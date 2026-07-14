import { supabase } from "@/integrations/supabase/client";
import type { ContactSubmissionInsert } from "@/models/db";

export async function submitContactMessage(payload: ContactSubmissionInsert) {
  const { error } = await supabase.from("contact_submissions").insert(payload);
  if (error) throw error;
}
