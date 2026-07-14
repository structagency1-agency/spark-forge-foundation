/**
 * Analytics service layer — wraps the analytics RPCs added in stage 8.
 * All queries are cached with tight refetch intervals for live dashboards.
 */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsOverview {
  total_events: number;
  upcoming_events: number;
  ongoing_events: number;
  completed_events: number;
  total_teams: number;
  total_participants: number;
  total_registrations: number;
  attended_teams: number;
  evaluated_teams: number;
  certificates_generated: number;
  published_results: number;
  gallery_images: number;
  contact_messages: number;
  unread_messages: number;
  active_announcements: number;
  unread_notifications: number;
}

export interface EventAnalyticsRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  event_date: string | null;
  department: string | null;
  max_participants: number | null;
  registrations: number;
  teams: number;
  attended: number;
  evaluated: number;
  winners: number;
  capacity_used_pct: number;
  attendance_pct: number;
  evaluation_progress_pct: number;
}

export interface DepartmentAnalyticsRow {
  id: string;
  name: string;
  code: string | null;
  registrations: number;
  attended: number;
  qualified: number;
  winners: number;
  participation_pct: number;
}

export interface RegistrationTrends {
  daily: Array<{ day: string; count: number }>;
  weekly: Array<{ week: string; count: number }>;
  monthly: Array<{ month: string; count: number }>;
  by_status: Record<string, number>;
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn as never, (args ?? {}) as never);
  if (error) throw error;
  return (data ?? null) as T;
}

export const analyticsOverviewQO = queryOptions({
  queryKey: ["analytics", "overview"],
  queryFn: () => rpc<AnalyticsOverview>("analytics_overview"),
  staleTime: 15_000,
  refetchInterval: 30_000,
});

export const analyticsByEventQO = queryOptions({
  queryKey: ["analytics", "by_event"],
  queryFn: () => rpc<EventAnalyticsRow[]>("analytics_by_event"),
  staleTime: 30_000,
});

export const analyticsByDepartmentQO = queryOptions({
  queryKey: ["analytics", "by_department"],
  queryFn: () => rpc<DepartmentAnalyticsRow[]>("analytics_by_department"),
  staleTime: 30_000,
});

export const registrationTrendsQO = (days = 30) =>
  queryOptions({
    queryKey: ["analytics", "reg_trends", days],
    queryFn: () => rpc<RegistrationTrends>("registration_trends", { _days: days }),
    staleTime: 60_000,
  });

export const attendanceAnalyticsQO = queryOptions({
  queryKey: ["analytics", "attendance"],
  queryFn: () => rpc<{
    total_attended: number;
    total_registered: number;
    percentage: number;
    by_department: Array<{ department: string; attended: number; registered: number }>;
    by_event: Array<{ event_name: string; attended: number; registered: number }>;
  }>("attendance_analytics"),
  staleTime: 30_000,
});

export const evaluationAnalyticsQO = queryOptions({
  queryKey: ["analytics", "evaluation"],
  queryFn: () => rpc<{
    completed: number;
    pending: number;
    avg_score: number;
    highest_score: number;
    lowest_score: number;
    by_department: Array<{ department: string; avg_score: number | null; evaluated_teams: number }>;
  }>("evaluation_analytics"),
  staleTime: 30_000,
});

export const certificateAnalyticsQO = queryOptions({
  queryKey: ["analytics", "certificates"],
  queryFn: () => rpc<{
    generated: number;
    downloaded: number;
    verified: number;
    by_type: Record<string, number>;
  }>("certificate_analytics"),
  staleTime: 30_000,
});

export const dbHealthQO = queryOptions({
  queryKey: ["analytics", "db_health"],
  queryFn: () => rpc<Record<string, number | string>>("db_health"),
  staleTime: 30_000,
  refetchInterval: 60_000,
});
