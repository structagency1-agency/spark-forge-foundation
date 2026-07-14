/**
 * Public › Results — search + browse published event results and winner lists.
 * Backed by `public_results` and `public_winners` RPCs, so archived / hidden
 * / draft results never leak.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Trophy, Search } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildMeta } from "@/lib/seo";
import { publicResults } from "@/services/results";

export const Route = createFileRoute("/results")({
  head: () =>
    buildMeta({
      title: "Results",
      description: "Published results for SPARK TANK 4.0 events — search by event, team, or department.",
      path: "/results",
    }),
  component: ResultsPage,
});

type PublicResultRow = {
  event_id: string;
  event_name: string;
  event_slug: string;
  published_at: string | null;
  summary: string | null;
  winners: Array<{
    position: string;
    team_name: string | null;
    department: string | null;
    prize: string | null;
    citation: string | null;
  }>;
};

const POSITION_LABEL: Record<string, string> = {
  winner: "Winner",
  runner_up: "Runner Up",
  second_runner_up: "2nd Runner Up",
  special_mention: "Special Mention",
};

function ResultsPage() {
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["public-results", applied],
    queryFn: async () => (await publicResults(applied)) as PublicResultRow[],
    staleTime: 30_000,
  });

  return (
    <PageShell
      eyebrow="Leaderboard"
      title="Results & winners"
      description="Every published event with its winners, runners-up and citations."
    >
      <form
        className="mb-8 flex flex-wrap items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(q.trim());
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by event, team, department, or registration code…"
          className="max-w-md"
        />
        <Button type="submit">
          <Search className="mr-1 h-4 w-4" /> Search
        </Button>
        <Link to="/winners" className="text-sm text-accent hover:underline">
          Winners showcase →
        </Link>
        <Link to="/verify-certificate" className="text-sm text-accent hover:underline">
          Verify a certificate →
        </Link>
      </form>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-8 w-8" />}
          title="No published results yet"
          description="Winners and result summaries appear here as events conclude."
        />
      ) : (
        <div className="space-y-10">
          {data.map((r) => (
            <section key={r.event_id} className="surface-panel p-6">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    to="/events/$slug"
                    params={{ slug: r.event_slug }}
                    className="font-display text-2xl text-gradient-accent hover:opacity-80"
                  >
                    {r.event_name}
                  </Link>
                  {r.summary ? <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{r.summary}</p> : null}
                </div>
                {r.published_at ? (
                  <Badge variant="outline" className="border-accent/40 text-accent">
                    Published {new Date(r.published_at).toLocaleDateString()}
                  </Badge>
                ) : null}
              </header>
              {r.winners.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Winner list not yet available.</p>
              ) : (
                <ul className="mt-5 grid gap-3 md:grid-cols-2">
                  {r.winners.map((w, i) => (
                    <li key={i} className="rounded-md border border-border bg-background/40 p-4">
                      <div className="text-xs uppercase tracking-widest text-accent">
                        {POSITION_LABEL[w.position] ?? w.position}
                      </div>
                      <div className="mt-1 font-display text-lg">{w.team_name ?? "—"}</div>
                      {w.department ? (
                        <div className="text-xs text-muted-foreground">{w.department}</div>
                      ) : null}
                      {w.prize ? <div className="mt-2 text-sm">🏆 {w.prize}</div> : null}
                      {w.citation ? (
                        <p className="mt-2 text-sm text-muted-foreground italic">“{w.citation}”</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
