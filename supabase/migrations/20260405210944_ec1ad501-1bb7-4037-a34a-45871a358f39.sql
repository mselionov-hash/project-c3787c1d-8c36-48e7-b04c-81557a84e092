
-- Migration: TZ v2.2 capability layer

-- 1. Add new columns to loans
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS signature_scheme_requested text NOT NULL DEFAULT 'UKEP_ONLY';
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS borrower_disbursement_receipt_policy text NOT NULL DEFAULT 'BANK_TRANSFER_ONLY';
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS lender_repayment_receipt_policy text NOT NULL DEFAULT 'BANK_TRANSFER_ONLY';
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS initiator_role text NOT NULL DEFAULT 'lender';
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS deal_version integer NOT NULL DEFAULT 1;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS loan_type text NOT NULL DEFAULT 'INDIVIDUAL_TO_INDIVIDUAL';
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS interest_accrual_start text NOT NULL DEFAULT 'FROM_EACH_TRANCHE_DATE';
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS early_repayment_interest_rule text NOT NULL DEFAULT 'ACCRUED_TO_DATE';

-- 2. EDO Regulations table
CREATE TABLE public.edo_regulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  title text NOT NULL DEFAULT 'Регламент электронного взаимодействия платформы',
  content_hash text,
  effective_from timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.edo_regulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view regulations"
  ON public.edo_regulations FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_edo_regulations_updated_at
  BEFORE UPDATE ON public.edo_regulations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. EDO Regulation Acceptances table
CREATE TABLE public.edo_regulation_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  regulation_id uuid NOT NULL REFERENCES public.edo_regulations(id) ON DELETE CASCADE,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  UNIQUE (user_id, regulation_id)
);

ALTER TABLE public.edo_regulation_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own acceptances"
  ON public.edo_regulation_acceptances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own acceptances"
  ON public.edo_regulation_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4. UNEP Agreements (APP6) table
CREATE TABLE public.unep_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  generated_at timestamptz,
  lender_signed_at timestamptz,
  borrower_signed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loan_id)
);

ALTER TABLE public.unep_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loan parties can view unep agreements"
  ON public.unep_agreements FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM loans
    WHERE loans.id = unep_agreements.loan_id
    AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
  ));

CREATE POLICY "Loan parties can create unep agreements"
  ON public.unep_agreements FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM loans
    WHERE loans.id = unep_agreements.loan_id
    AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
  ));

CREATE POLICY "Loan parties can update unep agreements"
  ON public.unep_agreements FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM loans
    WHERE loans.id = unep_agreements.loan_id
    AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
  ));

CREATE TRIGGER update_unep_agreements_updated_at
  BEFORE UPDATE ON public.unep_agreements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Signature Packages table
CREATE TABLE public.signature_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  signature_scheme_effective text NOT NULL DEFAULT 'PENDING',
  package_status text NOT NULL DEFAULT 'draft',
  app6_required boolean NOT NULL DEFAULT false,
  app6_status text NOT NULL DEFAULT 'not_applicable',
  signed_no_debt boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loan_id)
);

ALTER TABLE public.signature_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loan parties can view signature packages"
  ON public.signature_packages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM loans
    WHERE loans.id = signature_packages.loan_id
    AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
  ));

CREATE POLICY "Loan parties can create signature packages"
  ON public.signature_packages FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM loans
    WHERE loans.id = signature_packages.loan_id
    AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
  ));

CREATE POLICY "Loan parties can update signature packages"
  ON public.signature_packages FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM loans
    WHERE loans.id = signature_packages.loan_id
    AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
  ));

CREATE TRIGGER update_signature_packages_updated_at
  BEFORE UPDATE ON public.signature_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
