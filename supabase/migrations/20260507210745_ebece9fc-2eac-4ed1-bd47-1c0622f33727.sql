
CREATE TABLE public.ai_fraud_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  risk_level text NOT NULL,
  risk_score numeric,
  checks_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_summary text,
  blocking_reasons text[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_fraud_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loan parties can view ai fraud checks"
ON public.ai_fraud_checks FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.loans
  WHERE loans.id = ai_fraud_checks.loan_id
    AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
));

CREATE POLICY "Loan parties can create ai fraud checks"
ON public.ai_fraud_checks FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.loans
    WHERE loans.id = ai_fraud_checks.loan_id
      AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
  )
);

CREATE INDEX idx_ai_fraud_checks_loan ON public.ai_fraud_checks(loan_id, created_at DESC);
CREATE INDEX idx_ai_fraud_checks_entity ON public.ai_fraud_checks(entity_type, entity_id);

CREATE TABLE public.ai_extracted_payment_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  source_file_url text,
  amount numeric,
  currency text,
  payment_date date,
  payment_time text,
  sender_name text,
  receiver_name text,
  bank_name text,
  operation_id text,
  payment_purpose text,
  confidence numeric,
  raw_extraction_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_extracted_payment_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loan parties can view ai extracted payment data"
ON public.ai_extracted_payment_data FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.loans
  WHERE loans.id = ai_extracted_payment_data.loan_id
    AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
));

CREATE POLICY "Loan parties can create ai extracted payment data"
ON public.ai_extracted_payment_data FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.loans
    WHERE loans.id = ai_extracted_payment_data.loan_id
      AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
  )
);

CREATE INDEX idx_ai_extracted_loan ON public.ai_extracted_payment_data(loan_id, created_at DESC);
CREATE INDEX idx_ai_extracted_entity ON public.ai_extracted_payment_data(entity_type, entity_id);
