import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/layout/PageShell";
import { buildMeta } from "@/lib/seo";
import { eventBySlugQueryOptions } from "@/services/events";
import { computeEventStatus, EVENT_STATUS_LABEL } from "@/lib/status";

export const Route = createFileRoute("/events/$slug")({
  loader: async ({ context, params }) => {
    const event = await context.queryClient.ensureQueryData(
      eventBySlugQueryOptions(params.slug),
    );
    if (!event) throw notFound();
    return event;
  },
  head: ({ params, loaderData }) => buildMeta({
    title: loaderData?.name ?? "Event",
    description: loaderData?.description ?? "SPARK TANK 4.0 event details.",
    path: `/events/${params.slug}`,
    ogType: "article",
    image: loaderData?.banner_url ?? undefined,
  }),
  component: EventDetailPage,
});

function EventDetailPage() {
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(eventBySlugQueryOptions(slug));
  if (!event) return null;
  const status = computeEventStatus(event);

  return (
    <PageShell
      eyebrow={event.departments?.name ?? "Event"}
      title={event.name}
      description={event.description ?? undefined}
    >
      <div className="grid gap-6 md:grid-cols-3">
        <InfoCard label="Status" value={EVENT_STATUS_LABEL[status]} />
        <InfoCard label="Venue" value={event.venue ?? "TBA"} />
        <InfoCard
          label="Event date"
          value={event.event_date ? new Date(event.event_date).toLocaleString() : "TBA"}
        />
        <InfoCard label="Min team size" value={String(event.min_team_size)} />
        <InfoCard label="Max team size" value={String(event.max_team_size)} />
        <InfoCard
          label="Max participants"
          value={event.max_participants ? String(event.max_participants) : "—"}
        />
      </div>
    </PageShell>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-panel p-6">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-lg">{value}</div>
    </div>
  );
}
