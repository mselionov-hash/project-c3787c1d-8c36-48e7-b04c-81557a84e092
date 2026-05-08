ALTER TABLE public.loans ADD CONSTRAINT loans_no_self_loan CHECK (borrower_id IS NULL OR borrower_id <> lender_id) NOT VALID;
ALTER TABLE public.loans VALIDATE CONSTRAINT loans_no_self_loan;