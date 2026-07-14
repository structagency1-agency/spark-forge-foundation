import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !role) {
      throw new Response("Forbidden", { status: 403 });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [statsResult, registrationsResult, messagesResult, logsResult] = await Promise.all([
      supabaseAdmin.rpc("admin_stats"),
      supabaseAdmin
        .from("registrations")
        .select("id, registration_code, registered_at, status, email_status, events(name, slug), teams(name)")
        .order("registered_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("audit_logs")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(15),
    ]);

    if (statsResult.error) throw statsResult.error;
    if (registrationsResult.error) throw registrationsResult.error;
    if (messagesResult.error) throw messagesResult.error;
    if (logsResult.error) throw logsResult.error;

    return {
      stats: statsResult.data ?? {},
      recentRegistrations: registrationsResult.data ?? [],
      recentMessages: messagesResult.data ?? [],
      recentAuditLogs: logsResult.data ?? [],
    };
  });