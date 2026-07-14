import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Announcement = Tables<"announcements">;

async function fetchAll(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Announcement[];
}

async function fetchActive(location = "homepage"): Promise<Announcement[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("status", "published")
    .eq("display_location", location)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []) as Announcement[];
}

export const announcementsAdminQO = queryOptions({
  queryKey: ["announcements", "all"],
  queryFn: fetchAll,
  staleTime: 30_000,
});

export const activeAnnouncementsQO = (location = "homepage") =>
  queryOptions({
    queryKey: ["announcements", "active", location],
    queryFn: () => fetchActive(location),
    staleTime: 60_000,
  });
