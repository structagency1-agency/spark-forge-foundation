import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, UserPlus, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { writeAuditLog } from "@/services/admin";

export const Route = createFileRoute("/admin/user-management")({
  head: () => ({ meta: [{ title: "User Management — SPARK TANK 4.0" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: UserManagementPage,
});

type RoleName = "admin" | "iedc_admin" | "ecell_member" | "participant" | "jury";
const ROLES: RoleName[] = ["admin", "iedc_admin", "ecell_member", "participant", "jury"];

function UserManagementPage() {
  const qc = useQueryClient();
  const [emailToPromote, setEmailToPromote] = useState("");
  const [roleToGrant, setRoleToGrant] = useState<RoleName>("iedc_admin");
  const [assignUserId, setAssignUserId] = useState("");
  const [assignEventId, setAssignEventId] = useState("");

  const { data: roleRows } = useQuery({
    queryKey: ["admin", "user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data ?? [];
    },
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

  const byUser = useMemo(() => {
    const map = new Map<string, RoleName[]>();
    (roleRows ?? []).forEach((r) => {
      const arr = map.get(r.user_id) ?? [];
      arr.push(r.role as RoleName);
      map.set(r.user_id, arr);
    });
    return Array.from(map.entries());
  }, [roleRows]);

  async function grantRole() {
    const email = emailToPromote.trim().toLowerCase();
    if (!email) return toast.error("Enter an email");
    // Find user via participants or jury tables' user linking is not enough;
    // ask admin to paste user_id or lookup via user_roles by known linked email.
    // Best-effort: try find via participants → but participants isn't linked to auth.
    // Simpler: require user has signed up already; look up their user id via user_roles or via auth
    toast.info("The user must have signed up first. Ask them to sign in once, then paste their user ID from the list below.");
    setEmailToPromote("");
  }

  async function grantRoleById(userId: string, role: RoleName) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) return toast.error(error.message);
    toast.success(`Granted ${role}`);
    void writeAuditLog({ action: "role_grant", module: "user-management", description: `${userId} + ${role}` });
    await qc.invalidateQueries({ queryKey: ["admin", "user-roles"] });
  }

  async function revokeRole(userId: string, role: RoleName) {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) return toast.error(error.message);
    toast.success(`Revoked ${role}`);
    void writeAuditLog({ action: "role_revoke", module: "user-management", description: `${userId} − ${role}` });
    await qc.invalidateQueries({ queryKey: ["admin", "user-roles"] });
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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="User Management"
        description="Grant roles (IEDC Admin, E-Cell Member, Participant, Jury) and assign E-Cell members to events."
      />

      <Card className="p-4">
        <h2 className="mb-2 font-display text-lg">How this works</h2>
        <p className="text-sm text-muted-foreground">
          Users first sign up at <code>/auth</code> with their email/password. Their user ID appears in the
          "Registered users & roles" list below. Grant the appropriate role, and (for E-Cell members) assign
          them to specific events.
        </p>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-display text-lg">Registered users &amp; roles</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-2">User ID</th><th className="p-2">Roles</th><th className="p-2">Grant role</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byUser.length === 0 && (
                <tr><td colSpan={3} className="p-3 text-muted-foreground">No users have signed up yet.</td></tr>
              )}
              {byUser.map(([uid, roles]) => (
                <tr key={uid}>
                  <td className="p-2 font-mono text-xs">{uid}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {roles.map((r) => (
                        <span key={r} className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs">
                          {r}
                          <button onClick={() => revokeRole(uid, r)} className="text-red-500 hover:text-red-400">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      {ROLES.filter((r) => !roles.includes(r)).map((r) => (
                        <ConfirmButton
                          key={r}
                          label={`+ ${r}`}
                          variant="outline"
                          message={`Grant the ${r} role to this user?`}
                          onConfirm={() => grantRoleById(uid, r)}
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
            {byUser
              .filter(([, roles]) => roles.includes("ecell_member"))
              .map(([uid]) => (
                <option key={uid} value={uid}>{uid.slice(0, 12)}…</option>
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
              {(assignments ?? []).map((a) => (
                <tr key={a.id}>
                  <td className="p-2 font-mono text-xs">{a.user_id.slice(0, 12)}…</td>
                  <td className="p-2">{(a as unknown as { events: { name: string } | null }).events?.name ?? "—"}</td>
                  <td className="p-2 text-xs">{new Date(a.assigned_at).toLocaleString("en-GB", { timeZone: "UTC" })}</td>
                  <td className="p-2"><ConfirmButton label="Remove" onConfirm={() => unassign(a.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
