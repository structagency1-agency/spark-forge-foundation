import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Faq } from "@/models/db";

async function fetchFaqs(): Promise<Faq[]> {
  const { data, error } = await supabase
    .from("faqs")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as Faq[] | null) ?? [];
}

export const faqsQueryOptions = queryOptions({
  queryKey: ["faqs"],
  queryFn: fetchFaqs,
  staleTime: 5 * 60 * 1000,
});
