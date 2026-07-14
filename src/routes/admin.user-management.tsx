import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { writeAuditLog } from "@/services/admin";
import { listAllUsers, grantRoleByEmail, deleteUser } from "@/services/userManagement.functions";

export const Route = createFileRoute("/admin/user-management")({
  head: () => ({ meta: [{ title: "User Management — SPARK TANK 4.0" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: UserManagementPage,
});

type RoleName = "admin" | "iedc_admin" | "ecell_member" | "participant" | "jury";
const ROLES: RoleName[] = ["admin", "iedc_admin", "ecell_member", "participant", "jury"];

function UserManagementPage() {
  const qc = useQueryClient();
  const listUsersFn = useServerFn(listAllUsers);
  const grantByEmailFn = useServerFn(grantRoleByEmail);
  const deleteUserFn = useServerFn(deleteUser);
  const [emailToPromote, setEmailToPromote] = useState("");
  const [roleToGrant, setRoleToGrant] = useState<RoleName>("iedc_admin");
  const [assignUserId, setAssignUserId] = useState("");
  const [assignEventId, setAssignEventId] = useState("");
  const [search, setSearch] = useState("");

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["admin", "all-users"],
    queryFn: () => listUsersFn(),
  });

  const { data: events } = useQuery({
    queryKey: ["admin", "events-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("id, name, event_date").order("event_date");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["admin", "ecell-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecell_event_assignments")
        .select("id, user_id, event_id, assigned_at, events(name)")
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = users ?? [];
    if (!q) return list;
    return list.filter(
      (u) => (u.email ?? "").toLowerCase().includes(q) || u.id.toLowerCase().includes(q),
    );
  }, [users, search]);

  async function grantByEmail() {
    const email = emailToPromote.trim().toLowerCase();
    if (!email) return toast.error("Enter an email");
    try {
      const res = await grantByEmailFn({ data: { email, role: roleToGrant } });
      toast.success(`Granted ${roleToGrant} to ${email}`);
      void writeAuditLog({ action: "role_grant", module: "user-management", description: `${email} + ${roleToGrant}` });
      setEmailToPromote("");
      await qc.invalidateQueries({ queryKey: ["admin", "all-users"] });
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : (e as Error).message;
      toast.error(msg || "Failed");
    }
  }

  async function grantRoleById(userId: string, role: RoleName) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) return toast.error(error.message);
    toast.success(`Granted ${role}`);
    void writeAuditLog({ action: "role_grant", module: "user-management", description: `${userId} + ${role}` });
    await qc.invalidateQueries({ queryKey: ["admin", "all-users"] });
  }

  async function revokeRole(userId: string, role: RoleName) {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) return toast.error(error.message);
    toast.success(`Revoked ${role}`);
    void writeAuditLog({ action: "role_revoke", module: "user-management", description: `${userId} − ${role}` });
    await qc.invalidateQueries({ queryKey: ["admin", "all-users"] });
  }

  async function assignEvent() {
    if (!assignUserId || !assignEventId) return toast.error("Pick user and event");
    const { error } = await supabase
      .from("ecell_event_assignments")
      .insert({ user_id: assignUserId, event_id: assignEventId });
    if (error) return toast.error(error.message);
    toast.success("Assigned");
    void writeAuditLog({ action: "ecell_assign", module: "user-management", description: `${assignUserId} → ${assignEventId}` });
    setAssignEventId("");
    await qc.invalidateQueries({ queryKey: ["admin", "ecell-assignments"] });
  }

  async function unassign(id: string) {
    const { error } = await supabase.from("ecell_event_assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["admin", "ecell-assignments"] });
  }

  const ecellUsers = (users ?? []).filter((u) => u.roles.includes("ecell_member"));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="User Management"
        description="Grant roles (IEDC Admin, E-Cell Member, Participant, Jury) and assign E-Cell members to events."
      />

      <Card className="p-4">
        <h2 className="mb-3 font-display text-lg">Grant a role by email</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          The user must have signed up at <code>/auth</code> first. Then enter their email here to grant a role directly.
        </p>
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-xs"
            type="email"
            placeholder="user@example.com"
            value={emailToPromote}
            onChange={(e) => setEmailToPromote(e.target.value)}
          />
          <select
            className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={roleToGrant}
            onChange={(e) => setRoleToGrant(e.target.value as RoleName)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <Button onClick={grantByEmail}><UserPlus className="mr-1 h-4 w-4" /> Grant role</Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg">All registered users</h2>
          <Input
            className="max-w-xs"
            placeholder="Search email or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">Email</th>
                <th className="p-2">User ID</th>
                <th className="p-2">Roles</th>
                <th className="p-2">Grant role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usersLoading && (
                <tr><td colSpan={4} className="p-3 text-muted-foreground">Loading users…</td></tr>
              )}
              {!usersLoading && filtered.length === 0 && (
                <tr><td colSpan={4} className="p-3 text-muted-foreground">No users found.</td></tr>
              )}
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="p-2">{u.email ?? "—"}</td>
                  <td className="p-2 font-mono text-xs">{u.id.slice(0, 12)}…</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && <span className="text-xs text-muted-foreground">no roles</span>}
                      {u.roles.map((r) => (
                        <span key={r} className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs">
                          {r}
                          <button onClick={() => revokeRole(u.id, r as RoleName)} className="text-red-500 hover:text-red-400">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {ROLES.filter((r) => !u.roles.includes(r)).map((r) => (
                        <ConfirmButton
                          key={r}
                          label={`+ ${r}`}
                          variant="outline"
                          message={`Grant the ${r} role to ${u.email ?? u.id}?`}
                          onConfirm={() => grantRoleById(u.id, r)}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-display text-lg">E-Cell event assignments</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={assignUserId}
            onChange={(e) => setAssignUserId(e.target.value)}
          >
            <option value="">— pick an E-Cell user —</option>
            {ecellUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.email ?? u.id.slice(0, 12)}</option>
            ))}
          </select>
          <select
            className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={assignEventId}
            onChange={(e) => setAssignEventId(e.target.value)}
          >
            <option value="">— pick event —</option>
            {(events ?? []).map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <Button onClick={assignEvent}><Plus className="mr-1 h-4 w-4" /> Assign</Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-2">User</th><th className="p-2">Event</th><th className="p-2">Assigned</th><th className="p-2"></th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(assignments ?? []).length === 0 && (
                <tr><td colSpan={4} className="p-3 text-muted-foreground">No assignments.</td></tr>
              )}
              {(assignments ?? []).map((a) => {
                const u = (users ?? []).find((x) => x.id === a.user_id);
                return (
                  <tr key={a.id}>
                    <td className="p-2 text-xs">{u?.email ?? a.user_id.slice(0, 12) + "…"}</td>
                    <td className="p-2">{(a as unknown as { events: { name: string } | null }).events?.name ?? "—"}</td>
                    <td className="p-2 text-xs">{new Date(a.assigned_at).toLocaleString("en-GB", { timeZone: "UTC" })}</td>
                    <td className="p-2"><ConfirmButton label="Remove" onConfirm={() => unassign(a.id)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
