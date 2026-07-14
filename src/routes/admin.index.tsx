import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Users,
  Image as ImageIcon,
  FileText,
  Inbox,
  Trophy,
  Zap,
  Clock,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  adminStatsQueryOptions,
  recentRegistrationsQueryOptions,
  recentContactMessagesQueryOptions,
  recentAuditLogsQueryOptions,
} from "@/services/admin";

export const Route = createFileRoute("/admin/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(adminStatsQueryOptions);
    context.queryClient.ensureQueryData(recentRegistrationsQueryOptions);
    context.queryClient.ensureQueryData(recentContactMessagesQueryOptions);
    context.queryClient.ensureQueryData(recentAuditLogsQueryOptions);
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { data: stats } = useSuspenseQuery(adminStatsQueryOptions);
  const { data: recentRegs } = useSuspenseQuery(recentRegistrationsQueryOptions);
  const { data: messages } = useSuspenseQuery(recentContactMessagesQueryOptions);
  const { data: logs } = useSuspenseQuery(recentAuditLogsQueryOptions);

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        description="Live overview of SPARK TANK 4.0 activity."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Events" value={stats.total_events} icon={CalendarDays} />
        <StatCard label="Upcoming" value={stats.upcoming_events} icon={Clock} />
        <StatCard label="Ongoing" value={stats.ongoing_events} icon={Zap} />
        <StatCard label="Completed" value={stats.completed_events} icon={CheckCircle2} />
        <StatCard label="Total Registrations" value={stats.total_registrations} icon={Users} />
        <StatCard label="Today's Registrations" value={stats.today_registrations} hint="Last 24 hours" icon={Users} />
        <StatCard label="Remaining Capacity" value={stats.remaining_capacity} icon={Trophy} />
        <StatCard label="Total Participants" value={stats.total_participants} icon={Users} />
        <StatCard label="Gallery Images" value={stats.gallery_images} icon={ImageIcon} />
        <StatCard label="Problem Statements" value={stats.problem_statements} icon={FileText} />
        <StatCard label="Contact Messages" value={stats.contact_messages} icon={Inbox} />
        <StatCard label="Unread Messages" value={stats.unread_messages} hint="Needs review" icon={Mail} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg">Recent Registrations</h2>
            <Link to="/admin/registrations" className="text-xs text-accent hover:underline">View all →</Link>
          </div>
          {recentRegs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No registrations yet.</p>
          ) : (
            <ul className="divide-y divide-border/60 text-sm">
              {recentRegs.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{(r as unknown as { teams: { name: string } | null }).teams?.name ?? "—"}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {(r as unknown as { events: { name: string } | null }).events?.name ?? "—"} · {r.registration_code}
                    </div>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs uppercase tracking-wide">
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg">Recent Messages</h2>
            <Link to="/admin/contact-messages" className="text-xs text-accent hover:underline">View all →</Link>
          </div>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            <ul className="divide-y divide-border/60 text-sm">
              {messages.map((m) => (
                <li key={m.id} className="py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{m.name}</span>
                    {!m.is_read ? <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] uppercase text-accent">New</span> : null}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{m.subject ?? m.message.slice(0, 80)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg">Recent Activity</h2>
            <Link to="/admin/audit-logs" className="text-xs text-accent hover:underline">View all →</Link>
          </div>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-border/60 text-sm">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate">
                      <span className="font-mono text-xs text-accent">{l.module}</span>{" "}
                      <span className="font-medium">{l.action}</span>{" "}
                      <span className="text-muted-foreground">{l.description ?? ""}</span>
                    </div>
                  </div>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(l.occurred_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
