import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";
import { buildMeta } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () => buildMeta({
    title: "About",
    description: "SPARK TANK 4.0 is an inter-departmental innovation competition celebrating ideas, engineering and entrepreneurship across all engineering disciplines.",
    path: "/about",
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PageShell
      eyebrow="About"
      title="An arena for engineers who build."
      description="SPARK TANK 4.0 is the flagship innovation platform of our institution — bringing together builders, designers and dreamers from across every engineering discipline."
    >
      <div className="grid gap-12 md:grid-cols-2">
        <article className="surface-panel p-8">
          <h2 className="font-display text-2xl">Our mission</h2>
          <p className="mt-4 text-muted-foreground">
            Give every student engineer a real stage to pitch, prototype and defend original ideas — with industry mentors, faculty jurors and investors in the room.
          </p>
        </article>
        <article className="surface-panel p-8">
          <h2 className="font-display text-2xl">The format</h2>
          <p className="mt-4 text-muted-foreground">
            Nine department arenas run in parallel, each with its own qualifier. Winners advance to a cross-department semifinal and grand finale.
          </p>
        </article>
      </div>
    </PageShell>
  );
}
