import { useEffect, useState } from "react";
import type { EventWithDepartment } from "@/services/events";
import type { EventCapacity } from "@/services/registration";
import type { RegistrationButtonState } from "@/lib/registrationButton";
import { CalendarDays, MapPin, Users, Timer } from "lucide-react";

function fmt(d?: string | null) {
  if (!d) return "TBA";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(d)) + " UTC";
}

function useCountdown(target: string | null) {
  const [t, setT] = useState<null | { d: number; h: number; m: number; s: number }>(null);
  useEffect(() => {
    if (!target) {
      setT(null);
      return;
    }
    const compute = () => {
      const ms = Math.max(0, new Date(target).getTime() - Date.now());
      setT({
        d: Math.floor(ms / 86_400_000),
        h: Math.floor((ms / 3_600_000) % 24),
        m: Math.floor((ms / 60_000) % 60),
        s: Math.floor((ms / 1000) % 60),
      });
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [target]);
  return t;
}

interface Props {
  event: EventWithDepartment;
  capacity: EventCapacity | null;
  buttonState: RegistrationButtonState;
}

export function RegistrationSummary({ event, capacity, buttonState }: Props) {
  const now = Date.now();
  const started = event.registration_start
    ? new Date(event.registration_start).getTime() <= now
    : false;
  const target =
    !started && event.registration_start
      ? event.registration_start
      : event.registration_close ?? null;

  const t = useCountdown(target);
  const remaining =
    capacity && event.max_participants != null
      ? Math.max(0, event.max_participants - capacity.registered)
      : null;

  return (
    <aside className="space-y-6">
      {event.banner_url && (
        <img
          src={event.banner_url}
          alt={event.name}
          className="w-full rounded-2xl border border-border/60 object-cover"
        />
      )}
      <div className="surface-panel p-6">
        <div className="text-xs uppercase tracking-widest text-accent">
          {event.departments?.name ?? "Event"}
        </div>
        <h2 className="mt-2 font-display text-2xl">{event.name}</h2>

        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-accent" />
            <span>Event: {fmt(event.event_date)}</span>
          </li>
          {event.venue && (
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" />
              <span>{event.venue}</span>
            </li>
          )}
          <li className="flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            <span>
              Team size {event.min_team_size}–{event.max_team_size}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-accent" />
            <span>Opens: {fmt(event.registration_start)}</span>
          </li>
          <li className="ml-6">Closes: {fmt(event.registration_close)}</li>
        </ul>

        <div className="mt-6 rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {started ? "Closes in" : "Opens in"}
          </div>
          {t ? (
            <div
              className="mt-2 grid grid-cols-4 gap-2 text-center"
              role="timer"
              aria-live="polite"
            >
              {[
                ["D", t.d],
                ["H", t.h],
                ["M", t.m],
                ["S", t.s],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <div className="font-display text-2xl text-gradient-accent tabular-nums">
                    {String(val).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 font-display text-lg text-gradient-accent">
              Registration Closed
            </div>
          )}
        </div>

        <div className="mt-6 space-y-2 text-sm">
          <StatRow label="Status" value={buttonState.label} />
          {event.max_participants != null && (
            <>
              <StatRow label="Capacity" value={String(event.max_participants)} />
              <StatRow label="Registered" value={String(capacity?.registered ?? 0)} />
              <StatRow
                label="Remaining"
                value={remaining != null ? String(remaining) : "—"}
              />
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
