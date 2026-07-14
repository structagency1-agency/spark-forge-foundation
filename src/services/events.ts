import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Event } from "@/models/db";

export type EventWithDepartment = Event & {
  departments: { name: string; code: string; slug: string } | null;
};

const EVENT_SELECT = "*, departments(name, code, slug)";

async function fetchPublishedEvents(): Promise<EventWithDepartment[]> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("is_published", true)
    .order("event_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data as EventWithDepartment[] | null) ?? [];
}

async function fetchEventBySlug(slug: string): Promise<EventWithDepartment | null> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  return (data as EventWithDepartment | null) ?? null;
}

/**
 * Nearest event whose registration window is open right now.
 * Used by the live countdown timer — target is registration_close.
 */
async function fetchNearestRegistrationOpenEvent(): Promise<EventWithDepartment | null> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("is_published", true)
    .lte("registration_start", nowIso)
    .gt("registration_close", nowIso)
    .order("registration_close", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as EventWithDepartment | null) ?? null;
}

/**
 * Any event whose registration window has already closed — used
 * to decide between the "Registration Closed" and
 * "No Active Registrations" fallbacks in the countdown.
 */
async function fetchHasClosedRegistrations(): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("events")
    .select("id", { head: false })
    .eq("is_published", true)
    .not("registration_close", "is", null)
    .lte("registration_close", nowIso)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async function fetchRelatedEvents(
  eventId: string,
  departmentId: string | null,
  limit = 3,
): Promise<EventWithDepartment[]> {
  let q = supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("is_published", true)
    .neq("id", eventId);
  if (departmentId) q = q.eq("department_id", departmentId);
  const { data, error } = await q
    .order("event_date", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data as EventWithDepartment[] | null) ?? [];
}

export const eventsQueryOptions = queryOptions({
  queryKey: ["events", "published"],
  queryFn: fetchPublishedEvents,
  staleTime: 30 * 1000,
});

export const eventBySlugQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["events", "slug", slug],
    queryFn: () => fetchEventBySlug(slug),
    staleTime: 30 * 1000,
  });

export const nearestRegistrationOpenQueryOptions = queryOptions({
  queryKey: ["events", "nearest-registration-open"],
  queryFn: fetchNearestRegistrationOpenEvent,
  staleTime: 30 * 1000,
});

export const hasClosedRegistrationsQueryOptions = queryOptions({
  queryKey: ["events", "has-closed-registrations"],
  queryFn: fetchHasClosedRegistrations,
  staleTime: 60 * 1000,
});

export const relatedEventsQueryOptions = (
  eventId: string,
  departmentId: string | null,
) =>
  queryOptions({
    queryKey: ["events", "related", eventId, departmentId ?? "none"],
    queryFn: () => fetchRelatedEvents(eventId, departmentId),
    staleTime: 60 * 1000,
  });

// Backward-compatible: keep upcomingEventQueryOptions so pre-existing
// code paths continue to resolve — now aliased to the nearest open reg.
export const upcomingEventQueryOptions = nearestRegistrationOpenQueryOptions;
