import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import type { HomepageSection } from "@/models/db";
import { settingsQueryOptions, pickString } from "@/services/settings";
import { SectionHeading } from "@/components/layout/SectionHeading";

export function ContactPreview({ section }: { section: HomepageSection }) {
  const { data: settings } = useSuspenseQuery(settingsQueryOptions);
  const email = pickString(settings, "contact", "email");
  const phone = pickString(settings, "contact", "phone");
  const address = pickString(settings, "contact", "address");
  const body = (section.content as { body?: string } | null)?.body;

  return (
    <section className="container-page py-24 md:py-32">
      <div className="surface-panel grid gap-10 p-10 md:p-14 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <SectionHeading
            eyebrow="Contact"
            title={section.title ?? "Get in touch"}
            description={body}
          />
          <Link
            to="/contact"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground shadow-[var(--shadow-glow)] transition-all hover:brightness-110"
          >
            Open contact page <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ul className="space-y-4 text-sm">
          {email && (
            <li className="flex items-start gap-3">
              <Mail className="mt-1 h-4 w-4 text-accent" />
              <a href={`mailto:${email}`} className="text-foreground hover:text-accent">
                {email}
              </a>
            </li>
          )}
          {phone && (
            <li className="flex items-start gap-3">
              <Phone className="mt-1 h-4 w-4 text-accent" />
              <a href={`tel:${phone}`} className="text-foreground hover:text-accent">
                {phone}
              </a>
            </li>
          )}
          {address && (
            <li className="flex items-start gap-3">
              <MapPin className="mt-1 h-4 w-4 text-accent" />
              <span className="text-muted-foreground">{address}</span>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
