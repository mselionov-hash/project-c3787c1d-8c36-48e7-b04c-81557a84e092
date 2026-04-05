
CREATE OR REPLACE FUNCTION public.get_loan_edo_acceptance(p_loan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lender_id uuid;
  v_borrower_id uuid;
  v_regulation_id uuid;
  v_regulation_version text;
  v_regulation_title text;
  v_regulation_effective_from timestamptz;
  v_lender_accepted boolean;
  v_borrower_accepted boolean;
BEGIN
  -- Verify caller is a party to this loan
  SELECT lender_id, borrower_id INTO v_lender_id, v_borrower_id
  FROM public.loans
  WHERE id = p_loan_id
    AND (lender_id = auth.uid() OR borrower_id = auth.uid());

  IF v_lender_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authorized');
  END IF;

  -- Get current regulation
  SELECT id, version, title, effective_from
  INTO v_regulation_id, v_regulation_version, v_regulation_title, v_regulation_effective_from
  FROM public.edo_regulations
  WHERE is_current = true
  LIMIT 1;

  IF v_regulation_id IS NULL THEN
    RETURN jsonb_build_object('has_regulation', false);
  END IF;

  -- Check lender acceptance
  SELECT EXISTS(
    SELECT 1 FROM public.edo_regulation_acceptances
    WHERE user_id = v_lender_id AND regulation_id = v_regulation_id
  ) INTO v_lender_accepted;

  -- Check borrower acceptance
  IF v_borrower_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.edo_regulation_acceptances
      WHERE user_id = v_borrower_id AND regulation_id = v_regulation_id
    ) INTO v_borrower_accepted;
  ELSE
    v_borrower_accepted := false;
  END IF;

  RETURN jsonb_build_object(
    'has_regulation', true,
    'regulation_id', v_regulation_id,
    'regulation_version', v_regulation_version,
    'regulation_title', v_regulation_title,
    'regulation_effective_from', v_regulation_effective_from,
    'lender_accepted', v_lender_accepted,
    'borrower_accepted', v_borrower_accepted,
    'both_accepted', v_lender_accepted AND v_borrower_accepted
  );
END;
$$;
