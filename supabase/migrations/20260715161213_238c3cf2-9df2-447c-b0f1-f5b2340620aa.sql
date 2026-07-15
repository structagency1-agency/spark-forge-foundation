CREATE OR REPLACE FUNCTION public.normalize_attendance_qr_token(_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v text := btrim(coalesce(_raw, ''));
  j jsonb;
BEGIN
  IF v = '' THEN
    RETURN v;
  END IF;

  IF left(v, 1) = '{' THEN
    BEGIN
      j := v::jsonb;
      IF jsonb_typeof(j->'t') = 'string' AND btrim(j->>'t') <> '' THEN
        RETURN btrim(j->>'t');
      END IF;
      IF jsonb_typeof(j->'qr_token') = 'string' AND btrim(j->>'qr_token') <> '' THEN
        RETURN btrim(j->>'qr_token');
      END IF;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;

  IF v ILIKE 'ST4:%' THEN
    RETURN btrim(substr(v, 5));
  END IF;

  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.attendance_stats(_event_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total int;
  v_attended int;
  v_today int;
BEGIN
  SELECT count(*) INTO v_total
  FROM public.registrations r
  JOIN public.team_members tm ON tm.team_id = r.team_id
  WHERE (_event_id IS NULL OR r.event_id = _event_id)
    AND r.status <> 'cancelled';

  SELECT count(*) INTO v_attended
  FROM public.attendance a
  JOIN public.registrations r ON r.id = a.registration_id
  WHERE a.status = 'attended'
    AND r.status <> 'cancelled'
    AND (_event_id IS NULL OR a.event_id = _event_id);

  SELECT count(*) INTO v_today
  FROM public.attendance a
  JOIN public.registrations r ON r.id = a.registration_id
  WHERE a.status = 'attended'
    AND r.status <> 'cancelled'
    AND a.checked_in_at >= date_trunc('day', now())
    AND (_event_id IS NULL OR a.event_id = _event_id);

  RETURN jsonb_build_object(
    'total_registered', v_total,
    'total_attended', v_attended,
    'remaining', GREATEST(0, v_total - v_attended),
    'percentage', CASE WHEN v_total = 0 THEN 0 ELSE round((v_attended::numeric / v_total) * 100, 1) END,
    'today_attendance', v_today
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_attendance_by_qr(_qr_token text, _event_id uuid, _method attendance_method DEFAULT 'qr'::attendance_method)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token text := public.normalize_attendance_qr_token(_qr_token);
  v_tm public.team_members%ROWTYPE;
  v_reg public.registrations%ROWTYPE;
  v_event public.events%ROWTYPE;
  v_team public.teams%ROWTYPE;
  v_participant public.participants%ROWTYPE;
  v_member_count int;
  v_attended_count int;
  v_att_id uuid;
  v_checked_at timestamptz;
  v_now timestamptz := now();
BEGIN
  IF v_token IS NULL OR btrim(v_token) = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_qr', 'message', 'Invalid QR Code');
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = _event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_event', 'message', 'Select the correct event before scanning');
  END IF;
  IF v_event.status = 'completed' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'event_completed', 'message', 'Event already completed');
  END IF;

  SELECT * INTO v_tm FROM public.team_members WHERE qr_token = v_token;

  IF FOUND THEN
    SELECT * INTO v_reg
    FROM public.registrations
    WHERE team_id = v_tm.team_id AND event_id = _event_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'wrong_event', 'message', 'This member is not registered for the selected event');
    END IF;
  ELSE
    SELECT * INTO v_reg FROM public.registrations WHERE qr_token = v_token;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'not_found', 'message', 'QR not recognised');
    END IF;
    IF v_reg.event_id <> _event_id THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'wrong_event', 'message', 'Wrong event selected for this QR');
    END IF;
    SELECT * INTO v_tm
    FROM public.team_members
    WHERE team_id = v_reg.team_id AND role = 'leader'
    ORDER BY created_at ASC
    LIMIT 1;
    IF NOT FOUND THEN
      SELECT * INTO v_tm
      FROM public.team_members
      WHERE team_id = v_reg.team_id
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'not_found', 'message', 'No team member found for this registration');
    END IF;
  END IF;

  IF v_reg.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'cancelled', 'message', 'Registration cancelled');
  END IF;

  SELECT * INTO v_team FROM public.teams WHERE id = v_reg.team_id;
  SELECT * INTO v_participant FROM public.participants WHERE id = v_tm.participant_id;

  IF EXISTS (
    SELECT 1 FROM public.attendance
    WHERE registration_id = v_reg.id
      AND participant_id = v_tm.participant_id
      AND status = 'attended'
  ) THEN
    SELECT count(*) INTO v_member_count FROM public.team_members WHERE team_id = v_team.id;
    SELECT count(*) INTO v_attended_count FROM public.attendance
      WHERE registration_id = v_reg.id AND status = 'attended';
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'already_attended',
      'message', v_participant.full_name || ' is already checked in',
      'registration_id', v_reg.id,
      'registration_code', v_reg.registration_code,
      'team_id', v_team.id,
      'team_name', v_team.name,
      'participant_id', v_participant.id,
      'participant_name', v_participant.full_name,
      'leader_name', v_participant.full_name,
      'member_count', v_member_count,
      'attended_count', v_attended_count,
      'event_name', v_event.name
    );
  END IF;

  INSERT INTO public.attendance(registration_id, team_id, event_id, participant_id, method, status, checked_in_at)
  VALUES (v_reg.id, v_team.id, v_reg.event_id, v_tm.participant_id, _method, 'attended', v_now)
  ON CONFLICT (registration_id, participant_id) WHERE registration_id IS NOT NULL AND participant_id IS NOT NULL
  DO UPDATE SET
    status = 'attended',
    method = EXCLUDED.method,
    checked_in_at = CASE
      WHEN public.attendance.status = 'attended' THEN public.attendance.checked_in_at
      ELSE EXCLUDED.checked_in_at
    END,
    updated_at = now()
  RETURNING id, checked_in_at INTO v_att_id, v_checked_at;

  SELECT count(*) INTO v_member_count FROM public.team_members WHERE team_id = v_team.id;
  SELECT count(*) INTO v_attended_count FROM public.attendance
    WHERE registration_id = v_reg.id AND status = 'attended';

  IF v_attended_count >= v_member_count THEN
    UPDATE public.registrations SET status = 'attended', updated_at = now() WHERE id = v_reg.id;
  ELSIF v_reg.status = 'attended' THEN
    UPDATE public.registrations SET status = 'confirmed', updated_at = now() WHERE id = v_reg.id;
  END IF;

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
    'all_members_attended', v_attended_count >= v_member_count,
    'checked_in_at', v_checked_at,
    'event_name', v_event.name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_attendance_member_manual(_team_member_id uuid, _event_id uuid, _method attendance_method DEFAULT 'manual'::attendance_method)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token text;
BEGIN
  SELECT qr_token INTO v_token FROM public.team_members WHERE id = _team_member_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found', 'message', 'Team member not found');
  END IF;
  RETURN public.mark_attendance_by_qr(v_token, _event_id, _method);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_attendance_manual(_registration_id uuid, _method attendance_method DEFAULT 'manual'::attendance_method)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reg public.registrations%ROWTYPE;
  v_tm public.team_members%ROWTYPE;
BEGIN
  SELECT * INTO v_reg FROM public.registrations WHERE id = _registration_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found', 'message', 'Registration not found');
  END IF;

  SELECT * INTO v_tm FROM public.team_members
  WHERE team_id = v_reg.team_id AND role = 'leader'
  ORDER BY created_at ASC
  LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO v_tm FROM public.team_members
    WHERE team_id = v_reg.team_id
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found', 'message', 'No team member found for this registration');
  END IF;

  RETURN public.mark_attendance_member_manual(v_tm.id, v_reg.event_id, _method);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.normalize_attendance_qr_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_attendance_qr_token(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.attendance_stats(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_attendance_by_qr(text, uuid, attendance_method) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_attendance_manual(uuid, attendance_method) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_attendance_member_manual(uuid, uuid, attendance_method) TO authenticated, service_role;