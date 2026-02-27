// utils/date.ts
// Helper format tanggal Indonesia

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(date: string | Date): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateForInput(date: string | Date): string {
  return new Date(date).toISOString().split("T")[0];
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

export function isExpired(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

export function isNearExpiry(date: string | Date | null | undefined, days = 7): boolean {
  if (!date) return false;
  const diff = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

export function monthLabel(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}
