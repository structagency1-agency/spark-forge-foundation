import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Download, QrCode as QrIcon, FileText, CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import {
  lookupRegistrationsByEmail,
  type RegistrationDetail,
} from "@/services/registration";
import { renderQrDataUrl, buildQrPayload, downloadDataUrl } from "@/lib/qr";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/my-dashboard")({
  head: () => ({
    meta: [
      { title: "My Dashboard — SPARK TANK 4.0" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) throw redirect({ to: "/auth", search: { redirect: location.href } });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    const roleSet = new Set((roles ?? []).map((r) => r.role));
    if (roleSet.has("admin") || roleSet.has("iedc_admin")) throw redirect({ to: "/admin" });
    if (roleSet.has("jury")) throw redirect({ to: "/admin/evaluation" });
    if (roleSet.has("ecell_member")) throw redirect({ to: "/ecell-attendance" });
    return { user: session.user, email: session.user.email ?? "" };
  },
  component: MyDashboardPage,
});

function MyDashboardPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { email } = Route.useRouteContext() as { email: string };

  const { data: regs, isLoading } = useQuery({
    queryKey: ["my-dashboard", email],
    queryFn: () => lookupRegistrationsByEmail(email),
    enabled: !!email,
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
        <span className="font-display text-sm">SPARK TANK 4.0 · My Dashboard</span>
        <span className="ml-2 truncate text-xs text-muted-foreground">{email}</span>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 p-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading your registrations…</p>}
        {!isLoading && (!regs || regs.length === 0) && (
          <Card className="p-6">
            <p className="text-sm">
              We couldn't find any registration for <strong>{email}</strong>. Make sure you signed up with
              the same email used as the team leader when registering.
            </p>
            <div className="mt-3 flex gap-3">
              <Link to="/events" className="text-sm text-accent underline">Browse events</Link>
              <Link to="/my-registration" search={{ q: email }} className="text-sm text-accent underline">
                Search by code
              </Link>
            </div>
          </Card>
        )}
        {regs?.map((r) => (
          <RegistrationCard key={r.registration_id} reg={r} />
        ))}
      </main>
      <Toaster />
    </div>
  );
}

function RegistrationCard({ reg }: { reg: RegistrationDetail }) {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    if (!reg.qr_token) return;
    renderQrDataUrl(
      buildQrPayload({
        registration_id: reg.registration_id,
        registration_code: reg.registration_code,
        event_id: reg.event.id,
        team_id: reg.team.id,
        qr_token: reg.qr_token,
      }),
    ).then(setQr).catch(() => setQr(null));
  }, [reg]);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase text-muted-foreground">{reg.event.name}</div>
          <h2 className="font-display text-xl">{reg.team.name}</h2>
          <div className="mt-1 text-sm text-muted-foreground">
            Code: <strong>{reg.registration_code}</strong>
          </div>
          <div className="mt-1 text-sm">
            Status: <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs uppercase">{reg.status}</span>
          </div>
        </div>
        {qr && (
          <div className="flex flex-col items-center gap-2">
            <img src={qr} alt="Your QR" className="h-32 w-32 rounded-md border border-border bg-white p-1" />
            <Button size="sm" variant="outline" onClick={() => downloadDataUrl(qr, `${reg.registration_code}.png`)}>
              <Download className="mr-1 h-4 w-4" /> QR
            </Button>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        <Link
          to="/my-registration"
          search={{ q: reg.registration_code }}
          className="flex items-center gap-2 rounded-md border border-border/60 p-3 text-sm hover:border-accent"
        >
          <QrIcon className="h-4 w-4" /> My QR & team
        </Link>
        <Link
          to="/scorecard/$code"
          params={{ code: reg.registration_code }}
          className="flex items-center gap-2 rounded-md border border-border/60 p-3 text-sm hover:border-accent"
        >
          <FileText className="h-4 w-4" /> Scorecard
        </Link>
        <Link
          to="/results"
          className="flex items-center gap-2 rounded-md border border-border/60 p-3 text-sm hover:border-accent"
        >
          <FileText className="h-4 w-4" /> Results
        </Link>
        <div className="flex items-center gap-2 rounded-md border border-border/60 p-3 text-sm">
          <CalendarCheck className="h-4 w-4" />
          Attendance: {reg.status === "attended" ? "Checked in" : "Pending"}
        </div>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        {reg.members.length} team member{reg.members.length === 1 ? "" : "s"} · {reg.event.venue ?? "Venue TBA"}
      </div>
    </Card>
  );
}
