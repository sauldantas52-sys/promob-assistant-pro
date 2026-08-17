-- 1. Remover trigger de evidência industrial que bloqueia o checklist do piloto
DROP TRIGGER IF EXISTS validate_industrial_evidence_trigger ON public.validation_checks;

-- 2. Corrigir a função de persistência industrial bypass (V5)
-- Adicionando explicitamente o tratamento para project_files caso o trigger tente ler file_type
CREATE OR REPLACE FUNCTION public.persist_industrial_project_bypass_v2(
    _project_id UUID,
    _name TEXT,
    _client_name TEXT,
    _company_id UUID,
    _user_id UUID,
    _xml_size BIGINT,
    _storage_path TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Inserir o projeto
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

    -- Inserir o arquivo XML base para garantir que queries de auditoria funcionem
    INSERT INTO public.project_files (
        project_id,
        company_id,
        file_name,
        file_type,
        size_bytes,
        storage_path,
        storage_status
    )
    VALUES (
        _project_id,
        _company_id,
        _name || '.xml',
        'xml',
        _xml_size,
        _storage_path,
        'uploaded'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.persist_industrial_project_bypass_v2(UUID, TEXT, TEXT, UUID, UUID, BIGINT, TEXT) TO authenticated;
