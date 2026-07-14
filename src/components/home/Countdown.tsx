import { useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { HomepageSection } from "@/models/db";
import { upcomingEventQueryOptions } from "@/services/events";
import { SectionHeading } from "@/components/layout/SectionHeading";

function diff(target: Date) {
  const now = new Date();
  const ms = Math.max(0, target.getTime() - now.getTime());
  return {
    d: Math.floor(ms / 86_400_000),
    h: Math.floor((ms / 3_600_000) % 24),
    m: Math.floor((ms / 60_000) % 60),
    s: Math.floor((ms / 1000) % 60),
  };
}

export function Countdown({ section }: { section: HomepageSection }) {
  const { data: event } = useSuspenseQuery(upcomingEventQueryOptions);
  const target = event?.event_date ? new Date(event.event_date) : null;
  const [t, setT] = useState(() => (target ? diff(target) : null));

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target || !t) return null;

  const cells: [string, number][] = [
    ["Days", t.d], ["Hours", t.h], ["Minutes", t.m], ["Seconds", t.s],
  ];

  return (
    <section className="container-page py-24">
      <SectionHeading
        eyebrow="Countdown"
        title={section.title ?? "Countdown"}
        description={event?.name}
      />
      <div className="surface-panel grid grid-cols-2 gap-4 p-8 md:grid-cols-4 md:p-12">
        {cells.map(([label, value]) => (
          <div key={label} className="text-center">
            <div className="font-display text-5xl md:text-7xl text-gradient-accent tabular-nums">
              {String(value).padStart(2, "0")}
            </div>
            <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
              {label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
