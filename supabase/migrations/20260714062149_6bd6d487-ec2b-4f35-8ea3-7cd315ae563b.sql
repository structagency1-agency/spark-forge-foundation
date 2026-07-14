
-- =========================================================
-- SPARK TANK 4.0 — Foundation Schema
-- =========================================================

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Enums
CREATE TYPE public.event_status AS ENUM (
  'upcoming','registration_open','registration_closed','ongoing','evaluation','completed'
);
CREATE TYPE public.winner_position AS ENUM (
  'winner','runner_up','second_runner_up','special_mention'
);
CREATE TYPE public.report_type AS ENUM (
  'registrations','attendance','evaluations','certificates','results'
);
CREATE TYPE public.email_status AS ENUM ('pending','sent','failed');
CREATE TYPE public.email_template_key AS ENUM (
  'registration','reminder','certificate','winner_announcement','password_reset','notification'
);
CREATE TYPE public.media_type AS ENUM ('image','video');
CREATE TYPE public.registration_status AS ENUM ('pending','confirmed','cancelled','waitlisted');
CREATE TYPE public.attendance_method AS ENUM ('qr','manual','import');
CREATE TYPE public.content_status AS ENUM ('active','inactive');

-- =========================================================
-- 1. departments
-- =========================================================
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.departments TO anon, authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments public read" ON public.departments FOR SELECT USING (true);
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 2. events
-- =========================================================
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  banner_url text,
  venue text,
  event_date timestamptz,
  registration_start timestamptz,
  registration_close timestamptz,
  min_team_size int NOT NULL DEFAULT 1,
  max_team_size int NOT NULL DEFAULT 1,
  max_participants int,
  status public.event_status NOT NULL DEFAULT 'upcoming',
  is_published boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_department_idx ON public.events(department_id);
CREATE INDEX events_status_idx ON public.events(status);
CREATE INDEX events_event_date_idx ON public.events(event_date);
GRANT SELECT ON public.events TO anon, authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events public read published" ON public.events FOR SELECT USING (is_published = true);
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 3. participants
-- =========================================================
CREATE TABLE public.participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  year_of_study int,
  roll_number text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);
CREATE INDEX participants_dept_idx ON public.participants(department_id);
GRANT ALL ON public.participants TO service_role;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_participants_updated BEFORE UPDATE ON public.participants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 4. teams
-- =========================================================
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  leader_participant_id uuid REFERENCES public.participants(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, name)
);
CREATE INDEX teams_event_idx ON public.teams(event_id);
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_teams_updated BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Team members (join table for participants <-> teams)
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, participant_id)
);
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_team_members_updated BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 5. registrations
-- =========================================================
CREATE TABLE public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  status public.registration_status NOT NULL DEFAULT 'pending',
  registered_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, event_id)
);
CREATE INDEX registrations_event_idx ON public.registrations(event_id);
GRANT ALL ON public.registrations TO service_role;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_registrations_updated BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 6. attendance
-- =========================================================
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  method public.attendance_method NOT NULL DEFAULT 'manual',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attendance_event_idx ON public.attendance(event_id);
CREATE INDEX attendance_participant_idx ON public.attendance(participant_id);
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_attendance_updated BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 7. jury_assignments
-- =========================================================
CREATE TABLE public.jury_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jury_name text NOT NULL,
  jury_email text NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  round text NOT NULL DEFAULT 'main',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jury_event_idx ON public.jury_assignments(event_id);
GRANT ALL ON public.jury_assignments TO service_role;
ALTER TABLE public.jury_assignments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_jury_updated BEFORE UPDATE ON public.jury_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 8. evaluations
-- =========================================================
CREATE TABLE public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  jury_id uuid REFERENCES public.jury_assignments(id) ON DELETE SET NULL,
  round text NOT NULL DEFAULT 'main',
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  total numeric(10,2),
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX evaluations_event_idx ON public.evaluations(event_id);
CREATE INDEX evaluations_team_idx ON public.evaluations(team_id);
GRANT ALL ON public.evaluations TO service_role;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_evaluations_updated BEFORE UPDATE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 9. certificate_templates
-- =========================================================
CREATE TABLE public.certificate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_url text,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.content_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.certificate_templates TO service_role;
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_cert_tpl_updated BEFORE UPDATE ON public.certificate_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 10. certificates
-- =========================================================
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.certificate_templates(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'participation',
  url text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX certificates_event_idx ON public.certificates(event_id);
CREATE INDEX certificates_participant_idx ON public.certificates(participant_id);
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_certificates_updated BEFORE UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 11. problem_statements
-- =========================================================
CREATE TABLE public.problem_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  document_url text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  status public.content_status NOT NULL DEFAULT 'active',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX problem_statements_event_idx ON public.problem_statements(event_id);
GRANT SELECT ON public.problem_statements TO anon, authenticated;
GRANT ALL ON public.problem_statements TO service_role;
ALTER TABLE public.problem_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "problem_statements public read" ON public.problem_statements
  FOR SELECT USING (status = 'active');
CREATE TRIGGER trg_ps_updated BEFORE UPDATE ON public.problem_statements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 12. gallery
-- =========================================================
CREATE TABLE public.gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  media_type public.media_type NOT NULL DEFAULT 'image',
  url text NOT NULL,
  thumbnail_url text,
  title text,
  caption text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  status public.content_status NOT NULL DEFAULT 'active',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gallery_event_idx ON public.gallery(event_id);
GRANT SELECT ON public.gallery TO anon, authenticated;
GRANT ALL ON public.gallery TO service_role;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery public read" ON public.gallery
  FOR SELECT USING (status = 'active');
CREATE TRIGGER trg_gallery_updated BEFORE UPDATE ON public.gallery
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 13. sponsors
-- =========================================================
CREATE TABLE public.sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website text,
  tier text,
  priority int NOT NULL DEFAULT 0,
  status public.content_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sponsors TO anon, authenticated;
GRANT ALL ON public.sponsors TO service_role;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sponsors public read" ON public.sponsors
  FOR SELECT USING (status = 'active');
CREATE TRIGGER trg_sponsors_updated BEFORE UPDATE ON public.sponsors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 14. homepage_content
-- =========================================================
CREATE TABLE public.homepage_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  title text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.homepage_content TO anon, authenticated;
GRANT ALL ON public.homepage_content TO service_role;
ALTER TABLE public.homepage_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homepage_content public read" ON public.homepage_content
  FOR SELECT USING (is_active = true);
CREATE TRIGGER trg_homepage_updated BEFORE UPDATE ON public.homepage_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 15. timeline
-- =========================================================
CREATE TABLE public.timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date timestamptz,
  icon text,
  sequence_order int NOT NULL DEFAULT 0,
  status public.content_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.timeline TO anon, authenticated;
GRANT ALL ON public.timeline TO service_role;
ALTER TABLE public.timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timeline public read" ON public.timeline
  FOR SELECT USING (status = 'active');
CREATE TRIGGER trg_timeline_updated BEFORE UPDATE ON public.timeline
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 16. results
-- =========================================================
CREATE TABLE public.results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  published_at timestamptz,
  summary text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id)
);
GRANT SELECT ON public.results TO anon, authenticated;
GRANT ALL ON public.results TO service_role;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results public read" ON public.results
  FOR SELECT USING (is_published = true);
CREATE TRIGGER trg_results_updated BEFORE UPDATE ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 17. winner_list
-- =========================================================
CREATE TABLE public.winner_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  team_name_snapshot text,
  position public.winner_position NOT NULL,
  citation text,
  prize text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX winner_event_idx ON public.winner_list(event_id);
GRANT SELECT ON public.winner_list TO anon, authenticated;
GRANT ALL ON public.winner_list TO service_role;
ALTER TABLE public.winner_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "winner_list public read" ON public.winner_list
  FOR SELECT USING (true);
CREATE TRIGGER trg_winner_updated BEFORE UPDATE ON public.winner_list
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 18. email_logs
-- =========================================================
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  subject text NOT NULL,
  template_key public.email_template_key NOT NULL,
  status public.email_status NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_logs_status_idx ON public.email_logs(status);
GRANT ALL ON public.email_logs TO service_role;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_email_logs_updated BEFORE UPDATE ON public.email_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 19. reports
-- =========================================================
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.report_type NOT NULL,
  title text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reports_type_idx ON public.reports(type);
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 20. settings
-- =========================================================
CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.settings
  FOR SELECT USING (is_public = true);
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 21. audit_logs
-- =========================================================
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  module text NOT NULL,
  description text,
  actor_id uuid,
  actor_label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_module_idx ON public.audit_logs(module);
CREATE INDEX audit_occurred_idx ON public.audit_logs(occurred_at DESC);
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_audit_updated BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- Seed: Departments
-- =========================================================
INSERT INTO public.departments (name, code, slug, sort_order) VALUES
  ('All Departments','ALL','all',0),
  ('Civil Engineering','CIVIL','civil',1),
  ('Mechanical Engineering','MECH','mechanical',2),
  ('Electrical and Electronics Engineering','EEE','eee',3),
  ('Electronics and Communication Engineering','ECE','ece',4),
  ('Computer Science Engineering','CSE','cse',5),
  ('Information Technology','IT','it',6),
  ('Artificial Intelligence & Machine Learning','AIML','aiml',7),
  ('Artificial Intelligence & Data Science','AIDS','aids',8),
  ('Computer Science and Business Systems','CSBS','csbs',9);

-- =========================================================
-- Seed: Settings
-- =========================================================
INSERT INTO public.settings (key, value, is_public, description) VALUES
  ('site', jsonb_build_object(
    'name','SPARK TANK 4.0',
    'tagline','Ignite. Innovate. Inspire.',
    'logo_url','',
    'favicon_url',''
  ), true, 'Core site identity'),
  ('contact', jsonb_build_object(
    'email','contact@sparktank.example',
    'phone','',
    'address',''
  ), true, 'Public contact information'),
  ('social', jsonb_build_object(
    'instagram','',
    'linkedin','',
    'twitter','',
    'youtube''','',
    'facebook',''
  ), true, 'Social media links'),
  ('footer', jsonb_build_object(
    'copyright','© SPARK TANK 4.0. All rights reserved.',
    'note',''
  ), true, 'Footer content'),
  ('seo', jsonb_build_object(
    'title','SPARK TANK 4.0 — Innovation Competition',
    'description','SPARK TANK 4.0 is an inter-departmental innovation competition celebrating ideas, engineering, and entrepreneurship.',
    'og_image','',
    'keywords','spark tank, innovation, competition, hackathon, engineering'
  ), true, 'Default SEO metadata');
