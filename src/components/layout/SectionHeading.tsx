interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}

export function SectionHeading({ eyebrow, title, description, align = "left" }: SectionHeadingProps) {
  const alignCls = align === "center" ? "text-center mx-auto" : "";
  return (
    <div className={`max-w-2xl mb-12 ${alignCls}`}>
      {eyebrow && (
        <span className="mb-3 inline-block text-xs font-medium uppercase tracking-[0.25em] text-accent">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl md:text-5xl font-semibold">{title}</h2>
      {description && (
        <p className="mt-4 text-base text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
