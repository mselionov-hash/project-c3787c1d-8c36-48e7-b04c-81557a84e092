
-- Create storage bucket for transfer proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('transfer-proofs', 'transfer-proofs', true);

-- RLS policies for transfer-proofs bucket
CREATE POLICY "Authenticated users can upload transfer proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'transfer-proofs');

CREATE POLICY "Anyone can view transfer proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'transfer-proofs');

CREATE POLICY "Users can delete own transfer proofs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'transfer-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
