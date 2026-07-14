
-- Add scope columns to jury_event_assignments so admin can restrict a juror to a track/department within an event.
ALTER TABLE public.jury_event_assignments
  ADD COLUMN IF NOT EXISTS track public.project_track NULL,
  ADD COLUMN IF NOT EXISTS department_id uuid NULL REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS jury_event_assignments_track_idx ON public.jury_event_assignments(track);
CREATE INDEX IF NOT EXISTS jury_event_assignments_dept_idx ON public.jury_event_assignments(department_id);

-- Auto-assign: match teams to eligible jurors filtered by (event, track, department), round-robin per bucket.
CREATE OR REPLACE FUNCTION public.auto_assign_teams(_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team RECORD;
  v_jury_ids uuid[];
  v_n int;
  v_pick uuid;
  v_created int := 0;
  v_skipped int := 0;
  v_jury_total int;
  v_counter jsonb := '{}'::jsonb;
  v_idx int;
BEGIN
  -- Sanity: any active jury on event?
  SELECT count(*) INTO v_jury_total
    FROM public.jury_event_assignments jea
    JOIN public.jury_members jm ON jm.id = jea.jury_id
   WHERE jea.event_id = _event_id AND jm.status = 'active';
  IF v_jury_total = 0 THEN RAISE EXCEPTION 'no_active_jury_for_event'; END IF;

  FOR v_team IN
    SELECT DISTINCT ON (r.team_id)
           r.team_id,
           r.id AS registration_id,
           r.project_track,
           t.department_id
      FROM public.registrations r
      JOIN public.teams t ON t.id = r.team_id
     WHERE r.event_id = _event_id
       AND r.status IN ('attended','evaluated','completed')
     ORDER BY r.team_id, r.registered_at
  LOOP
    -- Eligible jurors: scope NULL means "any"
    SELECT array_agg(jm.id ORDER BY jm.full_name)
      INTO v_jury_ids
      FROM public.jury_event_assignments jea
      JOIN public.jury_members jm ON jm.id = jea.jury_id
     WHERE jea.event_id = _event_id
       AND jm.status = 'active'
       AND (jea.track IS NULL OR jea.track = v_team.project_track)
       AND (jea.department_id IS NULL OR jea.department_id = v_team.department_id);

    v_n := coalesce(array_length(v_jury_ids, 1), 0);
    IF v_n = 0 THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Round-robin within this (track, department) bucket
    v_idx := coalesce((v_counter ->> (coalesce(v_team.project_track::text,'-') || ':' || coalesce(v_team.department_id::text,'-')))::int, 0);
    v_pick := v_jury_ids[(v_idx % v_n) + 1];
    v_counter := jsonb_set(
      v_counter,
      ARRAY[coalesce(v_team.project_track::text,'-') || ':' || coalesce(v_team.department_id::text,'-')],
      to_jsonb(v_idx + 1),
      true
    );

    INSERT INTO public.jury_team_assignments(jury_id, team_id, event_id, registration_id, assignment_type, status)
    VALUES (v_pick, v_team.team_id, _event_id, v_team.registration_id, 'auto', 'assigned')
    ON CONFLICT (jury_id, team_id, event_id) DO NOTHING;
    v_created := v_created + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'assigned', v_created, 'skipped_no_match', v_skipped, 'jury_count', v_jury_total);
END $$;
