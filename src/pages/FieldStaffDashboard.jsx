import WorkspaceBanner from "../components/workspace/WorkspaceBanner.jsx";
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ClipboardList, LogOut, MapPin, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { getCurrentUser, logout } from "../auth/auth.js";
import { getAssistanceReportById, startFieldReport, resolveFieldReport } from "../services/assistanceReportService.js";
import { StatusPill, CopyReportNumber, ListSkeleton, Toast } from "../components/workspace/WorkspacePrimitives.jsx";
import { reportDate, reportLocation, reportMapLink } from "../utils/workspacePresentation.js";
import { presentApiError } from "../utils/errorMessages.js";
import logo from "../assets/logos/ons-logo-optimized.png";
import "../styles/FieldStaffDashboard.css";

function FieldTasks({ user, onLogout }) {
  const [recordId, setRecordId] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestVersion = useRef(0);
  useEffect(() => () => { requestVersion.current += 1; }, []);
  async function load(id) {
    const version = ++requestVersion.current;
    setLoading(true); setError(""); setReport(null);
    try {
      const result = await getAssistanceReportById(id);
      if (version === requestVersion.current) setReport(result);
    } catch (failure) {
      if (version === requestVersion.current) setError(presentApiError(failure, "تعذر تحميل البلاغ. أعد المحاولة.").message);
    } finally { if (version === requestVersion.current) setLoading(false); }
  }
  async function advance() {
    if (saving || loading || !["ASSIGNED", "IN_PROGRESS"].includes(report?.status)) return;
    const current = report; setSaving(true); setError("");
    try {
      if (current.status === "ASSIGNED") await startFieldReport(current.reportId);
      else await resolveFieldReport(current.reportId);
      setNotice(current.status === "ASSIGNED" ? "بدأ تنفيذ المساعدة." : "اكتملت المساعدة وتم حفظ حالة البلاغ.");
      await load(current.reportId);
      window.dispatchEvent(new CustomEvent("ons-report-updated"));
    } catch (failure) { setError(presentApiError(failure, "تعذر تحديث البلاغ. حدّث بياناته وأعد المحاولة.").message); }
    finally { setSaving(false); }
  }
  const map = reportMapLink(report);
  const displayName = user.name && user.name !== user.email ? user.name : "الموظف الميداني";
  return <main className="field-staff-shell ons-workspace-theme ons-role-delegate" dir="rtl">
    <aside className="field-staff-sidebar"><a href="/" className="field-staff-brand" aria-label="الصفحة الرئيسية"><img src={logo} alt="أُنس" /></a><span className="field-staff-section">مساحة العمل</span><div className="field-staff-nav-item" aria-current="page"><ClipboardList size={20} /> المهام الميدانية</div><div className="field-staff-sidebar-spacer" /><button className="field-staff-logout" onClick={onLogout}><LogOut size={20} /> تسجيل الخروج</button></aside>
    <section className="field-staff-main"><header className="field-staff-header"><span>أُنس / العمليات الميدانية</span><div title={user.email}><b>{displayName}</b><small>موظف ميداني</small></div></header><div className="field-staff-content">
      <WorkspaceBanner variant="delegate" eyebrow="أُنس · العمليات الميدانية" title="المساعدة تبدأ بخطوة" description="افتح البلاغ المسند إليك، وابدأ المساعدة ثم حدّث حالته عند الانتهاء." />
      <section className="field-staff-panel" aria-labelledby="field-lookup-title"><header><ShieldCheck size={23} /><div><h2 id="field-lookup-title">افتح مهمة مسندة إليك</h2><p>أدخل رقم سجل البلاغ الذي وصلك من المسؤول. يُتحقق من صلاحيتك عند فتحه.</p></div></header><form className="field-staff-lookup" onSubmit={(event) => { event.preventDefault(); void load(recordId); }}><label>رقم سجل البلاغ<input value={recordId} onChange={(event) => setRecordId(event.target.value)} type="number" step="1" min="1" required placeholder="مثال: 12" dir="ltr" disabled={saving} /></label><button className="pd-primary" disabled={loading || saving}><Search size={19} />{loading ? "جارٍ التحميل…" : "عرض المهمة"}</button></form><p className="ons-muted">القائمة التلقائية للمهام غير متاحة حاليًا؛ يمكنك متابعة كل مهمة بمعرّف سجلها.</p></section>
      {error && <div className="pd-error ons-list-error" role="alert"><span>{error}</span><button className="pd-secondary" disabled={loading || saving || !recordId} onClick={() => void load(recordId)}>إعادة المحاولة</button></div>}
      {loading ? <ListSkeleton rows={3} /> : report ? <article className={`ons-task-card is-${String(report.status).toLowerCase()}`}><header><CopyReportNumber value={report.caseNumber || report.reportId} /><StatusPill status={report.status} /></header><h2>{report.pilgrim?.fullName || "بلاغ مساعدة"}</h2><p className="ons-task-location"><MapPin size={20} />{reportLocation(report)}</p><dl className="ons-detail-fields"><div><dt>وقت إنشاء البلاغ</dt><dd>{reportDate(report.createdAt)}</dd></div><div><dt>الحملة</dt><dd>{report.campaign?.campaignName || report.campaign?.user?.name || "غير متاح"}</dd></div></dl><footer>{["ASSIGNED", "IN_PROGRESS"].includes(report.status) && <button className="pd-primary" disabled={saving || loading} onClick={() => void advance()}>{saving ? "جارٍ الحفظ…" : report.status === "ASSIGNED" ? "بدء تنفيذ المساعدة" : "إكمال المساعدة"}</button>}{report.status === "RESOLVED" && <span className="ons-task-completed">اكتملت هذه المهمة</span>}{report.status === "CANCELLED" && <span className="ons-task-completed">هذا البلاغ ملغي</span>}{map && <a className="pd-secondary" href={map} target="_blank" rel="noopener noreferrer"><MapPin size={18} />فتح موقع البلاغ</a>}<button className="pd-secondary" disabled={saving || loading} onClick={() => void load(report.reportId)}><RefreshCw size={18} />تحديث الحالة</button></footer></article> : !error && <section className="field-staff-empty"><ClipboardList size={32} /><h2>مهمتك التالية تبدأ هنا</h2><p>افتح رقم السجل للاطلاع على تفاصيل المهمة وإجراءها التالي.</p></section>}
    </div></section><Toast message={notice} onDismiss={setNotice} />
  </main>;
}
export default function FieldStaffDashboard() {
  const navigate = useNavigate(); const user = getCurrentUser();
  if (!user || user.role !== "FIELD_STAFF") return <Navigate to={user ? "/dashboard" : "/login"} replace />;
  return <FieldTasks user={user} onLogout={() => { logout(); navigate("/login", { replace: true }); }} />;
}
