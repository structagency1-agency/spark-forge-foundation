import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/common/EmptyState";
import { buildMeta } from "@/lib/seo";
import { sponsorsQueryOptions } from "@/services/sponsors";
import { Handshake } from "lucide-react";

export const Route = createFileRoute("/sponsors")({
  head: () => buildMeta({
    title: "Sponsors",
    description: "The partners, patrons and enablers powering SPARK TANK 4.0.",
    path: "/sponsors",
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(sponsorsQueryOptions),
  component: SponsorsPage,
});

function SponsorsPage() {
  const { data } = useSuspenseQuery(sponsorsQueryOptions);
  return (
    <PageShell
      eyebrow="Partners"
      title="Powered by our sponsors"
      description="We are grateful to the organizations backing SPARK TANK 4.0."
    >
      {data.length === 0 ? (
        <EmptyState
          icon={<Handshake className="h-8 w-8" />}
          title="Partnerships in progress"
          description="Sponsor announcements will be listed here soon."
        />
      ) : (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {data.map((s) => {
            const inner = (
              <div className="surface-panel flex h-40 items-center justify-center p-6 transition-transform hover:-translate-y-1">
                {s.logo_url ? (
                  <img src={s.logo_url} alt={s.name} className="max-h-16 w-auto" />
                ) : (
                  <span className="font-display text-lg text-center">{s.name}</span>
                )}
              </div>
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
      )}
    </PageShell>
  );
}
