import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Response("Forbidden", { status: 403 });
}

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const users: Array<{ id: string; email: string | null; created_at: string; last_sign_in_at: string | null }> = [];
    let page = 1;
    for (let i = 0; i < 10; i++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const batch = data?.users ?? [];
      users.push(
        ...batch.map((u) => ({
          id: u.id,
          email: u.email ?? null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
        })),
      );
      if (batch.length < 200) break;
      page++;
    }

    const { data: roles, error: rolesErr } = await supabaseAdmin.from("user_roles").select("user_id, role");
    if (rolesErr) throw rolesErr;

    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: { user_id: string; role: string }) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });

    return users.map((u) => ({ ...u, roles: roleMap.get(u.id) ?? [] }));
  });

const roleSchema = z.enum(["admin", "iedc_admin", "ecell_member", "jury"]);

export const grantRoleByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ email: z.string().email(), role: roleSchema }).parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let userId: string | null = null;
    let page = 1;
    for (let i = 0; i < 10; i++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const match = (list?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === data.email.toLowerCase());
      if (match) {
        userId = match.id;
        break;
      }
      if ((list?.users ?? []).length < 200) break;
      page++;
    }
    if (!userId) throw new Response("User not found. They must sign up first.", { status: 404 });

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
    if (error && !error.message.includes("duplicate")) throw error;
    return { userId };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) {
      throw new Response("You cannot delete your own account.", { status: 400 });
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("ecell_event_assignments").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });

// Super Admin creates a new admin/jury/ecell/IEDC account with instant access.
export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
      role: roleSchema,
    }).parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // instant access — skip email verification
    });
    if (error || !created?.user) {
      throw new Response(error?.message ?? "Failed to create user", { status: 400 });
    }

    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: data.role });
    if (rErr && !rErr.message.includes("duplicate")) {
      throw new Response(rErr.message, { status: 500 });
    }

    // If jury, link to existing jury_members by email
    if (data.role === "jury") {
      await supabaseAdmin
        .from("jury_members")
        .update({ user_id: created.user.id })
        .ilike("email", data.email);
    }

    return { userId: created.user.id };
  });

// Super Admin can rotate an existing user's email or password.
export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      userId: z.string().uuid(),
      email: z.string().email().optional(),
      password: z.string().min(8).optional(),
    }).parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: Record<string, unknown> = { email_confirm: true };
    if (data.email) patch.email = data.email;
    if (data.password) patch.password = data.password;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, patch as never);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });
