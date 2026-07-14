import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Result, WinnerListEntry, ResultStatus } from "@/models/db";

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
    .eq("status", "published")
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

async function fetchAdminResults(): Promise<ResultWithEvent[]> {
  const { data, error } = await supabase
    .from("results")
    .select("*, events(name, slug)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as ResultWithEvent[] | null) ?? [];
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

export const adminResultsQueryOptions = queryOptions({
  queryKey: ["admin", "results-list"],
  queryFn: fetchAdminResults,
});

/* ------------------------------------------------------------------ */
/*  Public search RPCs                                                 */
/* ------------------------------------------------------------------ */

export async function publicResults(query?: string): Promise<unknown[]> {
  const { data, error } = await supabase.rpc("public_results", { _query: query ?? "" });
  if (error) throw error;
  return (data as unknown[] | null) ?? [];
}

export async function publicWinners(eventId?: string): Promise<unknown[]> {
  const { data, error } = await supabase.rpc("public_winners", eventId ? { _event_id: eventId } : {});
  if (error) throw error;
  return (data as unknown[] | null) ?? [];
}

export async function verifyCertificate(code: string) {
  const { data, error } = await supabase.rpc("verify_certificate", { _code: code });
  if (error) throw error;
  return data;
}

export async function downloadsLookup(query: string) {
  const { data, error } = await supabase.rpc("downloads_lookup", { _query: query });
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ */
/*  Admin publishing actions                                           */
/* ------------------------------------------------------------------ */

export async function publishResults(eventId: string, opts?: { scheduledAt?: string | null; summary?: string | null }) {
  const args: { _event_id: string; _scheduled_at?: string; _summary?: string } = { _event_id: eventId };
  if (opts?.scheduledAt) args._scheduled_at = opts.scheduledAt;
  if (opts?.summary) args._summary = opts.summary;
  const { data, error } = await supabase.rpc("publish_results", args);
  if (error) throw error;
  return data;
}

export async function unpublishResults(eventId: string) {
  const { error } = await supabase.rpc("unpublish_results", { _event_id: eventId });
  if (error) throw error;
}

export async function hideResults(eventId: string) {
  const { error } = await supabase.rpc("hide_results", { _event_id: eventId });
  if (error) throw error;
}

export async function archiveResults(eventId: string) {
  const { error } = await supabase.rpc("archive_results", { _event_id: eventId });
  if (error) throw error;
}

export async function generateScorecards(eventId: string) {
  const { data, error } = await supabase.rpc("generate_scorecards", { _event_id: eventId });
  if (error) throw error;
  return data as number;
}

export async function generateCertificates(eventId: string) {
  const { data, error } = await supabase.rpc("generate_certificates", { _event_id: eventId });
  if (error) throw error;
  return data as number;
}

export const RESULT_STATUS_LABEL: Record<ResultStatus, string> = {
  draft: "Draft",
  published: "Published",
  hidden: "Hidden",
  archived: "Archived",
};
