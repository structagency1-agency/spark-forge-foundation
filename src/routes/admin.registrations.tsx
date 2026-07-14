import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { writeAuditLog } from "@/services/admin";
import { useEntityDelete } from "@/lib/adminCrud";

type RegistrationRow = {
  id: string;
  registration_code: string | null;
  status: string;
  email_status: string;
  registered_at: string;
  qr_token: string | null;
  idea_title: string | null;
  abstract: string | null;
  project_track: string | null;
  events: { id: string; name: string; slug: string } | null;
  teams: {
    id: string;
    name: string;
    academic_year: string | null;
    team_members: Array<{
      role: string | null;
      branch: string | null;
      academic_year: string | null;
      registration_number: string | null;
      participants: { full_name: string; email: string; phone: string | null } | null;
    }>;
  } | null;
};

const registrationsAdminQueryOptions = queryOptions({
  queryKey: ["admin", "registrations"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("registrations")
      .select(
        "id, registration_code, status, email_status, registered_at, qr_token, idea_title, abstract, project_track, events(id, name, slug), teams(id, name, academic_year, team_members(role, branch, academic_year, registration_number, participants(full_name, email, phone)))",
      )
      .order("registered_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as RegistrationRow[];
  },
});

const eventsSlimQueryOptions = queryOptions({
  queryKey: ["admin", "events-slim"],
  queryFn: async () => {
    const { data, error } = await supabase.from("events").select("id, name").order("name");
    if (error) throw error;
    return data ?? [];
  },
});

export const Route = createFileRoute("/admin/registrations")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(registrationsAdminQueryOptions);
    context.queryClient.ensureQueryData(eventsSlimQueryOptions);
  },
  component: RegistrationsAdmin,
});

function csvEscape(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function RegistrationsAdmin() {
  const { data: rows } = useSuspenseQuery(registrationsAdminQueryOptions);
  const { data: events } = useSuspenseQuery(eventsSlimQueryOptions);
  const qc = useQueryClient();
  const [eventFilter, setEventFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [detail, setDetail] = useState<RegistrationRow | null>(null);
  const remove = useEntityDelete({ table: "registrations", module: "registrations", invalidateKeys: [["admin", "registrations"]] });

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (eventFilter && r.events?.id !== eventFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      return true;
    });
  }, [rows, eventFilter, statusFilter]);

  function exportCsv() {
    const header = ["registration_code", "event", "team", "leader_name", "leader_email", "leader_phone", "members_count", "status", "email_status", "registered_at"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      const leader = r.teams?.team_members.find((m) => m.role === "leader") ?? r.teams?.team_members[0];
      lines.push([
        r.registration_code ?? "",
        r.events?.name ?? "",
        r.teams?.name ?? "",
        leader?.participants?.full_name ?? "",
        leader?.participants?.email ?? "",
        leader?.participants?.phone ?? "",
        String(r.teams?.team_members.length ?? 0),
        r.status,
        r.email_status,
        r.registered_at,
      ].map((v) => csvEscape(String(v))).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spark-tank-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    void writeAuditLog({ action: "export_csv", module: "registrations", description: `${filtered.length} rows` });
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("registrations").update({ status: status as never }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    await writeAuditLog({ action: "status_change", module: "registrations", description: `${id} → ${status}` });
    qc.invalidateQueries({ queryKey: ["admin", "registrations"] });
  }

  return (
    <div>
      <AdminPageHeader
        title="Registrations"
        description="Every team registration across all events."
        actions={<Button onClick={exportCsv}><Download className="mr-1 h-4 w-4" /> Export CSV</Button>}
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <select className="rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
          <option value="">All events</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select className="rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {["confirmed", "cancelled", "attended", "evaluated", "completed"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <DataTable
        rows={filtered}
        searchFields={(r) => `${r.registration_code ?? ""} ${r.teams?.name ?? ""} ${r.events?.name ?? ""} ${r.teams?.team_members.map((m) => m.participants?.email ?? "").join(" ")}`}
        columns={[
          { key: "code", header: "Code", render: (r) => <span className="font-mono text-xs">{r.registration_code ?? "—"}</span> },
          { key: "event", header: "Event", render: (r) => r.events?.name ?? "—" },
          { key: "team", header: "Team", render: (r) => r.teams?.name ?? "—" },
          { key: "leader", header: "Leader", render: (r) => {
            const l = r.teams?.team_members.find((m) => m.role === "leader") ?? r.teams?.team_members[0];
            return l?.participants ? (
              <div>
                <div className="font-medium">{l.participants.full_name}</div>
                <div className="text-xs text-muted-foreground">{l.participants.email}</div>
              </div>
            ) : "—";
          } },
          { key: "size", header: "Size", render: (r) => r.teams?.team_members.length ?? 0 },
          { key: "status", header: "Status", render: (r) => (
            <select className="rounded-md border border-input bg-transparent px-2 py-1 text-xs" value={r.status} onChange={(e) => updateStatus(r.id, e.target.value)}>
              {["confirmed", "cancelled", "attended", "evaluated", "completed"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) },
          { key: "when", header: "Registered", render: (r) => new Date(r.registered_at).toLocaleString() },
        ]}
        actions={(r) => (
          <>
            <Button size="sm" variant="outline" onClick={() => setDetail(r)}><Eye className="h-3.5 w-3.5" /></Button>
            <ConfirmButton onConfirm={() => remove.mutateAsync(r.id)} />
          </>
        )}
      />
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle>{detail.teams?.name ?? "Team"} — {detail.registration_code}</DialogTitle>
                <DialogDescription>{detail.events?.name} · registered {new Date(detail.registered_at).toLocaleString()}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-md border border-border p-3 text-sm">
                  <div><strong>Status:</strong> {detail.status}</div>
                  <div><strong>Email:</strong> {detail.email_status}</div>
                  <div><strong>QR Token:</strong> <span className="font-mono text-xs">{detail.qr_token}</span></div>
                  <div><strong>Academic year:</strong> {detail.teams?.academic_year ?? "—"}</div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Members ({detail.teams?.team_members.length ?? 0})</h3>
                  <div className="space-y-2">
                    {detail.teams?.team_members.map((m, i) => (
                      <div key={i} className="rounded-md border border-border p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{m.participants?.full_name} <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs uppercase">{m.role}</span></div>
                          <span className="text-xs text-muted-foreground">{m.registration_number}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{m.participants?.email} · {m.participants?.phone ?? "no phone"}</div>
                        <div className="text-xs text-muted-foreground">{m.branch} · {m.academic_year}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
