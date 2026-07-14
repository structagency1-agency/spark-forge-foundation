import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { buildReport, saveReportSnapshot, type ReportKind, type ReportFilters } from "@/services/reports";
import { exportCSV, exportExcel, exportPDF } from "@/lib/exporters";
import { eventsQueryOptions } from "@/services/events";
import { departmentsQueryOptions } from "@/services/departments";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";

export const Route = createFileRoute("/admin/reports")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(eventsQueryOptions);
    context.queryClient.ensureQueryData(departmentsQueryOptions);
  },
  component: ReportsPage,
});

const KINDS: { key: ReportKind; label: string }[] = [
  { key: "events", label: "Events" },
  { key: "registrations", label: "Registrations" },
  { key: "attendance", label: "Attendance" },
  { key: "evaluations", label: "Evaluations" },
  { key: "results", label: "Results" },
  { key: "winners", label: "Winners" },
  { key: "certificates", label: "Certificates" },
  { key: "gallery", label: "Gallery" },
  { key: "contact_messages", label: "Contact Messages" },
];

function ReportsPage() {
  const { data: events } = useSuspenseQuery(eventsQueryOptions);
  const { data: departments } = useSuspenseQuery(departmentsQueryOptions);
  const [kind, setKind] = useState<ReportKind>("registrations");
  const [filters, setFilters] = useState<ReportFilters>({});
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  const setF = (k: keyof ReportFilters, v: string) =>
    setFilters((f) => ({ ...f, [k]: v || null }));

  const runPreview = async () => {
    setLoading(true);
    try {
      const rows = await buildReport(kind, filters);
      setPreview(rows as Record<string, unknown>[]);
      toast.success(`${rows.length} rows found`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const doExport = async (fmt: "csv" | "xlsx" | "pdf") => {
    setLoading(true);
    try {
      const rows = preview.length ? preview : await buildReport(kind, filters);
      if (!rows.length) { toast.warning("No rows to export"); return; }
      const filename = `spark-tank-${kind}-${new Date().toISOString().slice(0, 10)}`;
      if (fmt === "csv") exportCSV(rows as never, filename);
      else if (fmt === "xlsx") await exportExcel(rows as never, filename, kind);
      else await exportPDF(rows as never, filename, `SPARK TANK 4.0 — ${kind}`);
      await saveReportSnapshot(kind, filters, rows as never);
      toast.success(`Exported ${rows.length} rows`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Reports" description="Generate and export reports across every module." />

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1">
          <span className="text-xs uppercase text-muted-foreground">Report</span>
          <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={kind} onChange={(e) => { setKind(e.target.value as ReportKind); setPreview([]); }}>
            {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase text-muted-foreground">Event</span>
          <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={filters.event_id ?? ""} onChange={(e) => setF("event_id", e.target.value)}>
            <option value="">All events</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase text-muted-foreground">Department</span>
          <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={filters.department_id ?? ""} onChange={(e) => setF("department_id", e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase text-muted-foreground">Registration Status</span>
          <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={filters.registration_status ?? ""} onChange={(e) => setF("registration_status", e.target.value)}>
            <option value="">All</option>
            <option value="pending">pending</option>
            <option value="confirmed">confirmed</option>
            <option value="attended">attended</option>
            <option value="evaluated">evaluated</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase text-muted-foreground">Attendance Status</span>
          <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={filters.attendance_status ?? ""} onChange={(e) => setF("attendance_status", e.target.value)}>
            <option value="">All</option>
            <option value="attended">attended</option>
            <option value="absent">absent</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase text-muted-foreground">Evaluation Status</span>
          <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={filters.evaluation_status ?? ""} onChange={(e) => setF("evaluation_status", e.target.value)}>
            <option value="">All</option>
            <option value="in_progress">in_progress</option>
            <option value="completed">completed</option>
            <option value="published">published</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase text-muted-foreground">From</span>
          <Input type="date" value={filters.from ?? ""} onChange={(e) => setF("from", e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase text-muted-foreground">To</span>
          <Input type="date" value={filters.to ?? ""} onChange={(e) => setF("to", e.target.value)} />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={runPreview} disabled={loading}>Preview</Button>
        <Button variant="outline" onClick={() => doExport("csv")} disabled={loading}>
          <FileDown className="mr-2 h-4 w-4" /> CSV
        </Button>
        <Button variant="outline" onClick={() => doExport("xlsx")} disabled={loading}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
        </Button>
        <Button variant="outline" onClick={() => doExport("pdf")} disabled={loading}>
          <FileText className="mr-2 h-4 w-4" /> PDF
        </Button>
      </div>

      {preview.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 uppercase text-muted-foreground">
              <tr>{Object.keys(preview[0]).map((k) => <th key={k} className="px-3 py-2">{k}</th>)}</tr>
            </thead>
            <tbody>
              {preview.slice(0, 100).map((r, i) => (
                <tr key={i} className="border-t border-border">
                  {Object.keys(preview[0]).map((k) => (
                    <td key={k} className="px-3 py-2">{String(r[k] ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {preview.length > 100 && (
            <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              Showing 100 of {preview.length} rows. Full dataset will be exported.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
