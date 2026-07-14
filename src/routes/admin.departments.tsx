import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
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
import type { Department } from "@/models/db";

const departmentsAdminQueryOptions = queryOptions({
  queryKey: ["admin", "departments"],
  queryFn: async () => {
    const { data, error } = await supabase.from("departments").select("*").order("sort_order");
    if (error) throw error;
    return (data ?? []) as Department[];
  },
});

export const Route = createFileRoute("/admin/departments")({
  loader: ({ context }) => context.queryClient.ensureQueryData(departmentsAdminQueryOptions),
  component: DepartmentsAdmin,
});

function DepartmentsAdmin() {
  const { data: rows } = useSuspenseQuery(departmentsAdminQueryOptions);
  const [dlg, setDlg] = useState<{ open: boolean; row?: Department }>({ open: false });
  const create = useEntityCreate<Department>({ table: "departments", module: "departments", invalidateKeys: [["admin", "departments"], ["departments"]] });
  const update = useEntityUpdate<Department>({ table: "departments", module: "departments", invalidateKeys: [["admin", "departments"], ["departments"]] });
  const remove = useEntityDelete({ table: "departments", module: "departments", invalidateKeys: [["admin", "departments"], ["departments"]] });

  return (
    <div>
      <AdminPageHeader
        title="Departments"
        description="Manage the departments that own events."
        actions={
          <Button onClick={() => setDlg({ open: true })}>
            <Plus className="mr-1 h-4 w-4" /> New department
          </Button>
        }
      />
      <DataTable
        rows={rows}
        searchFields={(r) => `${r.name} ${r.code} ${r.slug}`}
        columns={[
          { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "code", header: "Code", render: (r) => <span className="font-mono text-xs">{r.code}</span> },
          { key: "slug", header: "Slug", render: (r) => <span className="text-muted-foreground">{r.slug}</span> },
          { key: "sort", header: "Order", render: (r) => r.sort_order },
        ]}
        actions={(r) => (
          <>
            <Button size="sm" variant="outline" onClick={() => setDlg({ open: true, row: r })}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <ConfirmButton onConfirm={() => remove.mutateAsync(r.id)} />
          </>
        )}
      />
      <EntityFormDialog<Department>
        open={dlg.open}
        onOpenChange={(v) => setDlg({ open: v })}
        title={dlg.row ? "Edit department" : "New department"}
        initial={dlg.row ?? { sort_order: rows.length + 1 }}
        onSubmit={async (values) => {
          if (dlg.row) await update.mutateAsync({ id: dlg.row.id, values });
          else await create.mutateAsync(values);
        }}
        render={({ values, setValue }) => (
          <>
            <FieldRow label="Name">
              <Input required value={(values.name as string) ?? ""} onChange={(e) => setValue("name", e.target.value)} />
            </FieldRow>
            <FieldRow label="Code">
              <Input required value={(values.code as string) ?? ""} onChange={(e) => setValue("code", e.target.value)} />
            </FieldRow>
            <FieldRow label="Slug">
              <Input required value={(values.slug as string) ?? ""} onChange={(e) => setValue("slug", e.target.value)} />
            </FieldRow>
            <FieldRow label="Description">
              <Textarea value={(values.description as string) ?? ""} onChange={(e) => setValue("description", e.target.value)} />
            </FieldRow>
            <FieldRow label="Sort order">
              <Input type="number" value={(values.sort_order as number) ?? 0} onChange={(e) => setValue("sort_order", Number(e.target.value))} />
            </FieldRow>
          </>
        )}
      />
    </div>
  );
}
