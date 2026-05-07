ALTER TABLE public.ai_extracted_payment_data
  ADD COLUMN IF NOT EXISTS is_payment_proof boolean,
  ADD COLUMN IF NOT EXISTS is_russian_bank_receipt boolean,
  ADD COLUMN IF NOT EXISTS detected_currency text,
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS rejection_reason text;