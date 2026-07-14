import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { buildMeta } from "@/lib/seo";
import {
  problemStatementsQueryOptions,
  type ProblemStatementWithEvent,
} from "@/services/problemStatements";
import { Download, FileText } from "lucide-react";

export const Route = createFileRoute("/problem-statements")({
  head: () => buildMeta({
    title: "Problem Statements",
    description: "Download the official SPARK TANK 4.0 problem statements — grouped by event and department.",
    path: "/problem-statements",
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(problemStatementsQueryOptions),
  component: ProblemStatementsPage,
});

function groupByEvent(items: ProblemStatementWithEvent[]) {
  const map = new Map<
    string,
    { eventName: string; eventSlug: string | null; department: string | null; items: ProblemStatementWithEvent[] }
  >();
  for (const it of items) {
    const key = it.events?.slug ?? "unassigned";
    if (!map.has(key)) {
      map.set(key, {
        eventName: it.events?.name ?? "Unassigned briefs",
        eventSlug: it.events?.slug ?? null,
        department: it.events?.departments?.name ?? null,
        items: [],
      });
    }
    map.get(key)!.items.push(it);
  }
  return Array.from(map.values());
}

function fmtDate(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ProblemStatementsPage() {
  const { data } = useSuspenseQuery(problemStatementsQueryOptions);
  const groups = groupByEvent(data);

  return (
    <PageShell
      eyebrow="Briefs"
      title="Problem statements"
      description="Choose a challenge, form your team, and pitch your solution."
    >
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Problem Statements" },
        ]}
      />

      {data.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="Problem statements will be released soon"
          description="Documents will appear here once organizers publish them."
        />
      ) : (
        <div className="space-y-14">
          {groups.map((g) => (
            <section key={g.eventSlug ?? g.eventName}>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  {g.eventSlug ? (
                    <Link
                      to="/events/$slug"
                      params={{ slug: g.eventSlug }}
                      className="font-display text-2xl text-foreground hover:text-accent"
                    >
                      {g.eventName}
                    </Link>
                  ) : (
                    <h2 className="font-display text-2xl">{g.eventName}</h2>
                  )}
                  {g.department && (
                    <div className="mt-1 text-xs uppercase tracking-widest text-accent">
                      {g.department}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {g.items.length} brief{g.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-4">
                {g.items.map((ps) => (
                  <article
                    key={ps.id}
                    className="surface-panel flex flex-col justify-between gap-4 p-6 md:flex-row md:items-center"
                  >
                    <div>
                      <h3 className="font-display text-lg">{ps.title}</h3>
                      {ps.description && (
                        <p className="mt-2 text-sm text-muted-foreground">{ps.description}</p>
                      )}
                      {ps.uploaded_at && (
                        <div className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                          Uploaded {fmtDate(ps.uploaded_at)}
                        </div>
                      )}
                    </div>
                    {ps.document_url && (
                      <a
                        href={ps.document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 self-start rounded-full border border-accent/50 px-5 py-2.5 text-sm text-accent hover:bg-accent hover:text-accent-foreground"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
