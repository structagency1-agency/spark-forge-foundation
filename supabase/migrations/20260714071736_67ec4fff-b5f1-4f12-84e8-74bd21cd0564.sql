
-- ============================================================
-- SPARK TANK 4.0 — Jury Evaluation System
-- ============================================================

-- Drop legacy empty scaffolding so we can build the real schema
DROP TABLE IF EXISTS public.evaluations CASCADE;
DROP TABLE IF EXISTS public.jury_assignments CASCADE;

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.jury_status AS ENUM ('active','inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.evaluation_status AS ENUM ('pending','assigned','in_progress','completed','published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.evaluation_recommendation AS ENUM ('qualified','not_qualified','needs_review');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------
-- JURY MEMBERS (registry)
-- ------------------------------------------------------------
CREATE TABLE public.jury_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  organization text,
  designation text,
  mobile text,
  expertise text,
  status public.jury_status NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jury_members TO anon, authenticated;
GRANT ALL ON public.jury_members TO service_role;
ALTER TABLE public.jury_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jury_members_admin_all" ON public.jury_members TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_jury_members_updated BEFORE UPDATE ON public.jury_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- JURY ↔ EVENT ASSIGNMENTS
-- ------------------------------------------------------------
CREATE TABLE public.jury_event_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jury_id uuid NOT NULL REFERENCES public.jury_members(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  round text NOT NULL DEFAULT 'main',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (jury_id, event_id, round)
);
CREATE INDEX jury_event_asn_event_idx ON public.jury_event_assignments(event_id);
CREATE INDEX jury_event_asn_jury_idx  ON public.jury_event_assignments(jury_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jury_event_assignments TO anon, authenticated;
GRANT ALL ON public.jury_event_assignments TO service_role;
ALTER TABLE public.jury_event_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jury_event_asn_admin_all" ON public.jury_event_assignments TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- JURY ↔ TEAM ASSIGNMENTS  (which jury evaluates which team)
-- ------------------------------------------------------------
CREATE TABLE public.jury_team_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jury_id uuid NOT NULL REFERENCES public.jury_members(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES public.registrations(id) ON DELETE SET NULL,
  assignment_type text NOT NULL DEFAULT 'manual', -- 'manual' | 'auto'
  status public.evaluation_status NOT NULL DEFAULT 'assigned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (jury_id, team_id, event_id)
);
CREATE INDEX jury_team_asn_event_idx ON public.jury_team_assignments(event_id);
CREATE INDEX jury_team_asn_team_idx  ON public.jury_team_assignments(team_id);
CREATE INDEX jury_team_asn_jury_idx  ON public.jury_team_assignments(jury_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jury_team_assignments TO anon, authenticated;
GRANT ALL ON public.jury_team_assignments TO service_role;
ALTER TABLE public.jury_team_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jury_team_asn_admin_all" ON public.jury_team_assignments TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_jury_team_asn_updated BEFORE UPDATE ON public.jury_team_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- EVALUATION CRITERIA (configurable)
-- ------------------------------------------------------------
CREATE TABLE public.evaluation_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  max_marks numeric(6,2) NOT NULL DEFAULT 10 CHECK (max_marks > 0),
  weightage numeric(6,2) NOT NULL DEFAULT 0 CHECK (weightage >= 0 AND weightage <= 100),
  sort_order int NOT NULL DEFAULT 0,
  status public.jury_status NOT NULL DEFAULT 'active',
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE, -- NULL = applies to all events
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluation_criteria TO anon, authenticated;
GRANT ALL ON public.evaluation_criteria TO service_role;
ALTER TABLE public.evaluation_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "criteria_admin_all" ON public.evaluation_criteria TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_criteria_updated BEFORE UPDATE ON public.evaluation_criteria FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- EVALUATIONS  (one row per jury per team)
-- ------------------------------------------------------------
CREATE TABLE public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jury_id uuid NOT NULL REFERENCES public.jury_members(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES public.registrations(id) ON DELETE SET NULL,
  round text NOT NULL DEFAULT 'main',
  total_score numeric(10,2) NOT NULL DEFAULT 0,
  weighted_score numeric(10,2) NOT NULL DEFAULT 0,
  max_score numeric(10,2) NOT NULL DEFAULT 0,
  percentage numeric(6,2) NOT NULL DEFAULT 0,
  overall_comments text,
  recommendation public.evaluation_recommendation,
  status public.evaluation_status NOT NULL DEFAULT 'in_progress',
  is_locked boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (jury_id, team_id, event_id, round)
);
CREATE INDEX evaluations_event_idx ON public.evaluations(event_id);
CREATE INDEX evaluations_team_idx  ON public.evaluations(team_id);
CREATE INDEX evaluations_jury_idx  ON public.evaluations(jury_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluations TO anon, authenticated;
GRANT ALL ON public.evaluations TO service_role;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evaluations_admin_all" ON public.evaluations TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_evaluations_updated BEFORE UPDATE ON public.evaluations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- EVALUATION SCORES (per criterion inside an evaluation)
-- ------------------------------------------------------------
CREATE TABLE public.evaluation_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  criterion_id uuid NOT NULL REFERENCES public.evaluation_criteria(id) ON DELETE CASCADE,
  marks numeric(6,2) NOT NULL DEFAULT 0 CHECK (marks >= 0),
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evaluation_id, criterion_id)
);
CREATE INDEX eval_scores_eval_idx ON public.evaluation_scores(evaluation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluation_scores TO anon, authenticated;
GRANT ALL ON public.evaluation_scores TO service_role;
ALTER TABLE public.evaluation_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eval_scores_admin_all" ON public.evaluation_scores TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_eval_scores_updated BEFORE UPDATE ON public.evaluation_scores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- Seed default criteria (global)
-- ------------------------------------------------------------
INSERT INTO public.evaluation_criteria (name, description, max_marks, weightage, sort_order) VALUES
  ('Innovation','Originality and novelty of the idea', 10, 20, 1),
  ('Technical Feasibility','Soundness of the technical approach', 10, 20, 2),
  ('Business Model','Clarity and viability of business model', 10, 15, 3),
  ('Presentation','Communication and pitch quality', 10, 15, 4),
  ('Impact','Potential social / market impact', 10, 20, 5),
  ('Execution','Prototype / demo / progress made', 10, 10, 6);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- ---- Save a criterion score (validates bounds + updates parent eval totals)
CREATE OR REPLACE FUNCTION public.save_evaluation_score(
  _evaluation_id uuid,
  _criterion_id uuid,
  _marks numeric,
  _remarks text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_max numeric;
  v_eval public.evaluations%ROWTYPE;
BEGIN
  SELECT * INTO v_eval FROM public.evaluations WHERE id = _evaluation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'evaluation_not_found'; END IF;
  IF v_eval.is_locked THEN RAISE EXCEPTION 'evaluation_locked'; END IF;

  SELECT max_marks INTO v_max FROM public.evaluation_criteria WHERE id = _criterion_id AND status = 'active';
  IF v_max IS NULL THEN RAISE EXCEPTION 'criterion_inactive_or_missing'; END IF;
  IF _marks < 0 THEN RAISE EXCEPTION 'negative_marks_not_allowed'; END IF;
  IF _marks > v_max THEN RAISE EXCEPTION 'marks_exceed_maximum'; END IF;

  INSERT INTO public.evaluation_scores(evaluation_id, criterion_id, marks, remarks)
  VALUES (_evaluation_id, _criterion_id, _marks, _remarks)
  ON CONFLICT (evaluation_id, criterion_id) DO UPDATE
    SET marks = EXCLUDED.marks, remarks = EXCLUDED.remarks, updated_at = now();

  PERFORM public.recompute_evaluation_totals(_evaluation_id);
  RETURN jsonb_build_object('ok', true);
END $$;

-- ---- Recompute totals / weighted / percentage for one evaluation
CREATE OR REPLACE FUNCTION public.recompute_evaluation_totals(_evaluation_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total numeric := 0;
  v_max   numeric := 0;
  v_weighted numeric := 0;
  v_weight_sum numeric := 0;
BEGIN
  SELECT
    COALESCE(SUM(s.marks),0),
    COALESCE(SUM(c.max_marks),0),
    COALESCE(SUM( (s.marks / NULLIF(c.max_marks,0)) * c.weightage ),0),
    COALESCE(SUM(c.weightage),0)
  INTO v_total, v_max, v_weighted, v_weight_sum
  FROM public.evaluation_scores s
  JOIN public.evaluation_criteria c ON c.id = s.criterion_id
  WHERE s.evaluation_id = _evaluation_id;

  UPDATE public.evaluations
    SET total_score = v_total,
        max_score = v_max,
        weighted_score = v_weighted,
        percentage = CASE WHEN v_max = 0 THEN 0 ELSE round((v_total / v_max) * 100, 2) END,
        status = CASE WHEN status IN ('completed','published') THEN status ELSE 'in_progress' END
  WHERE id = _evaluation_id;
END $$;

-- ---- Submit / complete an evaluation
CREATE OR REPLACE FUNCTION public.submit_evaluation(_evaluation_id uuid, _comments text DEFAULT NULL, _recommendation text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_eval public.evaluations%ROWTYPE;
  v_active_criteria int;
  v_scored int;
BEGIN
  SELECT * INTO v_eval FROM public.evaluations WHERE id = _evaluation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'evaluation_not_found'; END IF;
  IF v_eval.is_locked THEN RAISE EXCEPTION 'evaluation_locked'; END IF;

  SELECT count(*) INTO v_active_criteria FROM public.evaluation_criteria WHERE status = 'active';
  SELECT count(*) INTO v_scored
    FROM public.evaluation_scores s
    JOIN public.evaluation_criteria c ON c.id = s.criterion_id
   WHERE s.evaluation_id = _evaluation_id AND c.status = 'active';
  IF v_scored < v_active_criteria THEN
    RAISE EXCEPTION 'incomplete_scores';
  END IF;

  PERFORM public.recompute_evaluation_totals(_evaluation_id);

  UPDATE public.evaluations
    SET overall_comments = COALESCE(_comments, overall_comments),
        recommendation = COALESCE(_recommendation::evaluation_recommendation, recommendation),
        status = 'completed',
        submitted_at = now()
  WHERE id = _evaluation_id;

  UPDATE public.jury_team_assignments
    SET status = 'completed', updated_at = now()
  WHERE jury_id = v_eval.jury_id AND team_id = v_eval.team_id AND event_id = v_eval.event_id;

  RETURN jsonb_build_object('ok', true);
END $$;

-- ---- Get or create an evaluation for (jury, team, event)
CREATE OR REPLACE FUNCTION public.upsert_evaluation(_jury_id uuid, _team_id uuid, _event_id uuid, _round text DEFAULT 'main')
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reg_id uuid;
  v_id uuid;
BEGIN
  SELECT id INTO v_reg_id FROM public.registrations WHERE team_id = _team_id AND event_id = _event_id LIMIT 1;
  INSERT INTO public.evaluations(jury_id, team_id, event_id, registration_id, round, status)
  VALUES (_jury_id, _team_id, _event_id, v_reg_id, _round, 'in_progress')
  ON CONFLICT (jury_id, team_id, event_id, round) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- ---- Unlock / lock evaluation for re-evaluation
CREATE OR REPLACE FUNCTION public.set_evaluation_lock(_evaluation_id uuid, _locked boolean, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_eval public.evaluations%ROWTYPE;
BEGIN
  SELECT * INTO v_eval FROM public.evaluations WHERE id = _evaluation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'evaluation_not_found'; END IF;
  UPDATE public.evaluations SET is_locked = _locked WHERE id = _evaluation_id;
  INSERT INTO public.audit_logs(action, module, description, metadata, actor_label)
  VALUES (
    CASE WHEN _locked THEN 'evaluation_lock' ELSE 'evaluation_unlock' END,
    'evaluation',
    COALESCE(_reason, CASE WHEN _locked THEN 'Evaluation locked' ELSE 'Evaluation unlocked for re-evaluation' END),
    jsonb_build_object('evaluation_id', _evaluation_id, 'team_id', v_eval.team_id, 'event_id', v_eval.event_id),
    'admin'
  );
  RETURN jsonb_build_object('ok', true);
END $$;

-- ---- Auto-distribute attended teams equally among assigned jury of an event
CREATE OR REPLACE FUNCTION public.auto_assign_teams(_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_jury_ids uuid[];
  v_n int;
  v_teams RECORD;
  v_i int := 0;
  v_created int := 0;
BEGIN
  SELECT array_agg(jm.id ORDER BY jm.full_name)
    INTO v_jury_ids
    FROM public.jury_event_assignments jea
    JOIN public.jury_members jm ON jm.id = jea.jury_id
   WHERE jea.event_id = _event_id AND jm.status = 'active';
  v_n := coalesce(array_length(v_jury_ids, 1), 0);
  IF v_n = 0 THEN RAISE EXCEPTION 'no_active_jury_for_event'; END IF;

  FOR v_teams IN
    SELECT DISTINCT r.team_id, r.id AS registration_id
    FROM public.registrations r
    WHERE r.event_id = _event_id
      AND r.status IN ('attended','evaluated','completed')
    ORDER BY r.team_id
  LOOP
    INSERT INTO public.jury_team_assignments(jury_id, team_id, event_id, registration_id, assignment_type, status)
    VALUES (v_jury_ids[(v_i % v_n) + 1], v_teams.team_id, _event_id, v_teams.registration_id, 'auto', 'assigned')
    ON CONFLICT (jury_id, team_id, event_id) DO NOTHING;
    v_i := v_i + 1;
    v_created := v_created + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'assigned', v_created, 'jury_count', v_n);
END $$;

-- ---- Leaderboard for an event (aggregate multi-jury evaluations)
CREATE OR REPLACE FUNCTION public.event_leaderboard(_event_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH agg AS (
    SELECT
      e.event_id,
      e.team_id,
      count(*) FILTER (WHERE e.status IN ('completed','published')) AS jury_completed,
      count(*) AS jury_total,
      round(avg(e.percentage) FILTER (WHERE e.status IN ('completed','published')), 2) AS avg_percentage,
      round(avg(e.total_score) FILTER (WHERE e.status IN ('completed','published')), 2) AS avg_score,
      max(e.total_score) FILTER (WHERE e.status IN ('completed','published')) AS high_score,
      min(e.total_score) FILTER (WHERE e.status IN ('completed','published')) AS low_score,
      -- tie-breakers: innovation, then impact
      round(avg(
        (SELECT s.marks FROM public.evaluation_scores s
           JOIN public.evaluation_criteria c ON c.id = s.criterion_id
          WHERE s.evaluation_id = e.id AND lower(c.name) = 'innovation')
      ), 2) AS avg_innovation,
      round(avg(
        (SELECT s.marks FROM public.evaluation_scores s
           JOIN public.evaluation_criteria c ON c.id = s.criterion_id
          WHERE s.evaluation_id = e.id AND lower(c.name) = 'impact')
      ), 2) AS avg_impact
    FROM public.evaluations e
    WHERE (_event_id IS NULL OR e.event_id = _event_id)
    GROUP BY e.event_id, e.team_id
  ),
  base AS (
    SELECT a.*, t.name AS team_name, t.department_id, d.name AS department_name,
           ev.name AS event_name,
           (SELECT r.registered_at FROM public.registrations r WHERE r.team_id = a.team_id AND r.event_id = a.event_id LIMIT 1) AS registered_at,
           (SELECT r.registration_code FROM public.registrations r WHERE r.team_id = a.team_id AND r.event_id = a.event_id LIMIT 1) AS registration_code
    FROM agg a
    JOIN public.teams t ON t.id = a.team_id
    LEFT JOIN public.departments d ON d.id = t.department_id
    JOIN public.events ev ON ev.id = a.event_id
  ),
  ranked AS (
    SELECT b.*,
      rank() OVER (ORDER BY COALESCE(b.avg_score,0) DESC,
                            COALESCE(b.avg_innovation,0) DESC,
                            COALESCE(b.avg_impact,0) DESC,
                            b.registered_at ASC NULLS LAST) AS overall_rank,
      rank() OVER (PARTITION BY b.department_id
                   ORDER BY COALESCE(b.avg_score,0) DESC,
                            COALESCE(b.avg_innovation,0) DESC,
                            COALESCE(b.avg_impact,0) DESC,
                            b.registered_at ASC NULLS LAST) AS department_rank
    FROM base b
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.overall_rank), '[]'::jsonb) FROM ranked r;
$$;

-- ---- Evaluation dashboard stats
CREATE OR REPLACE FUNCTION public.evaluation_stats(_event_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_events', (SELECT count(*) FROM public.events WHERE COALESCE(is_archived,false)=false),
    'events_under_evaluation', (
      SELECT count(DISTINCT event_id) FROM public.jury_event_assignments
      WHERE (_event_id IS NULL OR event_id = _event_id)
    ),
    'total_jury', (SELECT count(*) FROM public.jury_members),
    'active_jury', (SELECT count(*) FROM public.jury_members WHERE status='active'),
    'assigned_jury', (
      SELECT count(DISTINCT jury_id) FROM public.jury_event_assignments
      WHERE (_event_id IS NULL OR event_id = _event_id)
    ),
    'total_team_assignments', (
      SELECT count(*) FROM public.jury_team_assignments
      WHERE (_event_id IS NULL OR event_id = _event_id)
    ),
    'evaluated_teams', (
      SELECT count(DISTINCT team_id) FROM public.evaluations
      WHERE status IN ('completed','published')
        AND (_event_id IS NULL OR event_id = _event_id)
    ),
    'pending_evaluations', (
      SELECT count(*) FROM public.jury_team_assignments
      WHERE status IN ('assigned','pending','in_progress')
        AND (_event_id IS NULL OR event_id = _event_id)
    ),
    'completed_evaluations', (
      SELECT count(*) FROM public.evaluations
      WHERE status IN ('completed','published')
        AND (_event_id IS NULL OR event_id = _event_id)
    ),
    'avg_score', (
      SELECT COALESCE(round(avg(percentage),2),0) FROM public.evaluations
      WHERE status IN ('completed','published')
        AND (_event_id IS NULL OR event_id = _event_id)
    ),
    'progress_pct', (
      SELECT CASE WHEN count(*) = 0 THEN 0
        ELSE round(
          (count(*) FILTER (WHERE status='completed'))::numeric
          / count(*)::numeric * 100, 1) END
      FROM public.jury_team_assignments
      WHERE (_event_id IS NULL OR event_id = _event_id)
    )
  ) INTO r;
  RETURN r;
END $$;

-- ---- Publish/unpublish leaderboard for event (mark evaluations as 'published')
CREATE OR REPLACE FUNCTION public.publish_event_evaluations(_event_id uuid, _publish boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_incomplete int;
BEGIN
  IF _publish THEN
    SELECT count(*) INTO v_incomplete FROM public.jury_team_assignments
     WHERE event_id = _event_id AND status <> 'completed';
    IF v_incomplete > 0 THEN
      RAISE EXCEPTION 'incomplete_evaluations_% still_pending', v_incomplete;
    END IF;
    UPDATE public.evaluations SET status = 'published' WHERE event_id = _event_id AND status = 'completed';
  ELSE
    UPDATE public.evaluations SET status = 'completed' WHERE event_id = _event_id AND status = 'published';
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;
