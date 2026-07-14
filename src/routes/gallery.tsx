import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { buildMeta } from "@/lib/seo";
import { galleryQueryOptions } from "@/services/gallery";
import { Images, Search } from "lucide-react";

export const Route = createFileRoute("/gallery")({
  head: () => buildMeta({
    title: "Gallery",
    description: "Photos from every edition of SPARK TANK. Filter by department or event, search by title or caption.",
    path: "/gallery",
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(galleryQueryOptions),
  component: GalleryPage,
});

function GalleryPage() {
  const { data } = useSuspenseQuery(galleryQueryOptions);
  const [department, setDepartment] = useState<string>("all");
  const [eventSlug, setEventSlug] = useState<string>("all");
  const [query, setQuery] = useState("");

  const departments = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of data) {
      const d = g.events?.departments;
      if (d) map.set(d.slug, d.name);
    }
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [data]);

  const events = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of data) {
      const e = g.events;
      if (e) map.set(e.slug, e.name);
    }
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((g) => {
      if (department !== "all" && g.events?.departments?.slug !== department) return false;
      if (eventSlug !== "all" && g.events?.slug !== eventSlug) return false;
      if (q.length > 0) {
        const hay = `${g.title ?? ""} ${g.caption ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, department, eventSlug, query]);

  return (
    <PageShell eyebrow="Gallery" title="Moments from the arena">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Gallery" }]} />

      {data.length === 0 ? (
        <EmptyState
          icon={<Images className="h-8 w-8" />}
          title="Gallery coming soon"
          description="Photos from SPARK TANK will appear here."
        />
      ) : (
        <>
          <div className="mb-8 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <label className="flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-4 py-2.5 focus-within:border-accent">
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title or caption"
                aria-label="Search photos"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              aria-label="Filter by department"
              className="rounded-full border border-border/60 bg-card/40 px-4 py-2.5 text-sm text-foreground"
            >
              <option value="all">All departments</option>
              {departments.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              value={eventSlug}
              onChange={(e) => setEventSlug(e.target.value)}
              aria-label="Filter by event"
              className="rounded-full border border-border/60 bg-card/40 px-4 py-2.5 text-sm text-foreground"
            >
              <option value="all">All events</option>
              {events.map((e) => (
                <option key={e.slug} value={e.slug}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Images className="h-8 w-8" />}
              title="No photos match your filters"
              description="Try clearing filters or searching a different keyword."
            />
          ) : (
            <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
              {filtered.map((item) => (
                <figure
                  key={item.id}
                  className="mb-4 overflow-hidden rounded-xl border border-border/60 break-inside-avoid"
                >
                  <img
                    src={item.url}
                    alt={item.title ?? item.caption ?? "Gallery image"}
                    loading="lazy"
                    className="w-full"
                  />
                  {(item.title || item.caption || item.events) && (
                    <figcaption className="space-y-1 p-3 text-xs">
                      {item.title && <div className="text-foreground">{item.title}</div>}
                      {item.caption && (
                        <div className="text-muted-foreground">{item.caption}</div>
                      )}
                      {item.events && (
                        <div className="text-[10px] uppercase tracking-widest text-accent">
                          {item.events.name}
                          {item.events.departments && ` · ${item.events.departments.code}`}
                        </div>
                      )}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
