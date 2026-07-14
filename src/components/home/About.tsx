import type { HomepageSection } from "@/models/db";
import { SectionHeading } from "@/components/layout/SectionHeading";

export function About({ section }: { section: HomepageSection }) {
  const c = (section.content ?? {}) as { body?: string };
  return (
    <section className="container-page py-24 md:py-32">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <SectionHeading eyebrow="About" title={section.title ?? "About"} />
        <p className="text-lg md:text-xl leading-relaxed text-foreground/85">{c.body}</p>
      </div>
    </section>
  );
}
