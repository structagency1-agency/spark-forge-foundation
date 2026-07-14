import { Link, useRouterState, getRouteApi } from "@tanstack/react-router";
const Route = getRouteApi("/admin");

import {
  LayoutDashboard,
  Home,
  CalendarDays,
  Users,
  FileText,
  Image,
  ListOrdered,
  Trophy,
  Award,
  Building2,
  Mail,
  Inbox,
  Settings,
  ScrollText,
  QrCode,
  Gavel,
  Medal,
  BarChart3,
  LineChart,
  FileSpreadsheet,
  Megaphone,
  Globe,
  Activity,
  Bell,
  UsersRound,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items: Array<{ title: string; url: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, exact: true },
  { title: "Analytics", url: "/admin/analytics", icon: LineChart },
  { title: "Reports", url: "/admin/reports", icon: FileSpreadsheet },
  { title: "Notifications", url: "/admin/notifications", icon: Bell },
  { title: "Announcements", url: "/admin/announcements", icon: Megaphone },
  { title: "Homepage", url: "/admin/homepage", icon: Home },
  { title: "Website Management", url: "/admin/website", icon: Globe },
  { title: "Events", url: "/admin/events", icon: CalendarDays },
  { title: "Registrations", url: "/admin/registrations", icon: Users },
  { title: "Attendance", url: "/admin/attendance", icon: QrCode },
  { title: "Evaluation", url: "/admin/evaluation", icon: Gavel },
  { title: "Results", url: "/admin/results", icon: Trophy },
  { title: "Winners", url: "/admin/winners", icon: Medal },
  { title: "Scorecards", url: "/admin/scorecards", icon: BarChart3 },
  { title: "Certificates", url: "/admin/certificates", icon: Award },
  { title: "Problem Statements", url: "/admin/problem-statements", icon: FileText },
  { title: "Gallery", url: "/admin/gallery", icon: Image },
  { title: "Timeline", url: "/admin/timeline", icon: ListOrdered },
  { title: "Departments", url: "/admin/departments", icon: Building2 },
  { title: "Email Templates", url: "/admin/email-templates", icon: Mail },
  { title: "Contact Messages", url: "/admin/contact-messages", icon: Inbox },
  { title: "Website Settings", url: "/admin/settings", icon: Settings },
  { title: "Database Health", url: "/admin/db-health", icon: Activity },
  { title: "Audit Logs", url: "/admin/audit-logs", icon: ScrollText },
];


export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const ctx = Route.useRouteContext();
  const isAdmin = ctx?.isAdmin ?? false;
  const isIedcAdmin = (ctx as { isIedcAdmin?: boolean })?.isIedcAdmin ?? false;

  const iedcBlocked = new Set([
    "/admin/evaluation",
    "/admin/audit-logs",
    "/admin/settings",
    "/admin/db-health",
    "/admin/email-templates",
    "/admin/website",
  ]);

  const visibleItems = isAdmin
    ? items
    : isIedcAdmin
      ? items.filter((i) => !iedcBlocked.has(i.url))
      : items.filter((i) => i.url === "/admin/evaluation");

  const sidebarLabel = isAdmin
    ? "SPARK TANK 4.0 Admin"
    : isIedcAdmin
      ? "SPARK TANK 4.0 · IEDC"
      : "SPARK TANK 4.0 Jury";
  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{sidebarLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.exact)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

