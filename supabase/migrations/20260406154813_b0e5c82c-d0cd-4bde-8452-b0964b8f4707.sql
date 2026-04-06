
-- Add superseded_by column for version tracking
ALTER TABLE public.generated_documents
ADD COLUMN superseded_by uuid DEFAULT NULL;

-- Allow loan parties to update superseded_by on their documents
CREATE POLICY "Loan parties can mark documents superseded"
ON public.generated_documents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM loans
    WHERE loans.id = generated_documents.loan_id
      AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM loans
    WHERE loans.id = generated_documents.loan_id
      AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid())
  )
);
