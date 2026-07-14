import type { HomepageSection } from "@/models/db";
import { SectionHeading } from "@/components/layout/SectionHeading";

interface Focus {
  title: string;
  description: string;
}
interface Content {
  body?: string;
  items?: Focus[];
}

export function InnovationOverview({ section }: { section: HomepageSection }) {
  const c = (section.content ?? {}) as Content;
  const items = c.items ?? [];
  return (
    <section className="container-page py-24 md:py-32">
      <SectionHeading
        eyebrow="Innovation"
        title={section.title ?? "Innovation focus"}
        description={c.body}
      />
      {items.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.title}
              className="surface-panel h-full p-6 transition-transform hover:-translate-y-1"
            >
              <div className="mb-4 h-1 w-8 rounded-full bg-accent shadow-[0_0_16px_var(--color-accent)]" />
              <h3 className="font-display text-lg">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
