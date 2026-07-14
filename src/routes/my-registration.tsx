import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useEffect, useState, type FormEvent } from "react";
import { Search as SearchIcon, Loader2, Download } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { buildMeta } from "@/lib/seo";
import {
  lookupRegistrationByCode,
  lookupRegistrationsByEmail,
  type RegistrationDetail,
  type LookupMember,
} from "@/services/registration";
import { renderQrDataUrl, buildQrPayload, buildMemberQrPayload, downloadDataUrl } from "@/lib/qr";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/my-registration")({
  validateSearch: zodValidator(searchSchema),
  head: () => buildMeta({
    title: "My Registration",
    description: "Look up your SPARK TANK 4.0 registration by Registration ID or team leader email.",
    path: "/my-registration",
  }),
  component: MyRegistrationPage,
});

function isRegistrationCode(v: string) {
  return /^ST4-\d{4}-\d{5}$/i.test(v.trim());
}

async function lookup(q: string): Promise<RegistrationDetail[]> {
  const query = q.trim();
  if (!query) return [];
  if (isRegistrationCode(query)) {
    const one = await lookupRegistrationByCode(query);
    return one ? [one] : [];
  }
  return lookupRegistrationsByEmail(query);
}

function MyRegistrationPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [input, setInput] = useState(q);

  useEffect(() => {
    setInput(q);
  }, [q]);

  const { data, isFetching, error } = useQuery({
    queryKey: ["my-registration", q],
    queryFn: () => lookup(q),
    enabled: q.trim().length > 0,
    staleTime: 15 * 1000,
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = input.trim();
    navigate({ to: "/my-registration", search: { q: next }, replace: true });
  }

  return (
    <PageShell
      eyebrow="My registration"
      title="Look up your team"
      description="Enter your Registration ID or the team leader's email to see your details."
    >
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "My Registration" },
        ]}
      />
      <form onSubmit={onSubmit} className="mb-8 flex max-w-2xl gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-full border border-border/60 bg-card/40 px-4 py-2.5">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ST4-2026-00001 or team.leader@email.com"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            maxLength={255}
            aria-label="Registration ID or email"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground shadow-[var(--shadow-glow)]"
        >
          Look up
        </button>
      </form>

      {!q.trim() ? (
        <p className="text-sm text-muted-foreground">
          You'll receive your Registration ID by email after registering.
        </p>
      ) : isFetching ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Searching…
        </div>
      ) : error ? (
        <p className="text-sm text-destructive-foreground">
          Something went wrong. Please try again.
        </p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No registration found for <span className="font-mono">{q}</span>.
        </p>
      ) : (
        <div className="space-y-8">
          {(data ?? []).map((r) => (
            <RegistrationCard key={r.registration_id} r={r} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function RegistrationCard({ r }: { r: RegistrationDetail }) {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    renderQrDataUrl(
      buildQrPayload({
        registration_id: r.registration_id,
        registration_code: r.registration_code,
        event_id: r.event.id,
        team_id: r.team.id,
        qr_token: r.qr_token,
      }),
      240,
    ).then((u) => {
      if (!cancelled) setQr(u);
    });
    return () => {
      cancelled = true;
    };
  }, [r]);

  return (
    <article className="surface-panel grid gap-8 p-6 md:p-8 lg:grid-cols-[1.6fr_1fr]">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Link
            to="/events/$slug"
            params={{ slug: r.event.slug }}
            className="font-display text-2xl text-foreground hover:text-accent"
          >
            {r.event.name}
          </Link>
          <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] uppercase tracking-widest text-accent">
            {r.status}
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{r.event.department}</div>

        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <Row label="Registration ID" value={r.registration_code} mono />
          <Row label="Team" value={r.team.name} />
          <Row label="Registered" value={new Date(r.registered_at).toLocaleString("en-US", { timeZone: "UTC" }) + " UTC"} />
          <Row label="Email status" value={r.email_status} />
        </dl>

        <h4 className="mt-6 font-display text-sm uppercase tracking-widest text-muted-foreground">
          Team members
        </h4>
        <ul className="mt-3 divide-y divide-border/60 rounded-xl border border-border/60">
          {r.members.map((m) => (
            <li key={m.email} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <div>
                <div className="font-medium text-foreground">
                  {m.full_name}
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
              <div className="text-xs text-muted-foreground">{m.email}</div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="flex flex-col items-center text-center">
        {qr ? (
          <img
            src={qr}
            alt={`QR ${r.registration_code}`}
            className="rounded-xl border border-border/60 bg-white p-2"
            width={240}
            height={240}
          />
        ) : (
          <div className="flex h-[240px] w-[240px] items-center justify-center rounded-xl border border-border/60 bg-muted/30">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <button
          type="button"
          disabled={!qr}
          onClick={() => qr && downloadDataUrl(qr, `sparktank-${r.registration_code}.png`)}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs text-accent-foreground disabled:opacity-50"
        >
          <Download className="h-3 w-3" /> Download QR
        </button>
      </aside>
    </article>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/30 p-3">
      <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className={"mt-1 text-foreground " + (mono ? "font-mono text-sm" : "text-sm capitalize")}>
        {value}
      </dd>
    </div>
  );
}
