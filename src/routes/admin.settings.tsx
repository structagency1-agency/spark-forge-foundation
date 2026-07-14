import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { EntityFormDialog, FieldRow } from "@/components/admin/EntityFormDialog";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { writeAuditLog } from "@/services/admin";
import { useEntityCreate, useEntityDelete } from "@/lib/adminCrud";
import type { Setting } from "@/models/db";
import { Pencil, Plus } from "lucide-react";

const settingsAdminQueryOptions = queryOptions({
  queryKey: ["admin", "settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("settings").select("*").order("key");
    if (error) throw error;
    return (data ?? []) as Setting[];
  },
});

export const Route = createFileRoute("/admin/settings")({
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsAdminQueryOptions),
  component: SettingsAdmin,
});

function SettingsAdmin() {
  const { data: rows } = useSuspenseQuery(settingsAdminQueryOptions);
  const qc = useQueryClient();
  const [dlg, setDlg] = useState<{ open: boolean; row?: Setting }>({ open: false });
  const create = useEntityCreate<Setting>({ table: "settings", module: "settings", invalidateKeys: [["admin", "settings"], ["settings"]] });
  const remove = useEntityDelete({ table: "settings", module: "settings", invalidateKeys: [["admin", "settings"], ["settings"]] });

  return (
    <div>
      <AdminPageHeader
        title="Website Settings"
        description="Key/value site configuration used across the public site."
        actions={<Button onClick={() => setDlg({ open: true })}><Plus className="mr-1 h-4 w-4" /> New setting</Button>}
      />
      <DataTable
        rows={rows}
        searchFields={(r) => `${r.key} ${r.description ?? ""}`}
        columns={[
          { key: "key", header: "Key", render: (r) => <span className="font-mono text-xs">{r.key}</span> },
          { key: "desc", header: "Description", render: (r) => <span className="text-muted-foreground">{r.description ?? "—"}</span> },
          { key: "public", header: "Public", render: (r) => r.is_public ? "Yes" : "No" },
        ]}
        actions={(r) => (
          <>
            <Button size="sm" variant="outline" onClick={() => setDlg({ open: true, row: r })}><Pencil className="h-3.5 w-3.5" /></Button>
            <ConfirmButton onConfirm={() => remove.mutateAsync(r.id)} />
          </>
        )}
      />
      <EntityFormDialog<Setting>
        open={dlg.open}
        onOpenChange={(v) => setDlg({ open: v })}
        title={dlg.row ? `Edit ${dlg.row.key}` : "New setting"}
        initial={
          dlg.row
            ? { ...dlg.row, value: JSON.stringify(dlg.row.value, null, 2) as unknown as Setting["value"] }
            : { is_public: true, value: "{}" as unknown as Setting["value"] }
        }
        onSubmit={async (values) => {
          let parsed: unknown = values.value;
          if (typeof parsed === "string") {
            try { parsed = JSON.parse(parsed); } catch { toast.error("Invalid JSON"); return; }
          }
          if (dlg.row) {
            const { error } = await supabase.from("settings").update({
              value: parsed as never,
              description: values.description ?? null,
              is_public: values.is_public,
            }).eq("id", dlg.row.id);
            if (error) return toast.error(error.message);
            toast.success("Updated");
            await writeAuditLog({ action: "update", module: "settings", description: dlg.row.key });
            qc.invalidateQueries({ queryKey: ["admin", "settings"] });
            qc.invalidateQueries({ queryKey: ["settings"] });
          } else {
            await create.mutateAsync({ ...values, value: parsed as Setting["value"] });
          }
        }}
        render={({ values, setValue }) => (
          <>
            <FieldRow label="Key">
              <Input required value={(values.key as string) ?? ""} onChange={(e) => setValue("key", e.target.value)} disabled={!!dlg.row} />
            </FieldRow>
            <FieldRow label="Description">
              <Input value={(values.description as string) ?? ""} onChange={(e) => setValue("description", e.target.value)} />
            </FieldRow>
            <FieldRow label="Value (JSON)">
              <Textarea
                rows={12}
                className="font-mono text-xs"
                value={typeof values.value === "string" ? values.value : JSON.stringify(values.value ?? {}, null, 2)}
                onChange={(e) => setValue("value", e.target.value as unknown as Setting["value"])}
              />
            </FieldRow>
            <FieldRow label="Public (readable by anon)">
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={values.is_public ? "1" : "0"}
                onChange={(e) => setValue("is_public", e.target.value === "1")}
              >
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </FieldRow>
          </>
        )}
      />
    </div>
  );
}
