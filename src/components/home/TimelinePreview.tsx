import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { HomepageSection } from "@/models/db";
import { timelineQueryOptions } from "@/services/timeline";
import { SectionHeading } from "@/components/layout/SectionHeading";

export function TimelinePreview({ section }: { section: HomepageSection }) {
  const { data } = useSuspenseQuery(timelineQueryOptions);
  if (data.length === 0) return null;
  return (
    <section className="container-page py-24 md:py-32">
      <SectionHeading eyebrow="Timeline" title={section.title ?? "The journey"} />
      <ol className="relative space-y-8 border-l border-border/70 pl-8">
        {data.map((item) => (
          <li key={item.id} className="relative">
            <span className="absolute -left-[37px] top-1 h-3 w-3 rounded-full bg-accent shadow-[0_0_16px_var(--color-accent)]" />
            <div className="font-mono text-xs uppercase tracking-widest text-accent">
              {item.event_date ? new Date(item.event_date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "TBA"}
            </div>
            <h3 className="mt-1 font-display text-lg">{item.title}</h3>
            {item.description && (
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-10">
        <Link to="/events" className="text-sm text-accent underline-offset-4 hover:underline">
          Full schedule →
        </Link>
      </div>
    </section>
  );
}
