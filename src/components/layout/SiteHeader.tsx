import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { NAV_ITEMS, CTA_ITEM, SITE_FALLBACK } from "@/config/site";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  siteName?: string;
}

export function SiteHeader({ siteName = SITE_FALLBACK.name }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link to="/" className="group flex items-center gap-2" onClick={() => setOpen(false)}>
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_20px_var(--color-accent)]"
          />
          <span className="font-display text-sm tracking-[0.2em] uppercase text-foreground">
            {siteName}
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-foreground" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
              className="rounded-md px-3 py-2 text-sm transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Link
            to={CTA_ITEM.to}
            className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent px-5 py-2 text-sm font-medium text-accent-foreground shadow-[var(--shadow-glow)] transition-all hover:brightness-110"
          >
            {CTA_ITEM.label}
            <span aria-hidden>→</span>
          </Link>
        </div>

        <button
          className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          "lg:hidden overflow-hidden border-t border-border/60 bg-background transition-[max-height,opacity]",
          open ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <nav className="container-page flex flex-col gap-1 py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-foreground bg-secondary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="rounded-md px-3 py-3 text-base"
            >
              {item.label}
            </Link>
          ))}
          <Link
            to={CTA_ITEM.to}
            onClick={() => setOpen(false)}
            className="mt-3 inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-medium text-accent-foreground"
          >
            {CTA_ITEM.label}
          </Link>
        </nav>
      </div>
    </header>
  );
}
