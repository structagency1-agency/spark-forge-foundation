import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TimelineEntry } from "@/models/db";

async function fetchTimeline(): Promise<TimelineEntry[]> {
  const { data, error } = await supabase
    .from("timeline")
    .select("*")
    .eq("status", "active")
    .order("sequence_order", { ascending: true });
  if (error) throw error;
  return (data as TimelineEntry[] | null) ?? [];
}

export const timelineQueryOptions = queryOptions({
  queryKey: ["timeline"],
  queryFn: fetchTimeline,
  staleTime: 5 * 60 * 1000,
});
