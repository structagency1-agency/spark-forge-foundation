import { Link } from "@tanstack/react-router";
import type { HomepageSection } from "@/models/db";

interface HeroProps { section: HomepageSection }

interface Cta { label?: string; href?: string }
interface HeroContent {
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
  primary_cta?: Cta;
  secondary_cta?: Cta;
}

export function Hero({ section }: HeroProps) {
  const c = (section.content ?? {}) as HeroContent;
  return (
    <section className="relative overflow-hidden grid-noise">
      <div className="container-page relative py-24 md:py-36 lg:py-44">
        <div className="max-w-4xl">
          {c.eyebrow && (
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {c.eyebrow}
            </span>
          )}
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-semibold leading-[1.02] text-gradient-accent">
            {c.headline ?? section.title}
          </h1>
          {c.subheadline && (
            <p className="mt-8 max-w-2xl text-lg md:text-xl text-muted-foreground">
              {c.subheadline}
            </p>
          )}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            {c.primary_cta?.href && c.primary_cta?.label && (
              <Link
                to={c.primary_cta.href}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-medium text-accent-foreground shadow-[var(--shadow-glow)] transition-all hover:brightness-110"
              >
                {c.primary_cta.label}
                <span aria-hidden>→</span>
              </Link>
            )}
            {c.secondary_cta?.href && c.secondary_cta?.label && (
              <Link
                to={c.secondary_cta.href}
                className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                {c.secondary_cta.label}
              </Link>
            )}
          </div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 hidden h-[520px] w-[520px] rounded-full lg:block"
          style={{
            background:
              "conic-gradient(from 200deg, transparent 0deg, var(--color-accent) 40deg, transparent 100deg, var(--color-accent-glow) 220deg, transparent 300deg)",
            opacity: 0.15,
            filter: "blur(40px)",
          }}
        />
      </div>
    </section>
  );
}
