/**
 * Public › Printable certificate — /certificate/$code
 * Verifies + renders a certificate with an embedded QR pointing at the
 * verify page. Uses `verify_certificate` RPC for zero-trust lookup.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Printer, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { buildMeta } from "@/lib/seo";
import { verifyCertificate } from "@/services/results";
import { renderQrDataUrl } from "@/lib/qr";

type Payload = {
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

const TYPE_TITLE: Record<string, string> = {
  participation: "Certificate of Participation",
  winner: "Certificate of Achievement — Winner",
  runner_up: "Certificate of Achievement — Runner Up",
  jury: "Certificate of Appreciation — Jury",
  special: "Certificate of Special Mention",
};

export const Route = createFileRoute("/certificate/$code")({
  head: ({ params }) =>
    buildMeta({
      title: `Certificate ${params.code}`,
      description: "Printable SPARK TANK 4.0 certificate.",
      path: `/certificate/${params.code}`,
    }),
  component: CertificatePage,
});

function CertificatePage() {
  const { code } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["certificate", code],
    queryFn: async () => (await verifyCertificate(code)) as Payload,
    staleTime: 60_000,
  });

  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || !data?.valid) return;
    const url = `${window.location.origin}/verify-certificate/${code}`;
    renderQrDataUrl(url, 220).then(setQr).catch(() => setQr(null));
  }, [data, code]);

  if (isLoading) {
    return (
      <PageShell title="Loading certificate…">
        <p className="text-muted-foreground">Please wait…</p>
      </PageShell>
    );
  }

  if (!data || !data.valid) {
    return (
      <PageShell title="Certificate not found" description={code}>
        <EmptyState title="Not available" description="This code does not match any issued certificate." />
      </PageShell>
    );
  }

  return (
    <main className="container-page py-10 md:py-14 print:py-0">
      <div className="mb-6 flex justify-between print:hidden">
        <div>
          <h1 className="font-display text-2xl">Certificate</h1>
          <p className="text-sm text-muted-foreground">
            <ShieldCheck className="inline h-4 w-4 text-emerald-400" /> Verified — {data.certificate_code}
          </p>
        </div>
        <Button onClick={() => window.print()} variant="outline">
          <Printer className="mr-1 h-4 w-4" /> Print / Save PDF
        </Button>
      </div>

      <article className="mx-auto max-w-4xl aspect-[1.414/1] surface-panel p-12 relative overflow-hidden print:border-0 print:shadow-none print:bg-white print:text-black">
        {/* Decorative gradient border on-screen */}
        <div className="absolute inset-0 pointer-events-none border-4 border-accent/30 rounded-lg print:border-black" />

        <div className="relative flex h-full flex-col items-center justify-between text-center">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-accent print:text-black">SPARK TANK 4.0</p>
            <h2 className="mt-2 font-display text-3xl md:text-5xl text-gradient-accent print:text-black">
              {TYPE_TITLE[data.type ?? "participation"] ?? "Certificate"}
            </h2>
          </div>

          <div className="max-w-2xl">
            <p className="text-sm text-muted-foreground print:text-black">This is proudly presented to</p>
            <p className="mt-3 font-display text-3xl md:text-4xl">{data.participant_name ?? "—"}</p>
            {data.team_name ? (
              <p className="mt-2 text-sm text-muted-foreground print:text-black">Team: {data.team_name}</p>
            ) : null}
            <p className="mt-6 text-sm md:text-base text-muted-foreground print:text-black">
              for participating in <strong className="text-foreground print:text-black">{data.event_name}</strong>
              {data.event_date ? ` on ${new Date(data.event_date).toLocaleDateString()}` : ""}.
            </p>
          </div>

          <div className="flex w-full items-end justify-between text-left">
            <div className="text-xs text-muted-foreground print:text-black">
              <div className="font-mono">{data.certificate_code}</div>
              <div>Issued {data.issued_at ? new Date(data.issued_at).toLocaleDateString() : ""}</div>
            </div>
            {qr ? (
              <div className="text-center">
                <img src={qr} alt="Verification QR" className="h-24 w-24" />
                <div className="mt-1 text-[10px] text-muted-foreground print:text-black">Scan to verify</div>
              </div>
            ) : null}
          </div>
        </div>
      </article>
    </main>
  );
}
