import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { EntityFormDialog, FieldRow } from "@/components/admin/EntityFormDialog";
import { useEntityCreate, useEntityUpdate, useEntityDelete } from "@/lib/adminCrud";
import { supabase } from "@/integrations/supabase/client";
import type { GalleryItem } from "@/models/db";

const galleryAdminQueryOptions = queryOptions({
  queryKey: ["admin", "gallery"],
  queryFn: async () => {
    const { data, error } = await supabase.from("gallery").select("*, events(name)").order("sort_order");
    if (error) throw error;
    return (data ?? []) as (GalleryItem & { events: { name: string } | null })[];
  },
});

const eventsSlimQueryOptions = queryOptions({
  queryKey: ["admin", "events-slim"],
  queryFn: async () => {
    const { data, error } = await supabase.from("events").select("id, name").order("name");
    if (error) throw error;
    return data ?? [];
  },
});

export const Route = createFileRoute("/admin/gallery")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(galleryAdminQueryOptions);
    context.queryClient.ensureQueryData(eventsSlimQueryOptions);
  },
  component: GalleryAdmin,
});

function GalleryAdmin() {
  const { data: rows } = useSuspenseQuery(galleryAdminQueryOptions);
  const { data: events } = useSuspenseQuery(eventsSlimQueryOptions);
  const [dlg, setDlg] = useState<{ open: boolean; row?: GalleryItem }>({ open: false });
  const create = useEntityCreate<GalleryItem>({ table: "gallery", module: "gallery", invalidateKeys: [["admin", "gallery"], ["gallery"]] });
  const update = useEntityUpdate<GalleryItem>({ table: "gallery", module: "gallery", invalidateKeys: [["admin", "gallery"], ["gallery"]] });
  const remove = useEntityDelete({ table: "gallery", module: "gallery", invalidateKeys: [["admin", "gallery"], ["gallery"]] });

  return (
    <div>
      <AdminPageHeader
        title="Gallery"
        description="Images shown on the public gallery page."
        actions={<Button onClick={() => setDlg({ open: true })}><Plus className="mr-1 h-4 w-4" /> New image</Button>}
      />
      <DataTable
        rows={rows}
        searchFields={(r) => `${r.title ?? ""} ${r.caption ?? ""}`}
        columns={[
          { key: "img", header: "Image", render: (r) => (
            <img src={r.thumbnail_url ?? r.url} alt={r.title ?? ""} className="h-12 w-16 rounded object-cover" loading="lazy" />
          ) },
          { key: "title", header: "Title", render: (r) => <span className="font-medium">{r.title ?? "—"}</span> },
          { key: "event", header: "Event", render: (r) => r.events?.name ?? "—" },
          { key: "status", header: "Status", render: (r) => r.status },
          { key: "sort", header: "Order", render: (r) => r.sort_order },
        ]}
        actions={(r) => (
          <>
            <Button size="sm" variant="outline" onClick={() => setDlg({ open: true, row: r })}><Pencil className="h-3.5 w-3.5" /></Button>
            <ConfirmButton onConfirm={() => remove.mutateAsync(r.id)} />
          </>
        )}
      />
      <EntityFormDialog<GalleryItem>
        open={dlg.open}
        onOpenChange={(v) => setDlg({ open: v })}
        title={dlg.row ? "Edit image" : "New image"}
        initial={dlg.row ?? { sort_order: rows.length + 1, status: "active", media_type: "image" }}
        onSubmit={async (values) => {
          if (dlg.row) await update.mutateAsync({ id: dlg.row.id, values });
          else await create.mutateAsync(values);
        }}
        render={({ values, setValue }) => (
          <>
            <FieldRow label="Image URL">
              <Input required value={(values.url as string) ?? ""} onChange={(e) => setValue("url", e.target.value)} />
            </FieldRow>
            <FieldRow label="Thumbnail URL (optional)">
              <Input value={(values.thumbnail_url as string) ?? ""} onChange={(e) => setValue("thumbnail_url", e.target.value)} />
            </FieldRow>
            <FieldRow label="Title">
              <Input value={(values.title as string) ?? ""} onChange={(e) => setValue("title", e.target.value)} />
            </FieldRow>
            <FieldRow label="Caption">
              <Textarea value={(values.caption as string) ?? ""} onChange={(e) => setValue("caption", e.target.value)} />
            </FieldRow>
            <FieldRow label="Event (optional)">
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={(values.event_id as string) ?? ""}
                onChange={(e) => setValue("event_id", e.target.value || null)}
              >
                <option value="">— none —</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Sort order">
              <Input type="number" value={(values.sort_order as number) ?? 0} onChange={(e) => setValue("sort_order", Number(e.target.value))} />
            </FieldRow>
            <FieldRow label="Status">
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={(values.status as string) ?? "active"}
                onChange={(e) => setValue("status", e.target.value as GalleryItem["status"])}
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </FieldRow>
          </>
        )}
      />
    </div>
  );
}
