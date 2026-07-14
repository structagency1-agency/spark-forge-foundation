import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SearchResult {
  kind: "event" | "problem" | "gallery";
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

  const [events, problems, gallery] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, slug, description, departments(name)")
      .eq("is_published", true)
      .or(`name.ilike.${pattern},description.ilike.${pattern}`)
      .limit(8),
    supabase
      .from("problem_statements")
      .select("id, title, description, events(name, slug)")
      .eq("status", "active")
      .or(`title.ilike.${pattern},description.ilike.${pattern}`)
      .limit(8),
    supabase
      .from("gallery")
      .select("id, title, caption, events(name, slug)")
      .eq("status", "active")
      .eq("media_type", "image")
      .or(`title.ilike.${pattern},caption.ilike.${pattern}`)
      .limit(8),
  ]);

  const results: SearchResult[] = [];

  for (const e of (events.data as Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    departments: { name: string } | null;
  }> | null) ?? []) {
    results.push({
      kind: "event",
      id: e.id,
      title: e.name,
      description: e.description,
      href: `/events/${e.slug}`,
      meta: e.departments?.name ?? null,
    });
  }
  for (const p of (problems.data as Array<{
    id: string;
    title: string;
    description: string | null;
    events: { name: string; slug: string } | null;
  }> | null) ?? []) {
    results.push({
      kind: "problem",
      id: p.id,
      title: p.title,
      description: p.description,
      href: p.events ? `/events/${p.events.slug}` : "/problem-statements",
      meta: p.events?.name ?? null,
    });
  }
  for (const g of (gallery.data as Array<{
    id: string;
    title: string | null;
    caption: string | null;
    events: { name: string; slug: string } | null;
  }> | null) ?? []) {
    results.push({
      kind: "gallery",
      id: g.id,
      title: g.title ?? "Untitled photo",
      description: g.caption,
      href: "/gallery",
      meta: g.events?.name ?? null,
    });
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
