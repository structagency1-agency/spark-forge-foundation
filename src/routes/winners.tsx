/**
 * Public › Winners — showcase-only page (all winner_list rows across events).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Medal, Star } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/common/EmptyState";
import { buildMeta } from "@/lib/seo";
import { publicWinners } from "@/services/results";

export const Route = createFileRoute("/winners")({
  head: () =>
    buildMeta({
      title: "Winners",
      description: "Winners, runners-up and special mentions from SPARK TANK 4.0.",
      path: "/winners",
    }),
  component: WinnersPage,
});

type Row = {
  event_id: string;
  event_name: string;
  event_slug: string;
  position: string;
  team_name: string | null;
  department: string | null;
  prize: string | null;
  citation: string | null;
};

const ICON: Record<string, JSX.Element> = {
  winner: <Trophy className="h-5 w-5" />,
  runner_up: <Medal className="h-5 w-5" />,
  second_runner_up: <Medal className="h-5 w-5" />,
  special_mention: <Star className="h-5 w-5" />,
};

const LABEL: Record<string, string> = {
  winner: "Winner",
  runner_up: "Runner Up",
  second_runner_up: "2nd Runner Up",
  special_mention: "Special Mention",
};

function WinnersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["public-winners"],
    queryFn: async () => (await publicWinners()) as Row[],
    staleTime: 60_000,
  });

  return (
    <PageShell
      eyebrow="Hall of Fame"
      title="Winners"
      description="The teams that took home the honours at SPARK TANK 4.0."
    >
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={<Trophy className="h-8 w-8" />} title="No winners published yet" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((w, i) => (
            <article key={i} className="surface-panel p-6">
              <div className="flex items-center gap-2 text-accent">
                {ICON[w.position] ?? <Trophy className="h-5 w-5" />}
                <span className="text-xs uppercase tracking-widest">{LABEL[w.position] ?? w.position}</span>
              </div>
              <h3 className="mt-3 font-display text-xl">{w.team_name ?? "—"}</h3>
              <Link
                to="/events/$slug"
                params={{ slug: w.event_slug }}
                className="mt-1 inline-block text-sm text-muted-foreground hover:text-accent"
              >
                {w.event_name}
              </Link>
              {w.department ? <p className="mt-1 text-xs text-muted-foreground">{w.department}</p> : null}
              {w.prize ? <p className="mt-3 text-sm">🏆 {w.prize}</p> : null}
              {w.citation ? (
                <p className="mt-2 text-sm text-muted-foreground italic">“{w.citation}”</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </PageShell>
  );
}
