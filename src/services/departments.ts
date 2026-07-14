import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Department } from "@/models/db";

async function fetchDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as Department[] | null) ?? [];
}

export const departmentsQueryOptions = queryOptions({
  queryKey: ["departments"],
  queryFn: fetchDepartments,
  staleTime: 60 * 60 * 1000,
});
