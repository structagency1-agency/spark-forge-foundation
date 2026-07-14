import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/common/EmptyState";
import { EventCard } from "@/components/common/EventCard";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { buildMeta } from "@/lib/seo";
import { eventsQueryOptions, type EventWithDepartment } from "@/services/events";
import { computeEventStatus } from "@/lib/status";
import { CalendarDays } from "lucide-react";
import type { EventStatus } from "@/models/db";

export const Route = createFileRoute("/events")({
  head: () => buildMeta({
    title: "Events",
    description: "Every SPARK TANK 4.0 event — upcoming, live and completed. Explore department arenas, venues and registration windows.",
    path: "/events",
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQueryOptions),
  component: EventsPage,
});

const BUCKETS: Array<{
  key: "upcoming" | "ongoing" | "completed";
  label: string;
  statuses: EventStatus[];
  description: string;
}> = [
  {
    key: "upcoming",
    label: "Upcoming events",
    statuses: ["upcoming", "registration_open", "registration_closed"],
    description: "Registrations open or opening soon.",
  },
  {
    key: "ongoing",
    label: "Ongoing events",
    statuses: ["ongoing", "evaluation"],
    description: "Live arenas — pitches, prototypes and evaluations in flight.",
  },
  {
    key: "completed",
    label: "Completed events",
    statuses: ["completed"],
    description: "Recent arenas that have wrapped up.",
  },
];

function EventsPage() {
  const { data: events } = useSuspenseQuery(eventsQueryOptions);

  const grouped = BUCKETS.map((b) => ({
    ...b,
    items: events.filter((e) =>
      b.statuses.includes(computeEventStatus(e)),
    ) as EventWithDepartment[],
  }));

  const total = events.length;

  return (
    <PageShell
      eyebrow="Events"
      title="The full calendar"
      description="Every arena, semifinal and finale — grouped by status."
    >
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Events" }]} />

      {total === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-8 w-8" />}
          title="Events are being finalized"
          description="Check back soon. Events will appear here as they are announced."
        />
      ) : (
        <div className="space-y-16">
          {grouped.map((group) => (
            <section key={group.key}>
              <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-display text-2xl md:text-3xl">{group.label}</h2>
                <span className="text-sm text-muted-foreground">{group.description}</span>
              </div>
              {group.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
                  Nothing in this bucket right now.
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((e) => (
                    <EventCard key={e.id} event={e} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
