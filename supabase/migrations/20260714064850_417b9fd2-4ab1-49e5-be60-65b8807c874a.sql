
-- 1) Extend registration_status enum with lifecycle values
ALTER TYPE public.registration_status ADD VALUE IF NOT EXISTS 'attended';
ALTER TYPE public.registration_status ADD VALUE IF NOT EXISTS 'evaluated';
ALTER TYPE public.registration_status ADD VALUE IF NOT EXISTS 'completed';

-- 2) Registrations: registration code, QR token, email status
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS registration_code text,
  ADD COLUMN IF NOT EXISTS qr_token text,
  ADD COLUMN IF NOT EXISTS email_status text NOT NULL DEFAULT 'queued';

CREATE UNIQUE INDEX IF NOT EXISTS registrations_code_uidx
  ON public.registrations(registration_code)
  WHERE registration_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS registrations_qr_token_uidx
  ON public.registrations(qr_token)
  WHERE qr_token IS NOT NULL;

-- 3) Teams: academic year + department captured at registration
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS academic_year text,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

-- 4) Team members: per-member branch, academic year, registration number
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS branch text,
  ADD COLUMN IF NOT EXISTS academic_year text,
  ADD COLUMN IF NOT EXISTS registration_number text;

CREATE UNIQUE INDEX IF NOT EXISTS team_members_team_regno_uidx
  ON public.team_members(team_id, lower(registration_number))
  WHERE registration_number IS NOT NULL;

-- 5) Sequence + generator for registration code (ST4-YYYY-#####)
CREATE SEQUENCE IF NOT EXISTS public.registration_code_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_registration_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n bigint;
BEGIN
  v_n := nextval('public.registration_code_seq');
  RETURN 'ST4-' || to_char(now(), 'YYYY') || '-' || lpad(v_n::text, 5, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_registration_code() FROM PUBLIC;

-- 6) register_team: single atomic entrypoint the public form calls
CREATE OR REPLACE FUNCTION public.register_team(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid := (payload->>'event_id')::uuid;
  v_event public.events%ROWTYPE;
  v_now timestamptz := now();
  v_team_name text := btrim(coalesce(payload->'team'->>'name',''));
  v_team_year text := NULLIF(btrim(coalesce(payload->'team'->>'academic_year','')),'');
  v_team_dept_id uuid := NULLIF(payload->'team'->>'department_id','')::uuid;
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
BEGIN
  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'invalid_event' USING ERRCODE = 'P0001';
  END IF;
  IF v_leader IS NULL THEN
    RAISE EXCEPTION 'missing_required_fields' USING ERRCODE = 'P0001';
  END IF;

  v_all := jsonb_build_array(v_leader) || v_members;
  v_size := jsonb_array_length(v_all);

  -- Load event (row-locked for capacity fairness)
  SELECT * INTO v_event
  FROM public.events
  WHERE id = v_event_id AND is_published = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_event' USING ERRCODE = 'P0001';
  END IF;

  -- Registration window
  IF v_event.registration_start IS NULL OR v_now < v_event.registration_start THEN
    RAISE EXCEPTION 'registration_not_started' USING ERRCODE = 'P0001';
  END IF;
  IF v_event.registration_close IS NULL OR v_now >= v_event.registration_close THEN
    RAISE EXCEPTION 'registration_closed' USING ERRCODE = 'P0001';
  END IF;

  -- Team size
  IF v_size < v_event.min_team_size OR v_size > v_event.max_team_size THEN
    RAISE EXCEPTION 'invalid_team_size' USING ERRCODE = 'P0001';
  END IF;

  -- Team name & required
  IF v_team_name = '' OR length(v_team_name) > 120 THEN
    RAISE EXCEPTION 'invalid_team_name' USING ERRCODE = 'P0001';
  END IF;

  -- Capacity check (max_participants = teams for our model)
  IF v_event.max_participants IS NOT NULL THEN
    SELECT count(*) INTO v_current
    FROM public.registrations
    WHERE event_id = v_event_id AND status <> 'cancelled';
    IF v_current >= v_event.max_participants THEN
      RAISE EXCEPTION 'event_full' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Team name uniqueness within event (case-insensitive)
  IF EXISTS (
    SELECT 1 FROM public.teams
    WHERE event_id = v_event_id AND lower(name) = lower(v_team_name)
  ) THEN
    RAISE EXCEPTION 'duplicate_team_name' USING ERRCODE = 'P0001';
  END IF;

  -- Per-payload validation
  FOR i IN 0..(v_size - 1) LOOP
    v_member := v_all -> i;
    v_full_name := btrim(coalesce(v_member->>'full_name',''));
    v_email := lower(btrim(coalesce(v_member->>'email','')));
    v_regno := lower(btrim(coalesce(v_member->>'registration_number','')));

    IF v_full_name = '' OR v_email = '' OR v_regno = '' THEN
      RAISE EXCEPTION 'missing_required_fields' USING ERRCODE = 'P0001';
    END IF;
    IF v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
      RAISE EXCEPTION 'invalid_email_format' USING ERRCODE = 'P0001';
    END IF;
    IF coalesce(v_member->>'phone','') <> '' AND (v_member->>'phone') !~ v_phone_pattern THEN
      RAISE EXCEPTION 'invalid_phone_number' USING ERRCODE = 'P0001';
    END IF;

    IF v_email = ANY (v_seen_emails) THEN
      RAISE EXCEPTION 'duplicate_email' USING ERRCODE = 'P0001';
    END IF;
    IF v_regno = ANY (v_seen_regnos) THEN
      RAISE EXCEPTION 'duplicate_registration_number' USING ERRCODE = 'P0001';
    END IF;

    v_seen_emails := v_seen_emails || v_email;
    v_seen_regnos := v_seen_regnos || v_regno;
  END LOOP;

  -- Cross-team uniqueness within same event: emails
  IF EXISTS (
    SELECT 1
    FROM public.registrations r
    JOIN public.team_members tm ON tm.team_id = r.team_id
    JOIN public.participants p ON p.id = tm.participant_id
    WHERE r.event_id = v_event_id
      AND r.status <> 'cancelled'
      AND lower(p.email) = ANY (v_seen_emails)
  ) THEN
    RAISE EXCEPTION 'email_already_registered_for_event' USING ERRCODE = 'P0001';
  END IF;

  -- Cross-team uniqueness within same event: registration numbers
  IF EXISTS (
    SELECT 1
    FROM public.registrations r
    JOIN public.team_members tm ON tm.team_id = r.team_id
    WHERE r.event_id = v_event_id
      AND r.status <> 'cancelled'
      AND lower(tm.registration_number) = ANY (v_seen_regnos)
  ) THEN
    RAISE EXCEPTION 'regno_already_registered_for_event' USING ERRCODE = 'P0001';
  END IF;

  -- Create team
  INSERT INTO public.teams(name, event_id, academic_year, department_id)
  VALUES (v_team_name, v_event_id, v_team_year, v_team_dept_id)
  RETURNING id INTO v_team_id;

  -- Upsert participants + insert team_members
  FOR i IN 0..(v_size - 1) LOOP
    v_member := v_all -> i;
    v_email := lower(btrim(v_member->>'email'));
    v_full_name := btrim(v_member->>'full_name');

    INSERT INTO public.participants(full_name, email, phone, department_id, roll_number)
    VALUES (
      v_full_name,
      v_email,
      NULLIF(btrim(coalesce(v_member->>'phone','')),''),
      v_team_dept_id,
      NULLIF(btrim(coalesce(v_member->>'registration_number','')),'')
    )
    ON CONFLICT (email) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone     = COALESCE(EXCLUDED.phone, public.participants.phone),
      updated_at = now()
    RETURNING id INTO v_pid;

    INSERT INTO public.team_members(team_id, participant_id, role, branch, academic_year, registration_number)
    VALUES (
      v_team_id,
      v_pid,
      CASE WHEN i = 0 THEN 'leader' ELSE 'member' END,
      NULLIF(btrim(coalesce(v_member->>'branch','')),''),
      NULLIF(btrim(coalesce(v_member->>'academic_year','')),''),
      NULLIF(btrim(coalesce(v_member->>'registration_number','')),'')
    );

    IF i = 0 THEN
      v_leader_pid := v_pid;
      v_leader_email := v_email;
    END IF;
  END LOOP;

  UPDATE public.teams SET leader_participant_id = v_leader_pid WHERE id = v_team_id;

  -- Create registration
  v_reg_code := public.generate_registration_code();
  INSERT INTO public.registrations(team_id, event_id, status, registration_code, qr_token, email_status)
  VALUES (v_team_id, v_event_id, 'confirmed', v_reg_code, v_qr_token, 'queued')
  RETURNING id INTO v_reg_id;

  -- Queue confirmation email
  INSERT INTO public.email_logs(recipient, subject, template_key, status, payload)
  VALUES (
    v_leader_email,
    'SPARK TANK 4.0 — Registration Confirmed',
    'registration',
    'pending',
    jsonb_build_object(
      'registration_id', v_reg_id,
      'registration_code', v_reg_code,
      'event_id', v_event_id,
      'team_id', v_team_id,
      'qr_token', v_qr_token,
      'event_name', v_event.name,
      'event_date', v_event.event_date,
      'venue', v_event.venue,
      'team_name', v_team_name,
      'leader_email', v_leader_email
    )
  );

  RETURN jsonb_build_object(
    'registration_id', v_reg_id,
    'registration_code', v_reg_code,
    'qr_token', v_qr_token,
    'team_id', v_team_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_team(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_team(jsonb) TO anon, authenticated;

-- 7) Lookup: capacity summary for a single event (used by registration page)
CREATE OR REPLACE FUNCTION public.event_capacity(_event_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'registered', count(*),
    'max', (SELECT max_participants FROM public.events WHERE id = _event_id)
  )
  FROM public.registrations
  WHERE event_id = _event_id AND status <> 'cancelled';
$$;

REVOKE ALL ON FUNCTION public.event_capacity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.event_capacity(uuid) TO anon, authenticated;

-- 8) Lookup by registration code (My Registration page)
CREATE OR REPLACE FUNCTION public.lookup_registration_by_code(_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'registration_id', r.id,
    'registration_code', r.registration_code,
    'status', r.status,
    'email_status', r.email_status,
    'qr_token', r.qr_token,
    'registered_at', r.registered_at,
    'event', jsonb_build_object(
      'id', e.id,
      'name', e.name,
      'slug', e.slug,
      'venue', e.venue,
      'event_date', e.event_date,
      'department', (SELECT name FROM public.departments d WHERE d.id = e.department_id)
    ),
    'team', jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'academic_year', t.academic_year
    ),
    'members', (
      SELECT jsonb_agg(jsonb_build_object(
        'role', tm.role,
        'full_name', p.full_name,
        'email', p.email,
        'phone', p.phone,
        'branch', tm.branch,
        'academic_year', tm.academic_year,
        'registration_number', tm.registration_number
      ) ORDER BY CASE WHEN tm.role='leader' THEN 0 ELSE 1 END, p.full_name)
      FROM public.team_members tm
      JOIN public.participants p ON p.id = tm.participant_id
      WHERE tm.team_id = t.id
    )
  )
  FROM public.registrations r
  JOIN public.events e ON e.id = r.event_id
  JOIN public.teams  t ON t.id = r.team_id
  WHERE r.registration_code = _code
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_registration_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_registration_by_code(text) TO anon, authenticated;

-- 9) Lookup by leader email — returns an array
CREATE OR REPLACE FUNCTION public.lookup_registrations_by_email(_email text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(public.lookup_registration_by_code(r.registration_code)
           ORDER BY r.registered_at DESC), '[]'::jsonb)
  FROM public.registrations r
  JOIN public.teams t ON t.id = r.team_id
  JOIN public.participants p ON p.id = t.leader_participant_id
  WHERE lower(p.email) = lower(btrim(_email));
$$;

REVOKE ALL ON FUNCTION public.lookup_registrations_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_registrations_by_email(text) TO anon, authenticated;
