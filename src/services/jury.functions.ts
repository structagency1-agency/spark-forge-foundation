import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ensureJuryMemberForUser } from "@/services/jury-admin.server";

export interface JuryPortalMember {
  id: string;
  full_name: string;
  email: string;
  status: string;
  user_id: string | null;
}

export interface JuryPortalEvent {
  id: string;
  name: string;
  sub_tracks: string[];
  assigned_tracks: string[];
}

export interface JuryPortalTeam {
  id: string;
  registration_id: string;
  team_id: string;
  event_id: string;
  registration_code: string | null;
  project_track: string | null;
  team_name: string;
  department_name: string;
  status: string;
  evaluation_id: string | null;
}

export const getJuryPortalData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        eventId: z.string().uuid().nullable().optional(),
        track: z.string().nullable().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { data: roleRows, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleError) throw roleError;

    const roles = new Set((roleRows ?? []).map((r: { role: string }) => r.role));
    if (!roles.has("jury") && !roles.has("admin")) {
      throw new Response("Forbidden", { status: 403 });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let tokenEmail = typeof context.claims.email === "string" ? context.claims.email.toLowerCase() : "";
    if (!tokenEmail) {
      const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      if (authUserError) throw authUserError;
      tokenEmail = authUser.user?.email?.toLowerCase() ?? "";
    }

    const juryMember = await ensureJuryMemberForUser(supabaseAdmin, {
      userId: context.userId,
      email: tokenEmail,
    });

    if (!juryMember) {
      return { juryMember: null, events: [] as JuryPortalEvent[], teams: [] as JuryPortalTeam[] };
    }

    const normalizeTrack = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";
    const defaultTracks = ["software", "hardware"];

    const { data: assignmentRows, error: assignmentError } = await supabaseAdmin
      .from("jury_event_assignments")
      .select("id, event_id, track, department_id, events(id, name, sub_tracks)")
      .eq("jury_id", juryMember.id);
    if (assignmentError) throw assignmentError;

    const eventMap = new Map<
      string,
      { id: string; name: string; sub_tracks: string[]; all_tracks: boolean; assigned_tracks: Set<string> }
    >();

    for (const row of (assignmentRows ?? []) as Array<{
      event_id: string;
      track: string | null;
      department_id: string | null;
      events: { id: string; name: string; sub_tracks: string[] | null } | null;
    }>) {
      const ev = row.events;
      if (!ev) continue;
      const current = eventMap.get(ev.id) ?? {
        id: ev.id,
        name: ev.name,
        sub_tracks: ev.sub_tracks?.length ? ev.sub_tracks : defaultTracks,
        all_tracks: false,
        assigned_tracks: new Set<string>(),
      };
      const assignedTrack = normalizeTrack(row.track);
      if (assignedTrack) current.assigned_tracks.add(assignedTrack);
      else current.all_tracks = true;
      eventMap.set(ev.id, current);
    }

    const events: JuryPortalEvent[] = Array.from(eventMap.values()).map((ev) => ({
      id: ev.id,
      name: ev.name,
      sub_tracks: ev.sub_tracks,
      assigned_tracks: ev.all_tracks ? ev.sub_tracks : Array.from(ev.assigned_tracks),
    }));

    if (!data.eventId || !eventMap.has(data.eventId)) {
      return { juryMember, events, teams: [] as JuryPortalTeam[] };
    }

    const wantedTrack = normalizeTrack(data.track);
    const eventAssignments = ((assignmentRows ?? []) as Array<{
      event_id: string;
      track: string | null;
      department_id: string | null;
    }>).filter((row) => row.event_id === data.eventId);

    const eligibleAssignments = eventAssignments.filter((row) => {
      const assignedTrack = normalizeTrack(row.track);
      return !wantedTrack || !assignedTrack || assignedTrack === wantedTrack;
    });

    if (eligibleAssignments.length === 0) {
      return { juryMember, events, teams: [] as JuryPortalTeam[] };
    }

    const { data: registrationRows, error: registrationError } = await supabaseAdmin
      .from("registrations")
      .select(
        "id, registration_code, project_track, team_id, event_id, status, teams(id, name, department_id, departments(name))",
      )
      .eq("event_id", data.eventId)
      .neq("status", "cancelled")
      .order("registered_at", { ascending: true });
    if (registrationError) throw registrationError;

    const { data: evaluationRows, error: evaluationError } = await supabaseAdmin
      .from("evaluations")
      .select("id, team_id, status")
      .eq("jury_id", juryMember.id)
      .eq("event_id", data.eventId);
    if (evaluationError) throw evaluationError;

    const evaluationByTeam = new Map<string, { id: string; status: string }>();
    for (const evaluation of (evaluationRows ?? []) as Array<{ id: string; team_id: string; status: string }>) {
      evaluationByTeam.set(evaluation.team_id, { id: evaluation.id, status: evaluation.status });
    }

    const teams = ((registrationRows ?? []) as Array<{
      id: string;
      registration_code: string | null;
      project_track: string | null;
      team_id: string;
      event_id: string;
      teams: { id: string; name: string; department_id: string | null; departments: { name: string } | null } | null;
    }>)
      .filter((row) => {
        const regTrack = normalizeTrack(row.project_track);
        if (wantedTrack && regTrack !== wantedTrack) return false;
        return eligibleAssignments.some((assignment) => {
          const assignedTrack = normalizeTrack(assignment.track);
          const trackMatches = !assignedTrack || assignedTrack === regTrack;
          const departmentMatches = !assignment.department_id || row.teams?.department_id === assignment.department_id;
          return trackMatches && departmentMatches;
        });
      })
      .map((row): JuryPortalTeam => {
        const evaluation = evaluationByTeam.get(row.team_id);
        return {
          id: row.id,
          registration_id: row.id,
          team_id: row.team_id,
          event_id: row.event_id,
          registration_code: row.registration_code,
          project_track: row.project_track,
          team_name: row.teams?.name ?? "—",
          department_name: row.teams?.departments?.name ?? "—",
          status: evaluation?.status ?? "pending",
          evaluation_id: evaluation?.id ?? null,
        };
      });

    return { juryMember, events, teams };
  });