import GregorianDatePicker from "../components/GregorianDatePicker.jsx";
import ReportDetailView from "../components/workspace/ReportDetailView.jsx";
import { RefreshCw, Search } from "lucide-react";
import { StatusPill, CopyReportNumber, DetailsDrawer, ListSkeleton, Toast } from "../components/workspace/WorkspacePrimitives.jsx";
import { reportDate, reportLocation } from "../utils/workspacePresentation.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAssistanceReports, getReportTrackingHistory } from "../services/assistanceReportService.js";
import { getCampaignStaffReports } from "../services/campaignReportService.js";
import { acceptPilgrimReport } from "../services/authorizedStaffService.js";
import { CampaignReportAssignment, AdminReportAssignmentDialog } from "./ReportAssignments.jsx";
import { presentApiError } from "../utils/errorMessages.js";
import "../styles/PilgrimDirectory.css";
const labels = { OPEN: "مفتوح", ASSIGNED: "مسند", IN_PROGRESS: "قيد التنفيذ", RESOLVED: "مكتمل", CANCELLED: "ملغي" };
const list = (value) => Array.isArray(value) ? value : value?.data || [];
export default function ReportDirectory({ role, records, onReload, externalLoading = false, externalError = "", trackingOnly = false, initialStatus = "" }) {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [picked, setPicked] = useState([]);
  const [assignmentReport, setAssignmentReport] = useState(null);
  const [warning, setWarning] = useState("");
  const [notice, setNotice] = useState("");
  const [assignee, setAssignee] = useState(""); const [dateFrom, setDateFrom] = useState("");
  const [query, setQuery] = useState(""); const [status, setStatus] = useState(initialStatus); const [selected, setSelected] = useState(null); const [page, setPage] = useState(1);
  const closeDetails = useCallback(() => setSelected(null), []);
  const load = useCallback(async () => {
    if (records !== undefined || trackingOnly) return;
    setLoading(true); setError(""); setWarning("");
    try {
      if (role === "ADMIN") setRows(list(await getAssistanceReports()));
      else if (["SUPERVISOR", "REPRESENTATIVE"].includes(role)) {
        const result = await getCampaignStaffReports();
        setRows(result.reports);
        setPicked((current) => current.filter((id) => result.reports.some((row) => row.reportId === id && row.status === "OPEN" && !row.authorizedStaff)));
        if (result.failedCount) setWarning(`تعذر تحميل بلاغات ${result.failedCount} من سجلات الحجاج. أعد تحديث القائمة.`);
      }
    } catch (failure) { setError(presentApiError(failure, "تعذر تحميل البلاغات الآن. أعد المحاولة.").message); }
    finally { setLoading(false); }
  }, [records, role, trackingOnly]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    if (trackingOnly || records !== undefined) return;
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [load, records, trackingOnly]);
  async function accept(report) {
    setLoading(true); setError(""); setNotice("");
    try {
      const pilgrimId = report.pilgrim?.id ?? report.pilgrim?.Id ?? report.pilgrimId;
      if (!pilgrimId) throw new Error("بيانات الحاج المرتبط بالبلاغ غير مكتملة.");
      await acceptPilgrimReport(null, pilgrimId, report.reportId);
      setNotice("تم استلام البلاغ. يمكنك متابعته من بلاغاتي المسندة.");
      await load();
      window.dispatchEvent(new CustomEvent("ons-report-updated"));
    } catch (failure) { setError(presentApiError(failure, "تعذر استلام البلاغ الآن. أعد المحاولة.").message); }
    finally { setLoading(false); }
  }
  function assigned(message) {
    setNotice(message); setPicked([]); setSelected(null);
    if (onReload) onReload(); else void load();
    window.dispatchEvent(new CustomEvent("ons-report-updated"));
  }
  const selectedReportId = selected?.reportId;
  useEffect(() => {
    if (!selectedReportId) return;
    let mounted = true;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      try { const data = await getReportTrackingHistory(selectedReportId); if (mounted) setSelected(data); }
      catch (failure) { if (mounted) setError(presentApiError(failure, "تعذر تحديث الحالة الآن. أعد المحاولة.").message); }
    };
    const timer = window.setInterval(() => void refresh(), 10000);
    window.addEventListener("ons-report-updated", refresh);
    return () => { mounted = false; window.clearInterval(timer); window.removeEventListener("ons-report-updated", refresh); };
  }, [selectedReportId]);
  const sourceRows = useMemo(() => role === "REPRESENTATIVE" && !trackingOnly ? (records ?? rows).filter(row => row.status === "OPEN" && !row.authorizedStaff && !row.fieldStaff) : (records ?? rows), [records, rows, role, trackingOnly]);
  const assignedKey = (row) => row.authorizedStaff ? `campaign:${row.authorizedStaff.id ?? row.authorizedStaff.Id ?? row.authorizedStaff.user?.id}` : row.fieldStaff ? `field:${row.fieldStaff.id ?? row.fieldStaff.Id ?? row.fieldStaff.user?.id}` : "unassigned";
  const assignedOptions = [...new Map(sourceRows.filter((row) => row.authorizedStaff || row.fieldStaff).map((row) => [assignedKey(row), row.authorizedStaff?.user?.name || row.authorizedStaff?.name || row.fieldStaff?.user?.name || row.fieldStaff?.name || "موظف مسند"])).entries()];
  const filtered = useMemo(() => sourceRows.filter((row) => (role === "REPRESENTATIVE" || !status || row.status === status) && (!assignee || assignedKey(row) === assignee) && (!dateFrom || (row.createdAt && String(row.createdAt).slice(0, 10) >= dateFrom)) && (!query || `${row.caseNumber} ${row.reportId} ${row.pilgrim?.fullName || ""}`.toLowerCase().includes(query.trim().toLowerCase()))), [sourceRows, role, query, status, assignee, dateFrom]);
  const maxPage = Math.max(1, Math.ceil(filtered.length / 10)); const currentPage = Math.min(page, maxPage);
  async function inspect(id) {
    setDetailLoading(true); setError("");
    setSelected(sourceRows.find((row) => String(row.reportId) === String(id)) || { reportId: id });
    try { setSelected(await getReportTrackingHistory(id)); }
    catch (failure) { setError(presentApiError(failure, "تعذر تحميل الحالة الآن. أعد المحاولة.").message); if (trackingOnly) setSelected(null); }
    finally { setDetailLoading(false); }
  }
  const shown = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  const selectedSource = sourceRows.find((row) => String(row.reportId) === String(selected?.reportId));
  const retry = () => { if (onReload) onReload(); else void load(); };
  return <section className="pilgrim-directory ons-report-directory" dir="rtl" aria-busy={loading || externalLoading}>
    <header className="pd-heading"><div>{trackingOnly ? <><h2>البلاغات وحالاتها</h2><p>أدخل رقم سجل البلاغ لعرض حالته وسجل تحديثاته.</p></> : <span className="ons-kicker">{role === "REPRESENTATIVE" ? "بلاغات مفتوحة متاحة للاستلام" : "سجل البلاغات"} · {sourceRows.length} بلاغ</span>}</div>{!trackingOnly && <button className="pd-secondary" disabled={loading || externalLoading} onClick={retry}><RefreshCw size={18} />تحديث القائمة</button>}</header>
    {trackingOnly && !selected && <form className="pd-server-search" onSubmit={(event) => { event.preventDefault(); void inspect(new FormData(event.currentTarget).get("reportId")); }}><label>متابعة بلاغ برقم سجله<input name="reportId" type="number" min="1" required placeholder="رقم السجل الرقمي" /></label><button className="pd-secondary" disabled={detailLoading}>عرض الحالة</button></form>}
    {!trackingOnly && role !== "CAMPAIGN_OWNER" && <>
      <div className="ons-report-tabs" aria-label="تصفية حسب حالة البلاغ">{role !== "REPRESENTATIVE" && <button type="button" className={!status ? "is-active" : ""} aria-pressed={!status} onClick={() => { setStatus(""); setPage(1); }}><span>كل البلاغات</span><b>{sourceRows.length}</b></button>}{Object.entries(labels).filter(([key]) => role !== "REPRESENTATIVE" || key === "OPEN").map(([key, label]) => <button key={key} type="button" className={`${status === key || role === "REPRESENTATIVE" ? "is-active" : ""} ${key === "OPEN" ? "ons-open-tab" : ""}`} aria-pressed={status === key || role === "REPRESENTATIVE"} onClick={() => { setStatus(key); setPage(1); }}><span className={`ons-tab-dot is-${key.toLowerCase()}`} /><span>{label}</span><b>{(loading || externalLoading || error || externalError) && !sourceRows.length ? "—" : sourceRows.filter((row) => row.status === key).length}</b></button>)}</div>
      <div className="pd-toolbar ons-report-filters"><label className="pd-search"><Search size={18} /><input aria-label="بحث في البلاغات" value={query} placeholder="رقم البلاغ أو اسم الحاج" onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label>{["SUPERVISOR", "ADMIN"].includes(role) && <><label className="ons-responsible-filter"><span>المسؤول</span><select aria-label="تصفية حسب المسؤول" value={assignee} onChange={(event) => { setAssignee(event.target.value); setPage(1); }}><option value="">كل المسؤولين</option><option value="unassigned">غير مسند</option>{assignedOptions.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label><GregorianDatePicker name="reportDateFrom" label="من تاريخ" value={dateFrom} onChange={(value)=>{setDateFrom(value);setPage(1);}} />{(assignee || dateFrom || status || query) && <button className="pd-secondary" onClick={() => { setAssignee(""); setDateFrom(""); setStatus(""); setQuery(""); setPage(1); }}>مسح التصفية</button>}</>}</div>
    </>}
    {(error || externalError) && <div className="pd-error ons-list-error" role="alert"><span>{error || externalError}</span>{!trackingOnly && <button className="pd-secondary" disabled={loading || externalLoading} onClick={retry}>إعادة المحاولة</button>}</div>}
    {warning && <p className="pd-warning" role="status">{warning}</p>}
    <Toast message={notice} onDismiss={setNotice} />
    {assignmentReport && role === "ADMIN" && <AdminReportAssignmentDialog report={assignmentReport} onClose={() => setAssignmentReport(null)} onCompleted={assigned} />}
    {selected && (trackingOnly ? <section className="ons-inline-report-result" aria-label="نتيجة متابعة البلاغ"><div className="ons-report-result-nav"><span>نتيجة البحث</span><button type="button" className="pd-link" onClick={closeDetails}>البحث عن بلاغ آخر</button></div><ReportDetailView report={selected} source={selectedSource} loading={detailLoading} error={error} onRefresh={() => void inspect(selected.reportId)} /></section> : <DetailsDrawer className="ons-report-detail-modal" title="تفاصيل البلاغ" titleId="report-details-title" onClose={closeDetails}><ReportDetailView report={selected} source={selectedSource} loading={detailLoading} error={error} onRefresh={() => void inspect(selected.reportId)} /></DetailsDrawer>)}
    {!trackingOnly && role !== "CAMPAIGN_OWNER" && <>
      {(loading || externalLoading) && !sourceRows.length ? <ListSkeleton /> : <div className="pd-table-scroll ons-responsive-table"><table><thead><tr>{role === "SUPERVISOR" && <th>تحديد للإسناد</th>}<th>البلاغ</th><th>الحاج</th><th>الموقع</th><th>الحالة</th><th>المسؤول</th><th>تاريخ الإنشاء</th>{["ADMIN", "REPRESENTATIVE"].includes(role) && <th>الإجراء</th>}</tr></thead><tbody>{shown.map((row) => {
        const eligible = row.status === "OPEN" && !row.authorizedStaff;
        return <tr key={row.reportId} className={`ons-clickable-row ${row.status === "OPEN" ? "ons-open-report" : ""} ${role === "SUPERVISOR" && !eligible ? "is-ineligible" : ""}`} tabIndex={0} aria-label={`فتح تفاصيل البلاغ ${row.caseNumber || row.reportId}`} onClick={() => void inspect(row.reportId)} onKeyDown={(event) => { if (event.target === event.currentTarget && ["Enter", " "].includes(event.key)) { event.preventDefault(); void inspect(row.reportId); } }}>
          {role === "SUPERVISOR" && <td data-label="تحديد للإسناد" onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`تحديد البلاغ ${row.caseNumber || row.reportId}`} disabled={loading || !eligible} checked={picked.includes(row.reportId)} onChange={(event) => setPicked((current) => event.target.checked ? [...current, row.reportId] : current.filter((id) => id !== row.reportId))} /></td>}
          <td data-label="البلاغ"><CopyReportNumber value={row.caseNumber || row.reportId} /></td><td data-label="الحاج"><b>{row.pilgrim?.fullName || "—"}</b></td><td data-label="الموقع">{reportLocation(row)}</td><td data-label="الحالة"><StatusPill status={row.status} />{row.status === "OPEN" && <small className="ons-open-report-hint">بانتظار الاستلام</small>}</td><td data-label="المسؤول">{row.authorizedStaff?.user?.name || row.authorizedStaff?.name || row.fieldStaff?.user?.name || row.fieldStaff?.name || "غير مسند"}</td><td data-label="تاريخ الإنشاء"><time>{reportDate(row.createdAt)}</time></td>
          {["ADMIN", "REPRESENTATIVE"].includes(role) && <td data-label="الإجراء" onClick={(event) => event.stopPropagation()}>{role === "REPRESENTATIVE" && row.status === "OPEN" && <button className="pd-link" disabled={loading} onClick={() => void accept(row)}>استلام البلاغ</button>}{role === "ADMIN" && ((row.status === "OPEN" && !row.fieldStaff && !row.authorizedStaff) || (row.status === "ASSIGNED" && row.fieldStaff)) && <button className="pd-link" onClick={() => setAssignmentReport(row)}>{row.fieldStaff ? "إعادة الإسناد" : "إسناد لموظف ميداني"}</button>}</td>}
        </tr>;
      })}</tbody></table>{!filtered.length && !error && !externalError && <div className="pd-empty"><b>{query || status || assignee || dateFrom ? "لا توجد نتائج مطابقة" : "لا توجد بلاغات معروضة"}</b><p>{query || status || assignee || dateFrom ? "غيّر عبارة البحث أو الحالة المحددة." : "ستظهر هنا البلاغات المتاحة لحسابك."}</p></div>}</div>}
      <footer className="pd-pagination"><span>{filtered.length} بلاغ · صفحة {currentPage} من {maxPage}</span><div><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>السابق</button><button disabled={currentPage === maxPage} onClick={() => setPage(currentPage + 1)}>التالي</button></div></footer>
      {role === "SUPERVISOR" && picked.length > 0 && <CampaignReportAssignment reportIds={picked} onClear={() => setPicked([])} onCompleted={assigned} />}
    </>}
  </section>;
}
