import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Mail, ScanLine } from "lucide-react";
import { lookupRegistrationByCode } from "@/services/registration";
import { renderQrDataUrl, buildQrPayload, downloadDataUrl } from "@/lib/qr";

export function RegistrationSuccess({ code }: { code: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["registration", "lookup", code],
    queryFn: () => lookupRegistrationByCode(code),
    staleTime: 30 * 1000,
  });

  const [qr, setQr] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    renderQrDataUrl(
      buildQrPayload({
        registration_id: data.registration_id,
        registration_code: data.registration_code,
        event_id: data.event.id,
        team_id: data.team.id,
        qr_token: data.qr_token,
      }),
    )
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => setQr(null));
    return () => {
      cancelled = true;
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Preparing your confirmation…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="surface-panel p-8">
        <p className="text-sm text-destructive-foreground">
          We couldn't load your registration. Please try{" "}
          <Link to="/my-registration" className="underline">the lookup page</Link> using
          your Registration ID <span className="font-mono">{code}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div
        ref={qrRef}
        className="surface-panel flex flex-col items-center gap-4 border-emerald-400/40 p-6 text-center md:p-8"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-widest text-emerald-300">
          <ScanLine className="h-3.5 w-3.5" /> Your attendance QR
        </div>
        <p className="max-w-md text-sm text-muted-foreground">
          Show this QR at the venue — organisers will scan it to mark attendance.
          Save it now; it's also on its way to your team leader's email.
        </p>
        {qr ? (
          <img
            src={qr}
            alt={`QR code for ${data.registration_code}`}
            className="rounded-2xl border border-border/60 bg-white p-3"
            width={260}
            height={260}
          />
        ) : (
          <div className="flex h-[260px] w-[260px] items-center justify-center rounded-2xl border border-border/60 bg-muted/30">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <p className="font-mono text-xs text-muted-foreground">{data.registration_code}</p>
        <button
          type="button"
          disabled={!qr}
          onClick={() =>
            qr && downloadDataUrl(qr, `sparktank-${data.registration_code}.png`)
          }
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm text-accent-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Download QR
        </button>
      </div>

      <div className="surface-panel p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-widest text-emerald-300">
          Registration successful
        </span>
        <h2 className="mt-4 font-display text-3xl text-gradient-accent">
          {data.event.name}
        </h2>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          A confirmation email is on its way to{" "}
          <span className="text-foreground">{data.members[0]?.email}</span>
          <span className="inline-flex items-center gap-1 text-[11px]">
            <Mail className="h-3 w-3" /> QR emailed too
          </span>
        </p>

        <dl className="mt-6 grid gap-3 text-sm md:grid-cols-2">
          <Row label="Registration ID" value={data.registration_code} mono />
          <Row label="Team" value={data.team.name} />
          <Row label="Team status" value={data.status} />
          <Row label="Email status" value={data.email_status} />
        </dl>

        <div className="mt-8">
          <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground">
            Team members
          </h3>
          <ul className="mt-3 divide-y divide-border/60 rounded-xl border border-border/60">
            {data.members.map((m) => (
              <li key={`${m.email}`} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <div>
                  <div className="font-medium text-foreground">
                    {m.full_name}{" "}
                    {m.role === "leader" && (
                      <span className="ml-2 rounded-full border border-accent/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent">
                        Leader
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.registration_number} · {m.branch} · {m.academic_year}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {m.email}
                  {m.phone && <span className="ml-2">{m.phone}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/my-registration"
            search={{ q: data.registration_code }}
            className="rounded-full border border-border/60 px-5 py-2.5 text-sm hover:border-accent hover:text-accent"
          >
            View later
          </Link>
          <Link
            to="/events"
            className="rounded-full bg-accent px-5 py-2.5 text-sm text-accent-foreground"
          >
            Browse other events
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/30 p-3">
      <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd
        className={
          "mt-1 text-foreground " +
          (mono ? "font-mono text-sm" : "text-sm capitalize")
        }
      >
        {value}
      </dd>
    </div>
  );
}
