import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, LogOut, Search as SearchIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { saveEvaluationScore, submitEvaluation, upsertEvaluation } from "@/services/evaluation";

/**
 * Standalone Jury Portal. Signed-in jurors land here directly (never enter /admin).
 * Flow: pick event → pick sub-track → search assigned teams → evaluate against criteria.
 * Marks are locked after submission; any later change requires a reason (stored server-side).
 */
export const Route = createFileRoute("/jury")({
  head: () => ({
    meta: [
      { title: "Jury Portal — SPARK TANK 4.0" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) throw redirect({ to: "/auth", search: { redirect: location.href } });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", s.session.user.id);
    const set = new Set((roles ?? []).map((r) => r.role));
    if (!set.has("jury") && !set.has("admin")) {
      throw redirect({ to: "/" });
    }
    return { userId: s.session.user.id };
  },
  component: JuryPortal,
});

function JuryPortal() {
  const navigate = useNavigate();
  const [eventId, setEventId] = useState<string>("");
  const [track, setTrack] = useState<string>("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<{
    assignment_id: string;
    team_id: string;
    team_name: string;
    registration_code: string | null;
    track: string | null;
  } | null>(null);

  const { data: juryMember } = useQuery({
    queryKey: ["jury", "me"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jury_members").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: events } = useQuery({
    queryKey: ["jury", "events", juryMember?.id],
    enabled: !!juryMember?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jury_event_assignments")
        .select("event_id, track, events(id, name, sub_tracks, event_date, status)")
        .eq("jury_id", juryMember!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const eventOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; sub_tracks: string[] }>();
    for (const row of events ?? []) {
      const ev = (row as unknown as { events: { id: string; name: string; sub_tracks: string[] | null } | null }).events;
      if (ev && !map.has(ev.id)) map.set(ev.id, { id: ev.id, name: ev.name, sub_tracks: ev.sub_tracks ?? [] });
    }
    return Array.from(map.values());
  }, [events]);

  const trackOptions = useMemo(() => {
    if (!eventId) return [] as string[];
    const ev = eventOptions.find((e) => e.id === eventId);
    return ev?.sub_tracks?.length ? ev.sub_tracks : ["software", "hardware"];
  }, [eventId, eventOptions]);

  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ["jury", "teams-in-event", juryMember?.id, eventId, track],
    enabled: !!juryMember?.id && !!eventId,
    queryFn: async () => {
      // Source of truth = registrations for events the juror is assigned to.
      // Explicit per-team assignments are created lazily when they open Evaluate.
      const { data, error } = await supabase
        .from("registrations")
        .select(
          "id, registration_code, project_track, team_id, event_id, teams(id, name, department_id, departments(name))",
        )
        .eq("event_id", eventId)
        .neq("status", "cancelled");
      if (error) throw error;
      let rows = (data ?? []) as any[];
      if (track) rows = rows.filter((r) => (r.project_track ?? "") === track);

      // Overlay evaluation status for this juror to drive the UI badge.
      const { data: evs } = await supabase
        .from("evaluations")
        .select("team_id, status")
        .eq("jury_id", juryMember!.id)
        .eq("event_id", eventId);
      const statusByTeam = new Map<string, string>();
      for (const e of evs ?? []) statusByTeam.set((e as any).team_id, (e as any).status);

      return rows.map((r) => ({
        id: r.id,
        team_id: r.team_id,
        event_id: r.event_id,
        registration_code: r.registration_code,
        project_track: r.project_track,
        team_name: r.teams?.name ?? "—",
        department_name: r.teams?.departments?.name ?? "—",
        status: statusByTeam.get(r.team_id) ?? "pending",
      }));
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assignments ?? [];
    return (assignments ?? []).filter((r: any) =>
      `${r.team_name} ${r.registration_code ?? ""}`.toLowerCase().includes(q),
    );
  }, [assignments, search]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-3">
          <div>
            <div className="font-display text-lg">Jury Portal</div>
            <div className="text-xs text-muted-foreground">
              {juryMember?.full_name ?? "Signed in"} · SPARK TANK 4.0
            </div>
          </div>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-6">
        {!juryMember && (
          <Card className="p-4 text-sm text-muted-foreground">
            No jury profile is linked to your account yet. Ask the Super Admin to add you as a
            jury member with this exact email.
          </Card>
        )}

        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs uppercase text-muted-foreground">Event</label>
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={eventId}
                onChange={(e) => {
                  setEventId(e.target.value);
                  setTrack("");
                }}
              >
                <option value="">— pick event —</option>
                {eventOptions.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-muted-foreground">Sub-track</label>
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                disabled={!eventId}
              >
                <option value="">All sub-tracks</option>
                {trackOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-muted-foreground">Search team</label>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Team name or registration code…"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg">Your teams</h2>
            <span className="text-xs text-muted-foreground">
              {filtered.length} team{filtered.length === 1 ? "" : "s"}
            </span>
          </div>
          {loadingAssignments ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading assignments…
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              {eventId ? "No teams assigned in this scope." : "Pick an event to see your teams."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2">Reg ID</th>
                    <th className="p-2">Team</th>
                    <th className="p-2">Department</th>
                    <th className="p-2">Track</th>
                    <th className="p-2">Status</th>
                    <th className="p-2 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((r: any) => (
                    <tr key={r.id}>
                      <td className="p-2 font-mono text-xs">{r.registrations?.registration_code ?? "—"}</td>
                      <td className="p-2 font-medium">{r.teams?.name ?? "—"}</td>
                      <td className="p-2">{r.teams?.departments?.name ?? "—"}</td>
                      <td className="p-2 uppercase text-xs">{r.registrations?.project_track ?? "—"}</td>
                      <td className="p-2 text-xs uppercase">{r.status}</td>
                      <td className="p-2 text-right">
                        <Button
                          size="sm"
                          onClick={() =>
                            setActive({
                              assignment_id: r.id,
                              team_id: r.team_id,
                              team_name: r.teams?.name ?? "Team",
                              registration_code: r.registrations?.registration_code ?? null,
                              track: r.registrations?.project_track ?? null,
                            })
                          }
                        >
                          Evaluate
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>

      {active && juryMember && (
        <EvaluateDialog
          juryId={juryMember.id}
          eventId={eventId}
          team={active}
          onClose={() => setActive(null)}
        />
      )}

      <Toaster />
    </div>
  );
}

function EvaluateDialog({
  juryId,
  eventId,
  team,
  onClose,
}: {
  juryId: string;
  eventId: string;
  team: { assignment_id: string; team_id: string; team_name: string; registration_code: string | null };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: criteria } = useQuery({
    queryKey: ["jury", "criteria"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluation_criteria")
        .select("*")
        .eq("status", "active")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: existing } = useQuery({
    queryKey: ["jury", "existing-eval", juryId, team.team_id, eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("evaluations")
        .select("*, evaluation_scores(criterion_id, marks, remarks)")
        .eq("jury_id", juryId)
        .eq("team_id", team.team_id)
        .eq("event_id", eventId)
        .maybeSingle();
      return data;
    },
  });

  const isSubmitted = existing?.status === "completed" || existing?.status === "published";

  async function ensureEvaluation(): Promise<string> {
    if (evaluationId) return evaluationId;
    if (existing?.id) {
      setEvaluationId(existing.id);
      // hydrate existing scores/remarks
      const s: Record<string, number> = {};
      const r: Record<string, string> = {};
      for (const row of (existing.evaluation_scores ?? []) as { criterion_id: string; marks: number; remarks: string | null }[]) {
        s[row.criterion_id] = Number(row.marks);
        if (row.remarks) r[row.criterion_id] = row.remarks;
      }
      setScores((prev) => ({ ...s, ...prev }));
      setRemarks((prev) => ({ ...r, ...prev }));
      return existing.id;
    }
    const id = await upsertEvaluation({ jury_id: juryId, team_id: team.team_id, event_id: eventId });
    setEvaluationId(id);
    return id;
  }

  async function saveAll() {
    if (!criteria || criteria.length === 0) return toast.error("No criteria configured");
    if (isSubmitted && reason.trim().length < 3) {
      return toast.error("Give a reason (3+ chars) for editing after submission");
    }
    setBusy(true);
    try {
      const id = await ensureEvaluation();
      for (const c of criteria) {
        if (scores[c.id] === undefined) continue;
        await saveEvaluationScore({
          evaluation_id: id,
          criterion_id: c.id,
          marks: scores[c.id],
          remarks: remarks[c.id] ?? null,
          reason: isSubmitted ? reason.trim() : null,
        });
      }
      toast.success("Scores saved");
      await qc.invalidateQueries({ queryKey: ["jury"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!criteria) return;
    const missing = criteria.filter((c) => scores[c.id] === undefined);
    if (missing.length > 0) return toast.error("Score all criteria before submitting");
    setBusy(true);
    try {
      const id = await ensureEvaluation();
      for (const c of criteria) {
        await saveEvaluationScore({
          evaluation_id: id,
          criterion_id: c.id,
          marks: scores[c.id],
          remarks: remarks[c.id] ?? null,
        });
      }
      await submitEvaluation({ evaluation_id: id, comments: comments || null });
      toast.success("Evaluation submitted");
      await qc.invalidateQueries({ queryKey: ["jury"] });
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-display text-xl">{team.team_name}</h3>
            <p className="text-xs text-muted-foreground font-mono">{team.registration_code}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>

        {isSubmitted && (
          <div className="mb-4 rounded-md border border-amber-400/40 bg-amber-400/10 p-3 text-sm">
            This evaluation is already submitted. Any changes require a reason.
            <Input
              className="mt-2"
              placeholder="Reason for changing the marks"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-4">
          {(criteria ?? []).map((c) => (
            <div key={c.id} className="rounded-lg border border-border/60 p-3">
              <div className="flex items-baseline justify-between">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  weight {c.weightage} · max {c.max_marks}
                </div>
              </div>
              {c.description && <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>}
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <Input
                  type="number"
                  min={0}
                  max={c.max_marks}
                  placeholder={`0 – ${c.max_marks}`}
                  value={scores[c.id] ?? ""}
                  onChange={(e) => setScores((s) => ({ ...s, [c.id]: Number(e.target.value) }))}
                />
                <Input
                  className="sm:col-span-2"
                  placeholder="Remarks (optional)"
                  value={remarks[c.id] ?? ""}
                  onChange={(e) => setRemarks((r) => ({ ...r, [c.id]: e.target.value }))}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs uppercase text-muted-foreground">Overall comments</label>
          <Input value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Optional overall feedback" />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={saveAll} disabled={busy}>
            {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save draft
          </Button>
          {!isSubmitted && (
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Submit evaluation
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
