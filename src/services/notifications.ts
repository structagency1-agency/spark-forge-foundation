import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Notification = Tables<"notifications">;

async function fetchNotifications(limit = 100): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export const notificationsQO = (limit = 100) =>
  queryOptions({
    queryKey: ["notifications", limit],
    queryFn: () => fetchNotifications(limit),
    staleTime: 15_000,
    refetchInterval: 45_000,
  });

export const unreadNotificationCountQO = queryOptions({
  queryKey: ["notifications", "unread_count"],
  queryFn: async () => {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false);
    if (error) throw error;
    return count ?? 0;
  },
  staleTime: 15_000,
  refetchInterval: 30_000,
});

export async function markNotificationRead(id: string, read = true) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: read, read_at: read ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("is_read", false);
  if (error) throw error;
}

export async function createNotification(input: {
  title: string;
  message?: string;
  kind?: "info" | "success" | "warning" | "error";
  module?: string;
  related_id?: string;
}) {
  const { error } = await supabase.from("notifications").insert({
    title: input.title,
    message: input.message ?? null,
    kind: input.kind ?? "info",
    module: input.module ?? "system",
    related_id: input.related_id ?? null,
  });
  if (error) throw error;
}
