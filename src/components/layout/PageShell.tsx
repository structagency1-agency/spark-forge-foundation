import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Shared shell for every content page.
 * Renders an eyebrow, H1, optional description, and a slot for body content.
 */
export function PageShell({ eyebrow, title, description, children, className }: PageShellProps) {
  return (
    <main className={cn("container-page py-16 md:py-24", className)}>
      <header className="mb-12 md:mb-16 max-w-3xl">
        {eyebrow && (
          <span className="mb-4 inline-block text-xs font-medium uppercase tracking-[0.25em] text-accent">
            {eyebrow}
          </span>
        )}
        <h1 className="text-4xl md:text-6xl font-semibold text-gradient-accent">
          {title}
        </h1>
        {description && (
          <p className="mt-5 text-base md:text-lg text-muted-foreground">{description}</p>
        )}
      </header>
      {children}
    </main>
  );
}
