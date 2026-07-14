/**
 * Admin › Winners — manual CRUD over the winner_list table using the correct
 * winner_position enum (winner / runner_up / second_runner_up / special_mention).
 * `publish_results` auto-fills ranks 1..3; this page lets organisers tweak or
 * add Special Mentions.
 */
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
import type { WinnerListEntry, WinnerPosition } from "@/models/db";

const POSITION_LABEL: Record<WinnerPosition, string> = {
  winner: "Winner (1st)",
  runner_up: "Runner Up (2nd)",
  second_runner_up: "Second Runner Up (3rd)",
  special_mention: "Special Mention",
};

const winnersAdminQueryOptions = queryOptions({
  queryKey: ["admin", "winners"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("winner_list")
      .select("*, events(name), teams(name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as (WinnerListEntry & { events: { name: string } | null; teams: { name: string } | null })[];
  },
});

const eventsSlim = queryOptions({
  queryKey: ["admin", "events-slim"],
  queryFn: async () => {
    const { data, error } = await supabase.from("events").select("id, name").order("name");
    if (error) throw error;
    return data ?? [];
  },
});

const teamsSlim = queryOptions({
  queryKey: ["admin", "teams-slim"],
  queryFn: async () => {
    const { data, error } = await supabase.from("teams").select("id, name, event_id").order("name");
    if (error) throw error;
    return data ?? [];
  },
});

export const Route = createFileRoute("/admin/winners")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(winnersAdminQueryOptions);
    context.queryClient.ensureQueryData(eventsSlim);
    context.queryClient.ensureQueryData(teamsSlim);
  },
  component: WinnersAdmin,
});

function WinnersAdmin() {
  const { data: rows } = useSuspenseQuery(winnersAdminQueryOptions);
  const { data: events } = useSuspenseQuery(eventsSlim);
  const { data: teams } = useSuspenseQuery(teamsSlim);
  const [dlg, setDlg] = useState<{ open: boolean; row?: WinnerListEntry }>({ open: false });

  const invalidate = [["admin", "winners"], ["winners"]] as const;
  const create = useEntityCreate<WinnerListEntry>({ table: "winner_list", module: "winners", invalidateKeys: invalidate as unknown as unknown[][] });
  const update = useEntityUpdate<WinnerListEntry>({ table: "winner_list", module: "winners", invalidateKeys: invalidate as unknown as unknown[][] });
  const remove = useEntityDelete({ table: "winner_list", module: "winners", invalidateKeys: invalidate as unknown as unknown[][] });

  return (
    <div>
      <AdminPageHeader
        title="Winners"
        description="Manage the public winner list. Publishing results auto-fills the top 3; add Special Mentions here."
        actions={
          <Button onClick={() => setDlg({ open: true })}>
            <Plus className="mr-1 h-4 w-4" /> New winner
          </Button>
        }
      />
      <DataTable
        rows={rows}
        searchFields={(r) => `${r.events?.name ?? ""} ${r.teams?.name ?? ""} ${r.team_name_snapshot ?? ""}`}
        columns={[
          { key: "event", header: "Event", render: (r) => r.events?.name ?? "—" },
          {
            key: "position",
            header: "Position",
            render: (r) => <span className="font-medium">{POSITION_LABEL[r.position]}</span>,
          },
          { key: "team", header: "Team", render: (r) => r.teams?.name ?? r.team_name_snapshot ?? "—" },
          { key: "prize", header: "Prize", render: (r) => r.prize ?? "—" },
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
      <EntityFormDialog<WinnerListEntry>
        open={dlg.open}
        onOpenChange={(v) => setDlg({ open: v })}
        title={dlg.row ? "Edit winner" : "New winner"}
        initial={dlg.row ?? ({ position: "winner" } as Partial<WinnerListEntry>)}
        onSubmit={async (values) => {
          if (dlg.row) await update.mutateAsync({ id: dlg.row.id, values });
          else await create.mutateAsync(values);
        }}
        render={({ values, setValue }) => {
          const teamsForEvent = teams.filter((t) => !values.event_id || t.event_id === values.event_id);
          return (
            <>
              <FieldRow label="Event">
                <select
                  required
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={(values.event_id as string) ?? ""}
                  onChange={(e) => setValue("event_id", e.target.value)}
                >
                  <option value="">— select —</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="Position">
                <select
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={(values.position as string) ?? "winner"}
                  onChange={(e) => setValue("position", e.target.value as WinnerPosition)}
                >
                  {(Object.keys(POSITION_LABEL) as WinnerPosition[]).map((p) => (
                    <option key={p} value={p}>{POSITION_LABEL[p]}</option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="Team">
                <select
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={(values.team_id as string) ?? ""}
                  onChange={(e) => setValue("team_id", e.target.value || null)}
                >
                  <option value="">— none —</option>
                  {teamsForEvent.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="Team name snapshot (if team not in DB)">
                <Input
                  value={(values.team_name_snapshot as string) ?? ""}
                  onChange={(e) => setValue("team_name_snapshot", e.target.value)}
                />
              </FieldRow>
              <FieldRow label="Prize">
                <Input
                  value={(values.prize as string) ?? ""}
                  onChange={(e) => setValue("prize", e.target.value)}
                />
              </FieldRow>
              <FieldRow label="Citation">
                <Textarea
                  value={(values.citation as string) ?? ""}
                  onChange={(e) => setValue("citation", e.target.value)}
                />
              </FieldRow>
            </>
          );
        }}
      />
    </div>
  );
}
