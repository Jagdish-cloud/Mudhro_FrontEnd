export function formatDisplayDate(
  date: string | Date | null | undefined,
  fallback: string = "—"
): string {
  if (!date) return fallback;

  const d = typeof date === "string" ? new Date(date) : date;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    return fallback;
  }

  const day = String(d.getDate()).padStart(2, "0");
  const monthShort = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();

  return `${day}-${monthShort}-${year}`;
}


