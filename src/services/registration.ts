import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";

export interface RegistrationMemberInput {
  full_name: string;
  registration_number: string;
  email: string;
  phone: string;
  branch: string;
  academic_year: string;
}

export type ProjectTrack = "software" | "hardware";

export interface RegisterTeamInput {
  event_id: string;
  idea_title: string;
  abstract: string;
  team: {
    name: string;
    academic_year: string;
    project_track: ProjectTrack | "";
    department_id?: string | null;
  };
  leader: RegistrationMemberInput;
  members: RegistrationMemberInput[];
}

export interface RegisterTeamResult {
  registration_id: string;
  registration_code: string;
  qr_token: string;
  team_id: string;
}

/**
 * Map postgres RAISE EXCEPTION codes from `register_team` to user copy.
 * Keeps the UI strings in one place so validation and server errors read the same.
 */
export const REGISTRATION_ERROR_MESSAGES: Record<string, string> = {
  invalid_event: "This event is no longer available for registration.",
  invalid_project_track: "Please select Software or Hardware.",
  invalid_idea_title: "Please provide a valid idea title.",
  invalid_abstract: "Abstract should be at least 30 characters.",
  registration_not_started: "Registration hasn't opened yet for this event.",
  registration_closed: "Registration for this event has closed.",
  event_full: "This event is fully booked. Try another arena.",
  invalid_team_size: "Team size is outside the limits for this event.",
  invalid_team_name: "Please choose a valid team name.",
  duplicate_team_name: "That team name is already taken for this event.",
  duplicate_email: "Each teammate needs a unique email address.",
  duplicate_registration_number:
    "Each teammate needs a unique registration number.",
  email_already_registered_for_event:
    "One of the emails is already registered for this event.",
  regno_already_registered_for_event:
    "One of the registration numbers is already registered for this event.",
  missing_required_fields: "Please fill in every required field.",
  invalid_email_format: "One of the email addresses looks invalid.",
  invalid_phone_number: "One of the phone numbers looks invalid.",
};

export function humanizeRegistrationError(raw: string | undefined): string {
  if (!raw) return "Something went wrong. Please try again.";
  const key = raw.trim();
  return (
    REGISTRATION_ERROR_MESSAGES[key] ??
    (raw.length < 200 ? raw : "Something went wrong. Please try again.")
  );
}

export async function registerTeam(input: RegisterTeamInput): Promise<RegisterTeamResult> {
  // Cast payload through unknown → Json (RPC arg types are structural; input is JSON-safe).
  const { data, error } = await supabase.rpc("register_team", {
    payload: input as unknown as never,
  });
  if (error) {
    // Postgres RAISE EXCEPTION → error.message contains the code we set.
    throw new Error(humanizeRegistrationError(error.message));
  }
  return data as unknown as RegisterTeamResult;
}

// -------- Capacity --------

export interface EventCapacity {
  registered: number;
  max: number | null;
}

async function fetchEventCapacity(eventId: string): Promise<EventCapacity> {
  const { data, error } = await supabase.rpc("event_capacity", { _event_id: eventId });
  if (error) throw error;
  const d = (data ?? {}) as { registered?: number; max?: number | null };
  return { registered: d.registered ?? 0, max: d.max ?? null };
}

export const eventCapacityQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: ["event_capacity", eventId],
    queryFn: () => fetchEventCapacity(eventId),
    // Live-ish: registration pages need current counts.
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
  });

// -------- Lookup --------

export interface LookupMember {
  team_member_id?: string;
  participant_id?: string;
  qr_token?: string;
  role: "leader" | "member" | string;
  full_name: string;
  email: string;
  phone: string | null;
  branch: string | null;
  academic_year: string | null;
  registration_number: string | null;
}

export interface RegistrationDetail {
  registration_id: string;
  registration_code: string;
  status: string;
  email_status: string;
  qr_token: string;
  registered_at: string;
  event: {
    id: string;
    name: string;
    slug: string;
    venue: string | null;
    event_date: string | null;
    department: string | null;
  };
  team: {
    id: string;
    name: string;
    academic_year: string | null;
  };
  members: LookupMember[];
}

export async function lookupRegistrationByCode(
  code: string,
): Promise<RegistrationDetail | null> {
  const { data, error } = await supabase.rpc("lookup_registration_by_code", {
    _code: code.trim(),
  });
  if (error) throw error;
  return (data as RegistrationDetail | null) ?? null;
}

export async function lookupRegistrationsByEmail(
  email: string,
): Promise<RegistrationDetail[]> {
  const { data, error } = await supabase.rpc("lookup_registrations_by_email", {
    _email: email.trim(),
  });
  if (error) throw error;
  return (data as RegistrationDetail[] | null) ?? [];
}
