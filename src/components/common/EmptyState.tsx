interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="surface-panel flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-4 text-accent">{icon}</div>}
      <h3 className="font-display text-xl">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
