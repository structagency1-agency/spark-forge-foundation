import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Menu, X, Search } from "lucide-react";
import { NAV_ITEMS, CTA_ITEM, SITE_FALLBACK } from "@/config/site";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  siteName?: string;
}

export function SiteHeader({ siteName = SITE_FALLBACK.name }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setOpen(false);
    navigate({ to: "/search", search: { q } });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="container-page grid h-16 grid-cols-[auto_1fr_auto] items-center gap-3">
        <Link
          to="/"
          className="group flex shrink-0 items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-accent shadow-[0_0_20px_var(--color-accent)]"
          />
          <span className="font-display text-sm tracking-[0.2em] uppercase text-foreground whitespace-nowrap">
            {siteName}
          </span>
        </Link>

        <nav className="hidden lg:flex min-w-0 max-w-full items-center justify-center gap-1 overflow-hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-foreground" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
              className="rounded-md px-2 xl:px-3 py-2 text-xs xl:text-sm whitespace-nowrap transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center justify-end gap-2 shrink-0">
          <form
            role="search"
            onSubmit={submitSearch}
            className="flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1.5 text-sm focus-within:border-accent"
          >
            <Search className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <input
              type="search"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              aria-label="Search the site"
              className="w-28 lg:w-24 xl:w-36 2xl:w-44 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </form>
          <Link
            to={CTA_ITEM.to}
            className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent px-4 py-2 text-sm font-medium text-accent-foreground whitespace-nowrap shadow-[var(--shadow-glow)] transition-all hover:brightness-110"
          >
            <span className="inline 2xl:hidden">{CTA_ITEM.shortLabel ?? CTA_ITEM.label}</span>
            <span className="hidden 2xl:inline">{CTA_ITEM.label}</span>
            <span className="hidden 2xl:inline" aria-hidden>→</span>
          </Link>
        </div>

        <button
          className="lg:hidden col-start-3 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          "lg:hidden overflow-hidden border-t border-border/60 bg-background transition-[max-height,opacity]",
          open ? "max-h-[720px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <nav className="container-page flex flex-col gap-1 py-4">
          <form
            role="search"
            onSubmit={submitSearch}
            className="mb-3 flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-2 text-sm"
          >
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              type="search"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              aria-label="Search the site"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </form>
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
