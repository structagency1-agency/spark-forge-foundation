/**
 * Evaluation service layer — jury management, assignments, criteria, scoring,
 * leaderboard, and dashboard stats. All mutations flow through supabase RPCs
 * defined in the jury-evaluation migration.
 */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  JuryMember,
  JuryEventAssignment,
  JuryTeamAssignment,
  EvaluationCriterion,
  Evaluation,
  EvaluationScore,
} from "@/models/db";

export interface EvaluationStats {
  total_events: number;
  events_under_evaluation: number;
  total_jury: number;
  active_jury: number;
  assigned_jury: number;
  total_team_assignments: number;
  evaluated_teams: number;
  pending_evaluations: number;
  completed_evaluations: number;
  avg_score: number;
  progress_pct: number;
}

export interface LeaderboardRow {
  event_id: string;
  team_id: string;
  team_name: string;
  event_name: string;
  department_id: string | null;
  department_name: string | null;
  registration_code: string | null;
  registered_at: string | null;
  jury_total: number;
  jury_completed: number;
  avg_score: number | null;
  high_score: number | null;
  low_score: number | null;
  avg_percentage: number | null;
  avg_innovation: number | null;
  avg_impact: number | null;
  overall_rank: number;
  department_rank: number;
}

// ---------- Stats ----------
export const evaluationStatsQueryOptions = (eventId: string | null) =>
  queryOptions({
    queryKey: ["admin", "evaluation", "stats", eventId],
    queryFn: async (): Promise<EvaluationStats> => {
      const { data, error } = await supabase.rpc("evaluation_stats", {
        _event_id: eventId,
      } as never);
      if (error) throw error;
      return (data ?? {}) as unknown as EvaluationStats;
    },
    staleTime: 10_000,
  });

// ---------- Jury members ----------
export const juryMembersQueryOptions = queryOptions({
  queryKey: ["admin", "evaluation", "jury_members"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("jury_members")
      .select("*")
      .order("full_name");
    if (error) throw error;
    return (data ?? []) as JuryMember[];
  },
});

// ---------- Criteria ----------
export const criteriaQueryOptions = queryOptions({
  queryKey: ["admin", "evaluation", "criteria"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("evaluation_criteria")
      .select("*")
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as EvaluationCriterion[];
  },
});

// ---------- Events (slim) ----------
export const evaluationEventsQueryOptions = queryOptions({
  queryKey: ["admin", "evaluation", "events"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("events")
      .select("id, name, slug, department_id, event_date, status, is_archived, departments(name)")
      .eq("is_archived", false)
      .order("event_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

// ---------- Jury ↔ Event assignments ----------
export const juryEventAssignmentsQueryOptions = (eventId: string | null) =>
  queryOptions({
    queryKey: ["admin", "evaluation", "jury_event_assignments", eventId],
    queryFn: async () => {
      let q = supabase
        .from("jury_event_assignments")
        .select("*, jury_members(*), events(id, name, department_id, departments(name))")
        .order("created_at", { ascending: false });
      if (eventId) q = q.eq("event_id", eventId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as (JuryEventAssignment & {
        jury_members: JuryMember | null;
        events: {
          id: string;
          name: string;
          department_id: string | null;
          departments: { name: string } | null;
        } | null;
      })[];
    },
  });

// ---------- Jury ↔ Team assignments ----------
export const juryTeamAssignmentsQueryOptions = (eventId: string | null) =>
  queryOptions({
    queryKey: ["admin", "evaluation", "jury_team_assignments", eventId],
    queryFn: async () => {
      let q = supabase
        .from("jury_team_assignments")
        .select(
          "*, jury_members(id, full_name, email), teams(id, name, department_id, departments(name)), events(id, name), registrations(id, registration_code, status)",
        )
        .order("created_at", { ascending: false });
      if (eventId) q = q.eq("event_id", eventId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as (JuryTeamAssignment & {
        jury_members: { id: string; full_name: string; email: string } | null;
        teams: {
          id: string;
          name: string;
          department_id: string | null;
          departments: { name: string } | null;
        } | null;
        events: { id: string; name: string } | null;
        registrations: { id: string; registration_code: string | null; status: string } | null;
      })[];
    },
  });

// ---------- Attended registrations for an event (for team assignment) ----------
export const attendedRegistrationsQueryOptions = (eventId: string | null) =>
  queryOptions({
    queryKey: ["admin", "evaluation", "attended_regs", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from("registrations")
        .select(
          "id, registration_code, status, event_id, teams(id, name, department_id, departments(name), team_members(role, participants(full_name, email)))",
        )
        .eq("event_id", eventId)
        .in("status", ["attended", "evaluated", "completed"]);
      if (error) throw error;
      return data ?? [];
    },
  });

// ---------- Evaluations list (with scores) ----------
export const evaluationsQueryOptions = (eventId: string | null) =>
  queryOptions({
    queryKey: ["admin", "evaluation", "evaluations", eventId],
    queryFn: async () => {
      let q = supabase
        .from("evaluations")
        .select(
          "*, jury_members(id, full_name, email), teams(id, name, department_id, departments(name)), events(id, name), evaluation_scores(id, criterion_id, marks, remarks)",
        )
        .order("updated_at", { ascending: false });
      if (eventId) q = q.eq("event_id", eventId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as (Evaluation & {
        jury_members: { id: string; full_name: string; email: string } | null;
        teams: {
          id: string;
          name: string;
          department_id: string | null;
          departments: { name: string } | null;
        } | null;
        events: { id: string; name: string } | null;
        evaluation_scores: Pick<EvaluationScore, "id" | "criterion_id" | "marks" | "remarks">[];
      })[];
    },
  });

// ---------- Leaderboard ----------
export const leaderboardQueryOptions = (eventId: string | null) =>
  queryOptions({
    queryKey: ["admin", "evaluation", "leaderboard", eventId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("event_leaderboard", {
        _event_id: eventId,
      } as never);
      if (error) throw error;
      return (data ?? []) as unknown as LeaderboardRow[];
    },
    staleTime: 10_000,
  });

// ---------- Mutations ----------
export async function upsertEvaluation(input: {
  jury_id: string;
  team_id: string;
  event_id: string;
  round?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("upsert_evaluation", {
    _jury_id: input.jury_id,
    _team_id: input.team_id,
    _event_id: input.event_id,
    _round: input.round ?? "main",
  } as never);
  if (error) throw error;
  return data as unknown as string;
}

export async function saveEvaluationScore(input: {
  evaluation_id: string;
  criterion_id: string;
  marks: number;
  remarks?: string | null;
}) {
  const { error } = await supabase.rpc("save_evaluation_score", {
    _evaluation_id: input.evaluation_id,
    _criterion_id: input.criterion_id,
    _marks: input.marks,
    _remarks: input.remarks ?? null,
  } as never);
  if (error) throw error;
}

export async function submitEvaluation(input: {
  evaluation_id: string;
  comments?: string | null;
  recommendation?: string | null;
}) {
  const { error } = await supabase.rpc("submit_evaluation", {
    _evaluation_id: input.evaluation_id,
    _comments: input.comments ?? null,
    _recommendation: input.recommendation ?? null,
  } as never);
  if (error) throw error;
}

export async function setEvaluationLock(evaluation_id: string, locked: boolean, reason?: string) {
  const { error } = await supabase.rpc("set_evaluation_lock", {
    _evaluation_id: evaluation_id,
    _locked: locked,
    _reason: reason ?? null,
  } as never);
  if (error) throw error;
}

export async function autoAssignTeams(event_id: string) {
  const { data, error } = await supabase.rpc("auto_assign_teams", {
    _event_id: event_id,
  } as never);
  if (error) throw error;
  return data as unknown as { ok: boolean; assigned: number; jury_count: number };
}

export async function publishEventEvaluations(event_id: string, publish: boolean) {
  const { error } = await supabase.rpc("publish_event_evaluations", {
    _event_id: event_id,
    _publish: publish,
  } as never);
  if (error) throw error;
}
