import { useSuspenseQuery } from "@tanstack/react-query";
import { activeAnnouncementsQO } from "@/services/announcements";
import { Megaphone, AlertTriangle, Info, Bell } from "lucide-react";

const priorityStyles: Record<string, { icon: typeof Info; className: string }> = {
  urgent: { icon: AlertTriangle, className: "border-red-500/40 bg-red-500/10 text-red-100" },
  high: { icon: Bell, className: "border-amber-500/40 bg-amber-500/10 text-amber-100" },
  normal: { icon: Megaphone, className: "border-accent/40 bg-accent/10 text-foreground" },
  low: { icon: Info, className: "border-border bg-card text-muted-foreground" },
};

export function AnnouncementBanner({ location = "homepage" }: { location?: string }) {
  const { data } = useSuspenseQuery(activeAnnouncementsQO(location));
  if (!data.length) return null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-2 px-4 pt-4">
      {data.map((a) => {
        const style = priorityStyles[a.priority] ?? priorityStyles.normal;
        const Icon = style.icon;
        return (
          <div key={a.id} className={`flex items-start gap-3 rounded-lg border p-3 ${style.className}`}>
            <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">{a.title}</div>
              <p className="mt-0.5 text-sm opacity-90">{a.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
