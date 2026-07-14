import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface EntityFormRenderProps<T> {
  values: Partial<T>;
  setValue: <K extends keyof T>(key: K, value: T[K] | null) => void;
}

export function EntityFormDialog<T extends Record<string, unknown>>({
  open,
  onOpenChange,
  title,
  description,
  initial,
  onSubmit,
  render,
  submitLabel = "Save",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  initial: Partial<T>;
  onSubmit: (values: Partial<T>) => Promise<void>;
  render: (props: EntityFormRenderProps<T>) => ReactNode;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<Partial<T>>(initial);
  const [saving, setSaving] = useState(false);

  // Reset when opened
  const handleOpenChange = (v: boolean) => {
    if (v) setValues(initial);
    onOpenChange(v);
  };

  const setValue = <K extends keyof T>(key: K, value: T[K] | null) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              await onSubmit(values);
              onOpenChange(false);
            } finally {
              setSaving(false);
            }
          }}
          className="space-y-3"
        >
          {render({ values, setValue })}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
