import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/ui/card";
import { Home, Settings, ListOrdered, Image, FileText, Inbox, Users, Megaphone } from "lucide-react";

export const Route = createFileRoute("/admin/website")({
  component: WebsitePage,
});

const shortcuts = [
  { href: "/admin/homepage", icon: Home, label: "Homepage Content", desc: "Hero, About, Highlights, Stats, CTA and section copy." },
  { href: "/admin/settings", icon: Settings, label: "Website Settings", desc: "Website name, logo, favicon, footer, contact info, social links." },
  { href: "/admin/announcements", icon: Megaphone, label: "Announcements", desc: "Manage banners displayed on the homepage." },
  { href: "/admin/timeline", icon: ListOrdered, label: "Timeline", desc: "Milestones shown on the homepage timeline preview." },
  { href: "/admin/gallery", icon: Image, label: "Gallery", desc: "Public gallery photos and highlights." },
  { href: "/admin/problem-statements", icon: FileText, label: "Problem Statements", desc: "Public problem statement listings." },
  { href: "/admin/contact-messages", icon: Inbox, label: "Contact Messages", desc: "Inbound messages from the contact form." },
  { href: "/admin/departments", icon: Users, label: "Departments & FAQ", desc: "Departments used for filtering and FAQ entries." },
];

function WebsitePage() {
  return (
    <div>
      <AdminPageHeader
        title="Website Management"
        description="Central hub for every public-facing area of the website. All changes update the site instantly."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map((s) => (
          <Link key={s.href} to={s.href}>
            <Card className="h-full p-4 transition hover:border-accent">
              <div className="mb-2 flex items-center gap-2">
                <s.icon className="h-5 w-5 text-accent" />
                <span className="font-display text-base">{s.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
