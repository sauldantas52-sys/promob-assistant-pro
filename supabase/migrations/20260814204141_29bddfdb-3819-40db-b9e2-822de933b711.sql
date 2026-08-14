-- Add missing policies for bridge tables
CREATE POLICY "Users can manage validations of their company" ON public.project_package_validations FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage files of their company" ON public.project_version_files FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
