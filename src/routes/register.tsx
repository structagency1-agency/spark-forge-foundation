import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";
import { buildMeta } from "@/lib/seo";

export const Route = createFileRoute("/register")({
  head: () => buildMeta({
    title: "Register",
    description: "Team registration for SPARK TANK 4.0. Registrations open in Stage 2.",
    path: "/register",
  }),
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <PageShell
      eyebrow="Registration"
      title="Team registration"
      description="Registration will open shortly. This is where teams will sign up, choose an event, and add their members."
    >
      <div className="surface-panel p-8 md:p-12">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs uppercase tracking-widest text-accent">
            Coming soon
          </span>
          <h2 className="mt-4 font-display text-2xl">
            The registration flow is being finalized.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Once live, team leads will be able to create a team, invite members, pick an event and confirm participation — all from this page.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/events"
              className="rounded-full border border-border px-6 py-3 text-sm hover:border-accent hover:text-accent"
            >
              Browse events
            </Link>
            <Link
              to="/contact"
              className="rounded-full bg-accent px-6 py-3 text-sm text-accent-foreground"
            >
              Talk to organizers
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
