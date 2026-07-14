import { Link } from "@tanstack/react-router";
import { NAV_ITEMS, SITE_FALLBACK } from "@/config/site";
import type { SettingsMap } from "@/services/settings";
import { pickString } from "@/services/settings";

interface SiteFooterProps {
  settings?: SettingsMap;
}

export function SiteFooter({ settings = {} }: SiteFooterProps) {
  const siteName = pickString(settings, "site", "name", SITE_FALLBACK.name);
  const tagline = pickString(settings, "site", "tagline", SITE_FALLBACK.tagline);
  const email = pickString(settings, "contact", "email");
  const phone = pickString(settings, "contact", "phone");
  const address = pickString(settings, "contact", "address");
  const copyright = pickString(
    settings,
    "footer",
    "copyright",
    `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`,
  );

  const socials = Object.entries((settings.social ?? {}) as Record<string, unknown>)
    .filter(([, v]) => typeof v === "string" && (v as string).length > 0)
    .map(([k, v]) => ({ label: k, href: v as string }));

  return (
    <footer className="mt-24 border-t border-border/60 bg-surface/40">
      <div className="container-page grid gap-12 py-16 lg:grid-cols-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
            <span className="font-display text-sm tracking-[0.2em] uppercase">{siteName}</span>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">{tagline}</p>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Quick Links
          </h4>
          <ul className="space-y-2 text-sm">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="text-foreground/80 transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Reach us
          </h4>
          <ul className="space-y-2 text-sm text-foreground/80">
            {email && (
              <li>
                <a href={`mailto:${email}`} className="hover:text-accent">
                  {email}
                </a>
              </li>
            )}
            {phone && (
              <li>
                <a href={`tel:${phone}`} className="hover:text-accent">
                  {phone}
                </a>
              </li>
            )}
            {address && <li className="text-muted-foreground">{address}</li>}
          </ul>
          {socials.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-border px-3 py-1 text-xs capitalize text-foreground/80 hover:border-accent hover:text-accent"
                >
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="container-page py-6 text-xs text-muted-foreground">
          <span>{copyright}</span>
        </div>
      </div>
    </footer>
  );
}
