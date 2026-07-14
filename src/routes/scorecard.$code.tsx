/**
 * Public › Printable scorecard — /scorecard/$code
 * Renders a print-friendly page for a single team's scorecard. Fetches by
 * registration_code so participants can share the link straight from the
 * download center or their confirmation email.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { buildMeta } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  event_name: string;
  team_name: string | null;
  registration_code: string;
  total_score: number | null;
  max_score: number | null;
  percentage: number | null;
  overall_rank: number | null;
  department_rank: number | null;
  generated_at: string;
  snapshot: { criteria?: Array<{ name: string; marks: number; max_marks: number; weightage: number }> } | null;
};

export const Route = createFileRoute("/scorecard/$code")({
  head: ({ params }) =>
    buildMeta({
      title: `Scorecard ${params.code}`,
      description: "SPARK TANK 4.0 team scorecard.",
      path: `/scorecard/${params.code}`,
    }),
  component: ScorecardPage,
});

function ScorecardPage() {
  const { code } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["scorecard", code],
    queryFn: async (): Promise<Row | null> => {
      const { data: reg, error: e1 } = await supabase
        .from("registrations")
        .select("id, registration_code, teams(name), events(name)")
        .eq("registration_code", code)
        .maybeSingle();
      if (e1) throw e1;
      if (!reg) return null;
      const { data: sc, error: e2 } = await supabase
        .from("scorecards")
        .select("*")
        .eq("registration_id", reg.id)
        .maybeSingle();
      if (e2) throw e2;
      if (!sc) return null;
      return {
        id: sc.id,
        event_name: (reg as unknown as { events: { name: string } | null }).events?.name ?? "—",
        team_name: (reg as unknown as { teams: { name: string } | null }).teams?.name ?? null,
        registration_code: code,
        total_score: sc.total_score,
        max_score: sc.max_score,
        percentage: sc.percentage,
        overall_rank: sc.overall_rank,
        department_rank: sc.department_rank,
        generated_at: sc.generated_at,
        snapshot: (sc.snapshot as Row["snapshot"]) ?? null,
      };
    },
    staleTime: 60_000,
  });

  if (isLoading) return <PageShell title="Loading scorecard…"><p className="text-muted-foreground">Please wait…</p></PageShell>;

  if (!data) {
    return (
      <PageShell title="Scorecard not found" description={`No scorecard for ${code}.`}>
        <EmptyState title="Not available" description="Scorecard may not be published yet." />
      </PageShell>
    );
  }

  return (
    <main className="container-page py-10 md:py-14 print:py-4">
      <div className="mb-6 flex justify-between print:hidden">
        <div>
          <h1 className="font-display text-3xl text-gradient-accent">SPARK TANK 4.0</h1>
          <p className="text-sm text-muted-foreground">Team Scorecard</p>
        </div>
        <Button onClick={() => window.print()} variant="outline">
          <Printer className="mr-1 h-4 w-4" /> Print / Save PDF
        </Button>
      </div>

      <article className="surface-panel p-8 print:border-0 print:bg-white print:text-black print:shadow-none">
        <header className="border-b border-border pb-4 print:border-b-2 print:border-black">
          <div className="text-xs uppercase tracking-widest text-accent print:text-black">SPARK TANK 4.0</div>
          <h2 className="mt-1 font-display text-2xl">{data.event_name}</h2>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground print:text-black">
            <span>Team: <strong className="text-foreground print:text-black">{data.team_name}</strong></span>
            <span>Reg. code: <strong className="font-mono text-foreground print:text-black">{data.registration_code}</strong></span>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-4">
          <Stat label="Total score" value={`${data.total_score ?? 0} / ${data.max_score ?? 0}`} />
          <Stat label="Percentage" value={`${data.percentage ?? 0}%`} />
          <Stat label="Overall rank" value={data.overall_rank ? `#${data.overall_rank}` : "—"} />
          <Stat label="Department rank" value={data.department_rank ? `#${data.department_rank}` : "—"} />
        </section>

        {data.snapshot?.criteria?.length ? (
          <section className="mt-8">
            <h3 className="font-display text-lg mb-3">Criterion-wise marks</h3>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground print:text-black">
                <tr>
                  <th className="py-2">Criterion</th>
                  <th className="py-2 text-right">Marks</th>
                  <th className="py-2 text-right">Max</th>
                  <th className="py-2 text-right">Weightage</th>
                </tr>
              </thead>
              <tbody>
                {data.snapshot.criteria.map((c, i) => (
                  <tr key={i} className="border-t border-border/60 print:border-black/40">
                    <td className="py-2">{c.name}</td>
                    <td className="py-2 text-right font-medium">{c.marks}</td>
                    <td className="py-2 text-right text-muted-foreground print:text-black">{c.max_marks}</td>
                    <td className="py-2 text-right text-muted-foreground print:text-black">{c.weightage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        <footer className="mt-10 border-t border-border pt-4 text-xs text-muted-foreground print:text-black print:border-black">
          Generated {new Date(data.generated_at).toLocaleString()} · Verify at /verify-certificate
        </footer>
      </article>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3 print:border-black">
      <div className="text-xs uppercase tracking-widest text-muted-foreground print:text-black">{label}</div>
      <div className="mt-1 font-display text-xl">{value}</div>
    </div>
  );
}
