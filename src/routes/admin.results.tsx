/**
 * Admin › Results
 * Per-event publishing dashboard: draft → publish (with scheduling & summary),
 * unpublish, hide, archive; plus quick actions to generate scorecards +
 * certificates. Publishing runs the `publish_results` RPC which snapshots
 * the leaderboard, promotes ranks 1..3 into winner_list, generates scorecards
 * and certificates, and queues result-published emails.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Rocket,
  EyeOff,
  Archive,
  Undo2,
  RefreshCw,
  Trophy,
  FileText,
  CalendarClock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DataTable } from "@/components/admin/DataTable";
import {
  adminResultsQueryOptions,
  publishResults,
  unpublishResults,
  hideResults,
  archiveResults,
  generateScorecards,
  generateCertificates,
  RESULT_STATUS_LABEL,
  type ResultWithEvent,
} from "@/services/results";
import type { Event, ResultStatus } from "@/models/db";

const eventsQueryOptions = queryOptions({
  queryKey: ["admin", "results", "events"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("events")
      .select("id, name, slug, status")
      .order("event_date", { ascending: false, nullsFirst: false });
    if (error) throw error;
    return (data ?? []) as Pick<Event, "id" | "name" | "slug" | "status">[];
  },
});

type EventRow = {
  id: string;
  event_id: string;
  event_name: string;
  event_slug: string;
  event_status: string;
  result_status: ResultStatus | null;
  published_at: string | null;
  scheduled_at: string | null;
  summary: string | null;
};

export const Route = createFileRoute("/admin/results")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(eventsQueryOptions);
    context.queryClient.ensureQueryData(adminResultsQueryOptions);
  },
  component: ResultsAdmin,
});

const STATUS_TONE: Record<ResultStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  hidden: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  archived: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

function ResultsAdmin() {
  const qc = useQueryClient();
  const { data: events } = useSuspenseQuery(eventsQueryOptions);
  const { data: results } = useSuspenseQuery(adminResultsQueryOptions);
  const [busy, setBusy] = useState<string | null>(null);
  const [publishDlg, setPublishDlg] = useState<EventRow | null>(null);
  const [publishSummary, setPublishSummary] = useState("");
  const [publishSchedule, setPublishSchedule] = useState("");

  const rows: EventRow[] = useMemo(() => {
    const byEvent = new Map<string, ResultWithEvent>();
    for (const r of results) byEvent.set(r.event_id, r);
    return events.map((e) => {
      const r = byEvent.get(e.id);
      return {
        id: e.id,
        event_id: e.id,
        event_name: e.name,
        event_slug: e.slug,
        event_status: e.status ?? "",
        result_status: (r?.status ?? null) as ResultStatus | null,
        published_at: r?.published_at ?? null,
        scheduled_at: r?.scheduled_at ?? null,
        summary: r?.summary ?? null,
      };
    });
  }, [events, results]);

  async function run(label: string, key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
      toast.success(label);
      qc.invalidateQueries({ queryKey: ["admin", "results-list"] });
      qc.invalidateQueries({ queryKey: ["results"] });
      qc.invalidateQueries({ queryKey: ["winners"] });
    } catch (err) {
      toast.error((err as Error).message ?? `${label} failed`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Results publishing"
        description="Publish, unpublish, hide or archive event results. Publishing snapshots the leaderboard, promotes winners, generates scorecards + certificates, and queues result emails."
      />

      <DataTable
        rows={rows}
        searchFields={(r) => `${r.event_name} ${r.event_slug} ${r.result_status ?? ""}`}
        columns={[
          {
            key: "event",
            header: "Event",
            render: (r) => (
              <div>
                <div className="font-medium">{r.event_name}</div>
                <div className="text-xs text-muted-foreground">/{r.event_slug}</div>
              </div>
            ),
          },
          {
            key: "status",
            header: "Result status",
            render: (r) => (
              <div className="flex flex-col gap-1">
                <Badge
                  variant="outline"
                  className={r.result_status ? STATUS_TONE[r.result_status] : "bg-muted text-muted-foreground"}
                >
                  {r.result_status ? RESULT_STATUS_LABEL[r.result_status] : "Not created"}
                </Badge>
                {r.scheduled_at ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" /> {new Date(r.scheduled_at).toLocaleString()}
                  </span>
                ) : null}
              </div>
            ),
          },
          {
            key: "published_at",
            header: "Published",
            render: (r) =>
              r.published_at ? new Date(r.published_at).toLocaleString() : <span className="text-muted-foreground">—</span>,
          },
        ]}
        actions={(r) => {
          const bkey = `${r.event_id}:`;
          return (
            <>
              <Button
                size="sm"
                variant="default"
                disabled={busy === bkey + "publish"}
                onClick={() => {
                  setPublishSummary(r.summary ?? "");
                  setPublishSchedule("");
                  setPublishDlg(r);
                }}
              >
                <Rocket className="mr-1 h-3.5 w-3.5" /> Publish
              </Button>
              {r.result_status === "published" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === bkey + "unpub"}
                  onClick={() => run("Unpublished", bkey + "unpub", () => unpublishResults(r.event_id))}
                >
                  <Undo2 className="mr-1 h-3.5 w-3.5" /> Unpublish
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                disabled={busy === bkey + "hide" || !r.result_status}
                onClick={() => run("Hidden", bkey + "hide", () => hideResults(r.event_id))}
              >
                <EyeOff className="mr-1 h-3.5 w-3.5" /> Hide
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === bkey + "arch" || !r.result_status}
                onClick={() => run("Archived", bkey + "arch", () => archiveResults(r.event_id))}
              >
                <Archive className="mr-1 h-3.5 w-3.5" /> Archive
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy === bkey + "score"}
                onClick={() =>
                  run("Scorecards generated", bkey + "score", async () => {
                    const n = await generateScorecards(r.event_id);
                    toast.info(`Generated ${n} scorecards`);
                  })
                }
              >
                <FileText className="mr-1 h-3.5 w-3.5" /> Scorecards
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy === bkey + "cert"}
                onClick={() =>
                  run("Certificates generated", bkey + "cert", async () => {
                    const n = await generateCertificates(r.event_id);
                    toast.info(`Generated ${n} certificates`);
                  })
                }
              >
                <Trophy className="mr-1 h-3.5 w-3.5" /> Certificates
              </Button>
            </>
          );
        }}
      />

      <Dialog open={!!publishDlg} onOpenChange={(v) => !v && setPublishDlg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish results — {publishDlg?.event_name}</DialogTitle>
            <DialogDescription>
              This snapshots the leaderboard, promotes ranks 1–3 into the winner list, generates
              scorecards + certificates and queues emails. Optionally schedule a future publish time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium">Summary (optional)</label>
            <Textarea
              value={publishSummary}
              onChange={(e) => setPublishSummary(e.target.value)}
              placeholder="One-line summary shown on the public results page"
            />
            <label className="text-sm font-medium">Schedule (optional)</label>
            <Input
              type="datetime-local"
              value={publishSchedule}
              onChange={(e) => setPublishSchedule(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDlg(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!publishDlg) return;
                const evId = publishDlg.event_id;
                setPublishDlg(null);
                await run("Publish action complete", `${evId}:publish`, () =>
                  publishResults(evId, {
                    summary: publishSummary || null,
                    scheduledAt: publishSchedule ? new Date(publishSchedule).toISOString() : null,
                  }),
                );
              }}
            >
              <Rocket className="mr-1 h-4 w-4" /> Publish now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-8 rounded-md border border-border bg-muted/20 p-4 text-sm text-muted-foreground flex items-start gap-2">
        <RefreshCw className="h-4 w-4 mt-0.5" />
        <div>
          Winners are managed on the <a href="/admin/winners" className="text-accent underline">Winners</a>{" "}
          page. Scorecards live under <a href="/admin/scorecards" className="text-accent underline">Scorecards</a>.
          Certificate templates and issued certificates are under{" "}
          <a href="/admin/certificates" className="text-accent underline">Certificates</a>.
        </div>
      </div>
    </div>
  );
}
