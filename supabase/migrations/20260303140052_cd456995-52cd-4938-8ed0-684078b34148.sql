
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  passport_series TEXT DEFAULT '',
  passport_number TEXT DEFAULT '',
  address TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create loans table
CREATE TABLE public.loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lender_id UUID NOT NULL REFERENCES auth.users(id),
  borrower_id UUID REFERENCES auth.users(id),
  lender_name TEXT NOT NULL,
  borrower_name TEXT NOT NULL,
  lender_passport TEXT DEFAULT '',
  borrower_passport TEXT DEFAULT '',
  lender_address TEXT DEFAULT '',
  borrower_address TEXT DEFAULT '',
  amount NUMERIC NOT NULL,
  interest_rate NUMERIC NOT NULL DEFAULT 0,
  penalty_rate NUMERIC NOT NULL DEFAULT 0.1,
  city TEXT NOT NULL DEFAULT 'Москва',
  repayment_date DATE NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'awaiting_signature', 'signed_by_lender', 'signed_by_borrower', 'fully_signed', 'awaiting_payment', 'active', 'completed', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own loans" ON public.loans FOR SELECT USING (auth.uid() = lender_id OR auth.uid() = borrower_id);
CREATE POLICY "Users can create loans" ON public.loans FOR INSERT WITH CHECK (auth.uid() = lender_id);
CREATE POLICY "Users can update their own loans" ON public.loans FOR UPDATE USING (auth.uid() = lender_id OR auth.uid() = borrower_id);

-- Create loan_signatures table
CREATE TABLE public.loan_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('lender', 'borrower')),
  signature_data TEXT NOT NULL,
  signer_ip TEXT DEFAULT '',
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(loan_id, role)
);

ALTER TABLE public.loan_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signatures on their loans" ON public.loan_signatures FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.loans WHERE loans.id = loan_signatures.loan_id AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid()))
);
CREATE POLICY "Users can sign their loans" ON public.loan_signatures FOR INSERT WITH CHECK (auth.uid() = signer_id);

-- Create loan_payments table
CREATE TABLE public.loan_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES auth.users(id),
  transfer_method TEXT NOT NULL CHECK (transfer_method IN ('bank_transfer', 'sbp', 'cash')),
  transfer_amount NUMERIC NOT NULL,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_id TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  payment_reference TEXT DEFAULT '',
  screenshot_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments on their loans" ON public.loan_payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.loans WHERE loans.id = loan_payments.loan_id AND (loans.lender_id = auth.uid() OR loans.borrower_id = auth.uid()))
);
CREATE POLICY "Users can create payments" ON public.loan_payments FOR INSERT WITH CHECK (auth.uid() = payer_id);
CREATE POLICY "Users can update their payments" ON public.loan_payments FOR UPDATE USING (auth.uid() = payer_id);

-- Storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-screenshots', 'payment-screenshots', true);

CREATE POLICY "Users can upload payment screenshots" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Payment screenshots are viewable" ON storage.objects FOR SELECT USING (bucket_id = 'payment-screenshots');

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
