
-- Extend attendance table for team-level, registration-aware attendance
ALTER TABLE public.attendance
  ALTER COLUMN participant_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS registration_id uuid REFERENCES public.registrations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'attended',
  ADD COLUMN IF NOT EXISTS remarks text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_status_check'
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_status_check
      CHECK (status IN ('attended','no_show','cancelled','pending'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_registration_unique
  ON public.attendance(registration_id)
  WHERE registration_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS attendance_event_idx ON public.attendance(event_id);
CREATE INDEX IF NOT EXISTS attendance_team_idx ON public.attendance(team_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO anon, authenticated;
GRANT ALL ON public.attendance TO service_role;

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='attendance' AND policyname='attendance_all_access') THEN
    CREATE POLICY attendance_all_access ON public.attendance
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- RPC: mark attendance from QR token
CREATE OR REPLACE FUNCTION public.mark_attendance_by_qr(
  _qr_token text,
  _event_id uuid,
  _method attendance_method DEFAULT 'qr'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg public.registrations%ROWTYPE;
  v_event public.events%ROWTYPE;
  v_team public.teams%ROWTYPE;
  v_leader_pid uuid;
  v_leader_name text;
  v_member_count int;
  v_att_id uuid;
  v_now timestamptz := now();
BEGIN
  IF _qr_token IS NULL OR btrim(_qr_token) = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_qr', 'message', 'Invalid QR Code');
  END IF;

  SELECT * INTO v_reg FROM public.registrations WHERE qr_token = _qr_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found', 'message', 'Registration Not Found');
  END IF;

  IF v_reg.event_id <> _event_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'wrong_event', 'message', 'Wrong Event');
  END IF;

  IF v_reg.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'cancelled', 'message', 'Registration Cancelled');
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = _event_id;
  IF v_event.status = 'completed' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'event_completed', 'message', 'Event already completed');
  END IF;

  IF EXISTS (SELECT 1 FROM public.attendance WHERE registration_id = v_reg.id AND status = 'attended') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_attended', 'message', 'Already Attended');
  END IF;

  SELECT * INTO v_team FROM public.teams WHERE id = v_reg.team_id;
  v_leader_pid := v_team.leader_participant_id;
  SELECT full_name INTO v_leader_name FROM public.participants WHERE id = v_leader_pid;
  SELECT count(*) INTO v_member_count FROM public.team_members WHERE team_id = v_team.id;

  INSERT INTO public.attendance(registration_id, team_id, event_id, participant_id, method, status, checked_in_at)
  VALUES (v_reg.id, v_team.id, v_reg.event_id, v_leader_pid, _method, 'attended', v_now)
  ON CONFLICT (registration_id) WHERE registration_id IS NOT NULL DO UPDATE
    SET status = 'attended', method = EXCLUDED.method, checked_in_at = v_now, updated_at = v_now
  RETURNING id INTO v_att_id;

  UPDATE public.registrations SET status = 'attended' WHERE id = v_reg.id;

  RETURN jsonb_build_object(
    'ok', true,
    'attendance_id', v_att_id,
    'registration_id', v_reg.id,
    'registration_code', v_reg.registration_code,
    'team_id', v_team.id,
    'team_name', v_team.name,
    'leader_name', v_leader_name,
    'member_count', v_member_count,
    'checked_in_at', v_now,
    'event_name', v_event.name
  );
END $$;

-- RPC: manual attendance by registration id
CREATE OR REPLACE FUNCTION public.mark_attendance_manual(
  _registration_id uuid,
  _method attendance_method DEFAULT 'manual'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg public.registrations%ROWTYPE;
BEGIN
  SELECT * INTO v_reg FROM public.registrations WHERE id = _registration_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found', 'message', 'Registration Not Found');
  END IF;
  RETURN public.mark_attendance_by_qr(v_reg.qr_token, v_reg.event_id, _method);
END $$;

-- RPC: attendance stats for dashboard
CREATE OR REPLACE FUNCTION public.attendance_stats(_event_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_attended int;
  v_today int;
BEGIN
  SELECT count(*) INTO v_total FROM public.registrations r
   WHERE (_event_id IS NULL OR r.event_id = _event_id) AND r.status <> 'cancelled';
  SELECT count(*) INTO v_attended FROM public.attendance a
   WHERE a.status = 'attended' AND (_event_id IS NULL OR a.event_id = _event_id);
  SELECT count(*) INTO v_today FROM public.attendance a
   WHERE a.status='attended' AND a.checked_in_at >= date_trunc('day', now())
     AND (_event_id IS NULL OR a.event_id = _event_id);
  RETURN jsonb_build_object(
    'total_registered', v_total,
    'total_attended', v_attended,
    'remaining', GREATEST(0, v_total - v_attended),
    'percentage', CASE WHEN v_total = 0 THEN 0 ELSE round((v_attended::numeric / v_total) * 100, 1) END,
    'today_attendance', v_today
  );
END $$;

GRANT EXECUTE ON FUNCTION public.mark_attendance_by_qr(text, uuid, attendance_method) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_attendance_manual(uuid, attendance_method) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attendance_stats(uuid) TO anon, authenticated;
