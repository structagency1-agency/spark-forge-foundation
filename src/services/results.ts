import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Result, WinnerListEntry } from "@/models/db";

export type ResultWithEvent = Result & {
  events: { name: string; slug: string } | null;
};

export type WinnerWithContext = WinnerListEntry & {
  events: { name: string; slug: string } | null;
  teams: { name: string } | null;
};

async function fetchPublishedResults(): Promise<ResultWithEvent[]> {
  const { data, error } = await supabase
    .from("results")
    .select("*, events(name, slug)")
    .eq("is_published", true)
    .order("published_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data as ResultWithEvent[] | null) ?? [];
}

async function fetchWinners(): Promise<WinnerWithContext[]> {
  const { data, error } = await supabase
    .from("winner_list")
    .select("*, events(name, slug), teams(name)")
    .order("position", { ascending: true });
  if (error) throw error;
  return (data as WinnerWithContext[] | null) ?? [];
}

export const resultsQueryOptions = queryOptions({
  queryKey: ["results"],
  queryFn: fetchPublishedResults,
  staleTime: 60 * 1000,
});

export const winnersQueryOptions = queryOptions({
  queryKey: ["winners"],
  queryFn: fetchWinners,
  staleTime: 60 * 1000,
});
