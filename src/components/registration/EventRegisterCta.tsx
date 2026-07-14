import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { EventWithDepartment } from "@/services/events";
import { eventCapacityQueryOptions } from "@/services/registration";
import { computeRegistrationButtonState } from "@/lib/registrationButton";

export function EventRegisterCta({ event }: { event: EventWithDepartment }) {
  const { data: capacity } = useQuery(eventCapacityQueryOptions(event.id));
  const btn = computeRegistrationButtonState(event, capacity ?? null);

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      {btn.disabled ? (
        <span
          className="inline-flex cursor-not-allowed items-center rounded-full border border-border/60 bg-muted/30 px-6 py-3 text-sm font-medium text-muted-foreground"
          title={btn.hint}
          aria-disabled
        >
          {btn.label}
        </span>
      ) : (
        <Link
          to="/register/$slug"
          params={{ slug: event.slug }}
          className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground shadow-[var(--shadow-glow)] transition-all hover:brightness-110"
        >
          {btn.label}
        </Link>
      )}
      {capacity && capacity.max ? (
        <span className="text-xs text-muted-foreground">
          {Math.max(0, capacity.max - capacity.registered)} of {capacity.max} seats remaining
        </span>
      ) : null}
    </div>
  );
}
