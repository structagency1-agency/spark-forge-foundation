import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EntityFormDialog, FieldRow } from "@/components/admin/EntityFormDialog";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { useEntityCreate, useEntityUpdate, useEntityDelete } from "@/lib/adminCrud";
import { announcementsAdminQO, type Announcement } from "@/services/announcements";
import { supabase } from "@/integrations/supabase/client";
import { writeAuditLog } from "@/services/admin";
import { toast } from "sonner";
import { Pencil, Plus, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/admin/announcements")({
  loader: ({ context }) => context.queryClient.ensureQueryData(announcementsAdminQO),
  component: AnnouncementsPage,
});

const INV = [["announcements", "all"], ["announcements", "active", "homepage"]];

function AnnouncementsPage() {
  const { data: rows } = useSuspenseQuery(announcementsAdminQO);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);

  const create = useEntityCreate<Announcement>({ table: "announcements", module: "announcements", invalidateKeys: INV });
  const update = useEntityUpdate<Announcement>({ table: "announcements", module: "announcements", invalidateKeys: INV });
  const del = useEntityDelete({ table: "announcements", module: "announcements", invalidateKeys: INV });

  const togglePublish = async (a: Announcement) => {
    const newStatus = a.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("announcements").update({ status: newStatus }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    await writeAuditLog({ action: newStatus === "published" ? "publish" : "unpublish", module: "announcements", description: a.title });
    INV.forEach((k) => qc.invalidateQueries({ queryKey: k }));
    toast.success(newStatus === "published" ? "Published" : "Unpublished");
  };

  return (
    <div>
      <AdminPageHeader
        title="Announcements"
        description="Publish site-wide announcements. Active announcements automatically show on the homepage."
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> New Announcement
          </Button>
        }
      />

      <DataTable
        rows={rows}
        searchFields={(r) => `${r.title} ${r.description}`}
        columns={[
          { key: "title", header: "Title", render: (r) => <span className="font-medium">{r.title}</span> },
          { key: "location", header: "Location", render: (r) => r.display_location },
          { key: "priority", header: "Priority", render: (r) => r.priority },
          { key: "status", header: "Status", render: (r) => (
            <span className={`rounded px-2 py-0.5 text-xs ${r.status === "published" ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}`}>{r.status}</span>
          ) },
          { key: "starts", header: "Starts", render: (r) => r.starts_at ? new Date(r.starts_at).toLocaleDateString("en-GB") : "—" },
          { key: "ends", header: "Ends", render: (r) => r.ends_at ? new Date(r.ends_at).toLocaleDateString("en-GB") : "—" },
        ]}
        actions={(row) => (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => togglePublish(row)}>
              {row.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(row); setOpen(true); }}>
              <Pencil className="h-4 w-4" />
            </Button>
            <ConfirmButton onConfirm={() => del.mutateAsync(row.id)} />
          </div>
        )}
      />

      <EntityFormDialog<Announcement>
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Announcement" : "New Announcement"}
        initial={editing ?? { display_location: "homepage", priority: "normal", status: "draft" }}
        onSubmit={async (values) => {
          if (!values.title || !values.description) { toast.error("Title and description are required"); return; }
          if (values.starts_at && values.ends_at && new Date(values.ends_at as string) <= new Date(values.starts_at as string)) {
            toast.error("End date must be after start date"); return;
          }
          if (editing) await update.mutateAsync({ id: editing.id, values });
          else await create.mutateAsync(values);
        }}
        render={({ values, setValue }) => (
          <>
            <FieldRow label="Title">
              <Input value={(values.title as string) ?? ""} onChange={(e) => setValue("title", e.target.value)} required />
            </FieldRow>
            <FieldRow label="Description">
              <Textarea value={(values.description as string) ?? ""} onChange={(e) => setValue("description", e.target.value)} rows={4} required />
            </FieldRow>
            <div className="grid gap-3 sm:grid-cols-3">
              <FieldRow label="Location">
                <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={(values.display_location as string) ?? "homepage"}
                  onChange={(e) => setValue("display_location", e.target.value)}>
                  <option value="homepage">Homepage</option>
                  <option value="events">Events</option>
                  <option value="global">Global (all pages)</option>
                </select>
              </FieldRow>
              <FieldRow label="Priority">
                <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={(values.priority as string) ?? "normal"}
                  onChange={(e) => setValue("priority", e.target.value as never)}>
                  <option value="low">low</option>
                  <option value="normal">normal</option>
                  <option value="high">high</option>
                  <option value="urgent">urgent</option>
                </select>
              </FieldRow>
              <FieldRow label="Status">
                <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={(values.status as string) ?? "draft"}
                  onChange={(e) => setValue("status", e.target.value as never)}>
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="archived">archived</option>
                </select>
              </FieldRow>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldRow label="Starts At">
                <Input type="datetime-local"
                  value={values.starts_at ? new Date(values.starts_at as string).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setValue("starts_at", e.target.value ? new Date(e.target.value).toISOString() : null)} />
              </FieldRow>
              <FieldRow label="Ends At">
                <Input type="datetime-local"
                  value={values.ends_at ? new Date(values.ends_at as string).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setValue("ends_at", e.target.value ? new Date(e.target.value).toISOString() : null)} />
              </FieldRow>
            </div>
          </>
        )}
      />
    </div>
  );
}
