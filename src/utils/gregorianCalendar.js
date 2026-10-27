const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
export function dateParts(value) {
  const match = String(value || "").match(datePattern);
  if (!match) return null;
  const [, y, m, d] = match; const year = Number(y), month = Number(m), day = Number(d);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? { year, month, day } : null;
}
export const isoDate = (year, month, day) => `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
export const monthDays = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
export const firstWeekday = (year, month) => new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
export function formatGregorian(value) {
  const parts = dateParts(value); if (!parts) return "";
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { calendar:"gregory", numberingSystem:"latn", day:"numeric", month:"long", year:"numeric", timeZone:"UTC" }).format(new Date(Date.UTC(parts.year,parts.month-1,parts.day)));
}
