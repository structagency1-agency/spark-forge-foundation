
-- Helper: is current user a jury member?
CREATE OR REPLACE FUNCTION public.is_jury_of_team(_team_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jury_team_assignments a
    JOIN public.jury_members m ON m.id = a.jury_id
    WHERE a.team_id = _team_id
      AND a.event_id = _event_id
      AND m.user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.current_jury_member_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.jury_members WHERE user_id = auth.uid() LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.is_jury_of_team(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_jury_member_id() TO authenticated;

-- Criteria: jurors can read
CREATE POLICY "Jury can read criteria" ON public.evaluation_criteria
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'jury'::app_role));

-- Events: jurors can read all events (needed for scope selector + joins)
CREATE POLICY "Jury can read events" ON public.events
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'jury'::app_role));

-- Teams: jurors can read teams assigned to them
CREATE POLICY "Jury can read assigned teams" ON public.teams
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'jury'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.jury_team_assignments a
      JOIN public.jury_members m ON m.id = a.jury_id
      WHERE a.team_id = teams.id AND m.user_id = auth.uid()
    )
  );

-- Registrations: jurors can read registrations for their assigned teams
CREATE POLICY "Jury can read assigned registrations" ON public.registrations
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'jury'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.jury_team_assignments a
      JOIN public.jury_members m ON m.id = a.jury_id
      WHERE a.team_id = registrations.team_id AND m.user_id = auth.uid()
    )
  );

-- Jury members: allow jurors to read basic info (for join display)
CREATE POLICY "Jury can read jury members list" ON public.jury_members
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'jury'::app_role));

-- Evaluations: jurors can read/create/update their own
CREATE POLICY "Jury can read own evaluations" ON public.evaluations
  FOR SELECT TO authenticated
  USING (jury_id = public.current_jury_member_id());

CREATE POLICY "Jury can insert own evaluations" ON public.evaluations
  FOR INSERT TO authenticated
  WITH CHECK (jury_id = public.current_jury_member_id());

CREATE POLICY "Jury can update own evaluations" ON public.evaluations
  FOR UPDATE TO authenticated
  USING (jury_id = public.current_jury_member_id())
  WITH CHECK (jury_id = public.current_jury_member_id());

-- Evaluation scores: jurors can manage scores tied to their evaluations
CREATE POLICY "Jury can read own scores" ON public.evaluation_scores
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.evaluations e
    WHERE e.id = evaluation_scores.evaluation_id
      AND e.jury_id = public.current_jury_member_id()
  ));

CREATE POLICY "Jury can insert own scores" ON public.evaluation_scores
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.evaluations e
    WHERE e.id = evaluation_scores.evaluation_id
      AND e.jury_id = public.current_jury_member_id()
  ));

CREATE POLICY "Jury can update own scores" ON public.evaluation_scores
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.evaluations e
    WHERE e.id = evaluation_scores.evaluation_id
      AND e.jury_id = public.current_jury_member_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.evaluations e
    WHERE e.id = evaluation_scores.evaluation_id
      AND e.jury_id = public.current_jury_member_id()
  ));
