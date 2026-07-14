import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Event } from "@/models/db";

export type EventWithDepartment = Event & {
  departments: { name: string; code: string; slug: string } | null;
};

async function fetchPublishedEvents(): Promise<EventWithDepartment[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*, departments(name, code, slug)")
    .eq("is_published", true)
    .order("event_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data as EventWithDepartment[] | null) ?? [];
}

async function fetchEventBySlug(slug: string): Promise<EventWithDepartment | null> {
  const { data, error } = await supabase
    .from("events")
    .select("*, departments(name, code, slug)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  return (data as EventWithDepartment | null) ?? null;
}

async function fetchUpcomingEvent(): Promise<EventWithDepartment | null> {
  const { data, error } = await supabase
    .from("events")
    .select("*, departments(name, code, slug)")
    .eq("is_published", true)
    .gt("event_date", new Date().toISOString())
    .order("event_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as EventWithDepartment | null) ?? null;
}

export const eventsQueryOptions = queryOptions({
  queryKey: ["events", "published"],
  queryFn: fetchPublishedEvents,
  staleTime: 30 * 1000,
});

export const upcomingEventQueryOptions = queryOptions({
  queryKey: ["events", "upcoming"],
  queryFn: fetchUpcomingEvent,
  staleTime: 30 * 1000,
});

export const eventBySlugQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["events", "slug", slug],
    queryFn: () => fetchEventBySlug(slug),
    staleTime: 30 * 1000,
  });
