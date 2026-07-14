
-- Enums
DO $$ BEGIN
  CREATE TYPE public.announcement_priority AS ENUM ('low','normal','high','urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.announcement_status AS ENUM ('draft','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_kind AS ENUM ('info','success','warning','error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  display_location text NOT NULL DEFAULT 'homepage',
  priority public.announcement_priority NOT NULL DEFAULT 'normal',
  status public.announcement_status NOT NULL DEFAULT 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT announcements_dates_ck CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS announcements_title_location_uk
  ON public.announcements (lower(title), display_location);
CREATE INDEX IF NOT EXISTS announcements_status_idx ON public.announcements(status);
CREATE INDEX IF NOT EXISTS announcements_dates_idx ON public.announcements(starts_at, ends_at);

GRANT SELECT ON public.announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_public_read" ON public.announcements
  FOR SELECT TO anon, authenticated
  USING (status = 'published'
         AND (starts_at IS NULL OR starts_at <= now())
         AND (ends_at IS NULL OR ends_at > now()));

CREATE POLICY "announcements_admin_all" ON public.announcements
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_announcements_updated
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text,
  kind public.notification_kind NOT NULL DEFAULT 'info',
  module text NOT NULL DEFAULT 'system',
  related_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications(is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_module_idx ON public.notifications(module);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon, authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_admin_all" ON public.notifications
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Reports table permissive access (stage 4)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO anon, authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "reports_admin_all" ON public.reports
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ RPC FUNCTIONS ============

CREATE OR REPLACE FUNCTION public.analytics_overview()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_events', (SELECT count(*) FROM events),
    'upcoming_events', (SELECT count(*) FROM events WHERE status='upcoming'),
    'ongoing_events', (SELECT count(*) FROM events WHERE status='ongoing'),
    'completed_events', (SELECT count(*) FROM events WHERE status='completed'),
    'total_teams', (SELECT count(*) FROM teams),
    'total_participants', (SELECT count(*) FROM participants),
    'total_registrations', (SELECT count(*) FROM registrations),
    'attended_teams', (SELECT count(DISTINCT team_id) FROM attendance WHERE status='attended'),
    'evaluated_teams', (SELECT count(DISTINCT team_id) FROM evaluations WHERE status IN ('completed','published')),
    'certificates_generated', (SELECT count(*) FROM certificates),
    'published_results', (SELECT count(*) FROM results WHERE status='published'),
    'gallery_images', (SELECT count(*) FROM gallery),
    'contact_messages', (SELECT count(*) FROM contact_submissions),
    'unread_messages', (SELECT count(*) FROM contact_submissions WHERE is_read=false),
    'active_announcements', (SELECT count(*) FROM announcements
      WHERE status='published'
        AND (starts_at IS NULL OR starts_at <= now())
        AND (ends_at IS NULL OR ends_at > now())),
    'unread_notifications', (SELECT count(*) FROM notifications WHERE is_read=false)
  ) INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.analytics_by_event()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(x) ORDER BY x.event_date NULLS LAST, x.name), '[]'::jsonb) FROM (
    SELECT
      e.id, e.name, e.slug, e.status, e.event_date, e.max_participants,
      d.name AS department,
      (SELECT count(*) FROM registrations r WHERE r.event_id=e.id AND r.status<>'cancelled') AS registrations,
      (SELECT count(DISTINCT t.id) FROM teams t WHERE t.event_id=e.id) AS teams,
      (SELECT count(*) FROM attendance a WHERE a.event_id=e.id AND a.status='attended') AS attended,
      (SELECT count(*) FROM evaluations ev WHERE ev.event_id=e.id AND ev.status IN ('completed','published')) AS evaluated,
      (SELECT count(*) FROM winner_list wl WHERE wl.event_id=e.id) AS winners,
      CASE WHEN e.max_participants IS NULL OR e.max_participants=0 THEN 0
        ELSE round(((SELECT count(*) FROM registrations r WHERE r.event_id=e.id AND r.status<>'cancelled')::numeric
                    / e.max_participants) * 100, 1) END AS capacity_used_pct,
      CASE WHEN (SELECT count(*) FROM registrations r WHERE r.event_id=e.id AND r.status<>'cancelled') = 0 THEN 0
        ELSE round(((SELECT count(*) FROM attendance a WHERE a.event_id=e.id AND a.status='attended')::numeric
                    / (SELECT count(*) FROM registrations r WHERE r.event_id=e.id AND r.status<>'cancelled')) * 100, 1) END AS attendance_pct,
      COALESCE((SELECT count(*) FILTER (WHERE status='completed')::numeric / NULLIF(count(*),0) * 100
        FROM jury_team_assignments WHERE event_id=e.id),0)::numeric(6,1) AS evaluation_progress_pct
    FROM events e
    LEFT JOIN departments d ON d.id = e.department_id
  ) x;
$$;

CREATE OR REPLACE FUNCTION public.analytics_by_department(_department_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(x) ORDER BY x.name), '[]'::jsonb) FROM (
    SELECT
      d.id, d.name, d.code,
      (SELECT count(*) FROM registrations r
         JOIN teams t ON t.id=r.team_id
         WHERE t.department_id=d.id AND r.status<>'cancelled') AS registrations,
      (SELECT count(*) FROM attendance a
         JOIN teams t ON t.id=a.team_id
         WHERE t.department_id=d.id AND a.status='attended') AS attended,
      (SELECT count(DISTINCT ev.team_id) FROM evaluations ev
         JOIN teams t ON t.id=ev.team_id
         WHERE t.department_id=d.id AND ev.status IN ('completed','published')) AS qualified,
      (SELECT count(*) FROM winner_list wl
         JOIN teams t ON t.id=wl.team_id
         WHERE t.department_id=d.id) AS winners,
      CASE WHEN (SELECT count(*) FROM registrations)=0 THEN 0
        ELSE round(((SELECT count(*) FROM registrations r
                       JOIN teams t ON t.id=r.team_id
                       WHERE t.department_id=d.id AND r.status<>'cancelled')::numeric
                    / NULLIF((SELECT count(*) FROM registrations WHERE status<>'cancelled'),0)) * 100, 1) END AS participation_pct
    FROM departments d
    WHERE _department_id IS NULL OR d.id = _department_id
  ) x;
$$;

CREATE OR REPLACE FUNCTION public.registration_trends(_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  SELECT jsonb_build_object(
    'daily', COALESCE((
      SELECT jsonb_agg(row_to_json(d) ORDER BY d.day) FROM (
        SELECT to_char(date_trunc('day', registered_at), 'YYYY-MM-DD') AS day, count(*) AS count
        FROM registrations WHERE registered_at >= now() - (_days || ' days')::interval
        GROUP BY 1
      ) d
    ), '[]'::jsonb),
    'weekly', COALESCE((
      SELECT jsonb_agg(row_to_json(w) ORDER BY w.week) FROM (
        SELECT to_char(date_trunc('week', registered_at), 'YYYY-MM-DD') AS week, count(*) AS count
        FROM registrations WHERE registered_at >= now() - '90 days'::interval
        GROUP BY 1
      ) w
    ), '[]'::jsonb),
    'monthly', COALESCE((
      SELECT jsonb_agg(row_to_json(m) ORDER BY m.month) FROM (
        SELECT to_char(date_trunc('month', registered_at), 'YYYY-MM') AS month, count(*) AS count
        FROM registrations WHERE registered_at >= now() - '12 months'::interval
        GROUP BY 1
      ) m
    ), '[]'::jsonb),
    'by_status', COALESCE((
      SELECT jsonb_object_agg(status, cnt) FROM (
        SELECT status::text, count(*) cnt FROM registrations GROUP BY status
      ) s
    ), '{}'::jsonb)
  ) INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.attendance_analytics()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; v_reg int; v_att int;
BEGIN
  SELECT count(*) INTO v_reg FROM registrations WHERE status<>'cancelled';
  SELECT count(*) INTO v_att FROM attendance WHERE status='attended';
  SELECT jsonb_build_object(
    'total_attended', v_att,
    'total_registered', v_reg,
    'percentage', CASE WHEN v_reg=0 THEN 0 ELSE round((v_att::numeric / v_reg) * 100, 1) END,
    'by_department', COALESCE((
      SELECT jsonb_agg(row_to_json(x) ORDER BY x.department) FROM (
        SELECT d.name AS department,
               count(a.*) FILTER (WHERE a.status='attended') AS attended,
               count(DISTINCT r.id) AS registered
        FROM departments d
        LEFT JOIN teams t ON t.department_id=d.id
        LEFT JOIN registrations r ON r.team_id=t.id AND r.status<>'cancelled'
        LEFT JOIN attendance a ON a.team_id=t.id
        GROUP BY d.name
      ) x
    ), '[]'::jsonb),
    'by_event', COALESCE((
      SELECT jsonb_agg(row_to_json(x) ORDER BY x.event_name) FROM (
        SELECT e.name AS event_name,
               count(a.*) FILTER (WHERE a.status='attended') AS attended,
               count(DISTINCT r.id) AS registered
        FROM events e
        LEFT JOIN registrations r ON r.event_id=e.id AND r.status<>'cancelled'
        LEFT JOIN attendance a ON a.event_id=e.id
        GROUP BY e.name
      ) x
    ), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.evaluation_analytics()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  SELECT jsonb_build_object(
    'completed', (SELECT count(*) FROM evaluations WHERE status IN ('completed','published')),
    'pending', (SELECT count(*) FROM jury_team_assignments WHERE status IN ('assigned','pending','in_progress')),
    'avg_score', COALESCE((SELECT round(avg(percentage),2) FROM evaluations WHERE status IN ('completed','published')),0),
    'highest_score', COALESCE((SELECT max(percentage) FROM evaluations WHERE status IN ('completed','published')),0),
    'lowest_score', COALESCE((SELECT min(percentage) FROM evaluations WHERE status IN ('completed','published')),0),
    'by_department', COALESCE((
      SELECT jsonb_agg(row_to_json(x) ORDER BY x.avg_score DESC NULLS LAST) FROM (
        SELECT d.name AS department,
               round(avg(ev.percentage),2) AS avg_score,
               count(DISTINCT ev.team_id) AS evaluated_teams
        FROM departments d
        LEFT JOIN teams t ON t.department_id=d.id
        LEFT JOIN evaluations ev ON ev.team_id=t.id AND ev.status IN ('completed','published')
        GROUP BY d.name
      ) x
    ), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.certificate_analytics()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  SELECT jsonb_build_object(
    'generated', (SELECT count(*) FROM certificates),
    'downloaded', (SELECT count(*) FROM certificates WHERE downloaded_at IS NOT NULL),
    'verified', (SELECT count(*) FROM certificates WHERE verified_at IS NOT NULL),
    'by_type', COALESCE((
      SELECT jsonb_object_agg(type, cnt) FROM (
        SELECT type::text, count(*) cnt FROM certificates GROUP BY type
      ) x
    ), '{}'::jsonb)
  ) INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.db_health()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  SELECT jsonb_build_object(
    'events', (SELECT count(*) FROM events),
    'registrations', (SELECT count(*) FROM registrations),
    'teams', (SELECT count(*) FROM teams),
    'participants', (SELECT count(*) FROM participants),
    'attendance', (SELECT count(*) FROM attendance),
    'evaluations', (SELECT count(*) FROM evaluations),
    'certificates', (SELECT count(*) FROM certificates),
    'scorecards', (SELECT count(*) FROM scorecards),
    'gallery', (SELECT count(*) FROM gallery),
    'reports', (SELECT count(*) FROM reports),
    'contact_submissions', (SELECT count(*) FROM contact_submissions),
    'announcements', (SELECT count(*) FROM announcements),
    'notifications', (SELECT count(*) FROM notifications),
    'audit_logs', (SELECT count(*) FROM audit_logs),
    'total_records',
      (SELECT count(*) FROM events)+(SELECT count(*) FROM registrations)+(SELECT count(*) FROM teams)+
      (SELECT count(*) FROM participants)+(SELECT count(*) FROM attendance)+(SELECT count(*) FROM evaluations)+
      (SELECT count(*) FROM certificates)+(SELECT count(*) FROM scorecards)+(SELECT count(*) FROM gallery)+
      (SELECT count(*) FROM reports)+(SELECT count(*) FROM contact_submissions)+(SELECT count(*) FROM announcements)+
      (SELECT count(*) FROM notifications)+(SELECT count(*) FROM audit_logs),
    'last_updated', now()
  ) INTO r;
  RETURN r;
END $$;

-- Delete guard: prevent deleting events with active registrations
CREATE OR REPLACE FUNCTION public.guard_event_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.registrations WHERE event_id = OLD.id AND status <> 'cancelled') THEN
    RAISE EXCEPTION 'cannot_delete_event_with_active_registrations'
      USING HINT = 'Cancel all registrations before deleting this event.';
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_events_delete_guard ON public.events;
CREATE TRIGGER trg_events_delete_guard BEFORE DELETE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.guard_event_delete();
