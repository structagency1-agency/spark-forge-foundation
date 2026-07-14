import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SearchKind =
  | "event"
  | "problem"
  | "gallery"
  | "team"
  | "registration"
  | "participant"
  | "result"
  | "certificate"
  | "announcement";

export interface SearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  description?: string | null;
  href: string;
  meta?: string | null;
}

async function runSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const pattern = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;

  const [events, problems, gallery, teams, regs, participants, scorecards, certs, anns] = await Promise.all([
    supabase.from("events").select("id, name, slug, description, departments(name)").eq("is_published", true).or(`name.ilike.${pattern},description.ilike.${pattern}`).limit(6),
    supabase.from("problem_statements").select("id, title, description, events(name, slug)").eq("status", "active").or(`title.ilike.${pattern},description.ilike.${pattern}`).limit(6),
    supabase.from("gallery").select("id, title, caption, events(name, slug)").eq("status", "active").eq("media_type", "image").or(`title.ilike.${pattern},caption.ilike.${pattern}`).limit(6),
    supabase.from("teams").select("id, name, event_id, events(name, slug), departments(name)").ilike("name", pattern).limit(6),
    supabase.from("registrations").select("id, registration_code, events(name, slug), teams(name)").ilike("registration_code", pattern).limit(6),
    supabase.from("participants").select("id, full_name, email").or(`full_name.ilike.${pattern},email.ilike.${pattern}`).limit(6),
    supabase.from("scorecards").select("registration_id, snapshot, event_id, events(name, slug)").or(`snapshot->>team_name.ilike.${pattern},snapshot->>registration_code.ilike.${pattern}`).limit(6),
    supabase.from("certificates").select("id, certificate_code, type, events(name), participants(full_name)").ilike("certificate_code", pattern).limit(6),
    supabase.from("announcements").select("id, title, description").eq("status", "published").or(`title.ilike.${pattern},description.ilike.${pattern}`).limit(6),
  ]);

  const results: SearchResult[] = [];

  for (const e of (events.data as Array<{ id: string; name: string; slug: string; description: string | null; departments: { name: string } | null }> | null) ?? []) {
    results.push({ kind: "event", id: e.id, title: e.name, description: e.description, href: `/events/${e.slug}`, meta: e.departments?.name ?? null });
  }
  for (const p of (problems.data as Array<{ id: string; title: string; description: string | null; events: { name: string; slug: string } | null }> | null) ?? []) {
    results.push({ kind: "problem", id: p.id, title: p.title, description: p.description, href: p.events ? `/events/${p.events.slug}` : "/problem-statements", meta: p.events?.name ?? null });
  }
  for (const g of (gallery.data as Array<{ id: string; title: string | null; caption: string | null; events: { name: string; slug: string } | null }> | null) ?? []) {
    results.push({ kind: "gallery", id: g.id, title: g.title ?? "Untitled photo", description: g.caption, href: "/gallery", meta: g.events?.name ?? null });
  }
  for (const t of (teams.data as Array<{ id: string; name: string; events: { name: string; slug: string } | null; departments: { name: string } | null }> | null) ?? []) {
    results.push({ kind: "team", id: t.id, title: t.name, description: t.departments?.name ?? null, href: t.events ? `/events/${t.events.slug}` : "/events", meta: t.events?.name ?? null });
  }
  for (const r of (regs.data as Array<{ id: string; registration_code: string; events: { name: string; slug: string } | null; teams: { name: string } | null }> | null) ?? []) {
    results.push({ kind: "registration", id: r.id, title: r.registration_code, description: r.teams?.name ?? null, href: `/my-registration?code=${r.registration_code}`, meta: r.events?.name ?? null });
  }
  for (const p of (participants.data as Array<{ id: string; full_name: string; email: string }> | null) ?? []) {
    results.push({ kind: "participant", id: p.id, title: p.full_name, description: p.email, href: `/downloads?q=${encodeURIComponent(p.email)}`, meta: null });
  }
  for (const s of (scorecards.data as Array<{ registration_id: string; snapshot: Record<string, unknown>; events: { name: string; slug: string } | null }> | null) ?? []) {
    const team = (s.snapshot?.team_name as string) ?? "Team";
    const code = (s.snapshot?.registration_code as string) ?? "";
    results.push({ kind: "result", id: s.registration_id, title: `${team}${code ? " · " + code : ""}`, description: "View scorecard", href: `/scorecard/${code}`, meta: s.events?.name ?? null });
  }
  for (const c of (certs.data as Array<{ id: string; certificate_code: string; type: string; events: { name: string } | null; participants: { full_name: string } | null }> | null) ?? []) {
    results.push({ kind: "certificate", id: c.id, title: c.certificate_code, description: c.participants?.full_name ?? null, href: `/verify-certificate/${c.certificate_code}`, meta: `${c.type} · ${c.events?.name ?? ""}` });
  }
  for (const a of (anns.data as Array<{ id: string; title: string; description: string }> | null) ?? []) {
    results.push({ kind: "announcement", id: a.id, title: a.title, description: a.description, href: "/", meta: "Announcement" });
  }

  return results;
}

export const searchQueryOptions = (query: string) =>
  queryOptions({
    queryKey: ["search", query],
    queryFn: () => runSearch(query),
    staleTime: 30 * 1000,
    enabled: query.trim().length >= 2,
  });
