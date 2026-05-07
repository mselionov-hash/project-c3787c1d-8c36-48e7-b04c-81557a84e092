
ALTER TABLE public.loan_tranches
  ADD COLUMN IF NOT EXISTS ai_fraud_check_id uuid,
  ADD COLUMN IF NOT EXISTS ai_risk_level text,
  ADD COLUMN IF NOT EXISTS used_ai_extracted_data boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_override_reason text;

ALTER TABLE public.loan_payments
  ADD COLUMN IF NOT EXISTS ai_fraud_check_id uuid,
  ADD COLUMN IF NOT EXISTS ai_risk_level text,
  ADD COLUMN IF NOT EXISTS used_ai_extracted_data boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_override_reason text;
