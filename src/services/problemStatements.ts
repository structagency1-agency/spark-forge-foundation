import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProblemStatement } from "@/models/db";

export type ProblemStatementWithEvent = ProblemStatement & {
  events: { name: string; slug: string } | null;
};

async function fetchProblemStatements(): Promise<ProblemStatementWithEvent[]> {
  const { data, error } = await supabase
    .from("problem_statements")
    .select("*, events(name, slug)")
    .eq("status", "active")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as ProblemStatementWithEvent[] | null) ?? [];
}

export const problemStatementsQueryOptions = queryOptions({
  queryKey: ["problem_statements"],
  queryFn: fetchProblemStatements,
  staleTime: 60 * 1000,
});
