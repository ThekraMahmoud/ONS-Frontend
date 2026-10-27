import { Activity, CheckCircle2, CircleX, Clock3, MapPin, RefreshCw, ShieldCheck, UserRound, UserRoundCheck } from "lucide-react";
import { CopyReportNumber, ListSkeleton, StatusPill } from "./WorkspacePrimitives.jsx";
import { reportDate, reportLocation } from "../../utils/workspacePresentation.js";
import "../../styles/ReportDetailView.css";

const stateIcons = { OPEN: Clock3, ASSIGNED: UserRoundCheck, IN_PROGRESS: Activity, RESOLVED: CheckCircle2, CANCELLED: CircleX };
const stateDescriptions = { OPEN: "البلاغ بانتظار الاستلام والإسناد.", ASSIGNED: "تم إسناد البلاغ إلى الفريق المسؤول.", IN_PROGRESS: "تجري مساعدة الحاج ومتابعة طلبه.", RESOLVED: "اكتملت المساعدة وأُغلق البلاغ.", CANCELLED: "أُلغيت متابعة هذا البلاغ." };
export default function ReportDetailView({ report, source, loading, error, onRefresh }) {
  if (loading) return <ListSkeleton rows={3} />;
  const Icon = stateIcons[report.status] || ShieldCheck;
  const changes = [...(report.history || [])].sort((a,b) => String(b.changedAt || "").localeCompare(String(a.changedAt || "")));
  const lastChange = changes[0]?.changedAt || report.createdAt;
  return <div className={`ons-report-detail-view is-${String(report.status || "unknown").toLowerCase()}`}>
    {error && <p className="pd-error" role="alert">{error}</p>}
    <div className="ons-report-status-hero"><span className="ons-report-status-emblem"><Icon size={27} strokeWidth={1.6} /></span><div><small>الحالة الحالية</small><h3><StatusPill status={report.status} /></h3><p>{stateDescriptions[report.status] || "لم تتوفر حالة البلاغ الآن."}</p></div></div>
    <div className="ons-report-reference"><span>رقم البلاغ</span><div><code dir="ltr">{report.caseNumber || `#${report.reportId}`}</code><CopyReportNumber value={report.caseNumber || report.reportId} /></div></div>
    {source ? <dl className="ons-report-facts"><div><dt><UserRound size={15} />الحاج</dt><dd>{source.pilgrim?.fullName || "الاسم غير متاح"}</dd></div><div><dt><MapPin size={15} />الموقع</dt><dd>{reportLocation(source)}</dd></div><div><dt><UserRoundCheck size={15} />المسؤول</dt><dd>{source.authorizedStaff?.user?.name || source.authorizedStaff?.name || source.fieldStaff?.user?.name || source.fieldStaff?.name || "بيانات المسؤول غير متاحة"}</dd></div><div><dt><Clock3 size={15} />تاريخ الإنشاء</dt><dd>{reportDate(report.createdAt || source.createdAt)}</dd></div></dl> : <p className="ons-report-privacy"><ShieldCheck size={16} /><span>يعرض هذا البحث حالة البلاغ وسجل تحديثاته فقط، حفاظًا على خصوصية بيانات الحاج.</span></p>}
    <section className="ons-report-history"><header><div><Clock3 size={17} /><h3>مسار المتابعة</h3></div><span>{changes.length ? `${changes.length} تحديثات` : "سجل البلاغ"}</span></header>{changes.length ? <ol>{changes.map((change,index)=>{const StepIcon=stateIcons[change.newStatus] || Clock3;return <li key={`${change.changedAt}-${index}`} className={index===0?"is-latest":""}><span className="ons-report-history-node"><StepIcon size={16}/></span><div><StatusPill status={change.newStatus}/><time>{reportDate(change.changedAt)}</time></div>{index===0&&<small>آخر تحديث</small>}</li>;})}</ol> : <div className="ons-report-history-empty"><Clock3 size={21}/><p>لم تُسجّل تغييرات على الحالة بعد.</p></div>}</section>
    <footer className="ons-report-detail-footer"><span>{lastChange ? `آخر تحديث: ${reportDate(lastChange)}` : "يمكنك تحديث الحالة في أي وقت."}</span><button type="button" className="pd-secondary" onClick={onRefresh} disabled={loading}><RefreshCw size={15}/>تحديث الحالة</button></footer>
  </div>;
}
