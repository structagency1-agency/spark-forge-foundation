import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Copy, Archive, ArchiveRestore, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { EntityFormDialog, FieldRow } from "@/components/admin/EntityFormDialog";
import { useEntityCreate, useEntityUpdate, useEntityDelete } from "@/lib/adminCrud";
import { supabase } from "@/integrations/supabase/client";
import { writeAuditLog } from "@/services/admin";
import { computeEventStatus, EVENT_STATUS_LABEL } from "@/lib/status";
import type { Event, Department } from "@/models/db";

const eventsAdminQueryOptions = queryOptions({
  queryKey: ["admin", "events"],
  queryFn: async () => {
    const { data, error } = await supabase.from("events").select("*, departments(name, code, slug)").order("event_date", { ascending: false, nullsFirst: false });
    if (error) throw error;
    return (data ?? []) as (Event & { departments: { name: string; code: string; slug: string } | null })[];
  },
});

const departmentsListQueryOptions = queryOptions({
  queryKey: ["admin", "departments-slim"],
  queryFn: async () => {
    const { data, error } = await supabase.from("departments").select("id, name").order("sort_order");
    if (error) throw error;
    return (data ?? []) as Pick<Department, "id" | "name">[];
  },
});

export const Route = createFileRoute("/admin/events")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(eventsAdminQueryOptions);
    context.queryClient.ensureQueryData(departmentsListQueryOptions);
  },
  component: EventsAdmin,
});

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EventsAdmin() {
  const { data: rows } = useSuspenseQuery(eventsAdminQueryOptions);
  const { data: departments } = useSuspenseQuery(departmentsListQueryOptions);
  const qc = useQueryClient();
  const [dlg, setDlg] = useState<{ open: boolean; row?: Event }>({ open: false });
  const [showArchived, setShowArchived] = useState(false);

  const create = useEntityCreate<Event>({ table: "events", module: "events", invalidateKeys: [["admin", "events"], ["events"]] });
  const update = useEntityUpdate<Event>({ table: "events", module: "events", invalidateKeys: [["admin", "events"], ["events"]] });
  const remove = useEntityDelete({ table: "events", module: "events", invalidateKeys: [["admin", "events"], ["events"]] });

  const visible = rows.filter((r) => showArchived || !r.is_archived);

  async function archive(row: Event, is_archived: boolean) {
    const { error } = await supabase.from("events").update({ is_archived }).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success(is_archived ? "Archived" : "Restored");
    await writeAuditLog({ action: is_archived ? "archive" : "unarchive", module: "events", description: row.name });
    qc.invalidateQueries({ queryKey: ["admin", "events"] });
    qc.invalidateQueries({ queryKey: ["events"] });
  }

  async function togglePublish(row: Event) {
    const { error } = await supabase.from("events").update({ is_published: !row.is_published }).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success(!row.is_published ? "Published" : "Unpublished");
    await writeAuditLog({ action: !row.is_published ? "publish" : "unpublish", module: "events", description: row.name });
    qc.invalidateQueries({ queryKey: ["admin", "events"] });
    qc.invalidateQueries({ queryKey: ["events"] });
  }

  async function duplicate(row: Event) {
    const copy: Record<string, unknown> = { ...row };
    delete copy.id; delete copy.created_at; delete copy.updated_at;
    copy.name = `${row.name} (Copy)`;
    copy.slug = `${row.slug}-copy-${Date.now().toString(36)}`;
    copy.is_published = false;
    copy.is_archived = false;
    const { error } = await supabase.from("events").insert(copy as never);
    if (error) return toast.error(error.message);
    toast.success("Duplicated");
    await writeAuditLog({ action: "duplicate", module: "events", description: row.name });
    qc.invalidateQueries({ queryKey: ["admin", "events"] });
  }

  return (
    <div>
      <AdminPageHeader
        title="Events"
        description="Manage every SPARK TANK event. Toggle publish, archive, or duplicate any row."
        actions={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
              Show archived
            </label>
            <Button onClick={() => setDlg({ open: true })}><Plus className="mr-1 h-4 w-4" /> New event</Button>
          </div>
        }
      />
      <DataTable
        rows={visible}
        searchFields={(r) => `${r.name} ${r.slug} ${r.venue ?? ""} ${r.departments?.name ?? ""}`}
        columns={[
          { key: "name", header: "Name", render: (r) => (
            <div>
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-muted-foreground">{r.slug}</div>
            </div>
          ) },
          { key: "dept", header: "Department", render: (r) => r.departments?.name ?? "—" },
          { key: "date", header: "Event date", render: (r) => r.event_date ? new Date(r.event_date).toLocaleString() : "—" },
          { key: "status", header: "Status", render: (r) => (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs uppercase">{EVENT_STATUS_LABEL[computeEventStatus(r)]}</span>
          ) },
          { key: "pub", header: "Published", render: (r) => r.is_published ? "Yes" : "No" },
          { key: "arch", header: "Archived", render: (r) => r.is_archived ? "Yes" : "" },
        ]}
        actions={(r) => (
          <>
            <Link to="/events/$slug" params={{ slug: r.slug }} className="rounded-md border border-border p-1.5" title="View live">
              <Eye className="h-3.5 w-3.5" />
            </Link>
            <Button size="sm" variant="outline" onClick={() => togglePublish(r)} title={r.is_published ? "Unpublish" : "Publish"}>
              {r.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="outline" onClick={() => duplicate(r)} title="Duplicate">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => archive(r, !r.is_archived)} title={r.is_archived ? "Restore" : "Archive"}>
              {r.is_archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDlg({ open: true, row: r })}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <ConfirmButton onConfirm={() => remove.mutateAsync(r.id)} />
          </>
        )}
      />
      <EntityFormDialog<Event>
        open={dlg.open}
        onOpenChange={(v) => setDlg({ open: v })}
        title={dlg.row ? `Edit ${dlg.row.name}` : "New event"}
        initial={dlg.row ?? {
          min_team_size: 1,
          max_team_size: 4,
          is_published: true,
          is_archived: false,
          status: "upcoming",
        }}
        onSubmit={async (values) => {
          if (!values.event_date || !values.registration_start || !values.registration_close) {
            toast.error("Please set the event date and both registration open/close dates.");
            throw new Error("Missing required dates");
          }
          const rs = new Date(values.registration_start as string).getTime();
          const rc = new Date(values.registration_close as string).getTime();
          const ed = new Date(values.event_date as string).getTime();
          if (rc <= rs) { toast.error("Registration close must be after registration open."); throw new Error("Invalid dates"); }
          if (ed < rs) { toast.error("Event date should be on/after registration opens."); throw new Error("Invalid dates"); }
          if (dlg.row) await update.mutateAsync({ id: dlg.row.id, values });
          else await create.mutateAsync(values);
        }}
        render={({ values, setValue }) => (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Name">
                <Input required value={(values.name as string) ?? ""} onChange={(e) => {
                  const name = e.target.value;
                  setValue("name", name);
                  if (!dlg.row) {
                    const auto = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                    setValue("slug", auto);
                  }
                }} />
              </FieldRow>
              <FieldRow label="Slug (URL-safe: letters, numbers, hyphens)">
                <Input required pattern="[a-z0-9\-]+" value={(values.slug as string) ?? ""}
                  onChange={(e) => setValue("slug", e.target.value.toLowerCase().replace(/[^a-z0-9\-]+/g, "-"))} />
              </FieldRow>
            </div>
            <FieldRow label="Description">
              <Textarea rows={4} value={(values.description as string) ?? ""} onChange={(e) => setValue("description", e.target.value)} />
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Department">
                <select
                  required
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={(values.department_id as string) ?? ""}
                  onChange={(e) => setValue("department_id", e.target.value)}
                >
                  <option value="">— select —</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Venue">
                <Input value={(values.venue as string) ?? ""} onChange={(e) => setValue("venue", e.target.value)} />
              </FieldRow>
            </div>
            <FieldRow label="Banner URL">
              <Input value={(values.banner_url as string) ?? ""} onChange={(e) => setValue("banner_url", e.target.value)} />
            </FieldRow>
            <FieldRow label="Sub-tracks (comma-separated — teams pick one at registration)">
              <Input
                placeholder="software, hardware"
                value={Array.isArray(values.sub_tracks) ? (values.sub_tracks as string[]).join(", ") : ""}
                onChange={(e) => {
                  const list = e.target.value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
                  setValue("sub_tracks", list.length > 0 ? list : ["software", "hardware"]);
                }}
              />
            </FieldRow>
            <div className="grid grid-cols-3 gap-3">
              <FieldRow label="Event date *">
                <Input type="datetime-local" required value={toLocalInput(values.event_date as string | null)}
                  onChange={(e) => setValue("event_date", e.target.value ? new Date(e.target.value).toISOString() : null)} />
              </FieldRow>
              <FieldRow label="Registration opens *">
                <Input type="datetime-local" required value={toLocalInput(values.registration_start as string | null)}
                  onChange={(e) => setValue("registration_start", e.target.value ? new Date(e.target.value).toISOString() : null)} />
              </FieldRow>
              <FieldRow label="Registration closes *">
                <Input type="datetime-local" required value={toLocalInput(values.registration_close as string | null)}
                  onChange={(e) => setValue("registration_close", e.target.value ? new Date(e.target.value).toISOString() : null)} />
              </FieldRow>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              Times are in your local timezone. Registration must open before it closes, and the event date should be on/after registration opens.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <FieldRow label="Min team size">
                <Input type="number" min={1} value={(values.min_team_size as number) ?? 1}
                  onChange={(e) => setValue("min_team_size", Number(e.target.value))} />
              </FieldRow>
              <FieldRow label="Max team size">
                <Input type="number" min={1} value={(values.max_team_size as number) ?? 4}
                  onChange={(e) => setValue("max_team_size", Number(e.target.value))} />
              </FieldRow>
              <FieldRow label="Max teams (capacity)">
                <Input type="number" value={(values.max_participants as number) ?? ""}
                  onChange={(e) => setValue("max_participants", e.target.value ? Number(e.target.value) : null)} />
              </FieldRow>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FieldRow label="Status">
                <select
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={(values.status as string) ?? "upcoming"}
                  onChange={(e) => setValue("status", e.target.value as Event["status"])}
                >
                  <option value="upcoming">upcoming</option>
                  <option value="registration_open">registration_open</option>
                  <option value="registration_closed">registration_closed</option>
                  <option value="ongoing">ongoing</option>
                  <option value="evaluation">evaluation</option>
                  <option value="completed">completed</option>
                </select>
              </FieldRow>
              <FieldRow label="Published">
                <select
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={values.is_published ? "1" : "0"}
                  onChange={(e) => setValue("is_published", e.target.value === "1")}
                >
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </FieldRow>
              <FieldRow label="Archived">
                <select
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={values.is_archived ? "1" : "0"}
                  onChange={(e) => setValue("is_archived", e.target.value === "1")}
                >
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </FieldRow>
            </div>
          </>
        )}
      />
    </div>
  );
}
