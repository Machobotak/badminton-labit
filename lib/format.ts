export function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Good morning";
  if (h < 15) return "Good afternoon";
  if (h < 19) return "Good evening";
  return "Good night";
}

export function formatDateID(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function timeRange(start: string, end: string): string {
  if (!start) return end || "-";
  return end ? `${start}–${end}` : start;
}
