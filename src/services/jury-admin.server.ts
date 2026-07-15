type JuryMemberRecord = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  user_id: string | null;
};

function nameFromEmail(email: string) {
  return email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "Jury Member";
}

export async function ensureJuryMemberForUser(
  supabaseAdmin: any,
  input: { userId: string; email: string | null | undefined; fullName?: string | null },
): Promise<JuryMemberRecord | null> {
  const email = input.email?.trim().toLowerCase();
  if (!email) return null;

  const selectColumns = "id, full_name, email, status, user_id";

  const { data: byUser, error: byUserError } = await supabaseAdmin
    .from("jury_members")
    .select(selectColumns)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (byUserError) throw byUserError;
  if (byUser) return byUser.status === "active" ? (byUser as JuryMemberRecord) : null;

  const { data: byEmail, error: byEmailError } = await supabaseAdmin
    .from("jury_members")
    .select(selectColumns)
    .ilike("email", email)
    .maybeSingle();
  if (byEmailError) throw byEmailError;

  if (byEmail) {
    const existing = byEmail as JuryMemberRecord;
    if (existing.user_id && existing.user_id !== input.userId) return null;
    if (existing.status !== "active") return null;
    if (!existing.user_id) {
      const { data: linked, error: linkError } = await supabaseAdmin
        .from("jury_members")
        .update({ user_id: input.userId })
        .eq("id", existing.id)
        .select(selectColumns)
        .single();
      if (linkError) throw linkError;
      return linked as JuryMemberRecord;
    }
    return existing;
  }

  const { data: created, error: createError } = await supabaseAdmin
    .from("jury_members")
    .insert({
      full_name: input.fullName?.trim() || nameFromEmail(email),
      email,
      user_id: input.userId,
      status: "active",
    })
    .select(selectColumns)
    .single();
  if (createError) throw createError;
  return created as JuryMemberRecord;
}