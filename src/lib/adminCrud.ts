/**
 * Shared hooks + helpers for admin CRUD modules.
 * Wraps supabase mutations with audit logging + query cache invalidation.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { writeAuditLog } from "@/services/admin";
import type { Database } from "@/integrations/supabase/types";

type TableName = keyof Database["public"]["Tables"];

export function useEntityCreate<T extends Record<string, unknown>>({
  table,
  module,
  invalidateKeys,
  onSuccessMessage = "Created",
}: {
  table: TableName;
  module: string;
  invalidateKeys?: unknown[][];
  onSuccessMessage?: string;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<T>) => {
      const { data, error } = await supabase.from(table).insert(values as never).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      toast.success(onSuccessMessage);
      await writeAuditLog({ action: "create", module, description: `Created row ${(data as { id?: string })?.id ?? ""}` });
      invalidateKeys?.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      qc.invalidateQueries({ queryKey: ["admin", "recent_audit"] });
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed"),
  });
}

export function useEntityUpdate<T extends Record<string, unknown>>({
  table,
  module,
  invalidateKeys,
}: {
  table: TableName;
  module: string;
  invalidateKeys?: unknown[][];
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<T> }) => {
      const { data, error } = await supabase.from(table).update(values as never).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (_data, vars) => {
      toast.success("Updated");
      await writeAuditLog({ action: "update", module, description: `Updated row ${vars.id}` });
      invalidateKeys?.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      qc.invalidateQueries({ queryKey: ["admin", "recent_audit"] });
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed"),
  });
}

export function useEntityDelete({
  table,
  module,
  invalidateKeys,
}: {
  table: TableName;
  module: string;
  invalidateKeys?: unknown[][];
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: async (id) => {
      toast.success("Deleted");
      await writeAuditLog({ action: "delete", module, description: `Deleted row ${id}` });
      invalidateKeys?.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      qc.invalidateQueries({ queryKey: ["admin", "recent_audit"] });
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed"),
  });
}
