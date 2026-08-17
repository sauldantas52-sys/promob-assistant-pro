-- Desabilitar temporariamente triggers restritivos para o Piloto
DROP TRIGGER IF EXISTS enforce_project_initial_state_trigger ON public.projects;
DROP TRIGGER IF EXISTS enforce_part_initial_state_trigger ON public.parts;
DROP TRIGGER IF EXISTS enforce_module_initial_state_trigger ON public.modules;
DROP TRIGGER IF EXISTS validate_project_import_session_trigger ON public.project_import_sessions;
DROP TRIGGER IF EXISTS enforce_project_status_gates_trigger ON public.projects;

-- Criar função de persistência industrial bypass (V4)
CREATE OR REPLACE FUNCTION public.persist_industrial_project_bypass(
    _project_id UUID,
    _name TEXT,
    _client_name TEXT,
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
        id,
        company_id,
        created_by,
        name,
        client_name,
        status,
        operational_status,
        is_test,
        machining_blocked,
        is_validated
    )
    VALUES (
        _project_id,
        _company_id,
        _user_id,
        _name,
        _client_name,
        'novo',
        'recebido',
        TRUE,
        FALSE,
        FALSE
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        client_name = EXCLUDED.client_name,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.persist_industrial_project_bypass(UUID, TEXT, TEXT, UUID, UUID) TO authenticated;
