import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import type { HomepageSection } from "@/models/db";
import { faqsQueryOptions } from "@/services/faqs";
import { SectionHeading } from "@/components/layout/SectionHeading";

export function FAQ({ section }: { section: HomepageSection }) {
  const { data } = useSuspenseQuery(faqsQueryOptions);
  const [open, setOpen] = useState<string | null>(data[0]?.id ?? null);
  if (data.length === 0) return null;

  return (
    <section className="container-page py-24 md:py-32">
      <SectionHeading
        eyebrow="FAQ"
        title={section.title ?? "Frequently asked questions"}
      />
      <div className="mx-auto max-w-3xl divide-y divide-border/60 rounded-2xl border border-border/60 bg-card/40">
        {data.map((f) => {
          const isOpen = open === f.id;
          return (
            <div key={f.id}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : f.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="font-display text-base md:text-lg text-foreground">
                  {f.question}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-accent transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground">
                  {f.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
