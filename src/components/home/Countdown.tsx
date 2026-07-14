import { useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { HomepageSection } from "@/models/db";
import {
  nearestRegistrationOpenQueryOptions,
  hasClosedRegistrationsQueryOptions,
} from "@/services/events";
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

/**
 * Live countdown to registration_close of the nearest event with
 * an open registration window. Falls back to "Registration Closed"
 * if any past registration window exists, or "No Active Registrations"
 * otherwise. Ticks every second on the client.
 */
export function Countdown({ section }: { section: HomepageSection }) {
  const { data: event } = useSuspenseQuery(nearestRegistrationOpenQueryOptions);
  const { data: hasClosed } = useSuspenseQuery(hasClosedRegistrationsQueryOptions);
  const target = event?.registration_close ? new Date(event.registration_close) : null;
  const [t, setT] = useState(() => (target ? diff(target) : null));

  useEffect(() => {
    if (!target) return;
    setT(diff(target));
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const message = !target
    ? hasClosed
      ? "Registration Closed"
      : "No Active Registrations"
    : null;

  const cells: [string, number][] = t
    ? [
        ["Days", t.d],
        ["Hours", t.h],
        ["Minutes", t.m],
        ["Seconds", t.s],
      ]
    : [];

  return (
    <section className="container-page py-24" aria-label="Registration countdown">
      <SectionHeading
        eyebrow="Countdown"
        title={section.title ?? "Registration closes in"}
        description={
          event && target
            ? `${event.name} — closes ${new Intl.DateTimeFormat("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "UTC",
              }).format(target)} UTC`
            : undefined
        }
      />
      <div className="surface-panel p-8 md:p-12">
        {message ? (
          <div className="py-8 text-center">
            <div className="font-display text-3xl md:text-5xl text-gradient-accent">
              {message}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {message === "Registration Closed"
                ? "Registrations for the current cycle have closed. Watch this space for the next arena."
                : "New arenas will open for registration shortly."}
            </p>
          </div>
        ) : (
          <div
            className="grid grid-cols-2 gap-4 md:grid-cols-4"
            role="timer"
            aria-live="polite"
            aria-atomic="true"
          >
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
        )}
      </div>
    </section>
  );
}
