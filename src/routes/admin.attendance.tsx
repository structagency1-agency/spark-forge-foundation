import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Download,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Users,
  Clock,
  Percent,
  ClipboardCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { DataTable } from "@/components/admin/DataTable";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { QRScanner } from "@/components/admin/QRScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { writeAuditLog } from "@/services/admin";
import {
  attendanceEventsQueryOptions,
  attendanceLogsQueryOptions,
  attendanceStatsQueryOptions,
  eventRegistrationsQueryOptions,
  markAttendanceByQr,
  markAttendanceMemberManual,
  markAttendanceManual,
  type AttendanceRow,
  type EventRegistrationRow,
} from "@/services/attendance";

export const Route = createFileRoute("/admin/attendance")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(attendanceEventsQueryOptions);
    context.queryClient.ensureQueryData(attendanceStatsQueryOptions(null));
    context.queryClient.ensureQueryData(attendanceLogsQueryOptions(null));
  },
  component: AttendanceAdmin,
});

function csvEscape(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

type ScanResult = Awaited<ReturnType<typeof markAttendanceByQr>>;

function leaderOf<T extends { role: string | null; participants: { full_name: string; email: string } | null }>(members: T[]) {
  return members.find((m) => m.role === "leader") ?? members[0];
}

function attendedParticipantIds(logs: AttendanceRow[]) {
  return new Set(
    logs
      .filter((l) => l.status === "attended" && l.participant_id)
      .map((l) => l.participant_id as string),
  );
}

function AttendanceAdmin() {
  const qc = useQueryClient();
  const { data: events } = useSuspenseQuery(attendanceEventsQueryOptions);
  const [eventId, setEventId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [deptFilter, setDeptFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [manualQuery, setManualQuery] = useState("");
  const [scanResult, setScanResult] = useState<
    (ScanResult & { at: number }) | null
  >(null);
  const [detail, setDetail] = useState<AttendanceRow | null>(null);
  const [busy, setBusy] = useState(false);

  const filterEventId = eventId || null;
  const { data: stats } = useSuspenseQuery(attendanceStatsQueryOptions(filterEventId));
  const { data: logs } = useSuspenseQuery(attendanceLogsQueryOptions(filterEventId));
  const { data: eventRegs } = useSuspenseQuery(eventRegistrationsQueryOptions(filterEventId));

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === eventId) ?? null,
    [events, eventId],
  );

  const eventRegSummary = useMemo(() => {
    const attendedIds = attendedParticipantIds(logs);
    const active = eventRegs.filter((r) => r.status !== "cancelled");
    const total = active.reduce((sum, r) => sum + (r.teams?.team_members?.length ?? 0), 0);
    const attended = active.reduce(
      (sum, r) => sum + (r.teams?.team_members ?? []).filter((m) => attendedIds.has(m.participant_id)).length,
      0,
    );
    return { total, attended, pending: Math.max(0, total - attended) };
  }, [eventRegs, logs]);

  const departments = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of eventRegs) {
      const d = r.teams?.departments;
      if (d?.id && d.name) map.set(d.id, d.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [eventRegs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (deptFilter && l.teams?.department_id !== deptFilter) return false;
      if (dateFilter) {
        const d = new Date(l.checked_in_at).toISOString().slice(0, 10);
        if (d !== dateFilter) return false;
      }
      return true;
    });
  }, [logs, statusFilter, deptFilter, dateFilter]);

  const manualMatches = useMemo(() => {
    const q = manualQuery.trim().toLowerCase();
    if (!q) return [] as EventRegistrationRow[];
    return eventRegs
      .filter((r) => {
        const members = r.teams?.team_members ?? [];
        return (
          (r.registration_code ?? "").toLowerCase().includes(q) ||
          (r.teams?.name ?? "").toLowerCase().includes(q) ||
          members.some((m) =>
            `${m.participants?.full_name ?? ""} ${m.participants?.email ?? ""} ${m.registration_number ?? ""}`
              .toLowerCase()
              .includes(q),
          )
        );
      })
      .slice(0, 15);
  }, [eventRegs, manualQuery]);

  async function handleScan(text: string) {
    if (busy || !eventId) {
      if (!eventId) toast.error("Select an event first");
      return;
    }
    setBusy(true);
    try {
      const res = await markAttendanceByQr(text.trim(), eventId);
      setScanResult({ ...res, at: Date.now() });
      if (res.ok) {
        toast.success(`Attendance marked: ${res.team_name}`);
        void writeAuditLog({
          action: "attendance_qr",
          module: "attendance",
          description: `${res.registration_code} → attended`,
        });
        await refreshAll();
      } else {
        toast.error(res.message ?? "Scan rejected");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleManual(regId: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await markAttendanceManual(regId);
      setScanResult({ ...res, at: Date.now() });
      if (res.ok) {
        toast.success(`Attendance marked: ${res.team_name}`);
        void writeAuditLog({
          action: "attendance_manual",
          module: "attendance",
          description: `${res.registration_code} → attended`,
        });
        setManualQuery("");
        await refreshAll();
      } else {
        toast.error(res.message ?? "Failed");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleManualMember(teamMemberId: string) {
    if (busy || !eventId) return;
    setBusy(true);
    try {
      const res = await markAttendanceMemberManual(teamMemberId, eventId);
      setScanResult({ ...res, at: Date.now() });
      if (res.ok) {
        toast.success(`Attendance marked: ${res.participant_name ?? res.team_name}`);
        void writeAuditLog({
          action: "attendance_manual_member",
          module: "attendance",
          description: `${res.registration_code} → ${res.participant_name ?? "member"}`,
        });
        setManualQuery("");
        await refreshAll();
      } else {
        toast.error(res.message ?? "Failed");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function refreshAll() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin", "attendance"] }),
      qc.invalidateQueries({ queryKey: ["admin", "registrations"] }),
      qc.invalidateQueries({ queryKey: ["admin", "stats"] }),
    ]);
  }

  async function changeStatus(row: AttendanceRow, status: string) {
    const { error } = await supabase
      .from("attendance")
      .update({ status })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    if (row.registration_id) {
      const regStatus = status === "attended" ? "attended" : "confirmed";
      await supabase.from("registrations").update({ status: regStatus as never }).eq("id", row.registration_id);
    }
    toast.success("Status updated");
    await writeAuditLog({
      action: "attendance_status_change",
      module: "attendance",
      description: `${row.registrations?.registration_code ?? row.id} → ${status}`,
    });
    await refreshAll();
  }

  async function removeAttendance(row: AttendanceRow) {
    const { error } = await supabase.from("attendance").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    if (row.registration_id) {
      await supabase.from("registrations").update({ status: "confirmed" as never }).eq("id", row.registration_id);
    }
    toast.success("Attendance removed");
    await writeAuditLog({
      action: "attendance_remove",
      module: "attendance",
      description: `${row.registrations?.registration_code ?? row.id}`,
    });
    await refreshAll();
  }

  function exportCsv() {
    const header = [
      "registration_code",
      "event",
      "team",
      "leader",
      "leader_email",
      "department",
      "method",
      "status",
      "checked_in_at",
    ];
    const lines = [header.join(",")];
    for (const r of filteredLogs) {
      const l = leaderOf(r.teams?.team_members ?? []);
      lines.push([
        r.registrations?.registration_code ?? "",
        r.events?.name ?? "",
        r.teams?.name ?? "",
        l?.participants?.full_name ?? "",
        l?.participants?.email ?? "",
        r.teams?.departments?.name ?? "",
        r.method,
        r.status,
        r.checked_in_at,
      ].map((v) => csvEscape(String(v))).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    void writeAuditLog({ action: "attendance_export", module: "attendance", description: `${filteredLogs.length} rows` });
  }

  return (
    <div>
      <AdminPageHeader
        title="Attendance"
        description="Live QR check-in and manual attendance for every event."
        actions={
          <>
            <Button variant="outline" onClick={() => refreshAll()}>
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
            <Button onClick={exportCsv} disabled={filteredLogs.length === 0}>
              <Download className="mr-1 h-4 w-4" /> Export CSV
            </Button>
          </>
        }
      />

      {/* Event selector */}
      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Event
          </label>
          <select
            className="min-w-[280px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          >
            <option value="">— All events (dashboard only) —</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        {selectedEvent ? (
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <div><div className="text-xs text-muted-foreground">Event</div><div className="font-medium">{selectedEvent.name}</div></div>
            <div><div className="text-xs text-muted-foreground">Department</div><div>{selectedEvent.departments?.name ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Venue</div><div>{selectedEvent.venue ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Date</div><div>{selectedEvent.event_date ? new Date(selectedEvent.event_date).toLocaleDateString() : "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Registered</div><div className="font-medium">{eventRegSummary.total}</div></div>
            <div><div className="text-xs text-muted-foreground">Attended / Pending</div><div><span className="text-emerald-500">{eventRegSummary.attended}</span> / <span className="text-amber-500">{eventRegSummary.pending}</span></div></div>
          </div>
        ) : null}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Registered" value={stats.total_registered} icon={Users} />
        <StatCard label="Attended" value={stats.total_attended} icon={CheckCircle2} />
        <StatCard label="Remaining" value={stats.remaining} icon={Clock} />
        <StatCard label="Attendance %" value={`${stats.percentage}%`} icon={Percent} />
        <StatCard label="Today" value={stats.today_attendance} hint="Checked in today" icon={ClipboardCheck} />
      </div>

      {/* Progress */}
      <div className="mt-4 rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Attendance Progress</span>
          <span>{stats.total_attended} / {stats.total_registered}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-accent to-primary transition-all"
            style={{ width: `${Math.min(100, Number(stats.percentage) || 0)}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="scan" className="mt-6">
        <TabsList>
          <TabsTrigger value="scan">QR Scanner</TabsTrigger>
          <TabsTrigger value="manual">Manual Attendance</TabsTrigger>
          <TabsTrigger value="history">Attendance History</TabsTrigger>
          <TabsTrigger value="summary">Event Summary</TabsTrigger>
        </TabsList>

        {/* Scan */}
        <TabsContent value="scan" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 font-display text-lg">Scan Member QR</h2>
              {!eventId ? (
                <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-500">
                  Select an event above to enable scanning.
                </p>
              ) : (
                <QRScanner onDecode={handleScan} />
              )}
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 font-display text-lg">Last Scan</h2>
              {!scanResult ? (
                <p className="text-sm text-muted-foreground">No scans yet.</p>
              ) : scanResult.ok ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Attendance Successful</span>
                  </div>
                  <div className="rounded-md border border-border p-3 text-sm">
                    <div><strong>Team:</strong> {scanResult.team_name}</div>
                    <div><strong>Participant:</strong> {scanResult.participant_name ?? "—"}</div>
                    <div><strong>Registration:</strong> <span className="font-mono">{scanResult.registration_code}</span></div>
                    <div><strong>Checked in:</strong> {scanResult.attended_count ?? 0} / {scanResult.member_count ?? 0}</div>
                    <div><strong>Event:</strong> {scanResult.event_name}</div>
                    <div><strong>Time:</strong> {scanResult.checked_in_at ? new Date(scanResult.checked_in_at).toLocaleString() : ""}</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">{scanResult.message ?? "Rejected"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Reason code: <span className="font-mono">{scanResult.reason}</span></p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Manual */}
        <TabsContent value="manual" className="mt-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={eventId ? "Search by registration ID, team, leader name or email…" : "Select an event to enable manual attendance"}
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                disabled={!eventId}
              />
            </div>
            {manualQuery && manualMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matching registrations.</p>
            ) : null}
            <ul className="divide-y divide-border/60">
              {manualMatches.map((r) => {
                const l = leaderOf(r.teams?.team_members ?? []);
                const attendedIds = attendedParticipantIds(logs);
                const members = r.teams?.team_members ?? [];
                return (
                  <li key={r.id} className="py-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium">{r.teams?.name} · <span className="font-mono text-xs">{r.registration_code}</span></div>
                      <div className="text-xs text-muted-foreground">
                        {l?.participants?.full_name} · {l?.participants?.email} · {r.teams?.departments?.name ?? "—"} · {r.status}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {members.map((m) => {
                        const already = attendedIds.has(m.participant_id);
                        return (
                          <div key={m.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 p-2">
                            <div className="min-w-0">
                              <div className="truncate font-medium">{m.participants?.full_name ?? "Member"}</div>
                              <div className="truncate text-xs text-muted-foreground">{m.registration_number ?? "—"} · {m.participants?.email ?? "—"}</div>
                            </div>
                            <Button size="sm" onClick={() => handleManualMember(m.id)} disabled={busy || already || r.status === "cancelled"}>
                              {already ? "Done" : r.status === "cancelled" ? "Cancelled" : "Mark"}
                            </Button>
                          </div>
                        );
                      })}
                      {members.length === 0 ? (
                        <Button size="sm" onClick={() => handleManual(r.id)} disabled={busy || r.status === "cancelled"}>
                          Mark leader
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-4">
          <div className="mb-3 flex flex-wrap gap-3">
            <select className="rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {["attended", "pending", "no_show", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">All departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="max-w-[180px]"
            />
          </div>
          <DataTable
            rows={filteredLogs}
            searchFields={(r) => {
              const l = leaderOf(r.teams?.team_members ?? []);
              return `${r.registrations?.registration_code ?? ""} ${r.teams?.name ?? ""} ${l?.participants?.full_name ?? ""} ${l?.participants?.email ?? ""} ${r.teams?.departments?.name ?? ""}`;
            }}
            columns={[
              { key: "when", header: "When", render: (r) => new Date(r.checked_in_at).toLocaleString() },
              { key: "code", header: "Registration", render: (r) => <span className="font-mono text-xs">{r.registrations?.registration_code ?? "—"}</span> },
              { key: "team", header: "Team", render: (r) => r.teams?.name ?? "—" },
              { key: "participant", header: "Participant", render: (r) => (
                <div><div className="font-medium">{r.participants?.full_name ?? "—"}</div><div className="text-xs text-muted-foreground">{r.participants?.email ?? ""}</div></div>
              ) },
              { key: "leader", header: "Leader", render: (r) => {
                const l = leaderOf(r.teams?.team_members ?? []);
                return l?.participants ? (
                  <div><div className="font-medium">{l.participants.full_name}</div><div className="text-xs text-muted-foreground">{l.participants.email}</div></div>
                ) : "—";
              } },
              { key: "event", header: "Event", render: (r) => r.events?.name ?? "—" },
              { key: "method", header: "Method", render: (r) => <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase">{r.method}</span> },
              { key: "status", header: "Status", render: (r) => (
                <select className="rounded-md border border-input bg-transparent px-2 py-1 text-xs" value={r.status} onChange={(e) => changeStatus(r, e.target.value)}>
                  {["attended", "pending", "no_show", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) },
            ]}
            actions={(r) => (
              <>
                <Button size="sm" variant="outline" onClick={() => setDetail(r)}>View</Button>
                <ConfirmButton onConfirm={() => removeAttendance(r)} />
              </>
            )}
          />
        </TabsContent>

        {/* Summary */}
        <TabsContent value="summary" className="mt-4">
          <EventSummary
            eventId={eventId}
            regs={eventRegs}
            logs={logs}
          />
        </TabsContent>
      </Tabs>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle>{detail.teams?.name ?? "Team"} — {detail.registrations?.registration_code}</DialogTitle>
                <DialogDescription>{detail.events?.name} · {new Date(detail.checked_in_at).toLocaleString()}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="rounded-md border border-border p-3">
                  <div><strong>Method:</strong> {detail.method}</div>
                  <div><strong>Status:</strong> {detail.status}</div>
                  <div><strong>Department:</strong> {detail.teams?.departments?.name ?? "—"}</div>
                  <div><strong>Participant:</strong> {detail.participants?.full_name ?? "—"}</div>
                </div>
                <div>
                  <h3 className="mb-2 font-display text-sm uppercase tracking-wide text-muted-foreground">Members</h3>
                  <ul className="divide-y divide-border/60">
                    {(detail.teams?.team_members ?? []).map((m, i) => (
                      <li key={i} className="py-2">
                        <div className="font-medium">{m.participants?.full_name} <span className="text-xs uppercase text-muted-foreground">({m.role})</span></div>
                        <div className="text-xs text-muted-foreground">{m.participants?.email}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventSummary({
  eventId,
  regs,
  logs,
}: {
  eventId: string;
  regs: EventRegistrationRow[];
  logs: AttendanceRow[];
}) {
  const attendedIds = attendedParticipantIds(logs);
  const active = regs.filter((r) => r.status !== "cancelled");
  const total = active.reduce((sum, r) => sum + (r.teams?.team_members?.length ?? 0), 0);
  const attended = active.reduce(
    (sum, r) => sum + (r.teams?.team_members ?? []).filter((m) => attendedIds.has(m.participant_id)).length,
    0,
  );
  const pending = Math.max(0, total - attended);
  const pct = total === 0 ? 0 : Math.round((attended / total) * 1000) / 10;

  const byDept = new Map<string, { total: number; attended: number }>();
  for (const r of active) {
    const name = r.teams?.departments?.name ?? "Unassigned";
    const cur = byDept.get(name) ?? { total: 0, attended: 0 };
    const members = r.teams?.team_members ?? [];
    cur.total += members.length;
    cur.attended += members.filter((m) => attendedIds.has(m.participant_id)).length;
    byDept.set(name, cur);
  }

  if (!eventId) {
    return <p className="text-sm text-muted-foreground">Select an event to see its detailed attendance summary.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Registered" value={total} />
        <StatCard label="Attended" value={attended} />
        <StatCard label="Pending" value={pending} />
        <StatCard label="Attendance %" value={`${pct}%`} />
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 font-display text-sm uppercase tracking-wide text-muted-foreground">Department-wise attendance</h3>
        {byDept.size === 0 ? (
          <p className="text-sm text-muted-foreground">No registrations for this event yet.</p>
        ) : (
          <ul className="space-y-3">
            {Array.from(byDept.entries()).sort((a, b) => b[1].total - a[1].total).map(([name, v]) => {
              const p = v.total === 0 ? 0 : Math.round((v.attended / v.total) * 100);
              return (
                <li key={name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{name}</span>
                    <span className="text-xs text-muted-foreground">{v.attended} / {v.total} · {p}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-accent" style={{ width: `${p}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
