/**
 * Convenience re-exports of database row / insert / update types.
 * Import from here instead of `@/integrations/supabase/types` in feature code.
 */
import type { Tables, TablesInsert, TablesUpdate, Enums } from "@/integrations/supabase/types";

export type Department = Tables<"departments">;
export type Event = Tables<"events">;
export type Participant = Tables<"participants">;
export type Team = Tables<"teams">;
export type TeamMember = Tables<"team_members">;
export type Registration = Tables<"registrations">;
export type Attendance = Tables<"attendance">;
export type JuryAssignment = Tables<"jury_assignments">;
export type Evaluation = Tables<"evaluations">;
export type CertificateTemplate = Tables<"certificate_templates">;
export type Certificate = Tables<"certificates">;
export type ProblemStatement = Tables<"problem_statements">;
export type GalleryItem = Tables<"gallery">;
export type Sponsor = Tables<"sponsors">;
export type HomepageSection = Tables<"homepage_content">;
export type TimelineEntry = Tables<"timeline">;
export type Result = Tables<"results">;
export type WinnerListEntry = Tables<"winner_list">;
export type EmailLog = Tables<"email_logs">;
export type Report = Tables<"reports">;
export type Setting = Tables<"settings">;
export type AuditLog = Tables<"audit_logs">;
export type Faq = Tables<"faqs">;
export type ContactSubmission = Tables<"contact_submissions">;
export type ContactSubmissionInsert = TablesInsert<"contact_submissions">;
export type EmailTemplate = Tables<"email_templates">;

export type EventStatus = Enums<"event_status">;
export type WinnerPosition = Enums<"winner_position">;
export type MediaType = Enums<"media_type">;
export type ContentStatus = Enums<"content_status">;

export type { Tables, TablesInsert, TablesUpdate, Enums };
