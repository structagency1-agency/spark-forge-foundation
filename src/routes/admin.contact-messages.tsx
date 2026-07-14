import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { useEntityDelete } from "@/lib/adminCrud";
import { toast } from "sonner";
import { writeAuditLog } from "@/services/admin";
import type { ContactSubmission } from "@/models/db";

const contactMessagesQueryOptions = queryOptions({
  queryKey: ["admin", "contact-messages"],
  queryFn: async () => {
    const { data, error } = await supabase.from("contact_submissions").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ContactSubmission[];
  },
});

export const Route = createFileRoute("/admin/contact-messages")({
  loader: ({ context }) => context.queryClient.ensureQueryData(contactMessagesQueryOptions),
  component: ContactMessagesAdmin,
});

function ContactMessagesAdmin() {
  const { data: rows } = useSuspenseQuery(contactMessagesQueryOptions);
  const qc = useQueryClient();
  const remove = useEntityDelete({ table: "contact_submissions", module: "contact_submissions", invalidateKeys: [["admin", "contact-messages"], ["admin", "recent_contact_messages"]] });

  async function markRead(id: string, is_read: boolean) {
    const { error } = await supabase.from("contact_submissions").update({ is_read, read_at: is_read ? new Date().toISOString() : null }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(is_read ? "Marked read" : "Marked unread");
    await writeAuditLog({ action: is_read ? "mark_read" : "mark_unread", module: "contact_submissions", description: id });
    qc.invalidateQueries({ queryKey: ["admin", "contact-messages"] });
    qc.invalidateQueries({ queryKey: ["admin", "stats"] });
  }

  return (
    <div>
      <AdminPageHeader
        title="Contact Messages"
        description="Submissions from the public contact form."
      />
      <DataTable
        rows={rows}
        searchFields={(r) => `${r.name} ${r.email} ${r.subject ?? ""} ${r.message}`}
        columns={[
          { key: "when", header: "Received", render: (r) => new Date(r.created_at).toLocaleString() },
          { key: "name", header: "From", render: (r) => (
            <div>
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-muted-foreground">{r.email}</div>
            </div>
          ) },
          { key: "subject", header: "Subject", render: (r) => r.subject ?? "—" },
          { key: "message", header: "Message", render: (r) => (
            <span className="line-clamp-2 max-w-md text-muted-foreground">{r.message}</span>
          ) },
          { key: "read", header: "Read", render: (r) => r.is_read ? "Yes" : <span className="text-accent">New</span> },
        ]}
        actions={(r) => (
          <>
            <Button size="sm" variant="outline" onClick={() => markRead(r.id, !r.is_read)}>
              {r.is_read ? "Mark unread" : "Mark read"}
            </Button>
            <ConfirmButton onConfirm={() => remove.mutateAsync(r.id)} />
          </>
        )}
      />
    </div>
  );
}
