/**
 * Public › Verify certificate (search).
 * Enter a certificate code to open /verify-certificate/$code.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Search } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { buildMeta } from "@/lib/seo";

export const Route = createFileRoute("/verify-certificate")({
  head: () =>
    buildMeta({
      title: "Verify certificate",
      description: "Verify the authenticity of a SPARK TANK 4.0 certificate by entering its code.",
      path: "/verify-certificate",
    }),
  component: VerifyPage,
});

function VerifyPage() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  return (
    <PageShell
      eyebrow="Trust"
      title="Verify certificate"
      description="Enter the certificate code printed under the QR to confirm it was issued by SPARK TANK 4.0."
    >
      <form
        className="max-w-md space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = code.trim();
          if (!trimmed) return;
          nav({ to: "/verify-certificate/$code", params: { code: trimmed } });
        }}
      >
        <div className="flex items-center gap-2 text-accent">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-sm uppercase tracking-widest">Certificate lookup</span>
        </div>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ST4-CERT-YYYY-NNNNNN"
          className="font-mono"
          autoFocus
        />
        <Button type="submit">
          <Search className="mr-1 h-4 w-4" /> Verify
        </Button>
      </form>
    </PageShell>
  );
}
