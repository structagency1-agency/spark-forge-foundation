/**
 * Client-side export helpers for CSV / Excel / PDF.
 * All heavy libs are dynamically imported so they don't bloat the SSR bundle.
 */

export type ExportRow = Record<string, string | number | boolean | null | undefined>;

function toCSV(rows: ExportRow[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(","));
  return lines.join("\n");
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCSV(rows: ExportRow[], filename: string) {
  download(new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}

export async function exportExcel(rows: ExportRow[], filename: string, sheetName = "Sheet1") {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  download(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${filename}.xlsx`,
  );
}

export async function exportPDF(rows: ExportRow[], filename: string, title: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);
  if (rows.length) {
    const headers = Object.keys(rows[0]);
    autoTable(doc, {
      head: [headers],
      body: rows.map((r) => headers.map((h) => (r[h] ?? "").toString())),
      startY: 26,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [217, 119, 6] },
    });
  }
  doc.save(`${filename}.pdf`);
}
