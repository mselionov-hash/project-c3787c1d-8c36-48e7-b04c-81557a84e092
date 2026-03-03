
-- Function to find a user by email and return their id and profile name
-- Security definer so it can read auth.users without exposing the table
CREATE OR REPLACE FUNCTION public.find_user_by_email(lookup_email TEXT)
RETURNS TABLE(user_id UUID, full_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE u.email = lookup_email
  LIMIT 1;
$$;
