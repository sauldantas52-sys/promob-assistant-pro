-- REMOÇÃO DOS TRIGGERS IDENTIFICADOS QUE PODEM ACESSAR FILE_TYPE EM CONTEXTO ERRADO
DROP TRIGGER IF EXISTS tr_auto_process_project_gates ON public.project_files;
DROP TRIGGER IF EXISTS tr_auto_process_gates ON public.project_files;
DROP TRIGGER IF EXISTS auto_process_gates_trigger ON public.projects;
DROP TRIGGER IF EXISTS tr_update_project_validation ON public.validation_checks;
DROP TRIGGER IF EXISTS log_industrial_import_trigger ON public.projects;

-- RPC de Bypass Industrial Final (V11)
CREATE OR REPLACE FUNCTION public.industrial_bypass_persist_closet_v11(
    _project_id UUID,
    _name TEXT,
    _company_id UUID,
    _user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.projects (
        id, company_id, created_by, name, 
        status, operational_status, is_test, 
        machining_blocked, is_validated,
        is_machining_assembly_blocked
    )
    VALUES (
        _project_id, _company_id, _user_id, _name,
        'novo', 'recebido', TRUE, FALSE, FALSE, FALSE
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.industrial_bypass_persist_closet_v11(UUID, TEXT, UUID, UUID) TO authenticated;
