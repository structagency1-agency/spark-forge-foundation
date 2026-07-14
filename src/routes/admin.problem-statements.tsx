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
import type { ProblemStatement } from "@/models/db";

const psAdminQueryOptions = queryOptions({
  queryKey: ["admin", "problem-statements"],
  queryFn: async () => {
    const { data, error } = await supabase.from("problem_statements").select("*, events(name)").order("sort_order");
    if (error) throw error;
    return (data ?? []) as (ProblemStatement & { events: { name: string } | null })[];
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

export const Route = createFileRoute("/admin/problem-statements")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(psAdminQueryOptions);
    context.queryClient.ensureQueryData(eventsSlimQueryOptions);
  },
  component: PSAdmin,
});

function PSAdmin() {
  const { data: rows } = useSuspenseQuery(psAdminQueryOptions);
  const { data: events } = useSuspenseQuery(eventsSlimQueryOptions);
  const [dlg, setDlg] = useState<{ open: boolean; row?: ProblemStatement }>({ open: false });
  const create = useEntityCreate<ProblemStatement>({ table: "problem_statements", module: "problem_statements", invalidateKeys: [["admin", "problem-statements"], ["problem-statements"]] });
  const update = useEntityUpdate<ProblemStatement>({ table: "problem_statements", module: "problem_statements", invalidateKeys: [["admin", "problem-statements"], ["problem-statements"]] });
  const remove = useEntityDelete({ table: "problem_statements", module: "problem_statements", invalidateKeys: [["admin", "problem-statements"], ["problem-statements"]] });

  return (
    <div>
      <AdminPageHeader
        title="Problem Statements"
        description="Downloadable briefs attached to events."
        actions={<Button onClick={() => setDlg({ open: true })}><Plus className="mr-1 h-4 w-4" /> New brief</Button>}
      />
      <DataTable
        rows={rows}
        searchFields={(r) => `${r.title} ${r.description ?? ""}`}
        columns={[
          { key: "title", header: "Title", render: (r) => <span className="font-medium">{r.title}</span> },
          { key: "event", header: "Event", render: (r) => r.events?.name ?? "—" },
          { key: "doc", header: "Document", render: (r) => r.document_url ? <a href={r.document_url} target="_blank" rel="noreferrer" className="text-accent underline">Open</a> : "—" },
          { key: "status", header: "Status", render: (r) => r.status },
        ]}
        actions={(r) => (
          <>
            <Button size="sm" variant="outline" onClick={() => setDlg({ open: true, row: r })}><Pencil className="h-3.5 w-3.5" /></Button>
            <ConfirmButton onConfirm={() => remove.mutateAsync(r.id)} />
          </>
        )}
      />
      <EntityFormDialog<ProblemStatement>
        open={dlg.open}
        onOpenChange={(v) => setDlg({ open: v })}
        title={dlg.row ? "Edit brief" : "New brief"}
        initial={dlg.row ?? { sort_order: rows.length + 1, status: "active" }}
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
              <Textarea rows={5} value={(values.description as string) ?? ""} onChange={(e) => setValue("description", e.target.value)} />
            </FieldRow>
            <FieldRow label="Event (optional)">
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={(values.event_id as string) ?? ""}
                onChange={(e) => setValue("event_id", e.target.value || null)}
              >
                <option value="">— none —</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Document URL">
              <Input value={(values.document_url as string) ?? ""} onChange={(e) => setValue("document_url", e.target.value)} />
            </FieldRow>
            <FieldRow label="Sort order">
              <Input type="number" value={(values.sort_order as number) ?? 0} onChange={(e) => setValue("sort_order", Number(e.target.value))} />
            </FieldRow>
            <FieldRow label="Status">
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={(values.status as string) ?? "published"}
                onChange={(e) => setValue("status", e.target.value as ProblemStatement["status"])}
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
