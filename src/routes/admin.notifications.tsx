import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { notificationsQO, markNotificationRead, markAllNotificationsRead } from "@/services/notifications";
import { toast } from "sonner";
import { Bell, CheckCheck, Check } from "lucide-react";

export const Route = createFileRoute("/admin/notifications")({
  loader: ({ context }) => context.queryClient.ensureQueryData(notificationsQO(100)),
  component: NotificationsPage,
});

const kindStyles: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  warning: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  error: "bg-red-500/20 text-red-400 border-red-500/40",
};

function NotificationsPage() {
  const { data: notifications } = useSuspenseQuery(notificationsQO(100));
  const qc = useQueryClient();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["analytics", "overview"] });
  };

  const markOne = async (id: string) => {
    try { await markNotificationRead(id, true); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const markAll = async () => {
    try { await markAllNotificationsRead(); refresh(); toast.success("Marked all as read"); }
    catch (e) { toast.error((e as Error).message); }
  };

  const unread = notifications.filter((n) => !n.is_read);

  return (
    <div>
      <AdminPageHeader
        title="Notifications"
        description="In-dashboard system events: registrations closed, events full, evaluations, results, certificates."
        actions={
          <Button variant="outline" onClick={markAll} disabled={!unread.length}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
          </Button>
        }
      />

      {notifications.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          <Bell className="mx-auto mb-3 h-8 w-8 opacity-40" />
          No notifications yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id} className={`flex items-start justify-between gap-3 rounded-lg border bg-card p-4 ${n.is_read ? "border-border opacity-70" : "border-accent/40"}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded border px-2 py-0.5 text-[10px] uppercase ${kindStyles[n.kind] ?? kindStyles.info}`}>{n.kind}</span>
                  <span className="text-xs text-muted-foreground">{n.module}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("en-GB")}</span>
                </div>
                <div className="mt-1 font-medium">{n.title}</div>
                {n.message && <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>}
              </div>
              {!n.is_read && (
                <Button size="sm" variant="ghost" onClick={() => markOne(n.id)}>
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
