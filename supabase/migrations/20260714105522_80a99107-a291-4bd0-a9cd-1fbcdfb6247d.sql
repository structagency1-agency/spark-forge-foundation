
-- ecell event assignments
CREATE TABLE IF NOT EXISTS public.ecell_event_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

GRANT SELECT ON public.ecell_event_assignments TO authenticated;
GRANT ALL ON public.ecell_event_assignments TO service_role;

ALTER TABLE public.ecell_event_assignments ENABLE ROW LEVEL SECURITY;

-- Admins can manage all
CREATE POLICY "Admins manage ecell assignments"
  ON public.ecell_event_assignments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- E-cell members can see their own
CREATE POLICY "Ecell see own assignments"
  ON public.ecell_event_assignments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Helper: get current user's primary role
CREATE OR REPLACE FUNCTION public.current_user_roles()
RETURNS SETOF public.app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.user_roles WHERE user_id = auth.uid(); $$;

GRANT EXECUTE ON FUNCTION public.current_user_roles() TO authenticated;

-- Update seed trigger to also grant participant role by email match if any team_member exists
CREATE OR REPLACE FUNCTION public.grant_roles_on_signup()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'admin@ecellvitb.in' THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- If a participant matches by email, grant participant role
  IF EXISTS (SELECT 1 FROM public.participants WHERE lower(email) = lower(NEW.email)) THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'participant')
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Existing jury linking
  IF EXISTS (SELECT 1 FROM public.jury_members WHERE lower(email) = lower(NEW.email)) THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'jury')
      ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.jury_members SET user_id = NEW.id
      WHERE lower(email) = lower(NEW.email) AND user_id IS NULL;
  END IF;

  RETURN NEW;
END $$;

-- Replace old trigger if present, keep same trigger name
DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_grant_roles ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_roles
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_roles_on_signup();
