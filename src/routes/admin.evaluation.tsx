/**
 * Admin › Evaluation
 * Complete Jury Evaluation System — one page, seven tabs:
 *   Dashboard · Jury · Criteria · Jury Assignment · Team Assignment ·
 *   Evaluate · Leaderboard
 * All state is driven from the database (jury_members, evaluation_criteria,
 * jury_event_assignments, jury_team_assignments, evaluations,
 * evaluation_scores). Scoring, ranking, tie-breaks and stats live in
 * postgres functions defined in the migration.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Users,
  Gavel,
  ClipboardList,
  ListChecks,
  Trophy,
  Sparkles,
  Percent,
  RefreshCw,
  Plus,
  Pencil,
  Download,
  Lock,
  Unlock,
  Play,
  CheckCircle2,
  Search,
  Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { DataTable } from "@/components/admin/DataTable";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { EntityFormDialog, FieldRow } from "@/components/admin/EntityFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useEntityCreate, useEntityUpdate, useEntityDelete } from "@/lib/adminCrud";
import { writeAuditLog } from "@/services/admin";
import {
  attendedRegistrationsQueryOptions,
  autoAssignTeams,
  criteriaQueryOptions,
  evaluationEventsQueryOptions,
  evaluationsQueryOptions,
  evaluationStatsQueryOptions,
  juryEventAssignmentsQueryOptions,
  juryMembersQueryOptions,
  juryTeamAssignmentsQueryOptions,
  leaderboardQueryOptions,
  publishEventEvaluations,
  saveEvaluationScore,
  setEvaluationLock,
  submitEvaluation,
  upsertEvaluation,
  type LeaderboardRow,
} from "@/services/evaluation";
import type {
  EvaluationCriterion,
  JuryMember,
  EvaluationRecommendation,
} from "@/models/db";

export const Route = createFileRoute("/admin/evaluation")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(evaluationEventsQueryOptions);
    context.queryClient.ensureQueryData(evaluationStatsQueryOptions(null));
    context.queryClient.ensureQueryData(juryMembersQueryOptions);
    context.queryClient.ensureQueryData(criteriaQueryOptions);
  },
  component: EvaluationAdmin,
});

// -----------------------------------------------------------------------------
function csvEscape(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function downloadCsv(rows: string[][], filename: string) {
  const blob = new Blob([rows.map((r) => r.map(csvEscape).join(",")).join("\n")], {
    type: "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function EvaluationAdmin() {
  const qc = useQueryClient();
  const { data: events } = useSuspenseQuery(evaluationEventsQueryOptions);
  const [eventId, setEventId] = useState<string>("");
  const filterEventId = eventId || null;
  const { data: stats } = useSuspenseQuery(evaluationStatsQueryOptions(filterEventId));

  async function refreshAll() {
    await qc.invalidateQueries({ queryKey: ["admin", "evaluation"] });
  }

  return (
    <div>
      <AdminPageHeader
        title="Evaluation"
        description="Jury management, criteria, assignments, scoring and live leaderboard."
        actions={
          <Button variant="outline" onClick={refreshAll}>
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        }
      />

      {/* Event scope selector */}
      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Scope
          </label>
          <select
            className="min-w-[280px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          >
            <option value="">— All events —</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total Events" value={stats.total_events} icon={ClipboardList} />
        <StatCard label="Under Evaluation" value={stats.events_under_evaluation} icon={Gavel} />
        <StatCard label="Jury Members" value={stats.total_jury} hint={`${stats.active_jury} active`} icon={Users} />
        <StatCard label="Assigned Jury" value={stats.assigned_jury} icon={Sparkles} />
        <StatCard label="Evaluated Teams" value={stats.evaluated_teams} icon={CheckCircle2} />
        <StatCard label="Pending Evaluations" value={stats.pending_evaluations} icon={ListChecks} />
        <StatCard label="Average Score" value={`${stats.avg_score}%`} icon={BarChart3} />
        <StatCard label="Progress" value={`${stats.progress_pct}%`} icon={Percent} />
      </div>

      {/* Progress bar */}
      <div className="mt-4 rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Evaluation Progress</span>
          <span>{stats.completed_evaluations} / {stats.total_team_assignments}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-accent to-primary transition-all"
            style={{ width: `${Math.min(100, Number(stats.progress_pct) || 0)}%` }}
          />
        </div>
      </div>

      <Tabs defaultValue="jury" className="mt-6">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="jury">Jury</TabsTrigger>
          <TabsTrigger value="criteria">Criteria</TabsTrigger>
          <TabsTrigger value="jury-assign">Jury Assignment</TabsTrigger>
          <TabsTrigger value="team-assign">Team Assignment</TabsTrigger>
          <TabsTrigger value="evaluate">Evaluate</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="jury" className="mt-4"><JuryTab /></TabsContent>
        <TabsContent value="criteria" className="mt-4"><CriteriaTab /></TabsContent>
        <TabsContent value="jury-assign" className="mt-4">
          <JuryEventAssignmentTab eventId={filterEventId} allEvents={events} />
        </TabsContent>
        <TabsContent value="team-assign" className="mt-4">
          <TeamAssignmentTab eventId={filterEventId} allEvents={events} />
        </TabsContent>
        <TabsContent value="evaluate" className="mt-4">
          <EvaluateTab eventId={filterEventId} />
        </TabsContent>
        <TabsContent value="leaderboard" className="mt-4">
          <LeaderboardTab eventId={filterEventId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =============================================================================
// JURY MANAGEMENT
// =============================================================================
function JuryTab() {
  const { data: jury } = useSuspenseQuery(juryMembersQueryOptions);
  const [dlg, setDlg] = useState<{ open: boolean; row?: JuryMember }>({ open: false });
  const create = useEntityCreate<JuryMember>({
    table: "jury_members",
    module: "evaluation",
    invalidateKeys: [["admin", "evaluation"]],
  });
  const update = useEntityUpdate<JuryMember>({
    table: "jury_members",
    module: "evaluation",
    invalidateKeys: [["admin", "evaluation"]],
  });
  const remove = useEntityDelete({
    table: "jury_members",
    module: "evaluation",
    invalidateKeys: [["admin", "evaluation"]],
  });

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button onClick={() => setDlg({ open: true })}>
          <Plus className="mr-1 h-4 w-4" /> New jury
        </Button>
      </div>
      <DataTable
        rows={jury}
        searchFields={(r) => `${r.full_name} ${r.email} ${r.organization ?? ""} ${r.expertise ?? ""}`}
        columns={[
          { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.full_name}</span> },
          { key: "email", header: "Email", render: (r) => <span className="text-xs">{r.email}</span> },
          { key: "org", header: "Organization", render: (r) => r.organization ?? "—" },
          { key: "designation", header: "Designation", render: (r) => r.designation ?? "—" },
          { key: "mobile", header: "Mobile", render: (r) => r.mobile ?? "—" },
          { key: "expertise", header: "Expertise", render: (r) => r.expertise ?? "—" },
          {
            key: "status",
            header: "Status",
            render: (r) => (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${r.status === "active" ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground"}`}
              >
                {r.status}
              </span>
            ),
          },
        ]}
        actions={(r) => (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                update.mutateAsync({
                  id: r.id,
                  values: { status: r.status === "active" ? "inactive" : "active" },
                })
              }
              title={r.status === "active" ? "Disable" : "Enable"}
            >
              {r.status === "active" ? "Disable" : "Enable"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDlg({ open: true, row: r })}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <ConfirmButton onConfirm={() => remove.mutateAsync(r.id)} />
          </>
        )}
      />
      <EntityFormDialog<JuryMember>
        open={dlg.open}
        onOpenChange={(v) => setDlg({ open: v })}
        title={dlg.row ? "Edit jury" : "New jury"}
        initial={dlg.row ?? { status: "active" }}
        onSubmit={async (values) => {
          if (dlg.row) await update.mutateAsync({ id: dlg.row.id, values });
          else await create.mutateAsync(values);
        }}
        render={({ values, setValue }) => (
          <>
            <FieldRow label="Full name">
              <Input required value={(values.full_name as string) ?? ""} onChange={(e) => setValue("full_name", e.target.value)} />
            </FieldRow>
            <FieldRow label="Email">
              <Input required type="email" value={(values.email as string) ?? ""} onChange={(e) => setValue("email", e.target.value)} />
            </FieldRow>
            <FieldRow label="Organization">
              <Input value={(values.organization as string) ?? ""} onChange={(e) => setValue("organization", e.target.value)} />
            </FieldRow>
            <FieldRow label="Designation">
              <Input value={(values.designation as string) ?? ""} onChange={(e) => setValue("designation", e.target.value)} />
            </FieldRow>
            <FieldRow label="Mobile">
              <Input value={(values.mobile as string) ?? ""} onChange={(e) => setValue("mobile", e.target.value)} />
            </FieldRow>
            <FieldRow label="Expertise">
              <Input value={(values.expertise as string) ?? ""} onChange={(e) => setValue("expertise", e.target.value)} />
            </FieldRow>
            <FieldRow label="Status">
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={(values.status as string) ?? "active"}
                onChange={(e) => setValue("status", e.target.value as JuryMember["status"])}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FieldRow>
          </>
        )}
      />
    </div>
  );
}

// =============================================================================
// CRITERIA
// =============================================================================
function CriteriaTab() {
  const { data: rows } = useSuspenseQuery(criteriaQueryOptions);
  const [dlg, setDlg] = useState<{ open: boolean; row?: EvaluationCriterion }>({ open: false });
  const create = useEntityCreate<EvaluationCriterion>({
    table: "evaluation_criteria",
    module: "evaluation",
    invalidateKeys: [["admin", "evaluation"]],
  });
  const update = useEntityUpdate<EvaluationCriterion>({
    table: "evaluation_criteria",
    module: "evaluation",
    invalidateKeys: [["admin", "evaluation"]],
  });
  const remove = useEntityDelete({
    table: "evaluation_criteria",
    module: "evaluation",
    invalidateKeys: [["admin", "evaluation"]],
  });

  const totalWeight = rows.filter((r) => r.status === "active").reduce((sum, r) => sum + Number(r.weightage), 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Total active weightage: <span className={totalWeight === 100 ? "text-emerald-500" : "text-amber-500"}>{totalWeight}%</span>
        </p>
        <Button onClick={() => setDlg({ open: true })}>
          <Plus className="mr-1 h-4 w-4" /> New criterion
        </Button>
      </div>
      <DataTable
        rows={rows}
        searchFields={(r) => `${r.name} ${r.description ?? ""}`}
        columns={[
          { key: "order", header: "#", render: (r) => r.sort_order },
          { key: "name", header: "Criterion", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "max", header: "Max Marks", render: (r) => r.max_marks },
          { key: "weight", header: "Weightage", render: (r) => `${r.weightage}%` },
          { key: "desc", header: "Description", render: (r) => <span className="text-xs text-muted-foreground">{r.description ?? "—"}</span> },
          { key: "status", header: "Status", render: (r) => (
            <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "active" ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground"}`}>{r.status}</span>
          ) },
        ]}
        actions={(r) => (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => update.mutateAsync({ id: r.id, values: { status: r.status === "active" ? "inactive" : "active" } })}
            >
              {r.status === "active" ? "Disable" : "Enable"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDlg({ open: true, row: r })}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <ConfirmButton onConfirm={() => remove.mutateAsync(r.id)} />
          </>
        )}
      />
      <EntityFormDialog<EvaluationCriterion>
        open={dlg.open}
        onOpenChange={(v) => setDlg({ open: v })}
        title={dlg.row ? "Edit criterion" : "New criterion"}
        initial={dlg.row ?? { max_marks: 10, weightage: 0, sort_order: rows.length + 1, status: "active" }}
        onSubmit={async (values) => {
          if (dlg.row) await update.mutateAsync({ id: dlg.row.id, values });
          else await create.mutateAsync(values);
        }}
        render={({ values, setValue }) => (
          <>
            <FieldRow label="Name"><Input required value={(values.name as string) ?? ""} onChange={(e) => setValue("name", e.target.value)} /></FieldRow>
            <FieldRow label="Description"><Textarea value={(values.description as string) ?? ""} onChange={(e) => setValue("description", e.target.value)} /></FieldRow>
            <div className="grid grid-cols-3 gap-2">
              <FieldRow label="Max marks">
                <Input type="number" min={1} step="0.1" value={(values.max_marks as number) ?? 10} onChange={(e) => setValue("max_marks", Number(e.target.value) as EvaluationCriterion["max_marks"])} />
              </FieldRow>
              <FieldRow label="Weightage (%)">
                <Input type="number" min={0} max={100} step="0.1" value={(values.weightage as number) ?? 0} onChange={(e) => setValue("weightage", Number(e.target.value) as EvaluationCriterion["weightage"])} />
              </FieldRow>
              <FieldRow label="Sort order">
                <Input type="number" value={(values.sort_order as number) ?? 0} onChange={(e) => setValue("sort_order", Number(e.target.value) as EvaluationCriterion["sort_order"])} />
              </FieldRow>
            </div>
            <FieldRow label="Status">
              <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={(values.status as string) ?? "active"} onChange={(e) => setValue("status", e.target.value as EvaluationCriterion["status"])}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FieldRow>
          </>
        )}
      />
    </div>
  );
}

// =============================================================================
// JURY ↔ EVENT ASSIGNMENT
// =============================================================================
function JuryEventAssignmentTab({
  eventId,
  allEvents,
}: {
  eventId: string | null;
  allEvents: Array<{ id: string; name: string; department_id: string | null; departments: { name: string } | null }>;
}) {
  const qc = useQueryClient();
  const { data: jury } = useSuspenseQuery(juryMembersQueryOptions);
  const { data: assignments } = useSuspenseQuery(juryEventAssignmentsQueryOptions(eventId));
  const [selectedJury, setSelectedJury] = useState<string[]>([]);
  const [targetEvent, setTargetEvent] = useState<string>(eventId ?? "");
  const [deptFilter, setDeptFilter] = useState<string>("");

  const eventsForAssignment = useMemo(
    () => (deptFilter ? allEvents.filter((e) => e.department_id === deptFilter) : allEvents),
    [allEvents, deptFilter],
  );

  const departments = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of allEvents) if (e.department_id && e.departments?.name) map.set(e.department_id, e.departments.name);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allEvents]);

  async function assign() {
    if (!targetEvent || selectedJury.length === 0) {
      toast.error("Pick event and at least one jury");
      return;
    }
    const rows = selectedJury.map((jid) => ({ jury_id: jid, event_id: targetEvent, round: "main" }));
    const { error } = await supabase.from("jury_event_assignments").upsert(rows as never, {
      onConflict: "jury_id,event_id,round",
      ignoreDuplicates: true,
    });
    if (error) return toast.error(error.message);
    toast.success(`Assigned ${selectedJury.length} jury`);
    await writeAuditLog({
      action: "jury_assign_event",
      module: "evaluation",
      description: `${selectedJury.length} jury → event`,
      metadata: { event_id: targetEvent, jury_ids: selectedJury },
    });
    setSelectedJury([]);
    await qc.invalidateQueries({ queryKey: ["admin", "evaluation"] });
  }

  async function unassign(id: string) {
    const { error } = await supabase.from("jury_event_assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await writeAuditLog({ action: "jury_unassign_event", module: "evaluation", description: id });
    await qc.invalidateQueries({ queryKey: ["admin", "evaluation"] });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 font-display text-lg">Assign jury to event</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldRow label="Filter events by department">
            <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">— All departments —</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Event">
            <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={targetEvent} onChange={(e) => setTargetEvent(e.target.value)}>
              <option value="">— select event —</option>
              {eventsForAssignment.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </FieldRow>
        </div>
        <div className="mt-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Jury members</p>
          <div className="max-h-56 overflow-y-auto rounded-md border border-border/60 p-2">
            {jury.filter((j) => j.status === "active").map((j) => (
              <label key={j.id} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={selectedJury.includes(j.id)}
                  onChange={(e) => setSelectedJury((s) => e.target.checked ? [...s, j.id] : s.filter((x) => x !== j.id))}
                />
                <span className="font-medium">{j.full_name}</span>
                <span className="text-xs text-muted-foreground">· {j.organization ?? "—"} · {j.expertise ?? "—"}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={assign} disabled={!targetEvent || selectedJury.length === 0}>
            <Plus className="mr-1 h-4 w-4" /> Assign
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 font-display text-lg">Current assignments</h3>
        <DataTable
          rows={assignments}
          searchFields={(r) => `${r.jury_members?.full_name ?? ""} ${r.events?.name ?? ""}`}
          columns={[
            { key: "event", header: "Event", render: (r) => r.events?.name ?? "—" },
            { key: "dept", header: "Department", render: (r) => r.events?.departments?.name ?? "—" },
            { key: "jury", header: "Jury", render: (r) => <span className="font-medium">{r.jury_members?.full_name ?? "—"}</span> },
            { key: "org", header: "Organization", render: (r) => r.jury_members?.organization ?? "—" },
            { key: "round", header: "Round", render: (r) => r.round },
          ]}
          actions={(r) => <ConfirmButton label="Remove" onConfirm={() => unassign(r.id)} />}
        />
      </div>
    </div>
  );
}

// =============================================================================
// TEAM ASSIGNMENT
// =============================================================================
function TeamAssignmentTab({
  eventId,
  allEvents,
}: {
  eventId: string | null;
  allEvents: Array<{ id: string; name: string }>;
}) {
  const qc = useQueryClient();
  const [target, setTarget] = useState<string>(eventId ?? "");
  const { data: jury } = useSuspenseQuery(juryEventAssignmentsQueryOptions(target || null));
  const { data: attended } = useSuspenseQuery(attendedRegistrationsQueryOptions(target || null));
  const { data: assignments } = useSuspenseQuery(juryTeamAssignmentsQueryOptions(target || null));
  const [selectedJury, setSelectedJury] = useState<string>("");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  async function runAuto() {
    if (!target) return toast.error("Select an event");
    try {
      const res = await autoAssignTeams(target);
      toast.success(`Auto-assigned ${res.assigned} teams across ${res.jury_count} jury`);
      await writeAuditLog({ action: "auto_assign_teams", module: "evaluation", metadata: { event_id: target, ...res } });
      await qc.invalidateQueries({ queryKey: ["admin", "evaluation"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function manualAssign() {
    if (!selectedJury || selectedTeams.length === 0 || !target)
      return toast.error("Pick jury and at least one team");
    const rows = selectedTeams.map((teamId) => {
      const reg = attended.find((a) => a.teams?.id === teamId);
      return {
        jury_id: selectedJury,
        team_id: teamId,
        event_id: target,
        registration_id: reg?.id ?? null,
        assignment_type: "manual",
        status: "assigned" as const,
      };
    });
    const { error } = await supabase
      .from("jury_team_assignments")
      .upsert(rows as never, { onConflict: "jury_id,team_id,event_id", ignoreDuplicates: true });
    if (error) return toast.error(error.message);
    toast.success(`Assigned ${selectedTeams.length} teams`);
    await writeAuditLog({ action: "assign_teams_to_jury", module: "evaluation", description: `${selectedTeams.length} teams → jury`, metadata: { jury_id: selectedJury, team_ids: selectedTeams } });
    setSelectedTeams([]);
    await qc.invalidateQueries({ queryKey: ["admin", "evaluation"] });
  }

  async function unassign(id: string) {
    const { error } = await supabase.from("jury_team_assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await writeAuditLog({ action: "unassign_team", module: "evaluation", description: id });
    await qc.invalidateQueries({ queryKey: ["admin", "evaluation"] });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <FieldRow label="Event">
            <select className="min-w-[240px] rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">— select event —</option>
              {allEvents.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </FieldRow>
          <Button onClick={runAuto} disabled={!target}>
            <Sparkles className="mr-1 h-4 w-4" /> Auto-assign teams equally
          </Button>
        </div>

        {target ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs uppercase text-muted-foreground">Jury for this event</p>
              <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={selectedJury} onChange={(e) => setSelectedJury(e.target.value)}>
                <option value="">— select jury —</option>
                {jury.map((j) => <option key={j.jury_id} value={j.jury_id}>{j.jury_members?.full_name ?? "—"}</option>)}
              </select>
              {jury.length === 0 ? (
                <p className="mt-2 text-xs text-amber-500">No jury assigned to this event yet. Use the Jury Assignment tab first.</p>
              ) : null}
            </div>
            <div>
              <p className="mb-1 text-xs uppercase text-muted-foreground">Attended teams ({attended.length})</p>
              <div className="max-h-56 overflow-y-auto rounded-md border border-border/60 p-2">
                {attended.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">No attended teams for this event yet.</p>
                ) : (
                  attended.map((r) => (
                    <label key={r.id} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedTeams.includes(r.teams?.id ?? "")}
                        onChange={(e) => setSelectedTeams((s) => e.target.checked ? [...s, r.teams?.id ?? ""] : s.filter((x) => x !== r.teams?.id))}
                      />
                      <span className="font-medium">{r.teams?.name}</span>
                      <span className="text-xs text-muted-foreground">· {r.registration_code} · {r.teams?.departments?.name ?? "—"}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex justify-end">
          <Button onClick={manualAssign} disabled={!selectedJury || selectedTeams.length === 0}>
            <Plus className="mr-1 h-4 w-4" /> Assign selected teams
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 font-display text-lg">Team assignments</h3>
        <DataTable
          rows={assignments}
          searchFields={(r) => `${r.jury_members?.full_name ?? ""} ${r.teams?.name ?? ""} ${r.registrations?.registration_code ?? ""}`}
          columns={[
            { key: "regcode", header: "Reg ID", render: (r) => <span className="font-mono text-xs">{r.registrations?.registration_code ?? "—"}</span> },
            { key: "team", header: "Team", render: (r) => <span className="font-medium">{r.teams?.name ?? "—"}</span> },
            { key: "dept", header: "Department", render: (r) => r.teams?.departments?.name ?? "—" },
            { key: "event", header: "Event", render: (r) => r.events?.name ?? "—" },
            { key: "jury", header: "Jury", render: (r) => r.jury_members?.full_name ?? "—" },
            { key: "type", header: "Type", render: (r) => <span className="text-xs uppercase">{r.assignment_type}</span> },
            { key: "status", header: "Status", render: (r) => <StatusPill value={r.status} /> },
          ]}
          actions={(r) => <ConfirmButton label="Remove" onConfirm={() => unassign(r.id)} />}
        />
      </div>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const tone: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    assigned: "bg-blue-500/20 text-blue-400",
    in_progress: "bg-amber-500/20 text-amber-500",
    completed: "bg-emerald-500/20 text-emerald-500",
    published: "bg-primary/20 text-primary",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs ${tone[value] ?? "bg-muted"}`}>{value.replace("_", " ")}</span>;
}

// =============================================================================
// EVALUATE
// =============================================================================
function EvaluateTab({ eventId }: { eventId: string | null }) {
  const qc = useQueryClient();
  const { data: assignments } = useSuspenseQuery(juryTeamAssignmentsQueryOptions(eventId));
  const { data: evaluations } = useSuspenseQuery(evaluationsQueryOptions(eventId));
  const { data: criteria } = useSuspenseQuery(criteriaQueryOptions);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [scoreMin, setScoreMin] = useState("");
  const [scoreMax, setScoreMax] = useState("");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<null | { jury_id: string; team_id: string; event_id: string; team_name: string; jury_name: string }>(null);

  const activeCriteria = useMemo(() => criteria.filter((c) => c.status === "active"), [criteria]);

  // Merge assignments with evaluation status
  const rows = useMemo(() => {
    return assignments.map((a) => {
      const ev = evaluations.find((e) => e.jury_id === a.jury_id && e.team_id === a.team_id && e.event_id === a.event_id);
      return {
        ...a,
        evaluation: ev ?? null,
        eval_status: (ev?.status ?? a.status) as string,
        eval_percentage: ev?.percentage ?? null,
        eval_score: ev?.total_score ?? null,
      };
    });
  }, [assignments, evaluations]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter && r.eval_status !== statusFilter) return false;
      if (scoreMin && Number(r.eval_percentage ?? -1) < Number(scoreMin)) return false;
      if (scoreMax && Number(r.eval_percentage ?? 101) > Number(scoreMax)) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = `${r.registrations?.registration_code ?? ""} ${r.teams?.name ?? ""} ${r.jury_members?.full_name ?? ""} ${r.teams?.departments?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, scoreMin, scoreMax, query]);

  function exportCsv() {
    const header = ["registration_id", "team", "department", "event", "jury", "status", "score", "percentage"];
    const data = filtered.map((r) => [
      r.registrations?.registration_code ?? "",
      r.teams?.name ?? "",
      r.teams?.departments?.name ?? "",
      r.events?.name ?? "",
      r.jury_members?.full_name ?? "",
      r.eval_status,
      r.eval_score ?? "",
      r.eval_percentage ?? "",
    ]);
    downloadCsv([header, ...data.map((r) => r.map(String))], `evaluations-${new Date().toISOString().slice(0, 10)}.csv`);
    void writeAuditLog({ action: "evaluation_export", module: "evaluation", description: `${filtered.length} rows` });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input className="w-64" placeholder="Search reg ID, team, leader, department…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="rounded-md border border-input bg-transparent px-2 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="published">Published</option>
        </select>
        <Input type="number" placeholder="Min %" className="w-24" value={scoreMin} onChange={(e) => setScoreMin(e.target.value)} />
        <Input type="number" placeholder="Max %" className="w-24" value={scoreMax} onChange={(e) => setScoreMax(e.target.value)} />
        <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download className="mr-1 h-4 w-4" /> CSV
        </Button>
      </div>

      <DataTable
        rows={filtered}
        columns={[
          { key: "reg", header: "Reg ID", render: (r) => <span className="font-mono text-xs">{r.registrations?.registration_code ?? "—"}</span> },
          { key: "team", header: "Team", render: (r) => <span className="font-medium">{r.teams?.name ?? "—"}</span> },
          { key: "dept", header: "Department", render: (r) => r.teams?.departments?.name ?? "—" },
          { key: "jury", header: "Jury", render: (r) => r.jury_members?.full_name ?? "—" },
          { key: "status", header: "Status", render: (r) => <StatusPill value={r.eval_status} /> },
          { key: "score", header: "Score", render: (r) => r.eval_score != null ? `${r.eval_score} (${r.eval_percentage}%)` : "—" },
        ]}
        actions={(r) => (
          <>
            <Button
              size="sm"
              onClick={() => setActive({
                jury_id: r.jury_id!,
                team_id: r.team_id!,
                event_id: r.event_id!,
                team_name: r.teams?.name ?? "",
                jury_name: r.jury_members?.full_name ?? "",
              })}
            >
              <Play className="mr-1 h-3.5 w-3.5" /> Evaluate
            </Button>
            {r.evaluation ? (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await setEvaluationLock(r.evaluation!.id, !r.evaluation!.is_locked, "toggled from admin");
                    toast.success(r.evaluation!.is_locked ? "Unlocked" : "Locked");
                    await qc.invalidateQueries({ queryKey: ["admin", "evaluation"] });
                  } catch (e) { toast.error((e as Error).message); }
                }}
              >
                {r.evaluation.is_locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              </Button>
            ) : null}
          </>
        )}
      />

      {active ? (
        <EvaluationDialog
          juryId={active.jury_id}
          teamId={active.team_id}
          eventId={active.event_id}
          teamName={active.team_name}
          juryName={active.jury_name}
          criteria={activeCriteria}
          existing={evaluations.find((e) => e.jury_id === active.jury_id && e.team_id === active.team_id && e.event_id === active.event_id) ?? null}
          onClose={() => setActive(null)}
          onSaved={async () => { await qc.invalidateQueries({ queryKey: ["admin", "evaluation"] }); }}
        />
      ) : null}
    </div>
  );
}

function EvaluationDialog({
  juryId, teamId, eventId, teamName, juryName, criteria, existing, onClose, onSaved,
}: {
  juryId: string;
  teamId: string;
  eventId: string;
  teamName: string;
  juryName: string;
  criteria: EvaluationCriterion[];
  existing:
    | (import("@/models/db").Evaluation & {
        evaluation_scores: Pick<import("@/models/db").EvaluationScore, "id" | "criterion_id" | "marks" | "remarks">[];
      })
    | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, { marks: string; remarks: string }>>(() => {
    const base: Record<string, { marks: string; remarks: string }> = {};
    for (const c of criteria) {
      const found = existing?.evaluation_scores.find((s) => s.criterion_id === c.id);
      base[c.id] = { marks: found ? String(found.marks) : "", remarks: found?.remarks ?? "" };
    }
    return base;
  });
  const [comments, setComments] = useState(existing?.overall_comments ?? "");
  const [recommendation, setRecommendation] = useState<EvaluationRecommendation | "">((existing?.recommendation as EvaluationRecommendation | null) ?? "");
  const locked = existing?.is_locked ?? false;

  const totals = useMemo(() => {
    let total = 0, max = 0, weighted = 0;
    for (const c of criteria) {
      const m = Number(values[c.id]?.marks || 0);
      total += m;
      max += Number(c.max_marks);
      if (Number(c.max_marks) > 0) weighted += (m / Number(c.max_marks)) * Number(c.weightage);
    }
    return { total, max, weighted: Math.round(weighted * 100) / 100, percentage: max === 0 ? 0 : Math.round((total / max) * 100 * 100) / 100 };
  }, [values, criteria]);

  async function persist(): Promise<string> {
    const evalId = await upsertEvaluation({ jury_id: juryId, team_id: teamId, event_id: eventId });
    for (const c of criteria) {
      const v = values[c.id];
      if (v?.marks === "" || v?.marks == null) continue;
      const marks = Number(v.marks);
      if (Number.isNaN(marks)) throw new Error(`Invalid marks for ${c.name}`);
      if (marks < 0) throw new Error(`Negative marks not allowed for ${c.name}`);
      if (marks > Number(c.max_marks)) throw new Error(`${c.name}: max is ${c.max_marks}`);
      await saveEvaluationScore({ evaluation_id: evalId, criterion_id: c.id, marks, remarks: v.remarks || null });
    }
    return evalId;
  }

  async function handleSave() {
    setSaving(true);
    try {
      await persist();
      toast.success("Draft saved");
      await writeAuditLog({ action: "evaluation_draft_save", module: "evaluation", description: `${teamName} · ${juryName}` });
      await onSaved();
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  }
  async function handleSubmit() {
    setSaving(true);
    try {
      const id = await persist();
      await submitEvaluation({ evaluation_id: id, comments: comments || null, recommendation: recommendation || null });
      toast.success("Evaluation submitted");
      await writeAuditLog({ action: "evaluation_submit", module: "evaluation", description: `${teamName} · ${juryName}` });
      await onSaved();
      onClose();
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evaluate — {teamName}</DialogTitle>
          <DialogDescription>Jury: {juryName}{locked ? " · Locked" : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {criteria.map((c) => (
            <div key={c.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.name} <span className="text-xs text-muted-foreground">· max {c.max_marks} · weight {c.weightage}%</span></div>
                  {c.description ? <div className="text-xs text-muted-foreground">{c.description}</div> : null}
                </div>
                <Input
                  type="number" min={0} max={Number(c.max_marks)} step="0.1" className="w-24"
                  value={values[c.id]?.marks ?? ""} disabled={locked}
                  onChange={(e) => setValues((s) => ({ ...s, [c.id]: { ...s[c.id], marks: e.target.value } }))}
                />
              </div>
              <Textarea
                className="mt-2" placeholder="Remarks (optional)" disabled={locked}
                value={values[c.id]?.remarks ?? ""}
                onChange={(e) => setValues((s) => ({ ...s, [c.id]: { ...s[c.id], remarks: e.target.value } }))}
              />
            </div>
          ))}

          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            <div className="grid grid-cols-4 gap-3">
              <div><div className="text-xs text-muted-foreground">Total</div><div className="font-mono">{totals.total} / {totals.max}</div></div>
              <div><div className="text-xs text-muted-foreground">Weighted</div><div className="font-mono">{totals.weighted}</div></div>
              <div><div className="text-xs text-muted-foreground">Percentage</div><div className="font-mono">{totals.percentage}%</div></div>
              <div><div className="text-xs text-muted-foreground">Status</div><div>{existing?.status ?? "in_progress"}</div></div>
            </div>
          </div>

          <FieldRow label="Overall comments">
            <Textarea value={comments} disabled={locked} onChange={(e) => setComments(e.target.value)} />
          </FieldRow>
          <FieldRow label="Recommendation">
            <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={recommendation} disabled={locked} onChange={(e) => setRecommendation(e.target.value as EvaluationRecommendation | "")}>
              <option value="">— select —</option>
              <option value="qualified">Qualified</option>
              <option value="needs_review">Needs Review</option>
              <option value="not_qualified">Not Qualified</option>
            </select>
          </FieldRow>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={handleSave} disabled={saving || locked}>Save draft</Button>
          <Button onClick={handleSubmit} disabled={saving || locked}>Submit evaluation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// LEADERBOARD
// =============================================================================
function LeaderboardTab({ eventId }: { eventId: string | null }) {
  const qc = useQueryClient();
  const { data: rows } = useSuspenseQuery(leaderboardQueryOptions(eventId));

  const byDept = useMemo(() => {
    const map = new Map<string, LeaderboardRow[]>();
    for (const r of rows) {
      const k = r.department_name ?? "Unspecified";
      const arr = map.get(k) ?? [];
      arr.push(r);
      map.set(k, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.department_rank - b.department_rank);
    return Array.from(map.entries());
  }, [rows]);

  async function publish() {
    if (!eventId) return toast.error("Select an event to publish results");
    try {
      await publishEventEvaluations(eventId, true);
      toast.success("Results published");
      await writeAuditLog({ action: "publish_results", module: "evaluation", metadata: { event_id: eventId } });
      await qc.invalidateQueries({ queryKey: ["admin", "evaluation"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  async function computeWinners() {
    if (!eventId) return toast.error("Select an event");
    const top = rows.filter((r) => r.event_id === eventId).slice(0, 3);
    if (top.length === 0) return toast.error("No evaluated teams yet");
    const positions = ["first", "second", "third"] as const;
    for (let i = 0; i < top.length; i++) {
      const t = top[i];
      const { error } = await supabase.from("winner_list").upsert({
        event_id: eventId,
        team_id: t.team_id,
        team_name_snapshot: t.team_name,
        position: positions[i],
      } as never, { onConflict: "event_id,position" as never });
      if (error) return toast.error(error.message);
    }
    toast.success("Winners recorded");
    await writeAuditLog({ action: "compute_winners", module: "evaluation", metadata: { event_id: eventId, top: top.map((t) => t.team_id) } });
    await qc.invalidateQueries({ queryKey: ["admin", "results"] });
  }

  function exportCsv() {
    const header = ["overall_rank", "dept_rank", "team", "event", "department", "reg_id", "avg_score", "avg_percentage", "high", "low", "jury_completed", "jury_total"];
    const data = rows.map((r) => [r.overall_rank, r.department_rank, r.team_name, r.event_name, r.department_name ?? "", r.registration_code ?? "", r.avg_score ?? "", r.avg_percentage ?? "", r.high_score ?? "", r.low_score ?? "", r.jury_completed, r.jury_total]);
    downloadCsv([header, ...data.map((r) => r.map(String))], `leaderboard-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="mr-1 h-4 w-4" /> CSV
        </Button>
        <Button variant="outline" onClick={computeWinners} disabled={!eventId || rows.length === 0}>
          <Award className="mr-1 h-4 w-4" /> Auto-compute winners
        </Button>
        <Button onClick={publish} disabled={!eventId}>
          <Trophy className="mr-1 h-4 w-4" /> Publish results
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 font-display text-lg">Overall Leaderboard</h3>
        <DataTable
          rows={rows}
          searchFields={(r) => `${r.team_name} ${r.event_name} ${r.department_name ?? ""} ${r.registration_code ?? ""}`}
          columns={[
            { key: "rank", header: "Rank", render: (r) => <span className="font-mono">#{r.overall_rank}</span> },
            { key: "team", header: "Team", render: (r) => <span className="font-medium">{r.team_name}</span> },
            { key: "event", header: "Event", render: (r) => r.event_name },
            { key: "dept", header: "Department", render: (r) => r.department_name ?? "—" },
            { key: "score", header: "Avg Score", render: (r) => r.avg_score ?? "—" },
            { key: "pct", header: "Percentage", render: (r) => r.avg_percentage != null ? `${r.avg_percentage}%` : "—" },
            { key: "high", header: "High / Low", render: (r) => `${r.high_score ?? "—"} / ${r.low_score ?? "—"}` },
            { key: "jury", header: "Jury", render: (r) => `${r.jury_completed} / ${r.jury_total}` },
            { key: "status", header: "Status", render: (r) => r.jury_completed === r.jury_total && r.jury_total > 0 ? <StatusPill value="completed" /> : <StatusPill value="in_progress" /> },
          ]}
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 font-display text-lg">Department Leaderboards</h3>
        {byDept.length === 0 ? (
          <p className="text-sm text-muted-foreground">No evaluations yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {byDept.map(([dept, list]) => (
              <div key={dept} className="rounded-md border border-border/60 p-3">
                <div className="mb-2 font-medium">{dept}</div>
                <ol className="space-y-1 text-sm">
                  {list.slice(0, 5).map((r) => (
                    <li key={`${r.team_id}-${r.event_id}`} className="flex items-center justify-between">
                      <span><span className="font-mono text-xs">#{r.department_rank}</span> · {r.team_name}</span>
                      <span className="font-mono text-xs">{r.avg_percentage != null ? `${r.avg_percentage}%` : "—"}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
