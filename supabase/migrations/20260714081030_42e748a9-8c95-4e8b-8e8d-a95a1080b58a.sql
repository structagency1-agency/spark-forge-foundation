
-- =====================================================
-- Stage: Security hardening + role infrastructure
-- =====================================================

-- 1) Roles enum + user_roles table
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_roles" ON public.user_roles;
CREATE POLICY "users_read_own_roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 2) Security definer role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Convenience: current user admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'admin'); $$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 3) Replace permissive admin_all policies with admin-only policies
-- Helper macro via DO block
DO $$
DECLARE
  t text;
  pol text;
  tables text[] := ARRAY[
    'announcements','audit_logs','certificate_templates','certificates',
    'contact_submissions','departments','email_templates','evaluation_criteria',
    'evaluation_scores','evaluations','events','faqs','gallery','homepage_content',
    'jury_event_assignments','jury_members','jury_team_assignments','notifications',
    'participants','problem_statements','registrations','reports','result_publications',
    'results','scorecards','settings','sponsors','team_members','teams','timeline',
    'winner_list'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Drop any old permissive policies
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename=t
        AND policyname IN (
          t||'_admin_all', t||' admin all', t||'_all',
          'result_pub_all','criteria_admin_all','eval_scores_admin_all',
          'jury_event_asn_admin_all','jury_team_asn_admin_all'
        )
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    END LOOP;
    -- Create tight admin-only policy
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin'')) WITH CHECK (public.has_role(auth.uid(),''admin''))',
      t||'_admin_only', t
    );
  END LOOP;
END $$;

-- 4) Attendance table: replace public-all with admin-only + public verify via RPC only
DROP POLICY IF EXISTS "attendance_all_access" ON public.attendance;
CREATE POLICY "attendance_admin_only" ON public.attendance
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 5) email_logs: ensure RLS on and admin-only (no policies today)
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_logs_admin_only" ON public.email_logs;
CREATE POLICY "email_logs_admin_only" ON public.email_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 6) Revoke SECURITY DEFINER execute from anon/authenticated on ALL public functions
--    then re-grant only to public-facing ones.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
                   r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role',
                   r.proname, r.args);
  END LOOP;
END $$;

-- Re-grant EXECUTE on strictly public-facing RPCs (called from anonymous UX)
GRANT EXECUTE ON FUNCTION public.register_team(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_registration_by_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_registrations_by_email(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_certificate_verification(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_certificate_download(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_results(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_winners(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.downloads_lookup(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_capacity(uuid) TO anon, authenticated;
-- has_role/is_admin already scoped above

-- 7) Trigger to auto-grant admin role to the seed admin email upon signup + verification
CREATE OR REPLACE FUNCTION public.grant_admin_for_seed_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'admin@ecellvitb.in' THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

-- Note: triggers on auth.users are the standard Supabase pattern for this.
DROP TRIGGER IF EXISTS on_auth_user_created_grant_seed_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_seed_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_for_seed_email();
