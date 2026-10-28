export function buildReportTrackingLink(origin, reportId) {
  if (!Number.isSafeInteger(Number(reportId)) || Number(reportId)<1) throw new Error("معرّف البلاغ غير صالح.");
  const base = new URL(origin);
  if (!["http:","https:"].includes(base.protocol) || ["localhost","127.0.0.1","[::1]"].includes(base.hostname)) throw new Error("يلزم عنوان الجهاز على الشبكة لفتح المتابعة من الجوال.");
  return new URL(`/track/${Number(reportId)}`,base.origin).href;
}
export async function getReportShareOrigin() {
  const configured=import.meta.env?.VITE_PUBLIC_APP_URL;
  if (configured) return configured;
  if (!["localhost","127.0.0.1","[::1]"].includes(window.location.hostname)) return window.location.origin;
  const response=await fetch('/__ons/network-origin');
  if (!response.ok) throw new Error("تعذر معرفة عنوان الجهاز على الشبكة.");
  const data=await response.json();
  if (!data.origin) throw new Error("وصّل الجهاز بشبكة Wi-Fi لتفعيل المتابعة على الجوال.");
  return data.origin;
}
