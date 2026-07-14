import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { auditLogsQueryOptions } from "@/services/admin";

export const Route = createFileRoute("/admin/audit-logs")({
  loader: ({ context }) => context.queryClient.ensureQueryData(auditLogsQueryOptions(500)),
  component: AuditLogsAdmin,
});

function AuditLogsAdmin() {
  const { data: rows } = useSuspenseQuery(auditLogsQueryOptions(500));
  return (
    <div>
      <AdminPageHeader title="Audit Logs" description="Every admin action, most recent first." />
      <DataTable
        rows={rows}
        searchFields={(r) => `${r.module} ${r.action} ${r.description ?? ""}`}
        columns={[
          { key: "when", header: "When", render: (r) => new Date(r.occurred_at).toLocaleString() },
          { key: "module", header: "Module", render: (r) => <span className="font-mono text-xs">{r.module}</span> },
          { key: "action", header: "Action", render: (r) => <span className="font-medium">{r.action}</span> },
          { key: "actor", header: "Actor", render: (r) => r.actor_label ?? "system" },
          { key: "desc", header: "Description", render: (r) => <span className="text-muted-foreground">{r.description ?? "—"}</span> },
        ]}
      />
    </div>
  );
}
