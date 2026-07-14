/**
 * Report generation service — fetches raw rows for each entity and produces
 * flat, export-ready row sets consumable by CSV / Excel / PDF exporters.
 * All queries respect optional filters (event, department, date range, status).
 */
import { supabase } from "@/integrations/supabase/client";
import type { ExportRow } from "@/lib/exporters";

export type ReportKind =
  | "events"
  | "registrations"
  | "attendance"
  | "evaluations"
  | "results"
  | "winners"
  | "certificates"
  | "gallery"
  | "contact_messages";

export interface ReportFilters {
  event_id?: string | null;
  department_id?: string | null;
  from?: string | null; // ISO date
  to?: string | null;
  registration_status?: string | null;
  attendance_status?: string | null;
  evaluation_status?: string | null;
}

const iso = (d?: string | null) => (d ? new Date(d).toISOString() : null);

export async function buildReport(kind: ReportKind, filters: ReportFilters = {}): Promise<ExportRow[]> {
  const from = iso(filters.from);
  const to = iso(filters.to);

  switch (kind) {
    case "events": {
      let q = supabase.from("events").select("id, name, slug, status, event_date, venue, max_participants, department_id, departments(name)");
      if (filters.department_id) q = q.eq("department_id", filters.department_id);
      if (from) q = q.gte("event_date", from);
      if (to) q = q.lte("event_date", to);
      const { data, error } = await q.order("event_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        name: e.name as string,
        slug: e.slug as string,
        status: e.status as string,
        event_date: e.event_date as string | null,
        venue: (e.venue as string | null) ?? "",
        department: ((e.departments as { name?: string } | null)?.name) ?? "",
        max_participants: (e.max_participants as number | null) ?? 0,
      }));
    }
    case "registrations": {
      let q = supabase.from("registrations").select("id, registration_code, status, email_status, registered_at, event_id, events(name), teams(name, academic_year, departments(name))");
      if (filters.event_id) q = q.eq("event_id", filters.event_id);
      if (filters.registration_status) q = q.eq("status", filters.registration_status as never);
      if (from) q = q.gte("registered_at", from);
      if (to) q = q.lte("registered_at", to);
      const { data, error } = await q.order("registered_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        registration_code: r.registration_code as string,
        team: (r.teams as { name?: string } | null)?.name ?? "",
        event: (r.events as { name?: string } | null)?.name ?? "",
        department: (r.teams as { departments?: { name?: string } | null } | null)?.departments?.name ?? "",
        academic_year: (r.teams as { academic_year?: string | null } | null)?.academic_year ?? "",
        status: r.status as string,
        email_status: r.email_status as string,
        registered_at: r.registered_at as string,
      }));
    }
    case "attendance": {
      let q = supabase.from("attendance").select("id, status, method, checked_in_at, event_id, events(name), teams(name, departments(name)), registrations(registration_code)");
      if (filters.event_id) q = q.eq("event_id", filters.event_id);
      if (filters.attendance_status) q = q.eq("status", filters.attendance_status as never);
      if (from) q = q.gte("checked_in_at", from);
      if (to) q = q.lte("checked_in_at", to);
      const { data, error } = await q.order("checked_in_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((a: Record<string, unknown>) => ({
        registration_code: (a.registrations as { registration_code?: string } | null)?.registration_code ?? "",
        team: (a.teams as { name?: string } | null)?.name ?? "",
        department: (a.teams as { departments?: { name?: string } | null } | null)?.departments?.name ?? "",
        event: (a.events as { name?: string } | null)?.name ?? "",
        status: a.status as string,
        method: a.method as string,
        checked_in_at: (a.checked_in_at as string | null) ?? "",
      }));
    }
    case "evaluations": {
      let q = supabase.from("evaluations").select("id, status, total_score, max_score, percentage, submitted_at, event_id, events(name), teams(name, departments(name)), jury_members(full_name)");
      if (filters.event_id) q = q.eq("event_id", filters.event_id);
      if (filters.evaluation_status) q = q.eq("status", filters.evaluation_status as never);
      const { data, error } = await q.order("submitted_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map((v: Record<string, unknown>) => ({
        team: (v.teams as { name?: string } | null)?.name ?? "",
        department: (v.teams as { departments?: { name?: string } | null } | null)?.departments?.name ?? "",
        event: (v.events as { name?: string } | null)?.name ?? "",
        jury: (v.jury_members as { full_name?: string } | null)?.full_name ?? "",
        status: v.status as string,
        total_score: (v.total_score as number | null) ?? 0,
        max_score: (v.max_score as number | null) ?? 0,
        percentage: (v.percentage as number | null) ?? 0,
        submitted_at: (v.submitted_at as string | null) ?? "",
      }));
    }
    case "results": {
      let q = supabase.from("scorecards").select("id, total_score, percentage, overall_rank, department_rank, snapshot, event_id, teams(name, departments(name)), events(name)");
      if (filters.event_id) q = q.eq("event_id", filters.event_id);
      const { data, error } = await q.order("overall_rank", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map((s: Record<string, unknown>) => ({
        team: (s.teams as { name?: string } | null)?.name ?? "",
        department: (s.teams as { departments?: { name?: string } | null } | null)?.departments?.name ?? "",
        event: (s.events as { name?: string } | null)?.name ?? "",
        total_score: (s.total_score as number | null) ?? 0,
        percentage: (s.percentage as number | null) ?? 0,
        overall_rank: (s.overall_rank as number | null) ?? 0,
        department_rank: (s.department_rank as number | null) ?? 0,
      }));
    }
    case "winners": {
      let q = supabase.from("winner_list").select("id, position, prize, citation, event_id, events(name), teams(name, departments(name)), team_name_snapshot");
      if (filters.event_id) q = q.eq("event_id", filters.event_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((w: Record<string, unknown>) => ({
        event: (w.events as { name?: string } | null)?.name ?? "",
        team: ((w.teams as { name?: string } | null)?.name) ?? (w.team_name_snapshot as string | null) ?? "",
        department: (w.teams as { departments?: { name?: string } | null } | null)?.departments?.name ?? "",
        position: w.position as string,
        prize: (w.prize as string | null) ?? "",
        citation: (w.citation as string | null) ?? "",
      }));
    }
    case "certificates": {
      let q = supabase.from("certificates").select("id, certificate_code, type, status, issued_at, downloaded_at, verified_at, event_id, events(name), teams(name), participants(full_name, email)");
      if (filters.event_id) q = q.eq("event_id", filters.event_id);
      if (from) q = q.gte("issued_at", from);
      if (to) q = q.lte("issued_at", to);
      const { data, error } = await q.order("issued_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map((c: Record<string, unknown>) => ({
        certificate_code: c.certificate_code as string,
        type: c.type as string,
        participant: (c.participants as { full_name?: string } | null)?.full_name ?? "",
        email: (c.participants as { email?: string } | null)?.email ?? "",
        team: (c.teams as { name?: string } | null)?.name ?? "",
        event: (c.events as { name?: string } | null)?.name ?? "",
        status: c.status as string,
        issued_at: (c.issued_at as string | null) ?? "",
        downloaded_at: (c.downloaded_at as string | null) ?? "",
        verified_at: (c.verified_at as string | null) ?? "",
      }));
    }
    case "gallery": {
      let q = supabase.from("gallery").select("id, title, caption, media_type, status, sort_order, created_at, events(name)");
      if (filters.event_id) q = q.eq("event_id", filters.event_id);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((g: Record<string, unknown>) => ({
        title: (g.title as string | null) ?? "",
        caption: (g.caption as string | null) ?? "",
        media_type: g.media_type as string,
        status: g.status as string,
        event: (g.events as { name?: string } | null)?.name ?? "",
        created_at: g.created_at as string,
      }));
    }
    case "contact_messages": {
      let q = supabase.from("contact_submissions").select("*");
      if (from) q = q.gte("created_at", from);
      if (to) q = q.lte("created_at", to);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((m) => ({
        name: m.name,
        email: m.email,
        subject: m.subject ?? "",
        message: m.message,
        is_read: m.is_read,
        created_at: m.created_at,
      }));
    }
  }
}

export async function saveReportSnapshot(kind: ReportKind, filters: ReportFilters, rows: ExportRow[]) {
  const { error } = await supabase.from("reports").insert({
    type: kind as never,
    title: `${kind} report`,
    data: { filters, count: rows.length } as never,
  });
  if (error) throw error;
}
