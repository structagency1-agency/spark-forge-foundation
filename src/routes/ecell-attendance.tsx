import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LogOut, Search, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { QRScanner } from "@/components/admin/QRScanner";
import {
  markAttendanceByQr,
  markAttendanceManual,
  eventRegistrationsQueryOptions,
  attendanceStatsQueryOptions,
} from "@/services/attendance";

export const Route = createFileRoute("/ecell-attendance")({
  head: () => ({
    meta: [
      { title: "E-Cell Attendance — SPARK TANK 4.0" },
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
    if (roleSet.has("admin") || roleSet.has("ecell_member")) {
      return { user: session.user, isAdmin: roleSet.has("admin") };
    }
    if (roleSet.has("iedc_admin")) throw redirect({ to: "/admin" });
    if (roleSet.has("jury")) throw redirect({ to: "/admin/evaluation" });
    if (roleSet.has("participant")) throw redirect({ to: "/my-dashboard" });
    await supabase.auth.signOut();
    throw redirect({ to: "/auth", search: { redirect: location.href } });
  },
  component: EcellAttendancePage,
});

type ScanRes = Awaited<ReturnType<typeof markAttendanceByQr>>;

function EcellAttendancePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user, isAdmin } = Route.useRouteContext() as { user: { id: string }; isAdmin: boolean };
  const [eventId, setEventId] = useState<string>("");
  const [manualQ, setManualQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<(ScanRes & { at: number }) | null>(null);

  // Load assigned events (or all events for admin)
  const { data: eventsData } = useQuery({
    queryKey: ["ecell", "events", user.id, isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        const { data, error } = await supabase
          .from("events")
          .select("id, name, event_date, venue, status")
          .order("event_date", { ascending: true });
        if (error) throw error;
        return data ?? [];
      }
      const { data, error } = await supabase
        .from("ecell_event_assignments")
        .select("event_id, events(id, name, event_date, venue, status)")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? [])
        .map((r) => (r as unknown as { events: { id: string; name: string; event_date: string; venue: string | null; status: string } | null }).events)
        .filter((e): e is NonNullable<typeof e> => Boolean(e));
    },
  });

  const events = eventsData ?? [];

  useEffect(() => {
    if (!eventId && events.length > 0) setEventId(events[0].id);
  }, [events, eventId]);

  const { data: stats } = useQuery({
    ...attendanceStatsQueryOptions(eventId || null),
    enabled: !!eventId,
  });

  const { data: eventRegs } = useQuery({
    ...eventRegistrationsQueryOptions(eventId || null),
    enabled: !!eventId,
  });

  const matches = useMemo(() => {
    const q = manualQ.trim().toLowerCase();
    if (!q || !eventRegs) return [];
    return eventRegs
      .filter((r) => {
        const leader = r.teams?.team_members?.find((m) => m.role === "leader") ?? r.teams?.team_members?.[0];
        return (
          (r.registration_code ?? "").toLowerCase().includes(q) ||
          (r.teams?.name ?? "").toLowerCase().includes(q) ||
          (leader?.participants?.full_name ?? "").toLowerCase().includes(q) ||
          (leader?.participants?.email ?? "").toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [eventRegs, manualQ]);

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["admin", "attendance"] });
  }

  async function onScan(text: string) {
    if (busy || !eventId) {
      if (!eventId) toast.error("Select an event first");
      return;
    }
    setBusy(true);
    try {
      const res = await markAttendanceByQr(text.trim(), eventId);
      setLast({ ...res, at: Date.now() });
      if (res.ok) {
        toast.success(`Marked: ${res.team_name}`);
        await refresh();
      } else toast.error(res.message ?? "Rejected");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onManual(regId: string) {
    setBusy(true);
    try {
      const res = await markAttendanceManual(regId);
      setLast({ ...res, at: Date.now() });
      if (res.ok) {
        toast.success(`Marked: ${res.team_name}`);
        setManualQ("");
        await refresh();
      } else toast.error(res.message ?? "Rejected");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
        <span className="font-display text-sm">SPARK TANK 4.0 · E-Cell Attendance</span>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 p-4">
        <Card className="p-4">
          <label className="mb-2 block text-xs uppercase text-muted-foreground">Assigned event</label>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You have no events assigned. Ask an admin to assign you to an event.
            </p>
          ) : (
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} {e.event_date ? `— ${new Date(e.event_date).toLocaleDateString("en-GB", { timeZone: "UTC" })}` : ""}
                </option>
              ))}
            </select>
          )}
        </Card>

        {eventId && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4">
              <div className="text-xs uppercase text-muted-foreground">Registered</div>
              <div className="text-2xl font-display">{stats?.total_registered ?? 0}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs uppercase text-muted-foreground">Attended</div>
              <div className="text-2xl font-display">{stats?.total_attended ?? 0}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs uppercase text-muted-foreground">Percentage</div>
              <div className="text-2xl font-display">{stats?.percentage ?? 0}%</div>
            </Card>
          </div>
        )}

        {eventId && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h2 className="mb-3 font-display text-lg">QR Scanner</h2>
              <QRScanner onScan={onScan} paused={busy} />
              {last && (
                <div className={`mt-3 rounded-md border p-3 text-sm ${last.ok ? "border-emerald-500/40 bg-emerald-500/10" : "border-red-500/40 bg-red-500/10"}`}>
                  {last.ok ? <CheckCircle2 className="mr-1 inline h-4 w-4" /> : <XCircle className="mr-1 inline h-4 w-4" />}
                  <strong>{last.team_name ?? "—"}</strong> · {last.registration_code ?? last.message}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h2 className="mb-3 font-display text-lg">Manual search</h2>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Registration code, team name, leader email…"
                  value={manualQ}
                  onChange={(e) => setManualQ(e.target.value)}
                />
                <Button variant="ghost" size="icon" onClick={() => refresh()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <ul className="mt-3 max-h-80 divide-y divide-border overflow-y-auto rounded-md border border-border/60">
                {matches.map((r) => {
                  const leader = r.teams?.team_members?.find((m) => m.role === "leader") ?? r.teams?.team_members?.[0];
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                      <div>
                        <div className="font-medium">{r.teams?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.registration_code} · {leader?.participants?.full_name} · {leader?.participants?.email}
                        </div>
                      </div>
                      <Button size="sm" disabled={busy} onClick={() => onManual(r.id)}>Mark</Button>
                    </li>
                  );
                })}
                {manualQ && matches.length === 0 && (
                  <li className="p-3 text-sm text-muted-foreground">No matches</li>
                )}
              </ul>
            </Card>
          </div>
        )}
      </main>
      <Toaster />
    </div>
  );
}
