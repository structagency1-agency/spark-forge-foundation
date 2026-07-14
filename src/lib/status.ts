import type { Event, EventStatus } from "@/models/db";

/**
 * Derives an event's status from its date columns.
 * The DB status column remains authoritative for manual overrides
 * (e.g. `evaluation`, `completed`); the date-driven view is used
 * when the row has no override or an ambiguous state.
 */
export function computeEventStatus(event: Event, now: Date = new Date()): EventStatus {
  // Manual terminal states always win
  if (event.status === "evaluation" || event.status === "completed") {
    return event.status;
  }
  const eventDate = event.event_date ? new Date(event.event_date) : null;
  const regStart = event.registration_start ? new Date(event.registration_start) : null;
  const regClose = event.registration_close ? new Date(event.registration_close) : null;

  if (eventDate && now >= eventDate) return "ongoing";
  if (regStart && regClose && now >= regStart && now < regClose) return "registration_open";
  if (regClose && now >= regClose) return "registration_closed";
  return "upcoming";
}

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  upcoming: "Upcoming",
  registration_open: "Registration Open",
  registration_closed: "Registration Closed",
  ongoing: "Ongoing",
  evaluation: "Under Evaluation",
  completed: "Completed",
};
