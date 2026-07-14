/**
 * Admin service layer: dashboard stats, audit logging, and shared helpers
 * consumed across every admin module. All mutations write an audit log entry.
 *
 * Auth-gating is intentionally absent for stage 4 — future stage 5 will replace
 * these permissive policies with role checks and this layer with server fns.
 */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AuditLog } from "@/models/db";

export interface AdminStats {
  total_events: number;
  upcoming_events: number;
  ongoing_events: number;
  completed_events: number;
  total_teams: number;
  total_participants: number;
  total_registrations: number;
  today_registrations: number;
  remaining_capacity: number;
  gallery_images: number;
  problem_statements: number;
  contact_messages: number;
  unread_messages: number;
}

async function fetchAdminStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc("admin_stats");
  if (error) throw error;
  return (data ?? {}) as unknown as AdminStats;
}

export const adminStatsQueryOptions = queryOptions({
  queryKey: ["admin", "stats"],
  queryFn: fetchAdminStats,
  staleTime: 15_000,
  refetchInterval: 30_000,
});

// -------- Audit logs --------

export async function writeAuditLog(input: {
  action: string;
  module: string;
  description?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    action: input.action,
    module: input.module,
    description: input.description ?? null,
    metadata: (input.metadata ?? {}) as never,
    actor_label: "admin",
  });
  if (error) {
    // Non-fatal — log but don't break the caller.
    console.warn("audit log failed", error);
  }
}

async function fetchAuditLogs(limit = 200): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AuditLog[];
}

export const auditLogsQueryOptions = (limit = 200) =>
  queryOptions({
    queryKey: ["admin", "audit_logs", limit],
    queryFn: () => fetchAuditLogs(limit),
    staleTime: 10_000,
  });

// -------- Recent activity for the dashboard --------

export const recentRegistrationsQueryOptions = queryOptions({
  queryKey: ["admin", "recent_registrations"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("registrations")
      .select(
        "id, registration_code, registered_at, status, email_status, events(name, slug), teams(name)",
      )
      .order("registered_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return data ?? [];
  },
  staleTime: 30_000,
});

export const recentContactMessagesQueryOptions = queryOptions({
  queryKey: ["admin", "recent_contact_messages"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return data ?? [];
  },
  staleTime: 30_000,
});

export const recentAuditLogsQueryOptions = queryOptions({
  queryKey: ["admin", "recent_audit"],
  queryFn: () => fetchAuditLogs(15),
  staleTime: 15_000,
});
