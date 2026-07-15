
-- 1. Sub-tracks on events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS sub_tracks text[] NOT NULL DEFAULT ARRAY['software','hardware']::text[];

-- 2. Evaluation score-change audit log
CREATE TABLE IF NOT EXISTS public.evaluation_score_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  criterion_id uuid NOT NULL REFERENCES public.evaluation_criteria(id) ON DELETE CASCADE,
  old_marks numeric,
  new_marks numeric NOT NULL,
  reason text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.evaluation_score_changes TO authenticated;
GRANT ALL ON public.evaluation_score_changes TO service_role;

ALTER TABLE public.evaluation_score_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all score changes" ON public.evaluation_score_changes;
CREATE POLICY "Admins can view all score changes" ON public.evaluation_score_changes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'iedc_admin'));

DROP POLICY IF EXISTS "Jury can insert their own score changes" ON public.evaluation_score_changes;
CREATE POLICY "Jury can insert their own score changes" ON public.evaluation_score_changes
  FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());

DROP POLICY IF EXISTS "Jury can view their own score changes" ON public.evaluation_score_changes;
CREATE POLICY "Jury can view their own score changes" ON public.evaluation_score_changes
  FOR SELECT TO authenticated
  USING (changed_by = auth.uid());

-- 3. Updated save_evaluation_score with reason (required after first submit)
CREATE OR REPLACE FUNCTION public.save_evaluation_score(
  _evaluation_id uuid,
  _criterion_id uuid,
  _marks numeric,
  _remarks text DEFAULT NULL,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_max numeric;
  v_eval public.evaluations%ROWTYPE;
  v_prev numeric;
  v_submitted boolean;
BEGIN
  SELECT * INTO v_eval FROM public.evaluations WHERE id = _evaluation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'evaluation_not_found'; END IF;
  IF v_eval.is_locked THEN RAISE EXCEPTION 'evaluation_locked'; END IF;

  SELECT max_marks INTO v_max FROM public.evaluation_criteria WHERE id = _criterion_id AND status = 'active';
  IF v_max IS NULL THEN RAISE EXCEPTION 'criterion_inactive_or_missing'; END IF;
  IF _marks < 0 THEN RAISE EXCEPTION 'negative_marks_not_allowed'; END IF;
  IF _marks > v_max THEN RAISE EXCEPTION 'marks_exceed_maximum'; END IF;

  v_submitted := v_eval.submitted_at IS NOT NULL;
  SELECT marks INTO v_prev FROM public.evaluation_scores
    WHERE evaluation_id = _evaluation_id AND criterion_id = _criterion_id;

  IF v_submitted AND v_prev IS NOT NULL AND v_prev <> _marks
     AND (_reason IS NULL OR length(btrim(_reason)) < 3) THEN
    RAISE EXCEPTION 'reason_required_after_submission';
  END IF;

  INSERT INTO public.evaluation_scores(evaluation_id, criterion_id, marks, remarks)
  VALUES (_evaluation_id, _criterion_id, _marks, _remarks)
  ON CONFLICT (evaluation_id, criterion_id) DO UPDATE
    SET marks = EXCLUDED.marks, remarks = EXCLUDED.remarks, updated_at = now();

  IF v_submitted AND v_prev IS NOT NULL AND v_prev <> _marks THEN
    INSERT INTO public.evaluation_score_changes(evaluation_id, criterion_id, old_marks, new_marks, reason, changed_by)
    VALUES (_evaluation_id, _criterion_id, v_prev, _marks, btrim(_reason), auth.uid());
  END IF;

  PERFORM public.recompute_evaluation_totals(_evaluation_id);
  RETURN jsonb_build_object('ok', true);
END $function$;

-- 4. Stop auto-granting participant role
CREATE OR REPLACE FUNCTION public.grant_roles_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(NEW.email) = 'admin@ecellvitb.in' THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM public.jury_members WHERE lower(email) = lower(NEW.email)) THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'jury')
      ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.jury_members SET user_id = NEW.id
      WHERE lower(email) = lower(NEW.email) AND user_id IS NULL;
  END IF;

  RETURN NEW;
END $function$;

-- 5. Remove existing participant roles (no participant login anymore)
DELETE FROM public.user_roles WHERE role = 'participant';

-- 6. Jury read access to teams / registrations / team_members for their assigned events
DROP POLICY IF EXISTS "Jury can view teams in their events" ON public.teams;
CREATE POLICY "Jury can view teams in their events" ON public.teams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jury_event_assignments jea
      JOIN public.jury_members jm ON jm.id = jea.jury_id
      WHERE jea.event_id = teams.event_id AND jm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Jury can view registrations in their events" ON public.registrations;
CREATE POLICY "Jury can view registrations in their events" ON public.registrations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jury_event_assignments jea
      JOIN public.jury_members jm ON jm.id = jea.jury_id
      WHERE jea.event_id = registrations.event_id AND jm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Jury can view team members in their events" ON public.team_members;
CREATE POLICY "Jury can view team members in their events" ON public.team_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      JOIN public.jury_event_assignments jea ON jea.event_id = r.event_id
      JOIN public.jury_members jm ON jm.id = jea.jury_id
      WHERE r.team_id = team_members.team_id AND jm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Jury can view participants in their events" ON public.participants;
CREATE POLICY "Jury can view participants in their events" ON public.participants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.registrations r ON r.team_id = tm.team_id
      JOIN public.jury_event_assignments jea ON jea.event_id = r.event_id
      JOIN public.jury_members jm ON jm.id = jea.jury_id
      WHERE tm.participant_id = participants.id AND jm.user_id = auth.uid()
    )
  );

-- 7. Public results per registration (for /my-registration lookup) — respects published state
CREATE OR REPLACE FUNCTION public.registration_scorecard(_registration_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'published', COALESCE(r.status = 'published', false),
    'total_score', s.total_score,
    'percentage', s.percentage,
    'overall_rank', s.overall_rank,
    'department_rank', s.department_rank,
    'criteria', s.snapshot->'criteria',
    'event_name', s.snapshot->>'event_name',
    'team_name', s.snapshot->>'team_name'
  )
  FROM public.registrations reg
  LEFT JOIN public.scorecards s ON s.registration_id = reg.id
  LEFT JOIN public.results r ON r.event_id = reg.event_id
  WHERE reg.registration_code = _registration_code
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.registration_scorecard(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_evaluation_score(uuid,uuid,numeric,text,text) TO authenticated;
