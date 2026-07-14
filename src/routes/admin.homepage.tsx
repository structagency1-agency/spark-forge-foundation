import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { EntityFormDialog, FieldRow } from "@/components/admin/EntityFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { writeAuditLog } from "@/services/admin";
import type { HomepageSection } from "@/models/db";
import { Pencil, Plus } from "lucide-react";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { useEntityCreate, useEntityDelete } from "@/lib/adminCrud";

const homepageAdminQueryOptions = queryOptions({
  queryKey: ["admin", "homepage"],
  queryFn: async () => {
    const { data, error } = await supabase.from("homepage_content").select("*").order("sort_order");
    if (error) throw error;
    return (data ?? []) as HomepageSection[];
  },
});

export const Route = createFileRoute("/admin/homepage")({
  loader: ({ context }) => context.queryClient.ensureQueryData(homepageAdminQueryOptions),
  component: HomepageAdmin,
});

function HomepageAdmin() {
  const { data: rows } = useSuspenseQuery(homepageAdminQueryOptions);
  const qc = useQueryClient();
  const [dlg, setDlg] = useState<{ open: boolean; row?: HomepageSection }>({ open: false });
  const create = useEntityCreate<HomepageSection>({ table: "homepage_content", module: "homepage", invalidateKeys: [["admin", "homepage"], ["homepage"]] });
  const remove = useEntityDelete({ table: "homepage_content", module: "homepage", invalidateKeys: [["admin", "homepage"], ["homepage"]] });

  async function saveEdit(values: Partial<HomepageSection>) {
    if (!dlg.row) return;
    // Parse content JSON safely
    let content = values.content;
    if (typeof content === "string") {
      try { content = JSON.parse(content); } catch { toast.error("Invalid JSON in content"); return; }
    }
    const { error } = await supabase.from("homepage_content").update({
      title: values.title ?? null,
      section_key: values.section_key,
      content: content ?? {},
      is_active: values.is_active,
      sort_order: values.sort_order,
    }).eq("id", dlg.row.id);
    if (error) return toast.error(error.message);
    toast.success("Section updated");
    await writeAuditLog({ action: "update", module: "homepage", description: dlg.row.section_key });
    qc.invalidateQueries({ queryKey: ["admin", "homepage"] });
    qc.invalidateQueries({ queryKey: ["homepage"] });
  }

  return (
    <div>
      <AdminPageHeader
        title="Homepage Management"
        description="Edit dynamic homepage sections. Content is JSON — keep the same shape when editing."
        actions={<Button onClick={() => setDlg({ open: true })}><Plus className="mr-1 h-4 w-4" /> New section</Button>}
      />
      <DataTable
        rows={rows}
        searchFields={(r) => `${r.section_key} ${r.title ?? ""}`}
        columns={[
          { key: "sort", header: "#", render: (r) => r.sort_order },
          { key: "key", header: "Section key", render: (r) => <span className="font-mono text-xs">{r.section_key}</span> },
          { key: "title", header: "Title", render: (r) => r.title ?? "—" },
          { key: "active", header: "Active", render: (r) => r.is_active ? "Yes" : "No" },
        ]}
        actions={(r) => (
          <>
            <Button size="sm" variant="outline" onClick={() => setDlg({ open: true, row: r })}><Pencil className="h-3.5 w-3.5" /></Button>
            <ConfirmButton onConfirm={() => remove.mutateAsync(r.id)} />
          </>
        )}
      />
      <EntityFormDialog<HomepageSection>
        open={dlg.open}
        onOpenChange={(v) => setDlg({ open: v })}
        title={dlg.row ? `Edit ${dlg.row.section_key}` : "New section"}
        initial={
          dlg.row
            ? { ...dlg.row, content: JSON.stringify(dlg.row.content, null, 2) as unknown as HomepageSection["content"] }
            : { is_active: true, sort_order: rows.length + 1, content: "{}" as unknown as HomepageSection["content"] }
        }
        onSubmit={async (values) => {
          if (dlg.row) await saveEdit(values);
          else {
            let content = values.content;
            if (typeof content === "string") { try { content = JSON.parse(content); } catch { toast.error("Invalid JSON"); return; } }
            await create.mutateAsync({ ...values, content: content ?? {} });
          }
        }}
        render={({ values, setValue }) => (
          <>
            <FieldRow label="Section key">
              <Input required value={(values.section_key as string) ?? ""} onChange={(e) => setValue("section_key", e.target.value)} disabled={!!dlg.row} />
            </FieldRow>
            <FieldRow label="Title">
              <Input value={(values.title as string) ?? ""} onChange={(e) => setValue("title", e.target.value)} />
            </FieldRow>
            <FieldRow label="Content (JSON)">
              <Textarea
                rows={14}
                className="font-mono text-xs"
                value={typeof values.content === "string" ? values.content : JSON.stringify(values.content ?? {}, null, 2)}
                onChange={(e) => setValue("content", e.target.value as unknown as HomepageSection["content"])}
              />
            </FieldRow>
            <FieldRow label="Sort order">
              <Input type="number" value={(values.sort_order as number) ?? 0} onChange={(e) => setValue("sort_order", Number(e.target.value))} />
            </FieldRow>
            <FieldRow label="Active">
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={values.is_active ? "1" : "0"}
                onChange={(e) => setValue("is_active", e.target.value === "1")}
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
