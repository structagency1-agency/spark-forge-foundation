import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { HomepageSection, EventStatus } from "@/models/db";
import { eventsQueryOptions } from "@/services/events";
import { computeEventStatus } from "@/lib/status";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { EventCard } from "@/components/common/EventCard";

type Bucket = "upcoming" | "ongoing" | "completed";

const BUCKET_MATCH: Record<Bucket, EventStatus[]> = {
  upcoming: ["upcoming", "registration_open", "registration_closed"],
  ongoing: ["ongoing", "evaluation"],
  completed: ["completed"],
};

interface EventsByStatusProps {
  section: HomepageSection;
  bucket: Bucket;
  eyebrow: string;
  limit?: number;
}

export function EventsByStatus({
  section,
  bucket,
  eyebrow,
  limit = 3,
}: EventsByStatusProps) {
  const { data: events } = useSuspenseQuery(eventsQueryOptions);
  const filtered = events
    .filter((e) => BUCKET_MATCH[bucket].includes(computeEventStatus(e)))
    .slice(0, limit);

  if (filtered.length === 0) return null;

  return (
    <section className="container-page py-20 md:py-24">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <SectionHeading eyebrow={eyebrow} title={section.title ?? eyebrow} />
        <Link
          to="/events"
          className="text-sm text-accent underline-offset-4 hover:underline"
        >
          All events →
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </section>
  );
}
