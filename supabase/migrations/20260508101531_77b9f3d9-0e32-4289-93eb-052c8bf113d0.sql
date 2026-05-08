ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS archived_by uuid NULL,
  ADD COLUMN IF NOT EXISTS archive_reason text NULL;

CREATE INDEX IF NOT EXISTS idx_loans_archived_at ON public.loans (archived_at);