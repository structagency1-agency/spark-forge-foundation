CREATE POLICY "E-Cell can view assigned event registrations"
ON public.registrations
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'ecell_member'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.ecell_event_assignments eea
    WHERE eea.user_id = auth.uid()
      AND eea.event_id = registrations.event_id
  )
);

CREATE POLICY "E-Cell can view assigned event teams"
ON public.teams
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'ecell_member'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.ecell_event_assignments eea
    WHERE eea.user_id = auth.uid()
      AND eea.event_id = teams.event_id
  )
);

CREATE POLICY "E-Cell can view assigned event team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'ecell_member'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.teams t
    JOIN public.ecell_event_assignments eea ON eea.event_id = t.event_id
    WHERE t.id = team_members.team_id
      AND eea.user_id = auth.uid()
  )
);

CREATE POLICY "E-Cell can view assigned event participants"
ON public.participants
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'ecell_member'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    JOIN public.ecell_event_assignments eea ON eea.event_id = t.event_id
    WHERE tm.participant_id = participants.id
      AND eea.user_id = auth.uid()
  )
);

CREATE POLICY "E-Cell can view assigned event attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'ecell_member'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.ecell_event_assignments eea
    WHERE eea.user_id = auth.uid()
      AND eea.event_id = attendance.event_id
  )
);