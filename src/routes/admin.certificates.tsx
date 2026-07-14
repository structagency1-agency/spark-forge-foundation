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
import type { CertificateTemplate } from "@/models/db";

const templatesAdminQueryOptions = queryOptions({
  queryKey: ["admin", "certificate-templates"],
  queryFn: async () => {
    const { data, error } = await supabase.from("certificate_templates").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as CertificateTemplate[];
  },
});

export const Route = createFileRoute("/admin/certificates")({
  loader: ({ context }) => context.queryClient.ensureQueryData(templatesAdminQueryOptions),
  component: CertificatesAdmin,
});

function CertificatesAdmin() {
  const { data: rows } = useSuspenseQuery(templatesAdminQueryOptions);
  const [dlg, setDlg] = useState<{ open: boolean; row?: CertificateTemplate }>({ open: false });
  const create = useEntityCreate<CertificateTemplate>({ table: "certificate_templates", module: "certificates", invalidateKeys: [["admin", "certificate-templates"]] });
  const update = useEntityUpdate<CertificateTemplate>({ table: "certificate_templates", module: "certificates", invalidateKeys: [["admin", "certificate-templates"]] });
  const remove = useEntityDelete({ table: "certificate_templates", module: "certificates", invalidateKeys: [["admin", "certificate-templates"]] });

  return (
    <div>
      <AdminPageHeader
        title="Certificate Templates"
        description="Templates used to generate participant certificates (Stage 5 will render + issue)."
        actions={<Button onClick={() => setDlg({ open: true })}><Plus className="mr-1 h-4 w-4" /> New template</Button>}
      />
      <DataTable
        rows={rows}
        searchFields={(r) => r.name}
        columns={[
          { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "url", header: "Template URL", render: (r) => r.template_url ? <a href={r.template_url} target="_blank" rel="noreferrer" className="text-accent underline">Open</a> : "—" },
          { key: "status", header: "Status", render: (r) => r.status },
        ]}
        actions={(r) => (
          <>
            <Button size="sm" variant="outline" onClick={() => setDlg({ open: true, row: r })}><Pencil className="h-3.5 w-3.5" /></Button>
            <ConfirmButton onConfirm={() => remove.mutateAsync(r.id)} />
          </>
        )}
      />
      <EntityFormDialog<CertificateTemplate>
        open={dlg.open}
        onOpenChange={(v) => setDlg({ open: v })}
        title={dlg.row ? "Edit template" : "New template"}
        initial={dlg.row ?? { status: "active", fields: [] as unknown as CertificateTemplate["fields"] }}
        onSubmit={async (values) => {
          if (dlg.row) await update.mutateAsync({ id: dlg.row.id, values });
          else await create.mutateAsync(values);
        }}
        render={({ values, setValue }) => (
          <>
            <FieldRow label="Name">
              <Input required value={(values.name as string) ?? ""} onChange={(e) => setValue("name", e.target.value)} />
            </FieldRow>
            <FieldRow label="Template URL (PDF or image)">
              <Input value={(values.template_url as string) ?? ""} onChange={(e) => setValue("template_url", e.target.value)} />
            </FieldRow>
            <FieldRow label="Fields (JSON array)">
              <Textarea rows={6} className="font-mono text-xs"
                value={typeof values.fields === "string" ? values.fields : JSON.stringify(values.fields ?? [], null, 2)}
                onChange={(e) => {
                  try { setValue("fields", JSON.parse(e.target.value) as unknown as CertificateTemplate["fields"]); }
                  catch { setValue("fields", e.target.value as unknown as CertificateTemplate["fields"]); }
                }} />
            </FieldRow>
            <FieldRow label="Status">
              <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={(values.status as string) ?? "active"} onChange={(e) => setValue("status", e.target.value as CertificateTemplate["status"])}>
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
