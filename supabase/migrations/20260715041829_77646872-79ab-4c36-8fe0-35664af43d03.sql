
CREATE TABLE IF NOT EXISTS public.evaluation_score_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  criterion_id uuid NOT NULL REFERENCES public.evaluation_criteria(id) ON DELETE CASCADE,
  jury_id uuid,
  previous_marks numeric,
  new_marks numeric,
  reason text NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.evaluation_score_changes TO authenticated;
GRANT ALL ON public.evaluation_score_changes TO service_role;
ALTER TABLE public.evaluation_score_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage score changes" ON public.evaluation_score_changes;
CREATE POLICY "Admins manage score changes" ON public.evaluation_score_changes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Jury insert own score changes" ON public.evaluation_score_changes;
CREATE POLICY "Jury insert own score changes" ON public.evaluation_score_changes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.evaluations e
            JOIN public.jury_members m ON m.id = e.jury_id
            WHERE e.id = evaluation_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Jury reads own score changes" ON public.evaluation_score_changes;
CREATE POLICY "Jury reads own score changes" ON public.evaluation_score_changes
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.evaluations e
            JOIN public.jury_members m ON m.id = e.jury_id
            WHERE e.id = evaluation_id AND m.user_id = auth.uid())
  );

-- Rewrite save_evaluation_score to accept a reason and enforce it after submission
DROP FUNCTION IF EXISTS public.save_evaluation_score(uuid, uuid, numeric, text);
CREATE OR REPLACE FUNCTION public.save_evaluation_score(
  _evaluation_id uuid,
  _criterion_id uuid,
  _marks numeric,
  _remarks text DEFAULT NULL,
  _reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_max numeric;
  v_eval public.evaluations%ROWTYPE;
  v_prev numeric;
BEGIN
  SELECT * INTO v_eval FROM public.evaluations WHERE id = _evaluation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'evaluation_not_found'; END IF;
  IF v_eval.is_locked THEN RAISE EXCEPTION 'evaluation_locked'; END IF;

  SELECT max_marks INTO v_max FROM public.evaluation_criteria WHERE id = _criterion_id AND status = 'active';
  IF v_max IS NULL THEN RAISE EXCEPTION 'criterion_inactive_or_missing'; END IF;
  IF _marks < 0 THEN RAISE EXCEPTION 'negative_marks_not_allowed'; END IF;
  IF _marks > v_max THEN RAISE EXCEPTION 'marks_exceed_maximum'; END IF;

  -- If evaluation is already submitted (completed/published), require a reason
  IF v_eval.status IN ('completed','published') THEN
    IF _reason IS NULL OR length(btrim(_reason)) < 3 THEN
      RAISE EXCEPTION 'reason_required_for_change_after_submission';
    END IF;
    SELECT marks INTO v_prev FROM public.evaluation_scores
      WHERE evaluation_id = _evaluation_id AND criterion_id = _criterion_id;
    INSERT INTO public.evaluation_score_changes(evaluation_id, criterion_id, jury_id, previous_marks, new_marks, reason, changed_by)
    VALUES (_evaluation_id, _criterion_id, v_eval.jury_id, v_prev, _marks, btrim(_reason), auth.uid());
  END IF;

  INSERT INTO public.evaluation_scores(evaluation_id, criterion_id, marks, remarks)
  VALUES (_evaluation_id, _criterion_id, _marks, _remarks)
  ON CONFLICT (evaluation_id, criterion_id) DO UPDATE
    SET marks = EXCLUDED.marks, remarks = EXCLUDED.remarks, updated_at = now();

  PERFORM public.recompute_evaluation_totals(_evaluation_id);
  RETURN jsonb_build_object('ok', true);
END $$;

GRANT EXECUTE ON FUNCTION public.save_evaluation_score(uuid, uuid, numeric, text, text) TO authenticated;
