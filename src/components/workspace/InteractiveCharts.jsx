import { useId, useState } from "react";

const REPORT_STATES = [
  { key: "OPEN", label: "مفتوح", color: "#C7A66A" },
  { key: "ASSIGNED", label: "مسند", color: "#668CA5" },
  { key: "IN_PROGRESS", label: "قيد التنفيذ", color: "#C67A35" },
  { key: "RESOLVED", label: "مكتمل", color: "#176B56" },
  { key: "CANCELLED", label: "ملغي", color: "#919990" },
];
const number = (value) => new Intl.NumberFormat("ar-SA").format(value);

export function StatusDonut({ values, onSelect }) {
  const [active, setActive] = useState(null);
  const entries = REPORT_STATES.filter(({ key }) => Number.isFinite(Number(values?.[key])) && values?.[key] != null).map((item) => ({ ...item, value: Math.max(0, Number(values[item.key])) }));
  const total = entries.reduce((sum, item) => sum + item.value, 0);
  const focus = entries.find((item) => item.key === active);
  return <div className="ons-chart-distribution">
    <div className="ons-donut-wrap"><svg viewBox="0 0 220 220" role="img" aria-label={`توزيع ${number(total)} بلاغ حسب الحالة`}><circle cx="110" cy="110" r="83" fill="none" stroke="#ECEFE9" strokeWidth="24" />{entries.map((item, index) => {
      const start = total ? entries.slice(0, index).reduce((sum, entry) => sum + entry.value, 0) / total * 100 : 0; const length = total ? item.value / total * 100 : 0;
      return <circle key={item.key} cx="110" cy="110" r="83" pathLength="100" fill="none" stroke={item.color} strokeWidth={active === item.key ? 30 : 24} strokeDasharray={`${Math.max(0, length - (length ? 0.7 : 0))} ${100 - Math.max(0, length - (length ? 0.7 : 0))}`} strokeDashoffset={-start} transform="rotate(-90 110 110)" opacity={active && active !== item.key ? 0.35 : 1} onMouseEnter={() => setActive(item.key)} onMouseLeave={() => setActive(null)}><title>{item.label}: {number(item.value)}</title></circle>;
    })}</svg><div className="ons-donut-center" aria-live="polite"><b>{number(focus?.value ?? total)}</b><span>{focus?.label || "إجمالي البلاغات"}</span>{focus && total > 0 && <small>{number(Math.round(focus.value / total * 100))}٪ من الإجمالي</small>}</div></div>
    <div className="ons-chart-legend">{entries.map((item) => <button key={item.key} type="button" onMouseEnter={() => setActive(item.key)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(item.key)} onBlur={() => setActive(null)} onClick={() => onSelect ? onSelect(item.key) : setActive(item.key)} className={active === item.key ? "is-active" : ""} aria-label={`${item.label}: ${number(item.value)}${onSelect ? "، عرض البلاغات" : ""}`}><i style={{ background: item.color }} /><span>{item.label}</span><b>{number(item.value)}</b><small>{total ? number(Math.round(item.value / total * 100)) : "٠"}٪</small></button>)}</div>
    {total === 0 && <p className="ons-chart-empty">لا توجد بلاغات مسجلة في البيانات الحالية.</p>}
  </div>;
}

export function TrendChart({ rows }) {
  const [active, setActive] = useState(null); const id = useId();
  const points = rows.filter((row) => row?.date && Number.isFinite(Number(row.reportCount))).map((row) => ({ date: row.date, count: Math.max(0, Number(row.reportCount)) }));
  const max = Math.max(1, ...points.map((point) => point.count));
  const xy = points.map((point, index) => ({ ...point, x: points.length === 1 ? 320 : 38 + index * 564 / (points.length - 1), y: 160 - point.count / max * 130 }));
  const path = xy.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const current = xy[active] || xy.at(-1);
  const date = (value) => { const result = new Date(value); return Number.isNaN(result.getTime()) ? value : new Intl.DateTimeFormat("ar-SA", { calendar: "gregory", day: "numeric", month: "short" }).format(result); };
  if (!xy.length) return <div className="ons-chart-empty">لا تتوفر بيانات زمنية لعرضها.</div>;
  return <div className="ons-trend-chart"><div className="ons-trend-caption" aria-live="polite"><span>{date(current.date)}</span><b>{number(current.count)} <small>بلاغ</small></b></div><svg viewBox="0 0 640 190" role="img" aria-label="اتجاه البلاغات حسب الأيام المسجلة"><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#176B56" stopOpacity=".2" /><stop offset="100%" stopColor="#176B56" stopOpacity="0" /></linearGradient></defs>{[30, 95, 160].map((y) => <line key={y} x1="28" x2="612" y1={y} y2={y} stroke="#E5E9E1" strokeDasharray="4 5" />)}<path d={`${path} L${xy.at(-1).x},170 L${xy[0].x},170 Z`} fill={`url(#${id})`} /><path d={path} stroke="#176B56" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />{xy.map((point, index) => <g key={point.date} onMouseEnter={() => setActive(index)}><circle cx={point.x} cy={point.y} r="18" fill="transparent" /><circle cx={point.x} cy={point.y} r={active === index ? 6 : 4} fill="#176B56" stroke="#fff" strokeWidth="3" /><title>{date(point.date)}: {number(point.count)} بلاغ</title></g>)}</svg><div className="ons-trend-axis">{xy.map((point, index) => <button key={point.date} className={active === index ? "is-active" : ""} type="button" onFocus={() => setActive(index)} onMouseEnter={() => setActive(index)} onClick={() => setActive(index)} aria-label={`${date(point.date)}: ${number(point.count)} بلاغ`}>{date(point.date)}</button>)}</div></div>;
}

export function AllocationChart({ entries }) {
  const [active, setActive] = useState(null);
  const total = entries.reduce((sum, item) => sum + item.value, 0);
  const max = Math.max(1, ...entries.map((item) => item.value));
  if (!total) return <div className="ons-chart-empty">سيظهر توزيع السكن عند إضافة حجاج إلى الحملة.</div>;
  return <div className="ons-allocation-chart">{entries.map((item, index) => <button className={active === index ? "is-active" : ""} type="button" key={item.key} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => setActive(index)} aria-label={`${item.label}: ${number(item.value)} حاج`}><span>{item.label}<b>{number(item.value)} <small>حاج</small></b></span><i><em style={{ width: `${item.value / max * 100}%`, background: item.unassigned ? "#C7A66A" : "#176B56" }} /></i>{active === index && <small>{number(Math.round(item.value / total * 100))}٪ من حجاج الحملة</small>}</button>)}</div>;
}
