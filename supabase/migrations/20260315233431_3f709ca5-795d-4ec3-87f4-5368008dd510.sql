
-- Drop the old DELETE policy that only allows deletion in 'draft' status
DROP POLICY IF EXISTS "Loan parties can delete allowed bank details" ON public.loan_allowed_bank_details;

-- Create new DELETE policy allowing deletion in all pre-fully-signed statuses
CREATE POLICY "Loan parties can delete allowed bank details"
ON public.loan_allowed_bank_details
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM loans
    WHERE loans.id = loan_allowed_bank_details.loan_id
      AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
      AND loans.status IN ('draft', 'awaiting_signatures', 'signed_by_lender', 'signed_by_borrower')
  )
);
