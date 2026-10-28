import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, CircleDot, Copy, X } from "lucide-react";

const statusLabels = { OPEN: "مفتوح", ASSIGNED: "مسند", IN_PROGRESS: "قيد التنفيذ", RESOLVED: "مكتمل", CANCELLED: "ملغي", ACTIVE: "نشط", INACTIVE: "غير نشط", EXPIRED: "منتهي" };
export function StatusPill({ status, label }) {
  const key = String(status || "").toUpperCase();
  return <span className={`ons-status is-${key.toLowerCase()}`}>{key === "OPEN" && <CircleDot size={14} aria-hidden="true" />}{label || statusLabels[key] || "غير محدد"}</span>;
}

export function ListSkeleton({ rows = 4 }) {
  return <div className="ons-list-skeleton" role="status" aria-label="جارٍ تحميل البيانات"><span className="ons-sr-only">جارٍ تحميل البيانات…</span>{Array.from({ length: rows }, (_, index) => <div key={index}><i /><i /><i /></div>)}</div>;
}

export function Toast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => onDismiss(""), 4500);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);
  if (!message) return null;
  return <div className="ons-toast" role="status" aria-live="polite"><CheckCircle2 size={21} /><span>{message}</span><button type="button" onClick={() => onDismiss("")} aria-label="إغلاق الإشعار"><X size={18} /></button></div>;
}

export function CopyReportNumber({ value }) {
  const [copied, setCopied] = useState(false);
  const full = String(value ?? "");
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  async function copy(event) {
    event.stopPropagation();
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(full);
      else {
        const input = document.createElement("textarea"); input.value = full; input.setAttribute("readonly", ""); input.style.position = "fixed"; input.style.opacity = "0";
        document.body.appendChild(input); input.select(); const success = document.execCommand("copy"); input.remove(); if (!success) return;
      }
      setCopied(true);
    } catch { setCopied(false); }
  }
  return <button type="button" className="ons-report-number" title={full} aria-label={copied ? "تم نسخ رقم البلاغ" : `نسخ رقم البلاغ ${full}`} onClick={copy}><b dir="ltr">#{full.slice(-6) || "—"}</b>{copied ? <Check size={16} /> : <Copy size={16} />}<span className="ons-sr-only" aria-live="polite">{copied ? "تم النسخ" : ""}</span></button>;
}

export function DetailsDrawer({ title, titleId, onClose, children, className = "", closeDisabled = false }) {
  const panel = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector("button")?.focus();
    function keydown(event) {
      if (event.key === "Escape") { event.preventDefault(); if (!closeDisabled) onClose(); }
      if (event.key !== "Tab") return;
      const items = [...(panel.current?.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]') || [])].filter((element) => element.getClientRects().length);
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", keydown); if (previousFocus?.isConnected) previousFocus.focus(); };
  }, [onClose, closeDisabled]);
  return <div className={`ons-drawer-backdrop ${className}`} onMouseDown={(event) => { if (event.target === event.currentTarget && !closeDisabled) onClose(); }}><section ref={panel} className="ons-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} dir="rtl"><header><div><span className="ons-kicker">أُنس · تفاصيل السجل</span><h2 id={titleId}>{title}</h2></div><button type="button" className="ons-icon-button" onClick={onClose} disabled={closeDisabled} aria-label="إغلاق التفاصيل"><X size={22} /></button></header><div className="ons-drawer-body">{children}</div></section></div>;
}
