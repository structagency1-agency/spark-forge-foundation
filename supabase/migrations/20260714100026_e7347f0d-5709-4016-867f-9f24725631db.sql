
ALTER TABLE public.jury_members
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS jury_members_user_id_key
  ON public.jury_members(user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.link_jury_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_jury_id uuid;
BEGIN
  SELECT id INTO v_jury_id FROM public.jury_members
   WHERE lower(email) = lower(NEW.email) LIMIT 1;
  IF v_jury_id IS NOT NULL THEN
    UPDATE public.jury_members SET user_id = NEW.id WHERE id = v_jury_id AND user_id IS NULL;
    INSERT INTO public.user_roles(user_id, role)
      VALUES (NEW.id, 'jury'::app_role) ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS link_jury_on_signup_trg ON auth.users;
CREATE TRIGGER link_jury_on_signup_trg
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_jury_on_signup();

DO $$
DECLARE u record;
BEGIN
  FOR u IN
    SELECT au.id, au.email FROM auth.users au
    JOIN public.jury_members jm ON lower(jm.email) = lower(au.email)
    WHERE jm.user_id IS NULL
  LOOP
    UPDATE public.jury_members SET user_id = u.id
      WHERE lower(email) = lower(u.email) AND user_id IS NULL;
    INSERT INTO public.user_roles(user_id, role)
      VALUES (u.id, 'jury'::app_role) ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Jury can read own record" ON public.jury_members;
CREATE POLICY "Jury can read own record" ON public.jury_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Jury can read own team assignments" ON public.jury_team_assignments;
CREATE POLICY "Jury can read own team assignments" ON public.jury_team_assignments
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR jury_id IN (SELECT id FROM public.jury_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Jury can read own event assignments" ON public.jury_event_assignments;
CREATE POLICY "Jury can read own event assignments" ON public.jury_event_assignments
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR jury_id IN (SELECT id FROM public.jury_members WHERE user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.is_admin_or_jury()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'jury'::app_role); $$;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_jury() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_jury() TO authenticated;
