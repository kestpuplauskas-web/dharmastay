
DROP POLICY IF EXISTS "Admins read car-documents" ON storage.objects;
CREATE POLICY "Admins read car-documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'car-documents' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins write car-documents" ON storage.objects;
CREATE POLICY "Admins write car-documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'car-documents' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update car-documents" ON storage.objects;
CREATE POLICY "Admins update car-documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'car-documents' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete car-documents" ON storage.objects;
CREATE POLICY "Admins delete car-documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'car-documents' AND public.has_role(auth.uid(), 'admin'));
