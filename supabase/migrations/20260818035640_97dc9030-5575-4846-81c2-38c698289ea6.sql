DROP POLICY IF EXISTS "Public can view buckets" ON storage.buckets;
CREATE POLICY "Public can view buckets" ON storage.buckets FOR SELECT TO public USING (true);
