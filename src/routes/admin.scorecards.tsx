/**
 * Admin › Scorecards — read-only listing of generated scorecards, with a
 * link to the print-friendly public scorecard view (via registration code).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

type Row = {
  id: string;
  event_id: string;
  event_name: string | null;
  team_id: string | null;
  team_name: string | null;
  registration_id: string;
  registration_code: string | null;
  total_score: number | null;
  max_score: number | null;
  percentage: number | null;
  overall_rank: number | null;
  department_rank: number | null;
  generated_at: string;
};

const scorecardsQuery = queryOptions({
  queryKey: ["admin", "scorecards"],
  queryFn: async (): Promise<Row[]> => {
    const { data, error } = await supabase
      .from("scorecards")
      .select(
        "id, event_id, team_id, registration_id, total_score, max_score, percentage, overall_rank, department_rank, generated_at, events(name), teams(name), registrations(registration_code)",
      )
      .order("event_id")
      .order("overall_rank", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return ((data ?? []) as unknown as Array<
      Row & {
        events: { name: string } | null;
        teams: { name: string } | null;
        registrations: { registration_code: string | null } | null;
      }
    >).map((r) => ({
      ...r,
      event_name: r.events?.name ?? null,
      team_name: r.teams?.name ?? null,
      registration_code: r.registrations?.registration_code ?? null,
    }));
  },
});

export const Route = createFileRoute("/admin/scorecards")({
  loader: ({ context }) => context.queryClient.ensureQueryData(scorecardsQuery),
  component: ScorecardsAdmin,
});

function ScorecardsAdmin() {
  const { data: rows } = useSuspenseQuery(scorecardsQuery);

  return (
    <div>
      <AdminPageHeader
        title="Scorecards"
        description="Snapshots produced by publishing an event. Each attended team gets one scorecard with rankings and criterion marks."
      />
      <DataTable
        rows={rows}
        searchFields={(r) => `${r.event_name ?? ""} ${r.team_name ?? ""} ${r.registration_code ?? ""}`}
        columns={[
          { key: "event", header: "Event", render: (r) => r.event_name ?? "—" },
          { key: "team", header: "Team", render: (r) => r.team_name ?? "—" },
          { key: "code", header: "Reg. code", render: (r) => <span className="font-mono text-xs">{r.registration_code ?? "—"}</span> },
          {
            key: "score",
            header: "Score",
            render: (r) => (
              <span>
                {r.total_score ?? 0} / {r.max_score ?? 0}
                <span className="ml-2 text-xs text-muted-foreground">({r.percentage ?? 0}%)</span>
              </span>
            ),
          },
          {
            key: "rank",
            header: "Rank",
            render: (r) => (
              <div className="text-xs">
                <div>Overall: #{r.overall_rank ?? "—"}</div>
                <div className="text-muted-foreground">Dept: #{r.department_rank ?? "—"}</div>
              </div>
            ),
          },
          { key: "gen", header: "Generated", render: (r) => new Date(r.generated_at).toLocaleString() },
        ]}
        actions={(r) =>
          r.registration_code ? (
            <Button asChild size="sm" variant="outline">
              <Link to="/scorecard/$code" params={{ code: r.registration_code }}>
                <ExternalLink className="mr-1 h-3 w-3" /> View
              </Link>
            </Button>
          ) : null
        }
      />
    </div>
  );
}
