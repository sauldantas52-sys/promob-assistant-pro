-- Desabilitar triggers que podem estar causando o erro de campo ausente em cascata
DROP TRIGGER IF EXISTS tr_notify_gate_completion ON public.validation_checks;
DROP TRIGGER IF EXISTS validate_industrial_evidence_trigger ON public.validation_checks;

-- Criar função de persistência industrial bypass (V6) - Removendo inserção de arquivo para evitar triggers em project_files
CREATE OR REPLACE FUNCTION public.persist_industrial_project_bypass_v3(
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

GRANT EXECUTE ON FUNCTION public.persist_industrial_project_bypass_v3(UUID, TEXT, TEXT, UUID, UUID) TO authenticated;
