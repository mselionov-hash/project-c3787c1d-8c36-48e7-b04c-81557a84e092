
-- Add missing profile fields for legal documents
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS passport_issued_by text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS passport_issue_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS passport_division_code text DEFAULT '';

-- Add missing loan fields
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS contract_number text UNIQUE;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS disbursement_method text NOT NULL DEFAULT 'bank_transfer';
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS interest_mode text NOT NULL DEFAULT 'interest_free';
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS interest_payment_schedule text;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS repayment_schedule_type text NOT NULL DEFAULT 'no_schedule_single_deadline';
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS early_repayment_notice_days int NOT NULL DEFAULT 30;

-- Add missing loan_payments fields
ALTER TABLE public.loan_payments ADD COLUMN IF NOT EXISTS confirmed_by uuid;
ALTER TABLE public.loan_payments ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- Create contract number sequence
CREATE SEQUENCE IF NOT EXISTS public.loan_contract_number_seq START 1;

-- Create trigger function for auto-generating contract_number
CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.contract_number IS NULL THEN
    NEW.contract_number := 'ДЗ-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(nextval('public.loan_contract_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on loans table
DROP TRIGGER IF EXISTS trg_generate_contract_number ON public.loans;
CREATE TRIGGER trg_generate_contract_number
  BEFORE INSERT ON public.loans
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_contract_number();
