
-- ============================================================
-- bank_details (replaces payment_methods conceptually)
-- ============================================================
CREATE TABLE public.bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL DEFAULT '',
  bank_name text NOT NULL DEFAULT '',
  detail_type text NOT NULL DEFAULT 'general',
  transfer_link text,
  qr_image_url text,
  recipient_display_name text,
  card_number text,
  phone text,
  account_number text,
  bik text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bank details" ON public.bank_details
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank details" ON public.bank_details
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank details" ON public.bank_details
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank details" ON public.bank_details
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Lenders can view borrower bank details (for loans they participate in)
CREATE POLICY "Loan parties can view counterparty bank details" ON public.bank_details
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.loans
    WHERE (loans.lender_id = auth.uid() AND loans.borrower_id = bank_details.user_id)
       OR (loans.borrower_id = auth.uid() AND loans.lender_id = bank_details.user_id)
  ));

-- ============================================================
-- loan_allowed_bank_details
-- ============================================================
CREATE TABLE public.loan_allowed_bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  bank_detail_id uuid REFERENCES public.bank_details(id) NOT NULL,
  purpose text NOT NULL DEFAULT 'disbursement',
  party_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_allowed_bank_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loan parties can view allowed bank details" ON public.loan_allowed_bank_details
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.loans
    WHERE loans.id = loan_allowed_bank_details.loan_id
      AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
  ));

CREATE POLICY "Loan parties can insert allowed bank details" ON public.loan_allowed_bank_details
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.loans
    WHERE loans.id = loan_allowed_bank_details.loan_id
      AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
  ));

CREATE POLICY "Loan parties can delete allowed bank details" ON public.loan_allowed_bank_details
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.loans
    WHERE loans.id = loan_allowed_bank_details.loan_id
      AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
      AND loans.status = 'draft'
  ));

-- ============================================================
-- signing_snapshots (immutable)
-- ============================================================
CREATE TABLE public.signing_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  snapshot_type text NOT NULL,
  signer_id uuid,
  role text,
  snapshot_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signing_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert snapshots" ON public.signing_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = signer_id);

CREATE POLICY "Loan parties can view snapshots" ON public.signing_snapshots
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.loans
    WHERE loans.id = signing_snapshots.loan_id
      AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
  ));
-- No UPDATE or DELETE policies — snapshots are immutable

-- ============================================================
-- loan_tranches
-- ============================================================
CREATE TABLE public.loan_tranches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  tranche_number int NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'RUB',
  planned_date date NOT NULL,
  actual_date date,
  actual_time time,
  timezone text DEFAULT 'Europe/Moscow',
  method text NOT NULL DEFAULT 'bank_transfer',
  status text NOT NULL DEFAULT 'planned',
  sender_bank_detail_id uuid REFERENCES public.bank_details(id),
  receiver_bank_detail_id uuid REFERENCES public.bank_details(id),
  sender_account_display text,
  receiver_account_display text,
  reference_text text,
  bank_document_id text,
  bank_document_date date,
  transfer_source text,
  created_by uuid NOT NULL,
  confirmed_by uuid,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_tranches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loan parties can view tranches" ON public.loan_tranches
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.loans
    WHERE loans.id = loan_tranches.loan_id
      AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
  ));

CREATE POLICY "Lender can create tranches" ON public.loan_tranches
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = loan_tranches.loan_id AND loans.lender_id = auth.uid()
    )
  );

CREATE POLICY "Loan parties can update tranches" ON public.loan_tranches
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.loans
    WHERE loans.id = loan_tranches.loan_id
      AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
  ));

-- ============================================================
-- payment_schedule_items
-- ============================================================
CREATE TABLE public.payment_schedule_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  item_number int NOT NULL,
  due_date date NOT NULL,
  principal_amount numeric NOT NULL DEFAULT 0,
  interest_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loan parties can view schedule items" ON public.payment_schedule_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.loans
    WHERE loans.id = payment_schedule_items.loan_id
      AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
  ));

CREATE POLICY "Lender can manage schedule items" ON public.payment_schedule_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.loans
    WHERE loans.id = payment_schedule_items.loan_id AND loans.lender_id = auth.uid()
  ));

CREATE POLICY "Lender can update schedule items" ON public.payment_schedule_items
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.loans
    WHERE loans.id = payment_schedule_items.loan_id AND loans.lender_id = auth.uid()
  ));

-- Add schedule_item_id FK to loan_payments
ALTER TABLE public.loan_payments ADD COLUMN IF NOT EXISTS schedule_item_id uuid REFERENCES public.payment_schedule_items(id);

-- ============================================================
-- generated_documents
-- ============================================================
CREATE TABLE public.generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL,
  source_entity_id uuid,
  render_data_snapshot jsonb NOT NULL,
  template_version text NOT NULL DEFAULT '1.0',
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loan parties can view generated documents" ON public.generated_documents
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.loans
    WHERE loans.id = generated_documents.loan_id
      AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
  ));

CREATE POLICY "Authenticated users can create generated documents" ON public.generated_documents
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
