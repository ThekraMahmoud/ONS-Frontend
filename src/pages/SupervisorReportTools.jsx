import { useEffect, useState } from "react";
import { mergeCampaignReports, getReportTrackingHistory, getAssistanceReportById } from "../services/assistanceReportService.js";
import { getEmployeesBySupervisor } from "../services/authorizedStaffService.js";
import { presentApiError } from "../utils/errorMessages.js";

export default function SupervisorReportTools({ onChanged }) {
  const [employees, setEmployees] = useState([]);
  useEffect(() => {
    let active = true;
    getEmployeesBySupervisor().then((rows) => { if (active) setEmployees((Array.isArray(rows) ? rows : []).map((row) => ({ id: row.id ?? row.user?.id, name: row.user?.name ?? row.name }))); }).catch(() => { if (active) setEmployees([]); });
    return () => { active = false; };
  }, []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [report, setReport] = useState(null);
  async function inspect(event) {
    event.preventDefault(); const id = new FormData(event.currentTarget).get("reportId"); setBusy(true); setMessage("");
    try { setReport(await getAssistanceReportById(id)); }
    catch (error) { setReport(null); setMessage(presentApiError(error, "تعذر تحميل البلاغ.").message); }
    finally { setBusy(false); }
  }
  async function merge(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const reportId = Number(form.get("reportId"));
    const reportIds = [...new Set(String(form.get("reportIds")).split(/[,،\s]+/).filter(Boolean).map(Number))];
    if (!reportIds.length || reportIds.some((id) => !Number.isInteger(id) || id < 1 || id === reportId)) { setMessage("أدخلي أرقام البلاغات الإضافية الصحيحة، مختلفة عن البلاغ الرئيسي."); return; }
    setBusy(true); setMessage("");
    try { await mergeCampaignReports(reportId, { staffId: Number(form.get("staffId")), reportIds }); setMessage("تم دمج البلاغات وإسنادها للمندوب."); onChanged?.(); }
    catch (error) { setMessage(presentApiError(error, "تعذر إسناد البلاغات.").message); }
    finally { setBusy(false); }
  }
  return <section className="workspace-panel campaign-data-panel" dir="rtl">
    <div className="workspace-panel-heading"><h3>متابعة بلاغ وإسناد البلاغات</h3></div>
    {message && <p className="workspace-notice" role="status">{message}</p>}
    <form className="workspace-form" onSubmit={inspect}><label>رقم سجل البلاغ<input name="reportId" type="number" min="1" required /></label><button className="workspace-secondary-button" disabled={busy}>عرض البلاغ</button></form>
    {report && <div className="workspace-notice"><b>{report.caseNumber}</b><p>الحاج: {report.pilgrim?.fullName || "—"} · الحالة: {{ OPEN: "مفتوح", ASSIGNED: "مسند", IN_PROGRESS: "قيد التنفيذ", RESOLVED: "مكتمل", CANCELLED: "ملغي" }[report.status] || "غير محددة"}</p><button className="workspace-text-action" disabled={busy} onClick={async () => { setBusy(true); try { const data = await getReportTrackingHistory(report.reportId); setReport((current) => ({ ...current, ...data })); setMessage("تم تحديث حالة البلاغ."); } catch (error) { setMessage(presentApiError(error, "تعذر تحميل الحالة.").message); } finally { setBusy(false); } }}>تحديث الحالة</button></div>}
    <form className="workspace-form" onSubmit={merge}>
      <h4>دمج بلاغات وإسنادها إلى مندوب</h4>
      <label>رقم البلاغ الرئيسي<input name="reportId" type="number" min="1" required /></label>
      <label>أرقام البلاغات الإضافية، مفصولة بفاصلة<input name="reportIds" required dir="ltr" /></label>
      <label>المندوب<select name="staffId" required defaultValue=""><option value="" disabled>اختاري مندوبًا</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
      <button className="workspace-primary-button" disabled={busy || !employees.length}>دمج وإسناد</button>
    </form>
  </section>;
}
