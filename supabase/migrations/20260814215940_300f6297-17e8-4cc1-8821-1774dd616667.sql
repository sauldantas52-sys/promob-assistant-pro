REVOKE EXECUTE ON FUNCTION public.check_project_validation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_project_validation() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_project_validation() FROM anon;
GRANT EXECUTE ON FUNCTION public.check_project_validation() TO service_role;
