-- Adiciona a RPC para descartar sessões de importação e limpa dados órfãos.
-- Este script é idempontente e seguro para produção.

CREATE OR REPLACE FUNCTION public.discard_import_session(_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Remove metadados da sessão de importação
    DELETE FROM public.project_import_sessions
    WHERE id = _session_id;

    -- Remove arquivos associados que ainda não foram vinculados a um projeto finalizado
    -- (Segurança contra arquivos órfãos em caso de falha no meio do processo)
    DELETE FROM public.project_files
    WHERE project_id = _session_id
      AND NOT EXISTS (
          SELECT 1 FROM public.projects p WHERE p.id = _session_id
      );
END;
$$;

GRANT EXECUTE ON FUNCTION public.discard_import_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.discard_import_session(uuid) TO service_role;

-- Função auxiliar para marcar limpeza pendente em caso de falha crítica de storage
CREATE OR REPLACE FUNCTION public.mark_import_cleanup_required(_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.project_import_sessions
    SET status = 'error',
        error_message = COALESCE(error_message, '') || ' [CLEANUP_REQUIRED]'
    WHERE id = _session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_import_cleanup_required(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_import_cleanup_required(uuid) TO service_role;
