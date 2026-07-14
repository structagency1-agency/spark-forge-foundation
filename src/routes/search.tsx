import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { PageShell } from "@/components/layout/PageShell";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { buildMeta } from "@/lib/seo";
import { searchQueryOptions, type SearchResult } from "@/services/search";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  head: ({ match }) => {
    const q = (match.search as { q: string })?.q ?? "";
    return buildMeta({
      title: q ? `Search: ${q}` : "Search",
      description: "Search across SPARK TANK 4.0 events, problem statements and gallery.",
      path: "/search",
    });
  },
  component: SearchPage,
});

const KIND_LABEL: Record<SearchResult["kind"], string> = {
  event: "Event",
  problem: "Problem statement",
  gallery: "Gallery",
};

function SearchPage() {
  const { q } = Route.useSearch();
  const query = q.slice(0, 100);
  const { data } = useSuspenseQuery(searchQueryOptions(query));

  return (
    <PageShell
      eyebrow="Search"
      title={query ? `Results for “${query}”` : "Search"}
      description={
        query
          ? `${data.length} match${data.length === 1 ? "" : "es"} across events, briefs and gallery.`
          : "Type at least two characters in the header search."
      }
    >
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Search" }]} />

      {query.length < 2 ? (
        <p className="text-sm text-muted-foreground">Start typing in the header search bar.</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing matched that query.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((r) => (
            <li key={`${r.kind}-${r.id}`}>
              <Link
                to={r.href}
                className="surface-panel block p-5 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-accent">
                    {KIND_LABEL[r.kind]}
                  </span>
                  {r.meta && <span className="text-xs text-muted-foreground">{r.meta}</span>}
                </div>
                <h3 className="mt-2 font-display text-lg text-foreground">{r.title}</h3>
                {r.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
