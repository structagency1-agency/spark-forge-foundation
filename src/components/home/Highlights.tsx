import type { HomepageSection } from "@/models/db";
import { SectionHeading } from "@/components/layout/SectionHeading";

interface Item { title: string; description: string }

export function Highlights({ section }: { section: HomepageSection }) {
  const c = (section.content ?? {}) as { items?: Item[] };
  const items = c.items ?? [];
  if (items.length === 0) return null;
  return (
    <section className="container-page py-24 md:py-32">
      <SectionHeading eyebrow="Highlights" title={section.title ?? "Highlights"} />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => (
          <article
            key={i}
            className="surface-panel group relative overflow-hidden p-8 transition-transform hover:-translate-y-1"
          >
            <span className="font-mono text-xs text-accent">0{i + 1}</span>
            <h3 className="mt-4 font-display text-xl">{it.title}</h3>
            <p className="mt-3 text-sm text-muted-foreground">{it.description}</p>
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 transition-opacity group-hover:opacity-100"
            />
          </article>
        ))}
      </div>
    </section>
  );
}
