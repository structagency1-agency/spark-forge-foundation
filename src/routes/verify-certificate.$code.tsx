/**
 * Public › Verify certificate result page — /verify-certificate/$code
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/common/EmptyState";
import { buildMeta } from "@/lib/seo";
import { verifyCertificate } from "@/services/results";

export const Route = createFileRoute("/verify-certificate/$code")({
  head: ({ params }) =>
    buildMeta({
      title: `Verify ${params.code}`,
      description: "Certificate verification result.",
      path: `/verify-certificate/${params.code}`,
    }),
  component: VerifyResult,
});

type VerifyPayload = {
  valid: boolean;
  certificate_code?: string;
  type?: string;
  status?: string;
  issued_at?: string;
  participant_name?: string;
  team_name?: string | null;
  event_name?: string | null;
  event_date?: string | null;
};

function VerifyResult() {
  const { code } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["verify-cert", code],
    queryFn: async () => (await verifyCertificate(code)) as VerifyPayload,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <PageShell title="Verifying…" description={code}>
        <p className="text-muted-foreground">Checking certificate…</p>
      </PageShell>
    );
  }

  if (error || !data || !data.valid) {
    return (
      <PageShell eyebrow="Verification" title="Not valid" description={`Code ${code} was not found or is not issued.`}>
        <EmptyState
          icon={<ShieldAlert className="h-8 w-8" />}
          title="Certificate not found"
          description="Double-check the code exactly as printed. If you still see this, contact the organisers."
        />
        <div className="mt-6">
          <Link to="/verify-certificate" className="text-accent underline">
            ← Verify another
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Verified" title="Certificate is valid" description={`Code ${data.certificate_code}`}>
      <div className="surface-panel max-w-2xl p-6">
        <div className="flex items-center gap-2 text-emerald-400">
          <ShieldCheck className="h-6 w-6" />
          <span className="font-medium">Issued by SPARK TANK 4.0</span>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Participant</dt>
            <dd className="mt-1 font-medium">{data.participant_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Team</dt>
            <dd className="mt-1 font-medium">{data.team_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Event</dt>
            <dd className="mt-1 font-medium">{data.event_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Type</dt>
            <dd className="mt-1 font-medium capitalize">{data.type?.replace("_", " ") ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Issued</dt>
            <dd className="mt-1 font-medium">{data.issued_at ? new Date(data.issued_at).toLocaleString() : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="mt-1 font-medium capitalize">{data.status ?? "—"}</dd>
          </div>
        </dl>
        {data.certificate_code ? (
          <div className="mt-6">
            <Link
              to="/certificate/$code"
              params={{ code: data.certificate_code }}
              className="text-accent underline"
            >
              View printable certificate →
            </Link>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
