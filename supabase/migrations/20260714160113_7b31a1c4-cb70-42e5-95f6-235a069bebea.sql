
-- 1. Per-member QR token
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS qr_token text;

UPDATE public.team_members
  SET qr_token = gen_random_uuid()::text
  WHERE qr_token IS NULL;

ALTER TABLE public.team_members
  ALTER COLUMN qr_token SET NOT NULL,
  ALTER COLUMN qr_token SET DEFAULT gen_random_uuid()::text;

CREATE UNIQUE INDEX IF NOT EXISTS team_members_qr_token_uidx
  ON public.team_members(qr_token);

-- 2. Attendance: per-member instead of per-registration
DROP INDEX IF EXISTS public.attendance_registration_unique;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_reg_participant_uidx
  ON public.attendance(registration_id, participant_id)
  WHERE registration_id IS NOT NULL AND participant_id IS NOT NULL;

-- 3. mark_attendance_by_qr — look up by team_member.qr_token first,
--    fall back to legacy registration.qr_token (marks leader only).
CREATE OR REPLACE FUNCTION public.mark_attendance_by_qr(
  _qr_token text,
  _event_id uuid,
  _method public.attendance_method DEFAULT 'qr'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tm public.team_members%ROWTYPE;
  v_reg public.registrations%ROWTYPE;
  v_event public.events%ROWTYPE;
  v_team public.teams%ROWTYPE;
  v_participant public.participants%ROWTYPE;
  v_member_count int;
  v_attended_count int;
  v_att_id uuid;
  v_now timestamptz := now();
BEGIN
  IF _qr_token IS NULL OR btrim(_qr_token) = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_qr', 'message', 'Invalid QR Code');
  END IF;

  -- Try member QR first
  SELECT * INTO v_tm FROM public.team_members WHERE qr_token = _qr_token;

  IF FOUND THEN
    SELECT * INTO v_reg FROM public.registrations
      WHERE team_id = v_tm.team_id AND event_id = _event_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'wrong_event', 'message', 'This member is not registered for this event');
    END IF;
  ELSE
    -- Legacy team-level QR
    SELECT * INTO v_reg FROM public.registrations WHERE qr_token = _qr_token;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'not_found', 'message', 'QR not recognised');
    END IF;
    IF v_reg.event_id <> _event_id THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'wrong_event', 'message', 'Wrong Event');
    END IF;
    SELECT * INTO v_tm FROM public.team_members
      WHERE team_id = v_reg.team_id AND role = 'leader' LIMIT 1;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'not_found', 'message', 'Team leader not found');
    END IF;
  END IF;

  IF v_reg.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'cancelled', 'message', 'Registration Cancelled');
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = _event_id;
  IF v_event.status = 'completed' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'event_completed', 'message', 'Event already completed');
  END IF;

  SELECT * INTO v_team FROM public.teams WHERE id = v_reg.team_id;
  SELECT * INTO v_participant FROM public.participants WHERE id = v_tm.participant_id;

  IF EXISTS (
    SELECT 1 FROM public.attendance
     WHERE registration_id = v_reg.id AND participant_id = v_tm.participant_id AND status = 'attended'
  ) THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'already_attended',
      'message', v_participant.full_name || ' is already checked in',
      'participant_name', v_participant.full_name,
      'team_name', v_team.name
    );
  END IF;

  INSERT INTO public.attendance(registration_id, team_id, event_id, participant_id, method, status, checked_in_at)
  VALUES (v_reg.id, v_team.id, v_reg.event_id, v_tm.participant_id, _method, 'attended', v_now)
  RETURNING id INTO v_att_id;

  SELECT count(*) INTO v_member_count FROM public.team_members WHERE team_id = v_team.id;
  SELECT count(*) INTO v_attended_count FROM public.attendance
    WHERE registration_id = v_reg.id AND status = 'attended';

  -- Mark registration attended once any member is checked in; keep behaviour consistent
  UPDATE public.registrations SET status = 'attended' WHERE id = v_reg.id AND status <> 'attended';

  RETURN jsonb_build_object(
    'ok', true,
    'attendance_id', v_att_id,
    'registration_id', v_reg.id,
    'registration_code', v_reg.registration_code,
    'team_id', v_team.id,
    'team_name', v_team.name,
    'participant_id', v_participant.id,
    'participant_name', v_participant.full_name,
    'leader_name', v_participant.full_name,
    'member_count', v_member_count,
    'attended_count', v_attended_count,
    'checked_in_at', v_now,
    'event_name', v_event.name
  );
END; $$;

-- 4. lookup_registration_by_code returns per-member qr_token + team_member_id
CREATE OR REPLACE FUNCTION public.lookup_registration_by_code(_code text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'registration_id', r.id,
    'registration_code', r.registration_code,
    'status', r.status,
    'email_status', r.email_status,
    'qr_token', r.qr_token,
    'registered_at', r.registered_at,
    'event', jsonb_build_object(
      'id', e.id, 'name', e.name, 'slug', e.slug,
      'venue', e.venue, 'event_date', e.event_date,
      'department', (SELECT d.name FROM public.departments d WHERE d.id = e.department_id)
    ),
    'team', jsonb_build_object(
      'id', t.id, 'name', t.name, 'academic_year', t.academic_year
    ),
    'members', (
      SELECT jsonb_agg(jsonb_build_object(
        'team_member_id', tm.id,
        'participant_id', p.id,
        'qr_token', tm.qr_token,
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

-- 5. generate_certificates — only for members with their own attendance row
CREATE OR REPLACE FUNCTION public.generate_certificates(_event_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tpl_id uuid;
  cnt int := 0;
  v_row record;
  v_code text;
BEGIN
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
    -- Per-member attendance requirement
    JOIN public.attendance a
      ON a.registration_id = r.id
     AND a.participant_id = p.id
     AND a.status = 'attended'
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
    ) VALUES (
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

GRANT EXECUTE ON FUNCTION public.mark_attendance_by_qr(text, uuid, public.attendance_method) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.lookup_registration_by_code(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.generate_certificates(uuid) TO authenticated;
