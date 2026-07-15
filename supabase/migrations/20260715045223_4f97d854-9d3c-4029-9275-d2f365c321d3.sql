
-- 1. Tighten always-true INSERT policy on contact_submissions
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;
CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(btrim(coalesce(name, ''))) > 0
    AND length(btrim(coalesce(email, ''))) > 0
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND length(btrim(coalesce(message, ''))) BETWEEN 1 AND 5000
  );

-- 2. Revoke EXECUTE from anon/authenticated on trigger functions
--    (invoked only by database triggers; never called from the client)
REVOKE EXECUTE ON FUNCTION public.grant_admin_for_seed_email()        FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_roles_on_signup()             FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.link_jury_on_signup()               FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_duplicate_regno_per_event() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guard_event_delete()                FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at()                    FROM anon, authenticated, PUBLIC;

-- 3. Revoke EXECUTE from anon/authenticated on internal helpers
--    (only invoked from other SECURITY DEFINER RPCs, never from client)
REVOKE EXECUTE ON FUNCTION public.recompute_evaluation_totals(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.next_certificate_code()           FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_registration_code()      FROM anon, authenticated, PUBLIC;

-- 4. Revoke anon access from privileged functions that must require a signed-in user
REVOKE EXECUTE ON FUNCTION public.current_jury_member_id()                                       FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_jury_of_team(uuid, uuid)                                    FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_attendance_by_qr(text, uuid, attendance_method)           FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_evaluation_score(uuid, uuid, numeric, text, text)         FROM anon, PUBLIC;
