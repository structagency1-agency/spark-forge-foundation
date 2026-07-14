import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { HomepageSection } from "@/models/db";

async function fetchHomepageSections(): Promise<HomepageSection[]> {
  const { data, error } = await supabase
    .from("homepage_content")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as HomepageSection[] | null) ?? [];
}

export const homepageQueryOptions = queryOptions({
  queryKey: ["homepage_content"],
  queryFn: fetchHomepageSections,
  staleTime: 60 * 1000,
});
