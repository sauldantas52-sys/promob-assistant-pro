
-- Function to discard an import session and cleanup metadata
-- Used when an import fails or is cancelled by the user
CREATE OR REPLACE FUNCTION public.discard_import_session(_session_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Remove items linked to this session
    DELETE FROM public.project_files WHERE project_id = _session_id;
    DELETE FROM public.project_import_sessions WHERE id = _session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.discard_import_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.discard_import_session(UUID) TO service_role;
