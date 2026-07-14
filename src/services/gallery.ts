import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { GalleryItem } from "@/models/db";

async function fetchGallery(limit?: number): Promise<GalleryItem[]> {
  let q = supabase
    .from("gallery")
    .select("*")
    .eq("status", "active")
    .order("uploaded_at", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data as GalleryItem[] | null) ?? [];
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
