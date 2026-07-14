import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — SPARK TANK 4.0" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    if (error) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    const roleSet = new Set((roles ?? []).map((r) => r.role));
    const isAdmin = roleSet.has("admin");
    const isJury = roleSet.has("jury");
    const isIedcAdmin = roleSet.has("iedc_admin");
    const isEcell = roleSet.has("ecell_member");
    const path = location.pathname;
    const isEvaluationPath = path === "/admin/evaluation" || path.startsWith("/admin/evaluation/");

    // Super admin: full access
    if (isAdmin) return { user: session.user, isAdmin, isJury, isIedcAdmin: false };

    // Jury: only evaluation
    if (isJury) {
      if (!isEvaluationPath) throw redirect({ to: "/admin/evaluation" });
      return { user: session.user, isAdmin: false, isJury: true, isIedcAdmin: false };
    }

    // IEDC admin: everything except evaluation and system settings
    if (isIedcAdmin) {
      const blocked = isEvaluationPath
        || path.startsWith("/admin/audit-logs")
        || path.startsWith("/admin/settings")
        || path.startsWith("/admin/db-health")
        || path.startsWith("/admin/email-templates")
        || path.startsWith("/admin/user-management")
        || path.startsWith("/admin/website");
      if (blocked) throw redirect({ to: "/admin" });
      return { user: session.user, isAdmin: false, isJury: false, isIedcAdmin: true };
    }

    // E-cell members should go to /ecell-attendance
    if (isEcell) throw redirect({ to: "/ecell-attendance" });

    // Participants → their dashboard
    if (roleSet.has("participant")) throw redirect({ to: "/my-dashboard" });

    await supabase.auth.signOut();
    throw redirect({ to: "/auth", search: { redirect: location.href } });
  },
  component: AdminLayout,
});


function AdminLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur">
            <SidebarTrigger />
            <span className="font-display text-sm text-muted-foreground">SPARK TANK 4.0 · Admin Console</span>
            <div className="ml-auto">
              <Button size="sm" variant="ghost" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}
