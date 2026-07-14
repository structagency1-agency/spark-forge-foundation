import { useSuspenseQuery } from "@tanstack/react-query";
import type { HomepageSection } from "@/models/db";
import { sponsorsQueryOptions } from "@/services/sponsors";

export function SponsorsStrip({ section }: { section: HomepageSection }) {
  const { data } = useSuspenseQuery(sponsorsQueryOptions);
  if (data.length === 0) return null;
  return (
    <section className="container-page py-20">
      <div className="text-center">
        <span className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          {section.title ?? "Powered by"}
        </span>
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-14 gap-y-8">
        {data.map((s) => {
          const inner = s.logo_url ? (
            <img
              src={s.logo_url}
              alt={s.name}
              loading="lazy"
              className="h-10 w-auto opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
            />
          ) : (
            <span className="font-display text-lg text-muted-foreground hover:text-foreground">
              {s.name}
            </span>
          );
          return s.website ? (
            <a key={s.id} href={s.website} target="_blank" rel="noreferrer">
              {inner}
            </a>
          ) : (
            <div key={s.id}>{inner}</div>
          );
        })}
      </div>
    </section>
  );
}
