import { useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import { Plus, Trash2, Loader2 } from "lucide-react";
import type { EventWithDepartment } from "@/services/events";
import type { Department } from "@/models/db";
import type {
  RegisterTeamInput,
  RegistrationMemberInput,
} from "@/services/registration";

const memberSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(120),
  registration_number: z
    .string()
    .trim()
    .min(1, "Registration number is required")
    .max(60),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(255),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[0-9\s()-]{7,20}$/u, "Enter a valid phone number")
    .max(30),
  branch: z.string().trim().min(1, "Branch is required").max(80),
  academic_year: z.string().trim().min(1, "Academic year is required").max(40),
});

const teamSchema = z.object({
  name: z.string().trim().min(2, "Team name is too short").max(120),
  academic_year: z.string().trim().min(1, "Academic year is required").max(40),
  project_track: z.string().trim().min(1, "Select a sub-track"),
});

const ideaSchema = z.object({
  idea_title: z.string().trim().min(3, "Idea title is required").max(160),
  abstract: z
    .string()
    .trim()
    .min(30, "Abstract should be at least 30 characters")
    .max(2000, "Abstract is too long (max 2000 chars)"),
});

const mentorSchema = z.object({
  name: z.string().trim().min(2, "Mentor name is required").max(120),
  branch: z.string().trim().min(1, "Mentor branch is required").max(120),
  email: z.string().trim().email("Enter a valid mentor email").max(255),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[0-9\s()-]{7,20}$/u, "Enter a valid mentor phone number")
    .max(30),
});


interface Props {
  event: EventWithDepartment;
  departments: Department[];
  defaultMember: RegistrationMemberInput;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (input: Omit<RegisterTeamInput, "event_id">) => void;
}

export function RegistrationForm({
  event,
  departments,
  defaultMember,
  submitting,
  submitError,
  onSubmit,
}: Props) {
  const subTracks = useMemo<string[]>(() => {
    const raw = (event as unknown as { sub_tracks?: string[] | null }).sub_tracks;
    const list = Array.isArray(raw) && raw.length > 0 ? raw : ["software", "hardware"];
    return list.map((s) => String(s).trim()).filter(Boolean);
  }, [event]);

  const [team, setTeam] = useState<{
    name: string;
    academic_year: string;
    project_track: string;
  }>({
    name: "",
    academic_year: "",
    project_track: "",
  });
  const [idea, setIdea] = useState({ idea_title: "", abstract: "" });
  const [leader, setLeader] = useState<RegistrationMemberInput>({ ...defaultMember });
  const [members, setMembers] = useState<RegistrationMemberInput[]>(
    event.min_team_size > 1
      ? Array.from({ length: event.min_team_size - 1 }, () => ({ ...defaultMember }))
      : [],
  );
  const [mentor, setMentor] = useState({ name: "", branch: "", email: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});


  const totalSize = 1 + members.length;
  const canAdd = totalSize < event.max_team_size;
  const canRemove = totalSize > event.min_team_size;

  // departments retained on props for schema compatibility but not shown in the form
  void useMemo(() => departments, [departments]);

  function updateMember(index: number, patch: Partial<RegistrationMemberInput>) {
    setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }

  function validate() {
    const next: Record<string, string> = {};
    const teamRes = teamSchema.safeParse(team);
    if (!teamRes.success) {
      for (const issue of teamRes.error.issues) {
        next[`team.${String(issue.path[0])}`] = issue.message;
      }
    }
    const ideaRes = ideaSchema.safeParse(idea);
    if (!ideaRes.success) {
      for (const issue of ideaRes.error.issues) {
        next[`idea.${String(issue.path[0])}`] = issue.message;
      }
    }
    const mentorRes = mentorSchema.safeParse(mentor);
    if (!mentorRes.success) {
      for (const issue of mentorRes.error.issues) {
        next[`mentor.${String(issue.path[0])}`] = issue.message;
      }
    }
    const leaderRes = memberSchema.safeParse(leader);
    if (!leaderRes.success) {
      for (const issue of leaderRes.error.issues) {
        next[`leader.${String(issue.path[0])}`] = issue.message;
      }
    }

    members.forEach((m, i) => {
      const res = memberSchema.safeParse(m);
      if (!res.success) {
        for (const issue of res.error.issues) {
          next[`member.${i}.${String(issue.path[0])}`] = issue.message;
        }
      }
    });

    const emails = [leader.email, ...members.map((m) => m.email)].map((e) =>
      e.trim().toLowerCase(),
    );
    const regnos = [leader.registration_number, ...members.map((m) => m.registration_number)].map((r) =>
      r.trim().toLowerCase(),
    );
    emails.forEach((e, i) => {
      if (e && emails.indexOf(e) !== i) {
        const k = i === 0 ? "leader.email" : `member.${i - 1}.email`;
        next[k] = "Duplicate email in this team";
      }
    });
    regnos.forEach((r, i) => {
      if (r && regnos.indexOf(r) !== i) {
        const k = i === 0 ? "leader.registration_number" : `member.${i - 1}.registration_number`;
        next[k] = "Duplicate registration number in this team";
      }
    });

    if (totalSize < event.min_team_size)
      next["team.size"] = `Add at least ${event.min_team_size - totalSize} more member(s)`;
    if (totalSize > event.max_team_size)
      next["team.size"] = `Remove ${totalSize - event.max_team_size} member(s)`;

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) {
      // Surface the first error so users understand why nothing happened.
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          const el = document.querySelector<HTMLElement>(
            "[data-registration-error='true']",
          );
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
      return;
    }
    onSubmit({
      idea_title: idea.idea_title.trim(),
      abstract: idea.abstract.trim(),
      mentor: {
        name: mentor.name.trim(),
        branch: mentor.branch.trim(),
        email: mentor.email.trim(),
        phone: mentor.phone.trim(),
      },
      team: {
        name: team.name,
        academic_year: team.academic_year,
        project_track: team.project_track,
        department_id: event.department_id ?? null,
      },
      leader,
      members,
    });
  }


  const errorCount = Object.keys(errors).length;
  const errorList = buildErrorList(errors);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {errorCount > 0 && (
        <div
          data-registration-error="true"
          role="alert"
          aria-live="polite"
          className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive-foreground"
        >
          <div className="font-semibold">
            Please fix {errorCount} issue{errorCount === 1 ? "" : "s"} before confirming your registration:
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errorList.map((e) => (
              <li key={e.key}>
                <span className="font-medium">{e.label}:</span> {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Section title="Team information">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Team name" required error={errors["team.name"]}>
            <input
              value={team.name}
              onChange={(e) => setTeam({ ...team, name: e.target.value })}
              maxLength={120}
              className={inputCls}
            />
          </Field>
          <Field label="Academic year" required error={errors["team.academic_year"]}>
            <YearSelect
              value={team.academic_year}
              onChange={(v) => setTeam({ ...team, academic_year: v })}
            />
          </Field>
          <Field label="Sub-track" required error={errors["team.project_track"]}>
            <select
              value={team.project_track}
              onChange={(e) =>
                setTeam({ ...team, project_track: e.target.value })
              }
              className={inputCls}
            >
              <option value="">Select sub-track</option>
              {subTracks.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section
        title="Your idea"
        hint="Give us a short pitch. You can refine this later."
      >
        <div className="space-y-4">
          <Field label="Idea title" required error={errors["idea.idea_title"]}>
            <input
              value={idea.idea_title}
              onChange={(e) => setIdea({ ...idea, idea_title: e.target.value })}
              maxLength={160}
              placeholder="e.g. AI-powered campus navigation for accessibility"
              className={inputCls}
            />
          </Field>
          <Field label="Abstract" required error={errors["idea.abstract"]}>
            <textarea
              value={idea.abstract}
              onChange={(e) => setIdea({ ...idea, abstract: e.target.value })}
              maxLength={2000}
              rows={6}
              placeholder="Describe the problem, your solution, and the impact (min. 30 characters)."
              className={`${inputCls} min-h-[140px] resize-y`}
            />
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {idea.abstract.trim().length}/2000
            </span>
          </Field>
        </div>
      </Section>

      <Section
        title="Mentor details"
        hint="Faculty/industry mentor guiding your team."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Mentor name" required error={errors["mentor.name"]}>
            <input
              value={mentor.name}
              onChange={(e) => setMentor({ ...mentor, name: e.target.value })}
              maxLength={120}
              className={inputCls}
            />
          </Field>
          <Field label="Branch / Department" required error={errors["mentor.branch"]}>
            <input
              value={mentor.branch}
              onChange={(e) => setMentor({ ...mentor, branch: e.target.value })}
              maxLength={120}
              className={inputCls}
            />
          </Field>
          <Field label="Mentor email" required error={errors["mentor.email"]}>
            <input
              type="email"
              value={mentor.email}
              onChange={(e) => setMentor({ ...mentor, email: e.target.value })}
              maxLength={255}
              className={inputCls}
            />
          </Field>
          <Field label="Mentor phone" required error={errors["mentor.phone"]}>
            <input
              type="tel"
              value={mentor.phone}
              onChange={(e) => setMentor({ ...mentor, phone: e.target.value })}
              maxLength={30}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>




      <Section
        title="Team leader"
        hint="This is the primary contact for the team."
      >
        <MemberFields
          prefix="leader"
          value={leader}
          onChange={(patch) => setLeader({ ...leader, ...patch })}
          errors={errors}
        />
      </Section>

      <Section
        title={`Team members (${totalSize}/${event.max_team_size})`}
        hint={`This event allows ${event.min_team_size}–${event.max_team_size} members including the leader.`}
      >
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {event.min_team_size === 1
              ? "This event allows solo entries — you can add optional teammates."
              : "Add your teammates below."}
          </p>
        )}
        <div className="space-y-6">
          {members.map((m, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/60 bg-card/30 p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <h4 className="font-display text-sm uppercase tracking-widest text-muted-foreground">
                  Member {i + 2}
                </h4>
                {canRemove && (
                  <button
                    type="button"
                    onClick={() =>
                      setMembers((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground hover:border-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                )}
              </div>
              <MemberFields
                prefix={`member.${i}`}
                value={m}
                onChange={(patch) => updateMember(i, patch)}
                errors={errors}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={!canAdd}
            onClick={() =>
              setMembers((prev) => [...prev, { ...defaultMember }])
            }
            className="inline-flex items-center gap-2 rounded-full border border-accent/40 px-4 py-2 text-sm text-accent hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add member
          </button>
          {errors["team.size"] && (
            <span className="text-xs text-destructive-foreground">{errors["team.size"]}</span>
          )}
        </div>
      </Section>

      {submitError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          {submitError}
        </div>
      )}



      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3 text-sm font-medium text-accent-foreground shadow-[var(--shadow-glow)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Submitting…" : "Confirm registration"}
      </button>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-panel p-6 md:p-8">
      <h3 className="font-display text-lg">{title}</h3>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-widest text-muted-foreground">
        {label} {required && <span className="text-accent">*</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive-foreground">{error}</span>}
    </div>
  );
}

function MemberFields({
  prefix,
  value,
  onChange,
  errors,
}: {
  prefix: string;
  value: RegistrationMemberInput;
  onChange: (patch: Partial<RegistrationMemberInput>) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Full name" required error={errors[`${prefix}.full_name`]}>
        <input
          value={value.full_name}
          onChange={(e) => onChange({ full_name: e.target.value })}
          maxLength={120}
          className={inputCls}
        />
      </Field>
      <Field label="Registration number" required error={errors[`${prefix}.registration_number`]}>
        <input
          value={value.registration_number}
          onChange={(e) => onChange({ registration_number: e.target.value })}
          maxLength={60}
          className={inputCls}
        />
      </Field>
      <Field label="Email" required error={errors[`${prefix}.email`]}>
        <input
          type="email"
          value={value.email}
          onChange={(e) => onChange({ email: e.target.value })}
          maxLength={255}
          className={inputCls}
        />
      </Field>
      <Field label="Phone" required error={errors[`${prefix}.phone`]}>
        <input
          type="tel"
          value={value.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          maxLength={30}
          className={inputCls}
        />
      </Field>
      <Field label="Branch" required error={errors[`${prefix}.branch`]}>
        <input
          value={value.branch}
          onChange={(e) => onChange({ branch: e.target.value })}
          maxLength={80}
          className={inputCls}
        />
      </Field>
      <Field label="Academic year" required error={errors[`${prefix}.academic_year`]}>
        <YearSelect
          value={value.academic_year}
          onChange={(v) => onChange({ academic_year: v })}
        />
      </Field>
    </div>
  );
}

const ACADEMIC_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"] as const;

function YearSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        className={`${inputCls} flex min-h-10 items-center justify-between text-left`}
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || "Select year"}
        </span>
        <span aria-hidden="true" className="text-xs text-accent">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div
          role="listbox"
          className="mt-2 overflow-hidden rounded-lg border border-border bg-popover shadow-[var(--shadow-elevated)]"
        >
          {ACADEMIC_YEARS.map((o) => (
            <button
              key={o}
              type="button"
              role="option"
              aria-selected={value === o}
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              className={`block w-full px-3 py-3 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                value === o ? "bg-accent/20 text-accent" : "bg-popover text-popover-foreground"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


const inputCls =
  "w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

const FIELD_LABELS: Record<string, string> = {
  full_name: "Full name",
  registration_number: "Registration number",
  email: "Email",
  phone: "Phone",
  branch: "Branch",
  academic_year: "Academic year",
  name: "Team name",
  project_track: "Track (Software / Hardware)",
  idea_title: "Idea title",
  abstract: "Abstract",
  size: "Team size",
};

function labelForKey(key: string): string {
  const parts = key.split(".");
  const field = parts[parts.length - 1] ?? key;
  const fieldLabel = FIELD_LABELS[field] ?? field;
  if (parts[0] === "team") return `Team — ${fieldLabel}`;
  if (parts[0] === "idea") return fieldLabel;
  if (parts[0] === "leader") return `Team leader — ${fieldLabel}`;
  if (parts[0] === "mentor") return `Mentor — ${fieldLabel}`;

  if (parts[0] === "member") {
    const idx = Number(parts[1] ?? "0");
    return `Member ${idx + 2} — ${fieldLabel}`;
  }
  return fieldLabel;
}

function buildErrorList(
  errors: Record<string, string>,
): Array<{ key: string; label: string; message: string }> {
  return Object.entries(errors).map(([key, message]) => ({
    key,
    label: labelForKey(key),
    message,
  }));
}
