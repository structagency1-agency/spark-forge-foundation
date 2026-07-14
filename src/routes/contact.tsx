import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/layout/PageShell";
import { buildMeta } from "@/lib/seo";
import { settingsQueryOptions, pickString } from "@/services/settings";
import { Mail, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => buildMeta({
    title: "Contact",
    description: "Reach the SPARK TANK 4.0 organizing team — email, phone and campus address.",
    path: "/contact",
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQueryOptions),
  component: ContactPage,
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
      <div className="grid gap-6 md:grid-cols-3">
        <ContactCard icon={<Mail className="h-5 w-5" />} label="Email" value={email} href={email ? `mailto:${email}` : undefined} />
        <ContactCard icon={<Phone className="h-5 w-5" />} label="Phone" value={phone} href={phone ? `tel:${phone}` : undefined} />
        <ContactCard icon={<MapPin className="h-5 w-5" />} label="Address" value={address} />
      </div>
    </PageShell>
  );
}

function ContactCard({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const body = value || "To be announced";
  const inner = (
    <div className="surface-panel h-full p-6">
      <div className="text-accent">{icon}</div>
      <div className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-lg break-words">{body}</div>
    </div>
  );
  return href ? <a href={href}>{inner}</a> : inner;
}
