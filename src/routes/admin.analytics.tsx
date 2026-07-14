import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatCard } from "@/components/admin/StatCard";
import {
  analyticsOverviewQO,
  analyticsByEventQO,
  analyticsByDepartmentQO,
  registrationTrendsQO,
  attendanceAnalyticsQO,
  evaluationAnalyticsQO,
  certificateAnalyticsQO,
} from "@/services/analytics";
import { departmentsQueryOptions } from "@/services/departments";
import {
  CalendarDays, Users, Award, Trophy, Image as ImageIcon, Inbox, Zap, Clock,
  CheckCircle2, Gavel, QrCode, Megaphone, Bell,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart as RLineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/admin/analytics")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(analyticsOverviewQO);
    context.queryClient.ensureQueryData(analyticsByEventQO);
    context.queryClient.ensureQueryData(analyticsByDepartmentQO);
    context.queryClient.ensureQueryData(registrationTrendsQO(30));
    context.queryClient.ensureQueryData(attendanceAnalyticsQO);
    context.queryClient.ensureQueryData(evaluationAnalyticsQO);
    context.queryClient.ensureQueryData(certificateAnalyticsQO);
    context.queryClient.ensureQueryData(departmentsQueryOptions);
  },
  component: AnalyticsPage,
});

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#14b8a6", "#f97316", "#84cc16", "#6366f1"];

function AnalyticsPage() {
  const { data: overview } = useSuspenseQuery(analyticsOverviewQO);
  const { data: byEvent } = useSuspenseQuery(analyticsByEventQO);
  const { data: byDept } = useSuspenseQuery(analyticsByDepartmentQO);
  const { data: trends } = useSuspenseQuery(registrationTrendsQO(30));
  const { data: att } = useSuspenseQuery(attendanceAnalyticsQO);
  const { data: evalStats } = useSuspenseQuery(evaluationAnalyticsQO);
  const { data: certs } = useSuspenseQuery(certificateAnalyticsQO);
  const { data: departments } = useSuspenseQuery(departmentsQueryOptions);
  const [deptFilter, setDeptFilter] = useState<string>("ALL");

  const filteredDept = deptFilter === "ALL"
    ? byDept
    : byDept.filter((d) => d.name.toUpperCase() === deptFilter);

  const statusPie = Object.entries(trends.by_status ?? {}).map(([k, v]) => ({ name: k, value: v }));
  const certTypePie = Object.entries(certs.by_type ?? {}).map(([k, v]) => ({ name: k, value: v }));

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Analytics" description="Real-time analytics across every module." />

      <section>
        <h2 className="mb-3 font-display text-lg">Overview</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Events" value={overview.total_events} icon={CalendarDays} />
          <StatCard label="Upcoming" value={overview.upcoming_events} icon={Clock} />
          <StatCard label="Ongoing" value={overview.ongoing_events} icon={Zap} />
          <StatCard label="Completed" value={overview.completed_events} icon={CheckCircle2} />
          <StatCard label="Total Teams" value={overview.total_teams} icon={Users} />
          <StatCard label="Total Participants" value={overview.total_participants} icon={Users} />
          <StatCard label="Total Registrations" value={overview.total_registrations} icon={Users} />
          <StatCard label="Attended Teams" value={overview.attended_teams} icon={QrCode} />
          <StatCard label="Evaluated Teams" value={overview.evaluated_teams} icon={Gavel} />
          <StatCard label="Certificates" value={overview.certificates_generated} icon={Award} />
          <StatCard label="Published Results" value={overview.published_results} icon={Trophy} />
          <StatCard label="Gallery Images" value={overview.gallery_images} icon={ImageIcon} />
          <StatCard label="Contact Messages" value={overview.contact_messages} icon={Inbox} />
          <StatCard label="Active Announcements" value={overview.active_announcements} icon={Megaphone} />
          <StatCard label="Notifications" value={overview.unread_notifications} icon={Bell} />
          <StatCard label="Unread Messages" value={overview.unread_messages} icon={Inbox} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg">Registration Trends (Last 30 Days)</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 rounded-lg border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height="100%">
              <RLineChart data={trends.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="day" stroke="#888" fontSize={10} />
                <YAxis stroke="#888" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "#0f0f0f", border: "1px solid #333" }} />
                <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} />
              </RLineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-72 rounded-lg border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-medium">Registration Status Distribution</h3>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ backgroundColor: "#0f0f0f", border: "1px solid #333" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="h-64 rounded-lg border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-medium">Weekly (Last 90 Days)</h3>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={trends.weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="week" stroke="#888" fontSize={10} />
                <YAxis stroke="#888" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "#0f0f0f", border: "1px solid #333" }} />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-64 rounded-lg border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-medium">Monthly (Last 12 Months)</h3>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={trends.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" stroke="#888" fontSize={10} />
                <YAxis stroke="#888" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "#0f0f0f", border: "1px solid #333" }} />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg">Event Analytics</h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Regs</th>
                <th className="px-3 py-2">Teams</th>
                <th className="px-3 py-2">Attendance %</th>
                <th className="px-3 py-2">Eval Progress %</th>
                <th className="px-3 py-2">Winners</th>
                <th className="px-3 py-2">Capacity Used %</th>
              </tr>
            </thead>
            <tbody>
              {byEvent.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{e.name}</td>
                  <td className="px-3 py-2 text-xs">{e.status}</td>
                  <td className="px-3 py-2">{e.registrations}</td>
                  <td className="px-3 py-2">{e.teams}</td>
                  <td className="px-3 py-2">{e.attendance_pct}%</td>
                  <td className="px-3 py-2">{e.evaluation_progress_pct}%</td>
                  <td className="px-3 py-2">{e.winners}</td>
                  <td className="px-3 py-2">{e.capacity_used_pct}%</td>
                </tr>
              ))}
              {byEvent.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No events yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg">Department Analytics</h2>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1 text-sm"
          >
            <option value="ALL">ALL</option>
            {departments.map((d) => <option key={d.id} value={d.name.toUpperCase()}>{d.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Department</th>
                <th className="px-3 py-2">Registrations</th>
                <th className="px-3 py-2">Attended</th>
                <th className="px-3 py-2">Qualified</th>
                <th className="px-3 py-2">Winners</th>
                <th className="px-3 py-2">Participation %</th>
              </tr>
            </thead>
            <tbody>
              {filteredDept.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{d.name}</td>
                  <td className="px-3 py-2">{d.registrations}</td>
                  <td className="px-3 py-2">{d.attended}</td>
                  <td className="px-3 py-2">{d.qualified}</td>
                  <td className="px-3 py-2">{d.winners}</td>
                  <td className="px-3 py-2">{d.participation_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-display text-lg">Attendance</h2>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Attended" value={att.total_attended} />
            <StatCard label="Percentage" value={`${att.percentage}%`} />
          </div>
          <ul className="mt-3 space-y-1 text-xs">
            {att.by_department.slice(0, 8).map((r) => (
              <li key={r.department} className="flex justify-between border-t border-border/60 py-1">
                <span>{r.department}</span>
                <span className="text-muted-foreground">{r.attended} / {r.registered}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-display text-lg">Evaluation</h2>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Completed" value={evalStats.completed} />
            <StatCard label="Pending" value={evalStats.pending} />
            <StatCard label="Avg Score" value={`${evalStats.avg_score}%`} />
            <StatCard label="High / Low" value={`${evalStats.highest_score} / ${evalStats.lowest_score}`} />
          </div>
          <ul className="mt-3 space-y-1 text-xs">
            {evalStats.by_department.slice(0, 6).map((r) => (
              <li key={r.department} className="flex justify-between border-t border-border/60 py-1">
                <span>{r.department}</span>
                <span className="text-muted-foreground">{r.avg_score ?? 0}% · {r.evaluated_teams}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-display text-lg">Certificates</h2>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Generated" value={certs.generated} />
            <StatCard label="Downloaded" value={certs.downloaded} />
            <StatCard label="Verified" value={certs.verified} />
          </div>
          <div className="mt-3 h-40">
            {certTypePie.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={certTypePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                    {certTypePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground">No certificates issued yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
