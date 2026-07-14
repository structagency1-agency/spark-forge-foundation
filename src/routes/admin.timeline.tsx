import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { EntityFormDialog, FieldRow } from "@/components/admin/EntityFormDialog";
import { useEntityCreate, useEntityUpdate, useEntityDelete } from "@/lib/adminCrud";
import { supabase } from "@/integrations/supabase/client";
import type { TimelineEntry } from "@/models/db";

const timelineAdminQueryOptions = queryOptions({
  queryKey: ["admin", "timeline"],
  queryFn: async () => {
    const { data, error } = await supabase.from("timeline").select("*").order("sequence_order");
    if (error) throw error;
    return (data ?? []) as TimelineEntry[];
  },
});

export const Route = createFileRoute("/admin/timeline")({
  loader: ({ context }) => context.queryClient.ensureQueryData(timelineAdminQueryOptions),
  component: TimelineAdmin,
});

function TimelineAdmin() {
  const { data: rows } = useSuspenseQuery(timelineAdminQueryOptions);
  const [dlg, setDlg] = useState<{ open: boolean; row?: TimelineEntry }>({ open: false });
  const create = useEntityCreate<TimelineEntry>({ table: "timeline", module: "timeline", invalidateKeys: [["admin", "timeline"], ["timeline"]] });
  const update = useEntityUpdate<TimelineEntry>({ table: "timeline", module: "timeline", invalidateKeys: [["admin", "timeline"], ["timeline"]] });
  const remove = useEntityDelete({ table: "timeline", module: "timeline", invalidateKeys: [["admin", "timeline"], ["timeline"]] });

  return (
    <div>
      <AdminPageHeader
        title="Timeline"
        description="Milestones shown on the homepage 3D timeline."
        actions={<Button onClick={() => setDlg({ open: true })}><Plus className="mr-1 h-4 w-4" /> New milestone</Button>}
      />
      <DataTable
        rows={rows}
        searchFields={(r) => `${r.title} ${r.description ?? ""}`}
        columns={[
          { key: "seq", header: "#", render: (r) => r.sequence_order },
          { key: "title", header: "Title", render: (r) => <span className="font-medium">{r.title}</span> },
          { key: "date", header: "Date", render: (r) => r.event_date ? new Date(r.event_date).toLocaleDateString() : "—" },
          { key: "status", header: "Status", render: (r) => r.status },
        ]}
        actions={(r) => (
          <>
            <Button size="sm" variant="outline" onClick={() => setDlg({ open: true, row: r })}><Pencil className="h-3.5 w-3.5" /></Button>
            <ConfirmButton onConfirm={() => remove.mutateAsync(r.id)} />
          </>
        )}
      />
      <EntityFormDialog<TimelineEntry>
        open={dlg.open}
        onOpenChange={(v) => setDlg({ open: v })}
        title={dlg.row ? "Edit milestone" : "New milestone"}
        initial={dlg.row ?? { sequence_order: rows.length + 1, status: "active" }}
        onSubmit={async (values) => {
          if (dlg.row) await update.mutateAsync({ id: dlg.row.id, values });
          else await create.mutateAsync(values);
        }}
        render={({ values, setValue }) => (
          <>
            <FieldRow label="Title">
              <Input required value={(values.title as string) ?? ""} onChange={(e) => setValue("title", e.target.value)} />
            </FieldRow>
            <FieldRow label="Description">
              <Textarea value={(values.description as string) ?? ""} onChange={(e) => setValue("description", e.target.value)} />
            </FieldRow>
            <FieldRow label="Event date">
              <Input
                type="datetime-local"
                value={values.event_date ? new Date(values.event_date as string).toISOString().slice(0, 16) : ""}
                onChange={(e) => setValue("event_date", e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </FieldRow>
            <FieldRow label="Icon (lucide name)">
              <Input value={(values.icon as string) ?? ""} onChange={(e) => setValue("icon", e.target.value)} />
            </FieldRow>
            <FieldRow label="Sequence order">
              <Input type="number" value={(values.sequence_order as number) ?? 0} onChange={(e) => setValue("sequence_order", Number(e.target.value))} />
            </FieldRow>
            <FieldRow label="Status">
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={(values.status as string) ?? "published"}
                onChange={(e) => setValue("status", e.target.value as TimelineEntry["status"])}
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </FieldRow>
          </>
        )}
      />
    </div>
  );
}
