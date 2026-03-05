
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS transfer_link text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS qr_image_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recipient_display_name text DEFAULT NULL;
