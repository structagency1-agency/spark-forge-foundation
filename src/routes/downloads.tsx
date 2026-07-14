/**
 * Public › Download center.
 * Participants enter their registration code or email to retrieve their
 * scorecards + certificates for every event they attended.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { buildMeta } from "@/lib/seo";
import { downloadsLookup } from "@/services/results";

export const Route = createFileRoute("/downloads")({
  head: () =>
    buildMeta({
      title: "Download center",
      description: "Retrieve your SPARK TANK 4.0 scorecards and certificates by registration code or email.",
      path: "/downloads",
    }),
  component: DownloadsPage,
});

type DownloadsPayload = {
  registrations: Array<{
    registration_id: string;
    registration_code: string;
    event_name: string;
    event_slug: string;
    scorecard: { registration_code: string | null; percentage: number | null; overall_rank: number | null } | null;
    certificates: Array<{ certificate_code: string; type: string; issued_at: string }>;
  }>;
};

function DownloadsPage() {
  const [q, setQ] = useState("");
  const mut = useMutation({
    mutationFn: async (query: string) => (await downloadsLookup(query)) as DownloadsPayload,
  });

  const data = mut.data;

  return (
    <PageShell
      eyebrow="Participant portal"
      title="Download center"
      description="Find your scorecards and certificates. Enter your registration code or the team leader's email."
    >
      <form
        className="mb-8 flex flex-wrap items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) mut.mutate(q.trim());
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ST4-2025-00001 or you@college.edu"
          className="max-w-md"
        />
        <Button type="submit" disabled={mut.isPending}>
          <Search className="mr-1 h-4 w-4" /> {mut.isPending ? "Searching…" : "Search"}
        </Button>
      </form>

      {mut.isError ? (
        <p className="text-destructive">Lookup failed. Please try again.</p>
      ) : null}

      {data ? (
        data.registrations.length === 0 ? (
          <EmptyState
            icon={<Download className="h-8 w-8" />}
            title="Nothing found"
            description="No attended events found for that identifier."
          />
        ) : (
          <div className="space-y-5">
            {data.registrations.map((r) => (
              <article key={r.registration_id} className="surface-panel p-6">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      to="/events/$slug"
                      params={{ slug: r.event_slug }}
                      className="font-display text-xl hover:text-accent"
                    >
                      {r.event_name}
                    </Link>
                    <div className="text-xs text-muted-foreground font-mono">{r.registration_code}</div>
                  </div>
                  {r.scorecard?.overall_rank ? (
                    <div className="text-right text-xs text-muted-foreground">
                      Rank #{r.scorecard.overall_rank} · {r.scorecard.percentage ?? 0}%
                    </div>
                  ) : null}
                </header>
                <div className="mt-4 flex flex-wrap gap-2">
                  {r.scorecard ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/scorecard/$code" params={{ code: r.registration_code }}>
                        <Download className="mr-1 h-3.5 w-3.5" /> Scorecard
                      </Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Scorecard pending</span>
                  )}
                  {r.certificates.map((c) => (
                    <Button key={c.certificate_code} asChild size="sm" variant="outline">
                      <Link to="/certificate/$code" params={{ code: c.certificate_code }}>
                        <Download className="mr-1 h-3.5 w-3.5" /> {c.type.replace("_", " ")} certificate
                      </Link>
                    </Button>
                  ))}
                  {r.certificates.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No certificates yet</span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
    </PageShell>
  );
}
