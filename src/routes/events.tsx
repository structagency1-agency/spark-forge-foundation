import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/common/EmptyState";
import { buildMeta } from "@/lib/seo";
import { eventsQueryOptions } from "@/services/events";
import { computeEventStatus, EVENT_STATUS_LABEL } from "@/lib/status";
import { CalendarDays } from "lucide-react";

export const Route = createFileRoute("/events")({
  head: () => buildMeta({
    title: "Events",
    description: "Explore every SPARK TANK 4.0 event — from department qualifiers to the grand finale. Dates, venues and registration windows.",
    path: "/events",
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQueryOptions),
  component: EventsPage,
});

function EventsPage() {
  const { data: events } = useSuspenseQuery(eventsQueryOptions);
  return (
    <PageShell
      eyebrow="Events"
      title="The full calendar"
      description="Every arena, semifinal and finale — all in one place. Publishing an event from the admin makes it appear here automatically."
    >
      {events.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-8 w-8" />}
          title="Events are being finalized"
          description="Check back soon. Events will appear here as they are announced."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {events.map((e) => {
            const status = computeEventStatus(e);
            return (
              <Link
                key={e.id}
                to="/events/$slug"
                params={{ slug: e.slug }}
                className="surface-panel group block overflow-hidden transition-transform hover:-translate-y-1"
              >
                {e.banner_url && (
                  <img src={e.banner_url} alt={e.name} className="h-48 w-full object-cover" />
                )}
                <div className="p-6">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] uppercase tracking-widest text-accent">
                      {EVENT_STATUS_LABEL[status]}
                    </span>
                    {e.departments && (
                      <span className="text-xs text-muted-foreground">{e.departments.name}</span>
                    )}
                  </div>
                  <h2 className="mt-4 font-display text-2xl group-hover:text-accent">{e.name}</h2>
                  {e.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{e.description}</p>
                  )}
                  <div className="mt-4 text-xs text-muted-foreground">
                    {e.event_date && new Date(e.event_date).toLocaleDateString(undefined, {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                    {e.venue && ` • ${e.venue}`}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
