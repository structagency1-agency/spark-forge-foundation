import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { HomepageSection } from "@/models/db";
import { timelineQueryOptions } from "@/services/timeline";
import { SectionHeading } from "@/components/layout/SectionHeading";

/**
 * Interactive alternating "3D-ish" timeline.
 * Items come from the `timeline` table, sorted by sequence_order.
 * Card lifts on hover; central spine glows to accent.
 */
export function TimelinePreview({ section }: { section: HomepageSection }) {
  const { data } = useSuspenseQuery(timelineQueryOptions);
  if (data.length === 0) return null;

  return (
    <section className="container-page py-24 md:py-32">
      <SectionHeading
        eyebrow="Timeline"
        title={section.title ?? "The journey"}
        description="From launch to grand finale — every milestone on one interactive spine."
      />

      <ol className="relative mx-auto max-w-5xl">
        <span
          aria-hidden
          className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-accent/60 via-border to-transparent md:left-1/2 md:-translate-x-1/2"
        />
        {data.map((item, i) => {
          const rightSide = i % 2 === 1;
          const dateLabel = item.event_date
            ? new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(item.event_date))
            : "TBA";
          return (
            <li
              key={item.id}
              className={`relative mb-10 pl-12 md:mb-16 md:w-1/2 md:pl-0 ${
                rightSide ? "md:ml-auto md:pl-12" : "md:pr-12 md:text-right"
              }`}
            >
              <span
                aria-hidden
                className={`absolute top-3 h-3 w-3 rounded-full bg-accent shadow-[0_0_18px_var(--color-accent)] left-[10px] md:top-4 ${
                  rightSide ? "md:-left-[7px]" : "md:-right-[7px] md:left-auto"
                }`}
              />
              <article
                className="surface-panel group inline-block w-full max-w-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-glow)]"
                style={{ transform: "perspective(1000px)" }}
              >
                <div className="font-mono text-[11px] uppercase tracking-widest text-accent">
                  {dateLabel}
                  {item.icon && <span className="ml-2 text-muted-foreground">· {item.icon}</span>}
                </div>
                <h3 className="mt-2 font-display text-lg text-foreground">{item.title}</h3>
                {item.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                )}
              </article>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 text-center">
        <Link to="/events" className="text-sm text-accent underline-offset-4 hover:underline">
          Full schedule →
        </Link>
      </div>
    </section>
  );
}
