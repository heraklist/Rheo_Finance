-- Supabase Storage setup for private receipt photos.

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "receipts_select_own" ON storage.objects;
DROP POLICY IF EXISTS "receipts_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "receipts_update_own" ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete_own" ON storage.objects;

CREATE POLICY "receipts_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "receipts_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "receipts_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "receipts_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
