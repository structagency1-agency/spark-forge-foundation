
-- ==============================================
-- Results, Scorecards, Certificates, Winners
-- ==============================================

-- Extend certificate_templates
ALTER TABLE public.certificate_templates
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'participation',
  ADD COLUMN IF NOT EXISTS background_image_url text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS signature_image_url text,
  ADD COLUMN IF NOT EXISTS issue_date date;

-- Extend certificates
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS certificate_code text,
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS registration_id uuid REFERENCES public.registrations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'issued',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS certificates_code_uniq ON public.certificates(certificate_code) WHERE certificate_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS certificates_reg_idx ON public.certificates(registration_id);
CREATE UNIQUE INDEX IF NOT EXISTS certificates_unique_per_pet ON public.certificates(participant_id, event_id, type);

CREATE SEQUENCE IF NOT EXISTS public.certificate_code_seq START 1;
GRANT USAGE, SELECT ON SEQUENCE public.certificate_code_seq TO anon, authenticated, service_role;

-- result_status enum
DO $$ BEGIN
  CREATE TYPE public.result_status AS ENUM ('draft','published','hidden','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.results
  ADD COLUMN IF NOT EXISTS status public.result_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

UPDATE public.results SET status = 'published' WHERE is_published = true AND status = 'draft';

-- Scorecards snapshot
CREATE TABLE IF NOT EXISTS public.scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL UNIQUE REFERENCES public.registrations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_score numeric(10,2),
  max_score numeric(10,2),
  percentage numeric(6,2),
  overall_rank int,
  department_rank int,
  status text NOT NULL DEFAULT 'draft',
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scorecards TO anon, authenticated;
GRANT ALL ON public.scorecards TO service_role;
ALTER TABLE public.scorecards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scorecards_admin_all" ON public.scorecards;
CREATE POLICY "scorecards_admin_all" ON public.scorecards TO anon, authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_scorecards_updated ON public.scorecards;
CREATE TRIGGER trg_scorecards_updated BEFORE UPDATE ON public.scorecards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Result publications log
CREATE TABLE IF NOT EXISTS public.result_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  action text NOT NULL,
  scheduled_at timestamptz,
  performed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.result_publications TO anon, authenticated;
GRANT ALL ON public.result_publications TO service_role;
ALTER TABLE public.result_publications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "result_pub_all" ON public.result_publications;
CREATE POLICY "result_pub_all" ON public.result_publications TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================
-- RPCs
-- ==============================================

CREATE OR REPLACE FUNCTION public.next_certificate_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n bigint;
BEGIN
  n := nextval('public.certificate_code_seq');
  RETURN 'ST4-CERT-' || to_char(now(),'YYYY') || '-' || lpad(n::text, 6, '0');
END; $$;

CREATE OR REPLACE FUNCTION public.generate_scorecards(_event_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; item jsonb; cnt int := 0; v_reg record;
BEGIN
  r := public.event_leaderboard(_event_id);
  FOR item IN SELECT * FROM jsonb_array_elements(r) LOOP
    SELECT reg.id AS registration_id, reg.registration_code, t.id AS team_id, t.department_id, t.name AS team_name,
           e.name AS event_name, d.name AS department_name
    INTO v_reg
    FROM public.teams t
    JOIN public.registrations reg ON reg.team_id = t.id AND reg.event_id = _event_id
    JOIN public.events e ON e.id = _event_id
    LEFT JOIN public.departments d ON d.id = t.department_id
    WHERE t.id = (item->>'team_id')::uuid
    LIMIT 1;
    IF v_reg.registration_id IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.scorecards(registration_id, event_id, team_id, department_id, snapshot, total_score, max_score, percentage, overall_rank, department_rank, status)
    VALUES (
      v_reg.registration_id, _event_id, v_reg.team_id, v_reg.department_id,
      jsonb_build_object(
        'team_name', v_reg.team_name,
        'registration_code', v_reg.registration_code,
        'event_name', v_reg.event_name,
        'department', v_reg.department_name,
        'criteria', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'name', c.name,
            'weightage', c.weightage,
            'max_marks', c.max_marks,
            'obtained', COALESCE((
              SELECT round(avg(es.marks)::numeric, 2)
              FROM public.evaluation_scores es
              JOIN public.evaluations ev ON ev.id = es.evaluation_id
              WHERE es.criterion_id = c.id AND ev.team_id = v_reg.team_id AND ev.event_id = _event_id
                AND ev.status IN ('completed','published')
            ), 0)
          ) ORDER BY c.sort_order)
          FROM public.evaluation_criteria c
          WHERE c.status='active' AND (c.event_id IS NULL OR c.event_id = _event_id)
        ), '[]'::jsonb),
        'remarks', COALESCE((
          SELECT string_agg(coalesce(overall_comments,''), E'\n---\n')
          FROM public.evaluations
          WHERE team_id = v_reg.team_id AND event_id = _event_id AND status IN ('completed','published')
        ), '')
      ),
      NULLIF(item->>'avg_score','')::numeric,
      NULL,
      NULLIF(item->>'avg_percentage','')::numeric,
      NULLIF(item->>'overall_rank','')::int,
      NULLIF(item->>'department_rank','')::int,
      'draft'
    )
    ON CONFLICT (registration_id) DO UPDATE SET
      snapshot = EXCLUDED.snapshot,
      total_score = EXCLUDED.total_score,
      percentage = EXCLUDED.percentage,
      overall_rank = EXCLUDED.overall_rank,
      department_rank = EXCLUDED.department_rank,
      updated_at = now();
    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_certificates(_event_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tpl_id uuid;
  cnt int := 0;
  v_row record;
  v_cert_type text;
  v_code text;
BEGIN
  -- pick any active template (per-type preferred)
  FOR v_row IN
    SELECT p.id AS participant_id, tm.team_id, t.name AS team_name, r.id AS registration_id,
           r.registration_code, t.department_id, e.name AS event_name,
           CASE
             WHEN wl.position IS NULL THEN 'participation'
             WHEN wl.position = 'winner' THEN 'winner'
             WHEN wl.position = 'runner_up' THEN 'runner_up'
             WHEN wl.position = 'second_runner_up' THEN 'second_runner_up'
             WHEN wl.position = 'special_mention' THEN 'special_mention'
           END AS cert_type
    FROM public.registrations r
    JOIN public.teams t ON t.id = r.team_id
    JOIN public.team_members tm ON tm.team_id = t.id
    JOIN public.participants p ON p.id = tm.participant_id
    JOIN public.events e ON e.id = r.event_id
    JOIN public.attendance a ON a.registration_id = r.id AND a.status='attended'
    LEFT JOIN public.winner_list wl ON wl.event_id = r.event_id AND wl.team_id = t.id
    WHERE r.event_id = _event_id AND r.status <> 'cancelled'
  LOOP
    SELECT id INTO v_tpl_id FROM public.certificate_templates
      WHERE status='active' AND type=v_row.cert_type LIMIT 1;
    IF v_tpl_id IS NULL THEN
      SELECT id INTO v_tpl_id FROM public.certificate_templates WHERE status='active' LIMIT 1;
    END IF;

    v_code := public.next_certificate_code();

    INSERT INTO public.certificates(
      participant_id, event_id, team_id, registration_id, template_id, type,
      certificate_code, status, metadata, issued_at
    )
    VALUES (
      v_row.participant_id, _event_id, v_row.team_id, v_row.registration_id, v_tpl_id, v_row.cert_type,
      v_code, 'issued',
      jsonb_build_object(
        'team_name', v_row.team_name,
        'registration_code', v_row.registration_code,
        'event_name', v_row.event_name
      ),
      now()
    )
    ON CONFLICT (participant_id, event_id, type) DO NOTHING;
    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END; $$;

CREATE OR REPLACE FUNCTION public.publish_results(_event_id uuid, _scheduled_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status public.result_status;
  v_pub timestamptz;
  v_leader jsonb;
  v_cert_count int := 0;
  v_score_count int := 0;
BEGIN
  IF _scheduled_at IS NOT NULL AND _scheduled_at > now() THEN
    v_status := 'draft';
    v_pub := NULL;
  ELSE
    v_status := 'published';
    v_pub := now();
  END IF;

  v_leader := public.event_leaderboard(_event_id);

  INSERT INTO public.results(event_id, is_published, status, scheduled_at, published_at, data)
  VALUES (_event_id, v_status='published', v_status, _scheduled_at, v_pub, jsonb_build_object('leaderboard', v_leader))
  ON CONFLICT (event_id) DO UPDATE SET
    is_published = EXCLUDED.is_published,
    status = EXCLUDED.status,
    scheduled_at = EXCLUDED.scheduled_at,
    published_at = COALESCE(EXCLUDED.published_at, public.results.published_at),
    data = EXCLUDED.data,
    updated_at = now();

  INSERT INTO public.result_publications(event_id, action, scheduled_at, metadata)
  VALUES (_event_id, CASE WHEN v_status='published' THEN 'published' ELSE 'scheduled' END, _scheduled_at, jsonb_build_object('status', v_status));

  IF v_status='published' THEN
    v_score_count := public.generate_scorecards(_event_id);
    v_cert_count := public.generate_certificates(_event_id);
    -- queue emails to team leaders
    INSERT INTO public.email_logs(recipient, subject, template_key, status, payload)
    SELECT lower(p.email),
           'SPARK TANK 4.0 — Results Published',
           'results_published',
           'pending',
           jsonb_build_object(
             'event_id', _event_id,
             'registration_id', r.id,
             'registration_code', r.registration_code,
             'team_name', t.name
           )
    FROM public.registrations r
    JOIN public.teams t ON t.id = r.team_id
    JOIN public.participants p ON p.id = t.leader_participant_id
    WHERE r.event_id = _event_id AND r.status <> 'cancelled';
  END IF;

  RETURN jsonb_build_object('status', v_status, 'scorecards', v_score_count, 'certificates', v_cert_count);
END; $$;

CREATE OR REPLACE FUNCTION public.unpublish_results(_event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.results SET is_published=false, status='draft', updated_at=now() WHERE event_id=_event_id;
  INSERT INTO public.result_publications(event_id, action) VALUES (_event_id, 'unpublished');
END; $$;

CREATE OR REPLACE FUNCTION public.hide_results(_event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.results SET is_published=false, status='hidden', updated_at=now() WHERE event_id=_event_id;
  INSERT INTO public.result_publications(event_id, action) VALUES (_event_id, 'hidden');
END; $$;

CREATE OR REPLACE FUNCTION public.archive_results(_event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.results SET is_published=false, status='archived', updated_at=now() WHERE event_id=_event_id;
  INSERT INTO public.result_publications(event_id, action) VALUES (_event_id, 'archived');
END; $$;

CREATE OR REPLACE FUNCTION public.verify_certificate(_code text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'valid', true,
    'certificate_code', c.certificate_code,
    'type', c.type,
    'issued_at', c.issued_at,
    'status', c.status,
    'participant_name', p.full_name,
    'team_name', t.name,
    'event_name', e.name,
    'department', d.name,
    'registration_code', r.registration_code
  )
  FROM public.certificates c
  JOIN public.participants p ON p.id = c.participant_id
  JOIN public.events e ON e.id = c.event_id
  LEFT JOIN public.registrations r ON r.id = c.registration_id
  LEFT JOIN public.teams t ON t.id = c.team_id
  LEFT JOIN public.departments d ON d.id = t.department_id
  WHERE c.certificate_code = _code
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.public_results(_query text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(x) ORDER BY x.overall_rank NULLS LAST), '[]'::jsonb)
  FROM (
    SELECT s.registration_id, s.event_id, s.total_score, s.percentage, s.overall_rank, s.department_rank,
           s.snapshot->>'team_name' AS team_name,
           s.snapshot->>'registration_code' AS registration_code,
           s.snapshot->>'event_name' AS event_name,
           s.snapshot->>'department' AS department,
           r.status AS result_status
    FROM public.scorecards s
    JOIN public.results r ON r.event_id = s.event_id
    WHERE r.status='published'
      AND (_query IS NULL OR _query='' OR
           s.snapshot->>'team_name' ILIKE '%' || _query || '%' OR
           s.snapshot->>'registration_code' ILIKE '%' || _query || '%')
  ) x;
$$;

CREATE OR REPLACE FUNCTION public.public_winners(_event_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(x) ORDER BY x.position_order, x.event_name), '[]'::jsonb)
  FROM (
    SELECT wl.id, wl.event_id, wl.position, wl.citation, wl.prize,
           COALESCE(t.name, wl.team_name_snapshot) AS team_name,
           e.name AS event_name,
           d.name AS department,
           s.total_score, s.percentage, s.overall_rank, s.department_rank,
           CASE wl.position
             WHEN 'winner' THEN 1
             WHEN 'runner_up' THEN 2
             WHEN 'second_runner_up' THEN 3
             WHEN 'special_mention' THEN 4
           END AS position_order
    FROM public.winner_list wl
    JOIN public.events e ON e.id = wl.event_id
    LEFT JOIN public.teams t ON t.id = wl.team_id
    LEFT JOIN public.departments d ON d.id = t.department_id
    LEFT JOIN public.registrations r ON r.team_id = wl.team_id AND r.event_id = wl.event_id
    LEFT JOIN public.scorecards s ON s.registration_id = r.id
    JOIN public.results res ON res.event_id = wl.event_id AND res.status='published'
    WHERE (_event_id IS NULL OR wl.event_id = _event_id)
  ) x;
$$;

CREATE OR REPLACE FUNCTION public.downloads_lookup(_query text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'registrations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'registration_id', r.id,
        'registration_code', r.registration_code,
        'qr_token', r.qr_token,
        'team_name', t.name,
        'event_name', e.name,
        'event_id', e.id,
        'department', d.name,
        'leader_email', p.email,
        'scorecard', (SELECT to_jsonb(s.*) FROM public.scorecards s WHERE s.registration_id = r.id),
        'result_status', (SELECT status FROM public.results WHERE event_id = e.id),
        'certificates', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'certificate_code', c.certificate_code,
            'type', c.type,
            'participant_name', p2.full_name,
            'issued_at', c.issued_at
          ))
          FROM public.certificates c
          JOIN public.participants p2 ON p2.id = c.participant_id
          WHERE c.registration_id = r.id
        ), '[]'::jsonb)
      ))
      FROM public.registrations r
      JOIN public.teams t ON t.id = r.team_id
      JOIN public.events e ON e.id = r.event_id
      LEFT JOIN public.departments d ON d.id = t.department_id
      LEFT JOIN public.participants p ON p.id = t.leader_participant_id
      WHERE lower(r.registration_code) = lower(btrim(_query))
         OR lower(p.email) = lower(btrim(_query))
    ), '[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END; $$;

GRANT EXECUTE ON FUNCTION public.next_certificate_code() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_scorecards(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_certificates(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_results(uuid, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unpublish_results(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hide_results(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_results(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_results(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_winners(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.downloads_lookup(text) TO anon, authenticated;
