import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { EventCard } from "@/components/common/EventCard";
import { buildMeta } from "@/lib/seo";
import {
  eventBySlugQueryOptions,
  relatedEventsQueryOptions,
} from "@/services/events";
import { problemStatementsForEventQueryOptions } from "@/services/problemStatements";
import { galleryForEventQueryOptions } from "@/services/gallery";
import { computeEventStatus, EVENT_STATUS_LABEL } from "@/lib/status";
import { CalendarDays, MapPin, Users, Download, FileText } from "lucide-react";

export const Route = createFileRoute("/events/$slug")({
  loader: async ({ context, params }) => {
    const event = await context.queryClient.ensureQueryData(
      eventBySlugQueryOptions(params.slug),
    );
    if (!event) throw notFound();
    await Promise.all([
      context.queryClient.ensureQueryData(
        problemStatementsForEventQueryOptions(event.id),
      ),
      context.queryClient.ensureQueryData(galleryForEventQueryOptions(event.id)),
      context.queryClient.ensureQueryData(
        relatedEventsQueryOptions(event.id, event.department_id),
      ),
    ]);
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
  errorComponent: ({ error }) => (
    <div className="container-page py-24 text-center">
      <h1 className="font-display text-3xl">Something went wrong</h1>
      <p className="mt-3 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="font-display text-3xl">Event not found</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The event you're looking for may have been unpublished.
      </p>
    </div>
  ),
});

function fmtDateTime(d?: string | null) {
  if (!d) return "TBA";
  return new Date(d).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function useRegistrationCountdown(closeAt?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!closeAt) return null;
  const ms = Math.max(0, new Date(closeAt).getTime() - now);
  return {
    d: Math.floor(ms / 86_400_000),
    h: Math.floor((ms / 3_600_000) % 24),
    m: Math.floor((ms / 60_000) % 60),
    s: Math.floor((ms / 1000) % 60),
    ended: ms === 0,
  };
}

function EventDetailPage() {
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(eventBySlugQueryOptions(slug));
  const { data: problems } = useSuspenseQuery(
    problemStatementsForEventQueryOptions(event!.id),
  );
  const { data: gallery } = useSuspenseQuery(galleryForEventQueryOptions(event!.id));
  const { data: related } = useSuspenseQuery(
    relatedEventsQueryOptions(event!.id, event!.department_id),
  );
  const countdown = useRegistrationCountdown(event?.registration_close);

  if (!event) return null;
  const status = computeEventStatus(event);

  return (
    <main className="pb-24">
      {event.banner_url && (
        <div className="relative h-64 w-full overflow-hidden md:h-96">
          <img
            src={event.banner_url}
            alt={event.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>
      )}

      <div className="container-page -mt-16 md:-mt-24">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Events", href: "/events" },
            { label: event.name },
          ]}
        />
        <div className="surface-panel p-8 md:p-12">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] uppercase tracking-widest text-accent">
              {EVENT_STATUS_LABEL[status]}
            </span>
            {event.departments && (
              <span className="text-xs text-muted-foreground">
                {event.departments.name}
              </span>
            )}
          </div>
          <h1 className="mt-4 font-display text-4xl md:text-6xl text-gradient-accent">
            {event.name}
          </h1>
          {event.description && (
            <p className="mt-6 max-w-3xl text-base md:text-lg text-muted-foreground">
              {event.description}
            </p>
          )}

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <InfoRow icon={<CalendarDays className="h-4 w-4" />} label="Event date" value={fmtDateTime(event.event_date)} />
            <InfoRow icon={<MapPin className="h-4 w-4" />} label="Venue" value={event.venue ?? "TBA"} />
            <InfoRow icon={<Users className="h-4 w-4" />} label="Team size" value={`${event.min_team_size}–${event.max_team_size}`} />
            <InfoRow label="Registration opens" value={fmtDateTime(event.registration_start)} />
            <InfoRow label="Registration closes" value={fmtDateTime(event.registration_close)} />
            <InfoRow label="Max participants" value={event.max_participants ? String(event.max_participants) : "—"} />
          </div>

          {countdown && event.registration_close && (
            <div className="mt-8 rounded-2xl border border-border/60 bg-card/40 p-6">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                {countdown.ended ? "Registration closed" : "Registration closes in"}
              </div>
              {!countdown.ended ? (
                <div className="mt-3 grid grid-cols-4 gap-3 text-center">
                  {[["Days", countdown.d], ["Hrs", countdown.h], ["Min", countdown.m], ["Sec", countdown.s]].map(
                    ([label, value]) => (
                      <div key={label as string}>
                        <div className="font-display text-3xl md:text-4xl text-gradient-accent tabular-nums">
                          {String(value).padStart(2, "0")}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          {label}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="mt-2 font-display text-2xl text-gradient-accent">
                  Registration closed
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              disabled
              aria-disabled
              title="Registration opens later"
              className="inline-flex cursor-not-allowed items-center rounded-full border border-border/60 bg-muted/30 px-6 py-3 text-sm font-medium text-muted-foreground"
            >
              Register (coming soon)
            </button>
          </div>
        </div>

        {problems.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl md:text-3xl">Problem statements</h2>
            <div className="mt-6 space-y-4">
              {problems.map((p) => (
                <article
                  key={p.id}
                  className="surface-panel flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5 text-accent" />
                      Brief
                    </div>
                    <h3 className="mt-1 font-display text-lg">{p.title}</h3>
                    {p.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                    )}
                  </div>
                  {p.document_url && (
                    <a
                      href={p.document_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-accent/50 px-5 py-2.5 text-sm text-accent hover:bg-accent hover:text-accent-foreground"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {gallery.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl md:text-3xl">Gallery</h2>
            <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {gallery.map((g) => (
                <figure
                  key={g.id}
                  className="overflow-hidden rounded-xl border border-border/60"
                >
                  <img
                    src={g.url}
                    alt={g.title ?? event.name}
                    loading="lazy"
                    className="h-40 w-full object-cover"
                  />
                </figure>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl md:text-3xl">Related events</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/30 p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        {icon} <span>{label}</span>
      </div>
      <div className="mt-2 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
