import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { PageShell } from "@/components/layout/PageShell";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { buildMeta } from "@/lib/seo";
import { settingsQueryOptions, pickString } from "@/services/settings";
import { submitContactMessage } from "@/services/contact";
import { Mail, Phone, MapPin, Loader2 } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => buildMeta({
    title: "Contact",
    description: "Reach the SPARK TANK 4.0 organizing team — email, phone, campus address and contact form.",
    path: "/contact",
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQueryOptions),
  component: ContactPage,
});

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter your name")
    .max(100, "Name is too long"),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email")
    .max(255, "Email is too long"),
  subject: z.string().trim().max(200, "Subject is too long").optional(),
  message: z
    .string()
    .trim()
    .min(1, "Please write a message")
    .max(2000, "Message is too long (max 2000 characters)"),
});

function ContactPage() {
  const { data: settings } = useSuspenseQuery(settingsQueryOptions);
  const email = pickString(settings, "contact", "email");
  const phone = pickString(settings, "contact", "phone");
  const address = pickString(settings, "contact", "address");

  return (
    <PageShell
      eyebrow="Reach us"
      title="Talk to the team"
      description="Questions, partnerships, mentorship offers — we'd love to hear from you."
    >
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />

      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <ContactCard
            icon={<Mail className="h-5 w-5" />}
            label="Email"
            value={email}
            href={email ? `mailto:${email}` : undefined}
          />
          <ContactCard
            icon={<Phone className="h-5 w-5" />}
            label="Phone"
            value={phone}
            href={phone ? `tel:${phone}` : undefined}
          />
          <ContactCard icon={<MapPin className="h-5 w-5" />} label="Address" value={address} />
        </div>
        <ContactForm />
      </div>
    </PageShell>
  );
}

function ContactCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const body = value || "To be announced";
  const inner = (
    <div className="surface-panel h-full p-6">
      <div className="text-accent">{icon}</div>
      <div className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-lg break-words">{body}</div>
    </div>
  );
  return href ? (
    <a href={href} className="block">
      {inner}
    </a>
  ) : (
    inner
  );
}

function ContactForm() {
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setErrorMsg("");
    const form = new FormData(e.currentTarget);
    const raw = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      subject: String(form.get("subject") ?? "") || undefined,
      message: String(form.get("message") ?? ""),
    };
    const parsed = contactSchema.safeParse(raw);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !map[key]) map[key] = issue.message;
      }
      setErrors(map);
      return;
    }
    setState("submitting");
    try {
      await submitContactMessage(parsed.data);
      setState("done");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setState("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    }
  }

  if (state === "done") {
    return (
      <div className="surface-panel flex h-full flex-col items-start justify-center gap-3 p-8">
        <h2 className="font-display text-2xl text-gradient-accent">Message received</h2>
        <p className="text-sm text-muted-foreground">
          Thanks for reaching out. The organizing team will get back to you shortly.
        </p>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="mt-2 rounded-full border border-accent/40 px-5 py-2 text-sm text-accent hover:bg-accent hover:text-accent-foreground"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="surface-panel space-y-4 p-8">
      <h2 className="font-display text-2xl">Send a message</h2>

      <Field label="Name" name="name" required error={errors.name}>
        <input
          id="name"
          name="name"
          type="text"
          maxLength={100}
          required
          className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </Field>

      <Field label="Email" name="email" required error={errors.email}>
        <input
          id="email"
          name="email"
          type="email"
          maxLength={255}
          required
          className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </Field>

      <Field label="Subject" name="subject" error={errors.subject}>
        <input
          id="subject"
          name="subject"
          type="text"
          maxLength={200}
          className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </Field>

      <Field label="Message" name="message" required error={errors.message}>
        <textarea
          id="message"
          name="message"
          rows={6}
          maxLength={2000}
          required
          className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </Field>

      {state === "error" && (
        <p className="text-sm text-destructive-foreground">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground shadow-[var(--shadow-glow)] transition-all hover:brightness-110 disabled:opacity-60"
      >
        {state === "submitting" && <Loader2 className="h-4 w-4 animate-spin" />}
        {state === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  error,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
        {label} {required && <span className="text-accent">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive-foreground">{error}</p>}
    </div>
  );
}
