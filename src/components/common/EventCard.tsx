import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin } from "lucide-react";
import type { EventWithDepartment } from "@/services/events";
import { computeEventStatus, EVENT_STATUS_LABEL } from "@/lib/status";
import { eventCapacityQueryOptions } from "@/services/registration";
import { computeRegistrationButtonState } from "@/lib/registrationButton";

const STATUS_ACCENT: Record<string, string> = {
  registration_open: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  upcoming: "border-accent/40 bg-accent/10 text-accent",
  ongoing: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  registration_closed: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
  evaluation: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  completed: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
};

function fmtDate(d?: string | null) {
  if (!d) return "TBA";
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(d));
}

interface EventCardProps {
  event: EventWithDepartment;
  showActions?: boolean;
}

export function EventCard({ event, showActions = true }: EventCardProps) {
  const status = computeEventStatus(event);
  const statusClass = STATUS_ACCENT[status] ?? STATUS_ACCENT.upcoming;
  const { data: capacity } = useQuery({
    ...eventCapacityQueryOptions(event.id),
    enabled: showActions,
  });
  const btn = computeRegistrationButtonState(event, capacity ?? null);

  return (
    <article className="surface-panel group flex h-full flex-col overflow-hidden transition-transform hover:-translate-y-1">
      <Link
        to="/events/$slug"
        params={{ slug: event.slug }}
        className="block"
        aria-label={event.name}
      >
        {event.banner_url ? (
          <img
            src={event.banner_url}
            alt={event.name}
            loading="lazy"
            className="h-44 w-full object-cover"
          />
        ) : (
          <div className="h-44 w-full bg-gradient-to-br from-secondary via-background to-accent/20" />
        )}
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest ${statusClass}`}
          >
            {EVENT_STATUS_LABEL[status]}
          </span>
          {event.departments && (
            <span className="text-xs text-muted-foreground">{event.departments.name}</span>
          )}
        </div>
        <Link
          to="/events/$slug"
          params={{ slug: event.slug }}
          className="mt-4 font-display text-2xl text-foreground transition-colors group-hover:text-accent"
        >
          {event.name}
        </Link>
        {event.description && (
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{event.description}</p>
        )}
        <dl className="mt-4 space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            <dd>{fmtDate(event.event_date)}</dd>
          </div>
          {event.venue && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              <dd className="truncate">{event.venue}</dd>
            </div>
          )}
        </dl>
        {showActions && (
          <div className="mt-auto flex items-center gap-3 pt-6">
            {btn.disabled ? (
              <span
                className="inline-flex flex-1 items-center justify-center rounded-full border border-border/60 bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground"
                title={btn.hint}
              >
                {btn.label}
              </span>
            ) : (
              <Link
                to="/register/$slug"
                params={{ slug: event.slug }}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-xs font-medium text-accent hover:bg-accent hover:text-accent-foreground"
              >
                {btn.label}
              </Link>
            )}
            <Link
              to="/events/$slug"
              params={{ slug: event.slug }}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-foreground shadow-[var(--shadow-glow)] transition-all hover:brightness-110"
            >
              View details
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
