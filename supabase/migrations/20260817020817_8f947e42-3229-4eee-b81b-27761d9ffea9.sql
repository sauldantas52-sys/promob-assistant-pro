-- Ensure is_test exists and is correctly typed
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'projects' AND column_name = 'is_test') THEN
        ALTER TABLE public.projects ADD COLUMN is_test boolean DEFAULT false;
    END IF;
END $$;

-- RLS Update: Admins see everything of their company
-- First, simplify and fix projects policy
DROP POLICY IF EXISTS "Admins see all projects" ON public.projects;
CREATE POLICY "Admins see all projects"
ON public.projects
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Function to promote project
CREATE OR REPLACE FUNCTION public.promote_test_project(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Somente administradores podem promover projetos.';
  END IF;

  UPDATE public.projects 
  SET is_test = false, 
      status = 'novo'
  WHERE id = p_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_test_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.projects TO service_role;
GRANT ALL ON public.modules TO service_role;
GRANT ALL ON public.parts TO service_role;
GRANT ALL ON public.project_files TO service_role;
GRANT ALL ON public.project_import_sessions TO service_role;