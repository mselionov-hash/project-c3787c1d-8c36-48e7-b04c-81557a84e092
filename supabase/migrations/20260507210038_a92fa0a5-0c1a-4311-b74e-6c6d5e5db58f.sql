CREATE TABLE public.ai_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  request_message text,
  response_text text,
  http_status int,
  error text,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ai interactions"
ON public.ai_interactions FOR SELECT
USING (auth.uid() = user_id);

CREATE INDEX idx_ai_interactions_user_created ON public.ai_interactions(user_id, created_at DESC);