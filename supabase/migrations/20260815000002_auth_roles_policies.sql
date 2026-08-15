GRANT SELECT ON public.production_steps TO authenticated;
GRANT SELECT ON public.assembly_groups TO authenticated;
GRANT SELECT ON public.shipping_volumes TO authenticated;
GRANT SELECT ON public.production_logs TO authenticated;

DROP POLICY IF EXISTS "Auditors can view all production logs" ON public.production_logs;
CREATE POLICY "Auditors can view all production logs"
ON public.production_logs FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'auditor'::public.app_role)
  AND project_id IN (
    SELECT id FROM public.projects
    WHERE company_id = public.current_company_id()
  )
);

DROP POLICY IF EXISTS "Auditors can view all projects" ON public.projects;
CREATE POLICY "Auditors can view all projects"
ON public.projects FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'auditor'::public.app_role)
  AND company_id = public.current_company_id()
);
