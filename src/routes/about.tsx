import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/layout/PageShell";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { buildMeta } from "@/lib/seo";
import { settingsQueryOptions, pickString, pickArray } from "@/services/settings";
import { SITE_FALLBACK } from "@/config/site";

export const Route = createFileRoute("/about")({
  head: () => buildMeta({
    title: "About",
    description: SITE_FALLBACK.description,
    path: "/about",
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQueryOptions),
  component: AboutPage,
});

function AboutPage() {
  const { data: settings } = useSuspenseQuery(settingsQueryOptions);
  const body = pickString(settings, "about", "body", SITE_FALLBACK.description);
  const mission = pickString(settings, "about", "mission");
  const vision = pickString(settings, "about", "vision");
  const focus = pickString(settings, "about", "innovation_focus");
  const objectives = pickArray<string>(settings, "about", "objectives");
  const stats = pickArray<{ label: string; value: string }>(settings, "stats", "items");

  return (
    <PageShell
      eyebrow="About"
      title="An arena for engineers who build."
      description={body}
    >
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About" }]} />

      <div className="grid gap-6 md:grid-cols-2">
        {mission && (
          <article className="surface-panel p-8">
            <h2 className="font-display text-2xl text-gradient-accent">Our mission</h2>
            <p className="mt-4 text-muted-foreground">{mission}</p>
          </article>
        )}
        {vision && (
          <article className="surface-panel p-8">
            <h2 className="font-display text-2xl text-gradient-accent">Our vision</h2>
            <p className="mt-4 text-muted-foreground">{vision}</p>
          </article>
        )}
      </div>

      {objectives.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl">Objectives</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {objectives.map((o, i) => (
              <li
                key={i}
                className="surface-panel flex items-start gap-4 p-5 text-sm text-foreground/85"
              >
                <span className="mt-1 font-mono text-xs text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {focus && (
        <section className="mt-12">
          <h2 className="font-display text-2xl">Innovation focus</h2>
          <p className="mt-4 max-w-3xl text-muted-foreground">{focus}</p>
        </section>
      )}

      {stats.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl">By the numbers</h2>
          <div className="mt-6 grid gap-4 grid-cols-2 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="surface-panel p-6 text-center">
                <div className="font-display text-3xl md:text-4xl text-gradient-accent">
                  {s.value}
                </div>
                <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
