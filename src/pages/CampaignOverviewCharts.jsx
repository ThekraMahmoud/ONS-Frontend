import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Building2, RefreshCw } from "lucide-react";
import { StatusDonut, AllocationChart } from "../components/workspace/InteractiveCharts.jsx";
import { ListSkeleton } from "../components/workspace/WorkspacePrimitives.jsx";
import { getPilgrims } from "../services/pilgrimService.js";
import { presentApiError } from "../utils/errorMessages.js";

export default function CampaignOverviewCharts({ analytics, loading, error, onRetry, owner, refreshKey, onOpenReports, onOpenStays }) {
  const [entries, setEntries] = useState([]); const [busy, setBusy] = useState(true); const [failure, setFailure] = useState("");
  const load = useCallback(async () => {
    if (!owner) return;
    setBusy(true); setFailure("");
    try {
      const response = await getPilgrims(); const rows = Array.isArray(response) ? response : response?.data || []; const groups = new Map();
      for (const pilgrim of rows) { const stay = pilgrim.accommodation; const id = stay?.id ?? stay?.Id; const key = id == null ? "unassigned" : String(id); const current = groups.get(key) || { key, label: stay?.name || "غير مرتبط بسكن", value: 0, unassigned: id == null }; current.value += 1; groups.set(key, current); }
      setEntries([...groups.values()].sort((a,b) => b.value - a.value));
    } catch (error) { setFailure(presentApiError(error, "تعذر تحميل توزيع الحجاج.").message); }
    finally { setBusy(false); }
  }, [owner]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load, refreshKey]);
  const values = analytics ? { OPEN: analytics.openReports, ASSIGNED: analytics.assignedReports, IN_PROGRESS: analytics.inProgressReports, RESOLVED: analytics.resolvedReports, CANCELLED: analytics.cancelledReports } : null;
  if (!owner) return <SupervisorReportSummary analytics={analytics} loading={loading} error={error} onRetry={onRetry} onSelect={onOpenReports} />;
  return <section className={`ons-overview-charts ${owner ? "" : "is-single"}`} aria-label="مؤشرات الحملة"><article className="ons-visual-panel"><header><div><span className="ons-kicker">العمليات والمتابعة</span><h2>حالات البلاغات</h2><p>توزيع البلاغات المسجلة في حملتك.</p></div>{onOpenReports && <button className="ons-icon-button" onClick={onOpenReports} aria-label="فتح بلاغات الحملة"><ArrowLeft size={20} /></button>}</header>{loading ? <ListSkeleton rows={3} /> : error ? <div className="ons-chart-empty"><p>{error}</p><button className="pd-secondary" onClick={onRetry}>إعادة المحاولة</button></div> : values ? <StatusDonut values={values} /> : <p className="ons-chart-empty">لا تتوفر بيانات حاليًا.</p>}</article>{owner && <article className="ons-visual-panel"><header><div><span className="ons-kicker">الإقامة والتنظيم</span><h2>توزيع الحجاج على السكن</h2><p>أعداد فعلية من سجلات حجاج حملتك.</p></div><Building2 size={23} /></header>{busy ? <ListSkeleton rows={3} /> : failure ? <div className="ons-chart-empty"><p>{failure}</p><button className="pd-secondary" onClick={() => void load()}><RefreshCw size={17} />إعادة المحاولة</button></div> : <AllocationChart entries={entries} />}<footer><button className="pd-link" onClick={onOpenStays}>إدارة السكن <ArrowLeft size={17} /></button></footer></article>}</section>;
}

function SupervisorReportSummary({ analytics, loading, error, onRetry, onSelect }) {
  const items = [
    ["OPEN", "openReports", "مفتوحة", "بانتظار الإسناد", "#B69451"],
    ["ASSIGNED", "assignedReports", "مسندة", "بانتظار بدء المساعدة", "#638695"],
    ["IN_PROGRESS", "inProgressReports", "قيد التنفيذ", "تجري مساعدة الحاج", "#B9783F"],
    ["RESOLVED", "resolvedReports", "مكتملة", "انتهت المساعدة", "#397052"],
    ["CANCELLED", "cancelledReports", "ملغاة", "أُلغيت المتابعة", "#949B8E"],
  ];
  const count = (value) => value == null ? null : Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : null;
  const total = count(analytics?.totalReports);
  const format = (value) => value == null ? "—" : new Intl.NumberFormat("ar-SA").format(value);
  return <section className="supervisor-report-summary" aria-labelledby="supervisor-report-summary-title"><header><div><span>سجل المتابعة</span><h2 id="supervisor-report-summary-title">بلاغات الحملة</h2><p>اختر الحالة لعرض البلاغات وتفاصيلها.</p></div><button className="pd-secondary" type="button" onClick={() => onSelect?.("")}>كل البلاغات <ArrowLeft size={17} /></button></header>
    {loading ? <ListSkeleton rows={2} /> : error ? <div className="supervisor-summary-error" role="alert"><p>{error}</p><button className="pd-secondary" onClick={onRetry}>إعادة المحاولة</button></div> : !analytics ? <p className="ons-chart-empty">لا تتوفر بيانات حاليًا.</p> : <><div className="supervisor-status-cards">{items.map(([status, key, label, description, color]) => { const value = count(analytics[key]); return <button type="button" key={status} style={{ "--summary-tone": color }} onClick={() => onSelect?.(status)} aria-label={`عرض البلاغات ${label}: ${format(value)}`}><span className="supervisor-status-card-label"><i />{label}</span><b>{format(value)}</b><small>{description}</small><span className="supervisor-status-card-link" aria-hidden="true"><ArrowLeft size={15} /></span></button>; })}</div><footer><span><b>{format(total)}</b> بلاغ في الحملة</span>{total === 0 ? <small>لا توجد بلاغات مسجلة بعد.</small> : <div className="supervisor-report-distribution" role="img" aria-label="توزيع البلاغات حسب الحالة">{items.map(([status, key, label, , color]) => <i key={status} style={{ width: `${total ? (count(analytics[key]) || 0) / total * 100 : 0}%`, background: color }} title={`${label}: ${format(count(analytics[key]))}`} />)}</div>}</footer></>}
  </section>;
}
