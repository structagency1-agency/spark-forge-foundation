import { Link } from "@tanstack/react-router";
import type { HomepageSection } from "@/models/db";

export function CTA({ section }: { section: HomepageSection }) {
  const c = (section.content ?? {}) as { body?: string; primary_cta?: { label?: string; href?: string } };
  return (
    <section className="container-page py-24">
      <div className="surface-panel relative overflow-hidden px-8 py-16 md:px-16 md:py-24">
        <div className="relative z-10 max-w-3xl">
          <h2 className="font-display text-3xl md:text-5xl text-gradient-accent">
            {section.title}
          </h2>
          {c.body && (
            <p className="mt-5 text-base md:text-lg text-muted-foreground">{c.body}</p>
          )}
          {c.primary_cta?.href && c.primary_cta?.label && (
            <Link
              to={c.primary_cta.href}
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-medium text-accent-foreground shadow-[var(--shadow-glow)] transition-all hover:brightness-110"
            >
              {c.primary_cta.label} <span aria-hidden>→</span>
            </Link>
          )}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full"
          style={{
            background: "radial-gradient(circle, var(--color-accent), transparent 60%)",
            opacity: 0.25,
            filter: "blur(20px)",
          }}
        />
      </div>
    </section>
  );
}
