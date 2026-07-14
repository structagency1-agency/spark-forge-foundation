import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/common/EmptyState";
import { buildMeta } from "@/lib/seo";
import { resultsQueryOptions, winnersQueryOptions } from "@/services/results";
import { Trophy } from "lucide-react";
import type { WinnerPosition } from "@/models/db";

const POSITION_LABEL: Record<WinnerPosition, string> = {
  winner: "Winner",
  runner_up: "Runner Up",
  second_runner_up: "Second Runner Up",
  special_mention: "Special Mention",
};

export const Route = createFileRoute("/results")({
  head: () => buildMeta({
    title: "Results",
    description: "Winners, runners-up and special mentions from SPARK TANK 4.0.",
    path: "/results",
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(resultsQueryOptions),
      context.queryClient.ensureQueryData(winnersQueryOptions),
    ]);
  },
  component: ResultsPage,
});

function ResultsPage() {
  const { data: results } = useSuspenseQuery(resultsQueryOptions);
  const { data: winners } = useSuspenseQuery(winnersQueryOptions);
  const hasAny = results.length > 0 || winners.length > 0;

  return (
    <PageShell
      eyebrow="Leaderboard"
      title="Results & winners"
      description="Published results and the teams that took home the prizes."
    >
      {!hasAny ? (
        <EmptyState
          icon={<Trophy className="h-8 w-8" />}
          title="Results are not yet published"
          description="Winners and result summaries will appear here once evaluations conclude."
        />
      ) : (
        <div className="space-y-16">
          {winners.length > 0 && (
            <section>
              <h2 className="mb-6 font-display text-2xl">Winners</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {winners.map((w) => (
                  <div key={w.id} className="surface-panel p-6">
                    <div className="text-xs uppercase tracking-widest text-accent">
                      {POSITION_LABEL[w.position]}
                    </div>
                    <div className="mt-2 font-display text-xl">
                      {w.teams?.name ?? w.team_name_snapshot ?? "—"}
                    </div>
                    {w.events && (
                      <Link
                        to="/events/$slug"
                        params={{ slug: w.events.slug }}
                        className="mt-1 inline-block text-sm text-muted-foreground hover:text-accent"
                      >
                        {w.events.name}
                      </Link>
                    )}
                    {w.citation && (
                      <p className="mt-3 text-sm text-muted-foreground">{w.citation}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {results.length > 0 && (
            <section>
              <h2 className="mb-6 font-display text-2xl">Result summaries</h2>
              <div className="space-y-3">
                {results.map((r) => (
                  <article key={r.id} className="surface-panel p-6">
                    {r.events && (
                      <Link
                        to="/events/$slug"
                        params={{ slug: r.events.slug }}
                        className="text-xs uppercase tracking-widest text-accent hover:underline"
                      >
                        {r.events.name}
                      </Link>
                    )}
                    {r.summary && (
                      <p className="mt-3 text-sm text-foreground/85">{r.summary}</p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PageShell>
  );
}
