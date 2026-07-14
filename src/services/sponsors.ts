import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Sponsor } from "@/models/db";

async function fetchSponsors(): Promise<Sponsor[]> {
  const { data, error } = await supabase
    .from("sponsors")
    .select("*")
    .eq("status", "active")
    .order("priority", { ascending: false });
  if (error) throw error;
  return (data as Sponsor[] | null) ?? [];
}

export const sponsorsQueryOptions = queryOptions({
  queryKey: ["sponsors"],
  queryFn: fetchSponsors,
  staleTime: 5 * 60 * 1000,
});
