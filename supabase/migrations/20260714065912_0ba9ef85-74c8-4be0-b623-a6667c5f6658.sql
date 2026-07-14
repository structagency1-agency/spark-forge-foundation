
-- Admin dashboard extensions.
-- NOTE: This project has NOT enabled authentication yet (stage 5). To unblock the
-- admin dashboard the following policies grant anon full read/write on
-- admin-managed content tables. When auth ships, replace `TO anon` with a
-- has_role('admin') gate and revoke anon writes.

-- 1) Email templates -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO anon, authenticated;
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_templates admin all" ON public.email_templates
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_email_templates_updated ON public.email_templates;
CREATE TRIGGER trg_email_templates_updated
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Contact submissions: read tracking ------------------------------------

ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- 3) Events: archive flag --------------------------------------------------

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- 4) Admin read+write policies (temporary, no-auth stage) ------------------

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'events','departments','gallery','problem_statements','timeline',
    'results','sponsors','homepage_content','settings','faqs',
    'winner_list','certificate_templates','certificates',
    'registrations','teams','team_members','participants',
    'contact_submissions','audit_logs'
  ])
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t || '_admin_all', t);
  END LOOP;
END $$;

-- 5) Contact submissions read (was insert-only) ----------------------------
-- The admin_all policy above already covers SELECT for anon.

-- 6) Audit logs — enable RLS (had none) so admin_all applies -----------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7) Admin dashboard stats -------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_events', (SELECT count(*) FROM events WHERE COALESCE(is_archived,false)=false),
    'upcoming_events', (SELECT count(*) FROM events WHERE status='upcoming' AND COALESCE(is_archived,false)=false),
    'ongoing_events', (SELECT count(*) FROM events WHERE status='ongoing' AND COALESCE(is_archived,false)=false),
    'completed_events', (SELECT count(*) FROM events WHERE status='completed' AND COALESCE(is_archived,false)=false),
    'total_teams', (SELECT count(*) FROM teams),
    'total_participants', (SELECT count(*) FROM team_members),
    'total_registrations', (SELECT count(*) FROM registrations),
    'today_registrations', (SELECT count(*) FROM registrations WHERE created_at >= date_trunc('day', now())),
    'remaining_capacity', (
      SELECT COALESCE(SUM(GREATEST(0, e.max_participants - COALESCE(rc.cnt,0))),0)::int
      FROM events e
      LEFT JOIN (SELECT event_id, count(*)::int cnt FROM registrations GROUP BY event_id) rc ON rc.event_id = e.id
      WHERE e.max_participants IS NOT NULL AND COALESCE(e.is_archived,false)=false
    ),
    'gallery_images', (SELECT count(*) FROM gallery),
    'problem_statements', (SELECT count(*) FROM problem_statements),
    'contact_messages', (SELECT count(*) FROM contact_submissions),
    'unread_messages', (SELECT count(*) FROM contact_submissions WHERE is_read=false)
  ) INTO result;
  RETURN result;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_stats() TO anon, authenticated;

-- 8) Seed default email templates -----------------------------------------

INSERT INTO public.email_templates (key, name, subject, body, variables)
VALUES
  ('registration_confirmation', 'Registration Confirmation',
   'Your SPARK TANK 4.0 registration is confirmed — {{registration_code}}',
   'Hi {{leader_name}},

Your team "{{team_name}}" is confirmed for {{event_name}}.

Registration ID: {{registration_code}}
Event date: {{event_date}}
Venue: {{venue}}

Please keep your QR code handy on the day of the event.

— SPARK TANK 4.0 Team',
   '["leader_name","team_name","event_name","registration_code","event_date","venue"]'::jsonb),
  ('registration_reminder', 'Registration Reminder',
   'Reminder: {{event_name}} is coming up',
   'Hi {{leader_name}},

This is a reminder that {{event_name}} is scheduled for {{event_date}} at {{venue}}.
See you there!',
   '["leader_name","event_name","event_date","venue"]'::jsonb),
  ('certificate_ready', 'Certificate Ready',
   'Your SPARK TANK 4.0 certificate is ready',
   'Hi {{leader_name}},

Your certificate for {{event_name}} is now available.
Download it at: {{certificate_url}}',
   '["leader_name","event_name","certificate_url"]'::jsonb),
  ('winner_announcement', 'Winner Announcement',
   'Congratulations! {{team_name}} won {{position}}',
   'Hi {{leader_name}},

Congratulations! Team {{team_name}} secured {{position}} in {{event_name}}.',
   '["leader_name","team_name","event_name","position"]'::jsonb),
  ('general_notification', 'General Notification',
   '{{subject}}',
   'Hi {{recipient_name}},

{{message}}

— SPARK TANK 4.0 Team',
   '["recipient_name","subject","message"]'::jsonb)
ON CONFLICT (key) DO NOTHING;
