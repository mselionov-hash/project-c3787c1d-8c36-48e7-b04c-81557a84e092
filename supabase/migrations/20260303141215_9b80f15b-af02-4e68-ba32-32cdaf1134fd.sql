
-- Fix RLS policies: change from RESTRICTIVE to PERMISSIVE

-- loan_signatures
DROP POLICY IF EXISTS "Users can view signatures on their loans" ON public.loan_signatures;
DROP POLICY IF EXISTS "Users can sign their loans" ON public.loan_signatures;

CREATE POLICY "Users can view signatures on their loans" ON public.loan_signatures
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.loans WHERE loans.id = loan_signatures.loan_id AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())));

CREATE POLICY "Users can sign their loans" ON public.loan_signatures
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = signer_id);

-- loan_payments
DROP POLICY IF EXISTS "Users can view payments on their loans" ON public.loan_payments;
DROP POLICY IF EXISTS "Users can create payments" ON public.loan_payments;
DROP POLICY IF EXISTS "Users can update their payments" ON public.loan_payments;

CREATE POLICY "Users can view payments on their loans" ON public.loan_payments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.loans WHERE loans.id = loan_payments.loan_id AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())));

CREATE POLICY "Users can create payments" ON public.loan_payments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = payer_id);

CREATE POLICY "Users can update their payments" ON public.loan_payments
  FOR UPDATE TO authenticated
  USING (auth.uid() = payer_id);

-- loans
DROP POLICY IF EXISTS "Users can view their own loans" ON public.loans;
DROP POLICY IF EXISTS "Users can create loans" ON public.loans;
DROP POLICY IF EXISTS "Users can update their own loans" ON public.loans;

CREATE POLICY "Users can view their own loans" ON public.loans
  FOR SELECT TO authenticated
  USING (auth.uid() = lender_id OR auth.uid() = borrower_id);

CREATE POLICY "Users can create loans" ON public.loans
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = lender_id);

CREATE POLICY "Users can update their own loans" ON public.loans
  FOR UPDATE TO authenticated
  USING (auth.uid() = lender_id OR auth.uid() = borrower_id);

-- profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
