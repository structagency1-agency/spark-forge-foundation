import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { GalleryItem } from "@/models/db";

export type GalleryItemWithContext = GalleryItem & {
  events: {
    name: string;
    slug: string;
    departments: { name: string; slug: string; code: string } | null;
  } | null;
};

const GALLERY_SELECT =
  "*, events(name, slug, departments(name, slug, code))";

async function fetchGallery(limit?: number): Promise<GalleryItemWithContext[]> {
  let q = supabase
    .from("gallery")
    .select(GALLERY_SELECT)
    .eq("status", "active")
    .eq("media_type", "image")
    .order("uploaded_at", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data as GalleryItemWithContext[] | null) ?? [];
}

async function fetchGalleryForEvent(eventId: string, limit = 8): Promise<GalleryItemWithContext[]> {
  const { data, error } = await supabase
    .from("gallery")
    .select(GALLERY_SELECT)
    .eq("status", "active")
    .eq("media_type", "image")
    .eq("event_id", eventId)
    .order("uploaded_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as GalleryItemWithContext[] | null) ?? [];
}

export const galleryQueryOptions = queryOptions({
  queryKey: ["gallery", "all"],
  queryFn: () => fetchGallery(),
  staleTime: 60 * 1000,
});

export const galleryPreviewQueryOptions = queryOptions({
  queryKey: ["gallery", "preview"],
  queryFn: () => fetchGallery(8),
  staleTime: 60 * 1000,
});

export const galleryForEventQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: ["gallery", "event", eventId],
    queryFn: () => fetchGalleryForEvent(eventId),
    staleTime: 60 * 1000,
  });
