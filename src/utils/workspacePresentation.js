export function reportLocation(report) {
  const name = String(report?.kiosk?.locationName || "").replace(/\s*\([^)]*(?:تجريبي|test|demo)[^)]*\)/gi, "").trim();
  return !name || /^(?:جهاز\s*تجريبي|test\s*kiosk|demo)$/i.test(name) ? "الموقع غير محدد" : name;
}
export function reportMapLink(report) {
  const lat = report?.kiosk?.latitude; const lon = report?.kiosk?.longitude;
  if (lat == null || lon == null || lat === "" || lon === "" || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lon)) > 180) return null;
  return `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: `${lat},${lon}`, travelmode: "walking" })}`;
}
export function reportDate(value) {
  const date = new Date(value);
  return !value || Number.isNaN(date.getTime()) ? "غير مسجل" : new Intl.DateTimeFormat("ar-SA", { calendar: "gregory", dateStyle: "medium", timeStyle: "short" }).format(date);
}
