import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, UserRoundCheck, X } from "lucide-react";
import { getEmployeesBySupervisor } from "../services/authorizedStaffService.js";
import { getAllFieldStaff } from "../services/fieldStaffService.js";
import { assignCampaignReportGroup, assignReportToFieldStaff } from "../services/assistanceReportService.js";
import { presentApiError } from "../utils/errorMessages.js";

const idOf = (row) => row.id ?? row.Id ?? row.user?.id;
const active = (row) => row.user?.active ?? row.active;
const nameOf = (row) => row.user?.name ?? row.name ?? `#${idOf(row)}`;

export function CampaignReportAssignment({ reportIds, onClear, onCompleted }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [staffId, setStaffId] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const data = await getEmployeesBySupervisor(); setEmployees((Array.isArray(data) ? data : []).filter(active)); }
    catch (failure) { if (/there are no employees/i.test(failure.message || "")) setEmployees([]); else setError(presentApiError(failure, "تعذر تحميل مناديب الحملة. أعد المحاولة.").message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (!employees.some((employee) => String(idOf(employee)) === staffId)) throw new Error("اختر مندوبًا نشطًا من الحملة.");
      await assignCampaignReportGroup(reportIds, staffId);
      onCompleted("تم إسناد البلاغات المحددة للمندوب. ستظهر في بلاغاته المسندة.");
    } catch (failure) { setError(presentApiError(failure, "تعذر إسناد البلاغات. حدّث القائمة وأعد المحاولة.").message); }
    finally { setBusy(false); }
  }
  return <section className="report-assignment-panel supervisor-assignment-strip" aria-label="إسناد بلاغات الحملة">
    <header><span className="report-assignment-icon"><UserRoundCheck size={23} /></span><div><h3>إسناد البلاغات</h3><p>{reportIds.length ? `${reportIds.length} بلاغ محدد` : "حدد بلاغين مفتوحين أو أكثر من الجدول، ثم اختر المندوب المسؤول."}</p></div>{reportIds.length > 0 && <button className="pd-link" disabled={busy} onClick={onClear}>إلغاء التحديد</button>}</header>
    <form onSubmit={submit}><label>المندوب المسؤول<select value={staffId} onChange={(event) => setStaffId(event.target.value)} disabled={loading || busy} required><option value="">{loading ? "جارٍ تحميل المناديب…" : "اختر مندوبًا من الحملة"}</option>{employees.map((employee) => <option key={idOf(employee)} value={idOf(employee)}>{nameOf(employee)}</option>)}</select></label><button className="workspace-primary-button" disabled={busy || loading || reportIds.length < 2 || !staffId}><UserRoundCheck size={17} />{busy ? "جارٍ الإسناد…" : "إسناد البلاغات المحددة"}</button></form>
    {!loading && !employees.length && !error && <p className="pd-warning">لا يوجد مندوب نشط متاح. أضف مندوبًا من قسم المناديب ثم حدّث القائمة.</p>}
    {error && <p className="pd-error" role="alert">{error} <button className="pd-link" disabled={busy || loading} onClick={() => void load()}><RefreshCw size={14} /> تحديث المناديب</button></p>}
    {reportIds.length === 1 && <p className="report-assignment-hint">أضف بلاغًا مفتوحًا آخر لإتاحة الإسناد.</p>}
  </section>;
}

export function AdminReportAssignmentDialog({ report, onClose, onCompleted }) {
  const [staff, setStaff] = useState([]);
  const [staffId, setStaffId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reassign = Boolean(report.fieldStaff);
  useEffect(() => {
    let mounted = true;
    getAllFieldStaff().then((rows) => { if (mounted) setStaff((Array.isArray(rows) ? rows : []).filter((row) => active(row) && (!reassign || String(idOf(row)) !== String(idOf(report.fieldStaff))))); })
      .catch((failure) => { if (mounted) setError(presentApiError(failure, "تعذر تحميل الموظفين الميدانيين.").message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [report, reassign]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (!staff.some((row) => String(idOf(row)) === staffId)) throw new Error("اختر موظفًا ميدانيًا نشطًا.");
      await assignReportToFieldStaff(report.reportId, staffId, reassign);
      onCompleted(reassign ? "تمت إعادة إسناد البلاغ للموظف المحدد." : "تم إسناد البلاغ للموظف المحدد."); onClose();
    } catch (failure) { setError(presentApiError(failure, "تعذر إسناد البلاغ الآن. حدّث القائمة وأعد المحاولة.").message); }
    finally { setBusy(false); }
  }
  return <div className="workspace-modal-backdrop report-assignment-backdrop"><section className="workspace-modal" role="dialog" aria-modal="true" aria-labelledby="assignment-title"><button className="workspace-modal-close" aria-label="إغلاق" disabled={busy} onClick={onClose}><X size={19} /></button><span className="pd-eyebrow">{report.caseNumber || `#${report.reportId}`}</span><h2 id="assignment-title">{reassign ? "إعادة إسناد البلاغ" : "إسناد البلاغ"}</h2><p className="workspace-modal-description">الحاج: {report.pilgrim?.fullName || "—"}</p><form className="workspace-form" onSubmit={submit}><label>الموظف الميداني<select value={staffId} onChange={(event) => setStaffId(event.target.value)} required disabled={loading || busy}><option value="">{loading ? "جارٍ التحميل…" : "اختر موظفًا ميدانيًا نشطًا"}</option>{staff.map((row) => <option key={idOf(row)} value={idOf(row)}>{nameOf(row)}</option>)}</select></label>{!loading && !staff.length && !error && <p className="pd-warning">لا يوجد موظف ميداني نشط متاح للإسناد.</p>}{error && <p className="pd-error" role="alert">{error}</p>}<div className="workspace-modal-actions"><button className="workspace-primary-button" disabled={loading || busy || !staffId}><CheckCircle2 size={16} />{busy ? "جارٍ الإسناد…" : "تأكيد الإسناد"}</button><button type="button" className="workspace-secondary-button" disabled={busy} onClick={onClose}>إلغاء</button></div></form></section></div>;
}
