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
import type { EmailTemplate } from "@/models/db";

const templatesAdminQueryOptions = queryOptions({
  queryKey: ["admin", "email-templates"],
  queryFn: async () => {
    const { data, error } = await supabase.from("email_templates").select("*").order("key");
    if (error) throw error;
    return (data ?? []) as EmailTemplate[];
  },
});

export const Route = createFileRoute("/admin/email-templates")({
  loader: ({ context }) => context.queryClient.ensureQueryData(templatesAdminQueryOptions),
  component: EmailTemplatesAdmin,
});

function EmailTemplatesAdmin() {
  const { data: rows } = useSuspenseQuery(templatesAdminQueryOptions);
  const [dlg, setDlg] = useState<{ open: boolean; row?: EmailTemplate }>({ open: false });
  const create = useEntityCreate<EmailTemplate>({ table: "email_templates", module: "email_templates", invalidateKeys: [["admin", "email-templates"]] });
  const update = useEntityUpdate<EmailTemplate>({ table: "email_templates", module: "email_templates", invalidateKeys: [["admin", "email-templates"]] });
  const remove = useEntityDelete({ table: "email_templates", module: "email_templates", invalidateKeys: [["admin", "email-templates"]] });

  return (
    <div>
      <AdminPageHeader
        title="Email Templates"
        description="Editable transactional email templates. Use {{variable}} placeholders."
        actions={<Button onClick={() => setDlg({ open: true })}><Plus className="mr-1 h-4 w-4" /> New template</Button>}
      />
      <DataTable
        rows={rows}
        searchFields={(r) => `${r.key} ${r.name} ${r.subject}`}
        columns={[
          { key: "key", header: "Key", render: (r) => <span className="font-mono text-xs">{r.key}</span> },
          { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "subject", header: "Subject", render: (r) => r.subject },
          { key: "active", header: "Active", render: (r) => r.is_active ? "Yes" : "No" },
        ]}
        actions={(r) => (
          <>
            <Button size="sm" variant="outline" onClick={() => setDlg({ open: true, row: r })}><Pencil className="h-3.5 w-3.5" /></Button>
            <ConfirmButton onConfirm={() => remove.mutateAsync(r.id)} />
          </>
        )}
      />
      <EntityFormDialog<EmailTemplate>
        open={dlg.open}
        onOpenChange={(v) => setDlg({ open: v })}
        title={dlg.row ? "Edit template" : "New template"}
        initial={dlg.row ?? { is_active: true, variables: [] as unknown as EmailTemplate["variables"] }}
        onSubmit={async (values) => {
          if (dlg.row) await update.mutateAsync({ id: dlg.row.id, values });
          else await create.mutateAsync(values);
        }}
        render={({ values, setValue }) => (
          <>
            <FieldRow label="Key (unique)">
              <Input required value={(values.key as string) ?? ""} onChange={(e) => setValue("key", e.target.value)} />
            </FieldRow>
            <FieldRow label="Name">
              <Input required value={(values.name as string) ?? ""} onChange={(e) => setValue("name", e.target.value)} />
            </FieldRow>
            <FieldRow label="Subject">
              <Input required value={(values.subject as string) ?? ""} onChange={(e) => setValue("subject", e.target.value)} />
            </FieldRow>
            <FieldRow label="Body (HTML or plain text)">
              <Textarea rows={10} required value={(values.body as string) ?? ""} onChange={(e) => setValue("body", e.target.value)} />
            </FieldRow>
            <FieldRow label="Variables (comma-separated)">
              <Input
                value={Array.isArray(values.variables) ? (values.variables as string[]).join(", ") : ""}
                onChange={(e) => setValue("variables", e.target.value.split(",").map((s) => s.trim()).filter(Boolean) as unknown as EmailTemplate["variables"])}
              />
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
