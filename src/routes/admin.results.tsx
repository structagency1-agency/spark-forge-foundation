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
import type { WinnerListEntry } from "@/models/db";

const winnersAdminQueryOptions = queryOptions({
  queryKey: ["admin", "results"],
  queryFn: async () => {
    const { data, error } = await supabase.from("winner_list").select("*, events(name), teams(name)").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as (WinnerListEntry & { events: { name: string } | null; teams: { name: string } | null })[];
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

const teamsSlimQueryOptions = queryOptions({
  queryKey: ["admin", "teams-slim"],
  queryFn: async () => {
    const { data, error } = await supabase.from("teams").select("id, name, event_id").order("name");
    if (error) throw error;
    return data ?? [];
  },
});

export const Route = createFileRoute("/admin/results")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(winnersAdminQueryOptions);
    context.queryClient.ensureQueryData(eventsSlimQueryOptions);
    context.queryClient.ensureQueryData(teamsSlimQueryOptions);
  },
  component: ResultsAdmin,
});

function ResultsAdmin() {
  const { data: rows } = useSuspenseQuery(winnersAdminQueryOptions);
  const { data: events } = useSuspenseQuery(eventsSlimQueryOptions);
  const { data: teams } = useSuspenseQuery(teamsSlimQueryOptions);
  const [dlg, setDlg] = useState<{ open: boolean; row?: WinnerListEntry }>({ open: false });
  const create = useEntityCreate<WinnerListEntry>({ table: "winner_list", module: "results", invalidateKeys: [["admin", "results"], ["results"]] });
  const update = useEntityUpdate<WinnerListEntry>({ table: "winner_list", module: "results", invalidateKeys: [["admin", "results"], ["results"]] });
  const remove = useEntityDelete({ table: "winner_list", module: "results", invalidateKeys: [["admin", "results"], ["results"]] });

  return (
    <div>
      <AdminPageHeader
        title="Results & Winners"
        description="Assign winning teams and prizes per event."
        actions={<Button onClick={() => setDlg({ open: true })}><Plus className="mr-1 h-4 w-4" /> New winner</Button>}
      />
      <DataTable
        rows={rows}
        searchFields={(r) => `${r.events?.name ?? ""} ${r.teams?.name ?? ""} ${r.team_name_snapshot ?? ""}`}
        columns={[
          { key: "event", header: "Event", render: (r) => r.events?.name ?? "—" },
          { key: "position", header: "Position", render: (r) => <span className="font-medium uppercase">{r.position.replace("_", " ")}</span> },
          { key: "team", header: "Team", render: (r) => r.teams?.name ?? r.team_name_snapshot ?? "—" },
          { key: "prize", header: "Prize", render: (r) => r.prize ?? "—" },
        ]}
        actions={(r) => (
          <>
            <Button size="sm" variant="outline" onClick={() => setDlg({ open: true, row: r })}><Pencil className="h-3.5 w-3.5" /></Button>
            <ConfirmButton onConfirm={() => remove.mutateAsync(r.id)} />
          </>
        )}
      />
      <EntityFormDialog<WinnerListEntry>
        open={dlg.open}
        onOpenChange={(v) => setDlg({ open: v })}
        title={dlg.row ? "Edit winner" : "New winner"}
        initial={dlg.row ?? { position: "first" as WinnerListEntry["position"] }}
        onSubmit={async (values) => {
          if (dlg.row) await update.mutateAsync({ id: dlg.row.id, values });
          else await create.mutateAsync(values);
        }}
        render={({ values, setValue }) => {
          const teamsForEvent = teams.filter((t) => !values.event_id || t.event_id === values.event_id);
          return (
            <>
              <FieldRow label="Event">
                <select required className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={(values.event_id as string) ?? ""} onChange={(e) => setValue("event_id", e.target.value)}>
                  <option value="">— select —</option>
                  {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Position">
                <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={(values.position as string) ?? "first"} onChange={(e) => setValue("position", e.target.value as WinnerListEntry["position"])}>
                  <option value="first">1st</option>
                  <option value="second">2nd</option>
                  <option value="third">3rd</option>
                  <option value="special">Special mention</option>
                </select>
              </FieldRow>
              <FieldRow label="Team">
                <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={(values.team_id as string) ?? ""} onChange={(e) => setValue("team_id", e.target.value || null)}>
                  <option value="">— none —</option>
                  {teamsForEvent.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Team name snapshot (if team not in DB)">
                <Input value={(values.team_name_snapshot as string) ?? ""} onChange={(e) => setValue("team_name_snapshot", e.target.value)} />
              </FieldRow>
              <FieldRow label="Prize">
                <Input value={(values.prize as string) ?? ""} onChange={(e) => setValue("prize", e.target.value)} />
              </FieldRow>
              <FieldRow label="Citation">
                <Textarea value={(values.citation as string) ?? ""} onChange={(e) => setValue("citation", e.target.value)} />
              </FieldRow>
            </>
          );
        }}
      />
    </div>
  );
}
