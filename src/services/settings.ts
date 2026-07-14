import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Setting } from "@/models/db";

export type SettingsMap = Record<string, Record<string, unknown>>;

async function fetchSettings(): Promise<SettingsMap> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("is_public", true);
  if (error) throw error;
  const map: SettingsMap = {};
  for (const row of (data as Setting[] | null) ?? []) {
    map[row.key] = (row.value ?? {}) as Record<string, unknown>;
  }
  return map;
}

export const settingsQueryOptions = queryOptions({
  queryKey: ["settings"],
  queryFn: fetchSettings,
  staleTime: 5 * 60 * 1000,
});

export function pickString(
  settings: SettingsMap,
  group: string,
  key: string,
  fallback = "",
): string {
  const value = settings[group]?.[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function pickArray<T = unknown>(
  settings: SettingsMap,
  group: string,
  key: string,
): T[] {
  const value = settings[group]?.[key];
  return Array.isArray(value) ? (value as T[]) : [];
}
