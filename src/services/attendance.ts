/**
 * Attendance service — queries, RPCs, CSV export helpers.
 */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AttendanceStats {
  total_registered: number;
  total_attended: number;
  remaining: number;
  percentage: number;
  today_attendance: number;
}

export const attendanceStatsQueryOptions = (eventId: string | null) =>
  queryOptions({
    queryKey: ["admin", "attendance", "stats", eventId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("attendance_stats", {
        _event_id: eventId ?? undefined,
      });
      if (error) throw error;
      return (data ?? {}) as unknown as AttendanceStats;
    },
    staleTime: 5_000,
    refetchInterval: 15_000,
  });

export type AttendanceRow = {
  id: string;
  registration_id: string | null;
  team_id: string | null;
  event_id: string;
  method: "qr" | "manual" | "import";
  status: string;
  checked_in_at: string;
  remarks: string | null;
  registrations: {
    id: string;
    registration_code: string | null;
    qr_token: string | null;
    status: string;
  } | null;
  teams: {
    id: string;
    name: string;
    department_id: string | null;
    departments: { name: string } | null;
    team_members: Array<{
      role: string | null;
      participants: { full_name: string; email: string } | null;
    }>;
  } | null;
  events: { id: string; name: string; slug: string } | null;
};

export const attendanceLogsQueryOptions = (eventId: string | null) =>
  queryOptions({
    queryKey: ["admin", "attendance", "logs", eventId],
    queryFn: async () => {
      let q = supabase
        .from("attendance")
        .select(
          "id, registration_id, team_id, event_id, method, status, checked_in_at, remarks, registrations(id, registration_code, qr_token, status), teams(id, name, department_id, departments(name), team_members(role, participants(full_name, email))), events(id, name, slug)",
        )
        .order("checked_in_at", { ascending: false })
        .limit(500);
      if (eventId) q = q.eq("event_id", eventId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AttendanceRow[];
    },
    staleTime: 5_000,
    refetchInterval: 15_000,
  });

export type EventRegistrationRow = {
  id: string;
  registration_code: string | null;
  status: string;
  qr_token: string | null;
  registered_at: string;
  event_id: string;
  teams: {
    id: string;
    name: string;
    departments: { id: string; name: string } | null;
    team_members: Array<{
      role: string | null;
      participants: { full_name: string; email: string; phone: string | null } | null;
    }>;
  } | null;
};

export const eventRegistrationsQueryOptions = (eventId: string | null) =>
  queryOptions({
    queryKey: ["admin", "attendance", "event-registrations", eventId],
    queryFn: async () => {
      if (!eventId) return [] as EventRegistrationRow[];
      const { data, error } = await supabase
        .from("registrations")
        .select(
          "id, registration_code, status, qr_token, registered_at, event_id, teams(id, name, departments(id, name), team_members(role, participants(full_name, email, phone)))",
        )
        .eq("event_id", eventId)
        .order("registered_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EventRegistrationRow[];
    },
    staleTime: 5_000,
  });

export const attendanceEventsQueryOptions = queryOptions({
  queryKey: ["admin", "attendance", "events"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("events")
      .select(
        "id, name, slug, venue, event_date, status, departments(id, name)",
      )
      .order("event_date", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

function extractQrToken(scannedValue: string) {
  const value = scannedValue.trim();
  if (!value) return value;

  try {
    const payload = JSON.parse(value) as { t?: unknown; qr_token?: unknown };
    const token = typeof payload.t === "string" ? payload.t : payload.qr_token;
    if (typeof token === "string" && token.trim()) return token.trim();
  } catch {
    // Existing/manual QR values may already be the raw token.
  }

  return value;
}

export async function markAttendanceByQr(qrToken: string, eventId: string) {
  const normalizedToken = extractQrToken(qrToken);
  const { data, error } = await supabase.rpc("mark_attendance_by_qr", {
    _qr_token: normalizedToken,
    _event_id: eventId,
    _method: "qr",
  });
  if (error) throw error;
  return data as unknown as {
    ok: boolean;
    reason?: string;
    message?: string;
    attendance_id?: string;
    registration_code?: string;
    team_name?: string;
    leader_name?: string;
    member_count?: number;
    checked_in_at?: string;
    event_name?: string;
  };
}

export async function markAttendanceManual(registrationId: string) {
  const { data, error } = await supabase.rpc("mark_attendance_manual", {
    _registration_id: registrationId,
    _method: "manual",
  });
  if (error) throw error;
  return data as unknown as ReturnType<typeof markAttendanceByQr> extends Promise<infer R> ? R : never;
}
