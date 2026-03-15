
-- Drop the old UPDATE policy that only allows payer to update
DROP POLICY IF EXISTS "Users can update their payments" ON public.loan_payments;

-- Borrower (payer) can update their own pending payments (e.g. edit before confirmation)
CREATE POLICY "Payer can update own pending payments"
ON public.loan_payments
FOR UPDATE
TO authenticated
USING (auth.uid() = payer_id AND status = 'pending')
WITH CHECK (auth.uid() = payer_id AND status = 'pending');

-- Lender can confirm pending payments on their loans
CREATE POLICY "Lender can confirm repayments"
ON public.loan_payments
FOR UPDATE
TO authenticated
USING (
  status = 'pending'
  AND EXISTS (
    SELECT 1 FROM loans
    WHERE loans.id = loan_payments.loan_id
      AND loans.lender_id = auth.uid()
  )
)
WITH CHECK (
  status = 'confirmed'
  AND confirmed_by = auth.uid()
  AND confirmed_at IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM loans
    WHERE loans.id = loan_payments.loan_id
      AND loans.lender_id = auth.uid()
  )
);
