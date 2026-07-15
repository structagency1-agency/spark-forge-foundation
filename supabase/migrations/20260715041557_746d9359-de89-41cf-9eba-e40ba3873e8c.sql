
-- Convert project_track columns from enum to text so custom sub-tracks work
ALTER TABLE public.registrations
  ALTER COLUMN project_track TYPE text USING project_track::text;

ALTER TABLE public.jury_event_assignments
  ALTER COLUMN track TYPE text USING track::text;

-- Rewrite register_team: validate track against event.sub_tracks
CREATE OR REPLACE FUNCTION public.register_team(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event_id uuid := (payload->>'event_id')::uuid;
  v_event public.events%ROWTYPE;
  v_now timestamptz := now();
  v_team_name text := btrim(coalesce(payload->'team'->>'name',''));
  v_team_year text := NULLIF(btrim(coalesce(payload->'team'->>'academic_year','')),'');
  v_team_dept_id uuid := NULLIF(payload->'team'->>'department_id','')::uuid;
  v_project_track text := lower(NULLIF(btrim(coalesce(payload->'team'->>'project_track','')),''));
  v_idea_title text := NULLIF(btrim(coalesce(payload->>'idea_title','')),'');
  v_abstract text := NULLIF(btrim(coalesce(payload->>'abstract','')),'');
  v_leader jsonb := payload->'leader';
  v_members jsonb := coalesce(payload->'members','[]'::jsonb);
  v_all jsonb;
  v_size int;
  v_current int;
  v_team_id uuid;
  v_reg_id uuid;
  v_reg_code text;
  v_qr_token text := gen_random_uuid()::text;
  v_leader_pid uuid;
  v_pid uuid;
  v_member jsonb;
  v_email text;
  v_regno text;
  v_full_name text;
  v_phone_pattern text := '^[+]?[0-9\s()-]{7,20}$';
  v_seen_emails text[] := ARRAY[]::text[];
  v_seen_regnos text[] := ARRAY[]::text[];
  v_leader_email text;
  v_allowed_tracks text[];
BEGIN
  IF v_event_id IS NULL THEN RAISE EXCEPTION 'invalid_event' USING ERRCODE='P0001'; END IF;
  IF v_leader IS NULL THEN RAISE EXCEPTION 'missing_required_fields' USING ERRCODE='P0001'; END IF;

  IF v_idea_title IS NULL OR length(v_idea_title) < 3 THEN
    RAISE EXCEPTION 'invalid_idea_title' USING ERRCODE='P0001';
  END IF;
  IF v_abstract IS NULL OR length(v_abstract) < 30 THEN
    RAISE EXCEPTION 'invalid_abstract' USING ERRCODE='P0001';
  END IF;

  v_all := jsonb_build_array(v_leader) || v_members;
  v_size := jsonb_array_length(v_all);

  SELECT * INTO v_event FROM public.events WHERE id = v_event_id AND is_published = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_event' USING ERRCODE='P0001'; END IF;

  v_allowed_tracks := COALESCE(v_event.sub_tracks, ARRAY['software','hardware']::text[]);
  IF v_project_track IS NULL OR NOT (v_project_track = ANY (SELECT lower(unnest(v_allowed_tracks)))) THEN
    RAISE EXCEPTION 'invalid_project_track' USING ERRCODE='P0001';
  END IF;

  IF v_event.registration_start IS NULL OR v_now < v_event.registration_start THEN
    RAISE EXCEPTION 'registration_not_started' USING ERRCODE='P0001'; END IF;
  IF v_event.registration_close IS NULL OR v_now >= v_event.registration_close THEN
    RAISE EXCEPTION 'registration_closed' USING ERRCODE='P0001'; END IF;
  IF v_size < v_event.min_team_size OR v_size > v_event.max_team_size THEN
    RAISE EXCEPTION 'invalid_team_size' USING ERRCODE='P0001'; END IF;
  IF v_team_name = '' OR length(v_team_name) > 120 THEN
    RAISE EXCEPTION 'invalid_team_name' USING ERRCODE='P0001'; END IF;

  IF v_event.max_participants IS NOT NULL THEN
    SELECT count(*) INTO v_current FROM public.registrations
     WHERE event_id = v_event_id AND status <> 'cancelled';
    IF v_current >= v_event.max_participants THEN
      RAISE EXCEPTION 'event_full' USING ERRCODE='P0001'; END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM public.teams WHERE event_id = v_event_id AND lower(name) = lower(v_team_name)) THEN
    RAISE EXCEPTION 'duplicate_team_name' USING ERRCODE='P0001';
  END IF;

  FOR i IN 0..(v_size - 1) LOOP
    v_member := v_all -> i;
    v_full_name := btrim(coalesce(v_member->>'full_name',''));
    v_email := lower(btrim(coalesce(v_member->>'email','')));
    v_regno := lower(btrim(coalesce(v_member->>'registration_number','')));
    IF v_full_name = '' OR v_email = '' OR v_regno = '' THEN
      RAISE EXCEPTION 'missing_required_fields' USING ERRCODE='P0001'; END IF;
    IF v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
      RAISE EXCEPTION 'invalid_email_format' USING ERRCODE='P0001'; END IF;
    IF coalesce(v_member->>'phone','') <> '' AND (v_member->>'phone') !~ v_phone_pattern THEN
      RAISE EXCEPTION 'invalid_phone_number' USING ERRCODE='P0001'; END IF;
    IF v_email = ANY (v_seen_emails) THEN RAISE EXCEPTION 'duplicate_email' USING ERRCODE='P0001'; END IF;
    IF v_regno = ANY (v_seen_regnos) THEN RAISE EXCEPTION 'duplicate_registration_number' USING ERRCODE='P0001'; END IF;
    v_seen_emails := v_seen_emails || v_email;
    v_seen_regnos := v_seen_regnos || v_regno;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.registrations r
    JOIN public.team_members tm ON tm.team_id = r.team_id
    JOIN public.participants p ON p.id = tm.participant_id
    WHERE r.event_id = v_event_id AND r.status <> 'cancelled'
      AND lower(p.email) = ANY (v_seen_emails)
  ) THEN RAISE EXCEPTION 'email_already_registered_for_event' USING ERRCODE='P0001'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.registrations r
    JOIN public.team_members tm ON tm.team_id = r.team_id
    WHERE r.event_id = v_event_id AND r.status <> 'cancelled'
      AND lower(tm.registration_number) = ANY (v_seen_regnos)
  ) THEN RAISE EXCEPTION 'regno_already_registered_for_event' USING ERRCODE='P0001'; END IF;

  INSERT INTO public.teams(name, event_id, academic_year, department_id)
  VALUES (v_team_name, v_event_id, v_team_year, v_team_dept_id)
  RETURNING id INTO v_team_id;

  FOR i IN 0..(v_size - 1) LOOP
    v_member := v_all -> i;
    v_email := lower(btrim(v_member->>'email'));
    v_full_name := btrim(v_member->>'full_name');

    INSERT INTO public.participants(full_name, email, phone, department_id, roll_number)
    VALUES (v_full_name, v_email,
      NULLIF(btrim(coalesce(v_member->>'phone','')),''),
      v_team_dept_id,
      NULLIF(btrim(coalesce(v_member->>'registration_number','')),''))
    ON CONFLICT (email) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = COALESCE(EXCLUDED.phone, public.participants.phone),
      updated_at = now()
    RETURNING id INTO v_pid;

    INSERT INTO public.team_members(team_id, participant_id, role, branch, academic_year, registration_number)
    VALUES (v_team_id, v_pid,
      CASE WHEN i = 0 THEN 'leader' ELSE 'member' END,
      NULLIF(btrim(coalesce(v_member->>'branch','')),''),
      NULLIF(btrim(coalesce(v_member->>'academic_year','')),''),
      NULLIF(btrim(coalesce(v_member->>'registration_number','')),''));

    IF i = 0 THEN v_leader_pid := v_pid; v_leader_email := v_email; END IF;
  END LOOP;

  UPDATE public.teams SET leader_participant_id = v_leader_pid WHERE id = v_team_id;

  v_reg_code := public.generate_registration_code();
  INSERT INTO public.registrations(team_id, event_id, status, registration_code, qr_token, email_status,
    idea_title, abstract, project_track)
  VALUES (v_team_id, v_event_id, 'confirmed', v_reg_code, v_qr_token, 'queued',
    v_idea_title, v_abstract, v_project_track)
  RETURNING id INTO v_reg_id;

  INSERT INTO public.email_logs(recipient, subject, template_key, status, payload)
  VALUES (v_leader_email, 'SPARK TANK 4.0 — Registration Confirmed', 'registration', 'pending',
    jsonb_build_object(
      'registration_id', v_reg_id, 'registration_code', v_reg_code,
      'event_id', v_event_id, 'team_id', v_team_id, 'qr_token', v_qr_token,
      'event_name', v_event.name, 'event_date', v_event.event_date, 'venue', v_event.venue,
      'team_name', v_team_name, 'leader_email', v_leader_email,
      'idea_title', v_idea_title, 'project_track', v_project_track));

  RETURN jsonb_build_object(
    'registration_id', v_reg_id,
    'registration_code', v_reg_code,
    'qr_token', v_qr_token,
    'team_id', v_team_id);
END;
$function$;
