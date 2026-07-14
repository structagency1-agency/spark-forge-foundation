import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
    >
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 opacity-60" />}
            {item.href && !last ? (
              <Link to={item.href} className="hover:text-accent">
                {item.label}
              </Link>
            ) : (
              <span className={last ? "text-foreground" : ""}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
