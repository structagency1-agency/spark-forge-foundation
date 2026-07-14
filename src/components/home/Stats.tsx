import type { HomepageSection } from "@/models/db";

interface Stat { value: string; label: string }

export function Stats({ section }: { section: HomepageSection }) {
  const c = (section.content ?? {}) as { items?: Stat[] };
  const items = c.items ?? [];
  if (items.length === 0) return null;
  return (
    <section className="container-page py-16">
      <div className="surface-panel grid grid-cols-2 gap-y-10 gap-x-6 px-6 py-12 md:grid-cols-4 md:px-12">
        {items.map((s, i) => (
          <div key={i} className="text-center md:text-left">
            <div className="font-display text-4xl md:text-5xl text-accent">{s.value}</div>
            <div className="mt-2 text-xs md:text-sm uppercase tracking-widest text-muted-foreground">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
