-- Redefinir as políticas de storage para o bucket 'project-files'
-- Primeiro removemos as políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Company users can read project artifacts" ON storage.objects;
DROP POLICY IF EXISTS "Technical roles can upload project artifacts" ON storage.objects;
DROP POLICY IF EXISTS "Technical roles can delete project artifacts" ON storage.objects;

-- Política de Leitura (SELECT)
CREATE POLICY "Company users can read project artifacts"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-files'
  AND (storage.foldername(name))[1] = public.current_company_id()::text
);

-- Política de Inserção (INSERT)
CREATE POLICY "Technical roles can upload project artifacts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND (storage.foldername(name))[1] = public.current_company_id()::text
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR public.has_role(auth.uid(), 'escritorio'::public.app_role) 
    OR public.has_role(auth.uid(), 'projetista'::public.app_role)
  )
);

-- Política de Deleção (DELETE) - Necessária para a função discard_import_session e correções
CREATE POLICY "Technical roles can delete project artifacts"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-files'
  AND (storage.foldername(name))[1] = public.current_company_id()::text
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR public.has_role(auth.uid(), 'escritorio'::public.app_role) 
    OR public.has_role(auth.uid(), 'projetista'::public.app_role)
  )
);
