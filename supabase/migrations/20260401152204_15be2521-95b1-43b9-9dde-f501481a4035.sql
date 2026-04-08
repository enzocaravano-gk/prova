-- Add phone column to profiles
ALTER TABLE public.profiles ADD COLUMN phone text;

-- Create function to get coach phone
CREATE OR REPLACE FUNCTION public.get_profile_phone(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT phone FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;