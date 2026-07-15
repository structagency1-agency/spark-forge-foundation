import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { ensureJuryMemberForUser } from "@/services/jury-admin.server";
import { assertAdmin } from "@/services/admin-auth.server";

export type ParticipantRegistrationRow = {
  registration_id: string;
  registration_code: string;
  registered_at: string;
  status: string;
  event_name: string;
  event_slug: string | null;
  team_id: string;
  team_name: string;
  member_id: string;
  role: string;
  full_name: string;
  email: string;
  phone: string | null;
  registration_number: string | null;
  academic_year: string | null;
  branch: string | null;
};

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

export const listParticipantRegistrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: registrations, error: registrationsError } = await supabaseAdmin
      .from("registrations")
      .select("id, registration_code, registered_at, status, event_id, team_id")
      .order("registered_at", { ascending: false })
      .limit(100);
    if (registrationsError) throw registrationsError;

    const regs = (registrations ?? []) as Array<{
      id: string;
      registration_code: string;
      registered_at: string;
      status: string;
      event_id: string;
      team_id: string;
    }>;
    if (regs.length === 0) return [] as ParticipantRegistrationRow[];

    const teamIds = Array.from(new Set(regs.map((r) => r.team_id)));
    const eventIds = Array.from(new Set(regs.map((r) => r.event_id)));

    const [teamsResult, eventsResult, membersResult] = await Promise.all([
      supabaseAdmin.from("teams").select("id, name").in("id", teamIds),
      supabaseAdmin.from("events").select("id, name, slug").in("id", eventIds),
      supabaseAdmin
        .from("team_members")
        .select("id, team_id, participant_id, role, registration_number, academic_year, branch")
        .in("team_id", teamIds),
    ]);

    if (teamsResult.error) throw teamsResult.error;
    if (eventsResult.error) throw eventsResult.error;
    if (membersResult.error) throw membersResult.error;

    const members = (membersResult.data ?? []) as Array<{
      id: string;
      team_id: string;
      participant_id: string;
      role: string;
      registration_number: string | null;
      academic_year: string | null;
      branch: string | null;
    }>;
    const participantIds = Array.from(new Set(members.map((m) => m.participant_id)));
    const participantsResult = participantIds.length
      ? await supabaseAdmin
          .from("participants")
          .select("id, full_name, email, phone")
          .in("id", participantIds)
      : { data: [], error: null };
    if (participantsResult.error) throw participantsResult.error;

    const teamMap = new Map(
      ((teamsResult.data ?? []) as Array<{ id: string; name: string }>).map((t) => [t.id, t]),
    );
    const eventMap = new Map(
      ((eventsResult.data ?? []) as Array<{ id: string; name: string; slug: string | null }>).map((e) => [e.id, e]),
    );
    const participantMap = new Map(
      ((participantsResult.data ?? []) as Array<{
        id: string;
        full_name: string;
        email: string;
        phone: string | null;
      }>).map((p) => [p.id, p]),
    );
    const membersByTeam = new Map<string, typeof members>();
    members.forEach((member) => {
      const list = membersByTeam.get(member.team_id) ?? [];
      list.push(member);
      membersByTeam.set(member.team_id, list);
    });

    return regs.flatMap((reg) => {
      const team = teamMap.get(reg.team_id);
      const event = eventMap.get(reg.event_id);
      const list = (membersByTeam.get(reg.team_id) ?? []).sort((a, b) => {
        if (a.role === b.role) return 0;
        return a.role === "leader" ? -1 : 1;
      });

      return list.map((member) => {
        const participant = participantMap.get(member.participant_id);
        return {
          registration_id: reg.id,
          registration_code: reg.registration_code,
          registered_at: reg.registered_at,
          status: reg.status,
          event_name: event?.name ?? "—",
          event_slug: event?.slug ?? null,
          team_id: reg.team_id,
          team_name: team?.name ?? "—",
          member_id: member.id,
          role: member.role,
          full_name: participant?.full_name ?? "—",
          email: participant?.email ?? "—",
          phone: participant?.phone ?? null,
          registration_number: member.registration_number,
          academic_year: member.academic_year,
          branch: member.branch,
        } satisfies ParticipantRegistrationRow;
      });
    });
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
    if (data.role === "jury") {
      await ensureJuryMemberForUser(supabaseAdmin, { userId, email: data.email });
    }
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

    if (data.role === "jury") {
      await ensureJuryMemberForUser(supabaseAdmin, {
        userId: created.user.id,
        email: data.email,
      });
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
