DROP POLICY IF EXISTS "Company members manage parts" ON public.parts;
DROP POLICY IF EXISTS "Admins see all parts" ON public.parts;

CREATE POLICY "Users can view parts of their company"
ON public.parts
FOR SELECT
TO authenticated
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
