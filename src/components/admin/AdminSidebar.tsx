import { Link, useRouterState } from "@tanstack/react-router";
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
  { title: "Homepage", url: "/admin/homepage", icon: Home },
  { title: "Events", url: "/admin/events", icon: CalendarDays },
  { title: "Registrations", url: "/admin/registrations", icon: Users },
  { title: "Problem Statements", url: "/admin/problem-statements", icon: FileText },
  { title: "Gallery", url: "/admin/gallery", icon: Image },
  { title: "Timeline", url: "/admin/timeline", icon: ListOrdered },
  { title: "Results", url: "/admin/results", icon: Trophy },
  { title: "Certificates", url: "/admin/certificates", icon: Award },
  { title: "Departments", url: "/admin/departments", icon: Building2 },
  { title: "Email Templates", url: "/admin/email-templates", icon: Mail },
  { title: "Contact Messages", url: "/admin/contact-messages", icon: Inbox },
  { title: "Website Settings", url: "/admin/settings", icon: Settings },
  { title: "Audit Logs", url: "/admin/audit-logs", icon: ScrollText },
];

export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>SPARK TANK 4.0 Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
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
