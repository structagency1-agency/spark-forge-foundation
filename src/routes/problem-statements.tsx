import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/common/EmptyState";
import { buildMeta } from "@/lib/seo";
import { problemStatementsQueryOptions } from "@/services/problemStatements";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/problem-statements")({
  head: () => buildMeta({
    title: "Problem Statements",
    description: "Download the official SPARK TANK 4.0 problem statements — one document per track and event.",
    path: "/problem-statements",
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(problemStatementsQueryOptions),
  component: ProblemStatementsPage,
});

function ProblemStatementsPage() {
  const { data } = useSuspenseQuery(problemStatementsQueryOptions);
  return (
    <PageShell
      eyebrow="Briefs"
      title="Problem statements"
      description="Choose a challenge, form your team, and pitch your solution."
    >
      {data.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="Problem statements will be released soon"
          description="Documents will appear here once organizers publish them."
        />
      ) : (
        <div className="space-y-4">
          {data.map((ps) => (
            <article
              key={ps.id}
              className="surface-panel flex flex-col justify-between gap-4 p-6 md:flex-row md:items-center"
            >
              <div>
                {ps.events && (
                  <Link
                    to="/events/$slug"
                    params={{ slug: ps.events.slug }}
                    className="text-xs uppercase tracking-widest text-accent hover:underline"
                  >
                    {ps.events.name}
                  </Link>
                )}
                <h3 className="mt-1 font-display text-xl">{ps.title}</h3>
                {ps.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{ps.description}</p>
                )}
              </div>
              {ps.document_url && (
                <a
                  href={ps.document_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-accent/50 px-5 py-2.5 text-sm text-accent hover:bg-accent hover:text-accent-foreground"
                >
                  Download PDF
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </PageShell>
  );
}
