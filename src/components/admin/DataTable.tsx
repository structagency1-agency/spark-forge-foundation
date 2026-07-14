import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  width?: string;
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  searchFields,
  emptyLabel = "No entries yet",
  actions,
}: {
  rows: T[];
  columns: Column<T>[];
  searchFields?: (row: T) => string;
  emptyLabel?: string;
  actions?: (row: T) => ReactNode;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim() || !searchFields) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) => searchFields(r).toLowerCase().includes(needle));
  }, [rows, q, searchFields]);

  return (
    <div className="space-y-3">
      {searchFields ? (
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search..."
          className="max-w-sm"
        />
      ) : null}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-3 py-2" style={c.width ? { width: c.width } : undefined}>
                  {c.header}
                </th>
              ))}
              {actions ? <th className="px-3 py-2 text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-3 py-8 text-center text-muted-foreground">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="border-t border-border/60 hover:bg-muted/20">
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2 align-top">
                      {c.render(row)}
                    </td>
                  ))}
                  {actions ? (
                    <td className="px-3 py-2 text-right align-top">
                      <div className="flex justify-end gap-1">{actions(row)}</div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {rows.length} entries
      </p>
    </div>
  );
}
