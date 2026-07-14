import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { dbHealthQO } from "@/services/analytics";
import { Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/db-health")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dbHealthQO),
  component: DbHealthPage,
});

function DbHealthPage() {
  const { data } = useSuspenseQuery(dbHealthQO);
  const qc = useQueryClient();
  const last = data.last_updated ? new Date(String(data.last_updated)) : null;

  const rows: Array<[string, string, string]> = [
    ["events", "Events", "/admin/events"],
    ["registrations", "Registrations", "/admin/registrations"],
    ["teams", "Teams", "/admin/registrations"],
    ["participants", "Participants", "/admin/registrations"],
    ["attendance", "Attendance", "/admin/attendance"],
    ["evaluations", "Evaluations", "/admin/evaluation"],
    ["certificates", "Certificates", "/admin/certificates"],
    ["scorecards", "Scorecards", "/admin/scorecards"],
    ["gallery", "Gallery", "/admin/gallery"],
    ["reports", "Reports", "/admin/reports"],
    ["contact_submissions", "Contact Messages", "/admin/contact-messages"],
    ["announcements", "Announcements", "/admin/announcements"],
    ["notifications", "Notifications", "/admin/notifications"],
    ["audit_logs", "Audit Logs", "/admin/audit-logs"],
  ];

  return (
    <div>
      <AdminPageHeader
        title="Database Health"
        description="Live record counts and system health across every table."
        actions={
          <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["analytics", "db_health"] })}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Records" value={String(data.total_records ?? 0)} icon={Database} />
        <StatCard label="Total Events" value={String(data.events ?? 0)} />
        <StatCard label="Total Registrations" value={String(data.registrations ?? 0)} />
        <StatCard label="Total Gallery" value={String(data.gallery ?? 0)} />
        <StatCard label="Total Certificates" value={String(data.certificates ?? 0)} />
        <StatCard label="Total Reports" value={String(data.reports ?? 0)} />
        <StatCard label="Notifications" value={String(data.notifications ?? 0)} />
        <StatCard label="Audit Log Entries" value={String(data.audit_logs ?? 0)} />
      </div>

      <div className="mb-4 text-xs text-muted-foreground">
        Last updated: {last ? last.toLocaleString("en-GB") : "—"}
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Table</th>
              <th className="px-3 py-2">Records</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, label, href]) => (
              <tr key={key} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{label}</td>
                <td className="px-3 py-2">{String(data[key] ?? 0)}</td>
                <td className="px-3 py-2 text-right">
                  <Link to={href} className="text-xs text-accent hover:underline">Manage →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
