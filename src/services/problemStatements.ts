import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProblemStatement } from "@/models/db";

export type ProblemStatementWithEvent = ProblemStatement & {
  events: {
    name: string;
    slug: string;
    departments: { name: string; slug: string; code: string } | null;
  } | null;
};

const PS_SELECT = "*, events(name, slug, departments(name, slug, code))";

async function fetchProblemStatements(): Promise<ProblemStatementWithEvent[]> {
  const { data, error } = await supabase
    .from("problem_statements")
    .select(PS_SELECT)
    .eq("status", "active")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as ProblemStatementWithEvent[] | null) ?? [];
}

async function fetchProblemStatementsForEvent(
  eventId: string,
): Promise<ProblemStatementWithEvent[]> {
  const { data, error } = await supabase
    .from("problem_statements")
    .select(PS_SELECT)
    .eq("status", "active")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as ProblemStatementWithEvent[] | null) ?? [];
}

export const problemStatementsQueryOptions = queryOptions({
  queryKey: ["problem_statements"],
  queryFn: fetchProblemStatements,
  staleTime: 60 * 1000,
});

export const problemStatementsForEventQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: ["problem_statements", "event", eventId],
    queryFn: () => fetchProblemStatementsForEvent(eventId),
    staleTime: 60 * 1000,
  });
