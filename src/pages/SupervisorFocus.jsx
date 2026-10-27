import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardList, RefreshCw, Plus, UsersRound } from "lucide-react";
import { getStaffReports } from "../services/authorizedStaffService.js";
import { StatusPill, ListSkeleton } from "../components/workspace/WorkspacePrimitives.jsx";
import { reportDate, reportLocation } from "../utils/workspacePresentation.js";
import { presentApiError } from "../utils/errorMessages.js";

export default function SupervisorFocus({ onOpenTasks, onOpenReports, onAddPilgrim, onOpenPilgrims }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const data = await getStaffReports(); setRows(Array.isArray(data) ? data : []); }
    catch (failure) {
      if (/you dont have reports|there is no reports/i.test(failure.message || "")) setRows([]);
      else setError(presentApiError(failure, "تعذر تحديث المهام الآن. أعد المحاولة.").message);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { const refresh = () => { if (document.visibilityState === "visible") void load(); }; window.addEventListener("ons-report-updated", refresh); return () => window.removeEventListener("ons-report-updated", refresh); }, [load]);
  const rank = { IN_PROGRESS: 0, ASSIGNED: 1, OPEN: 2 };
  const pending = rows.filter((row) => Object.hasOwn(rank, row.status)).sort((a, b) => rank[a.status] - rank[b.status] || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return <section className="supervisor-overview-workbench is-unified" aria-label="العمل اليومي">
    <article className="supervisor-followup-panel"><header><div><span className="supervisor-panel-kicker">مساحة العمل اليومية</span><h2>الحجاج والمتابعة</h2><p>سجلات الحجاج والمهام التي تحتاج إلى إجراء.</p></div><div className="supervisor-unified-actions"><button className="workspace-primary-button" type="button" onClick={onAddPilgrim}><Plus size={17} />إضافة حاج</button><button className="workspace-secondary-button" type="button" onClick={onOpenPilgrims}><UsersRound size={17} />حجاج الحملة</button><button className="ons-icon-button" disabled={loading} onClick={() => void load()} aria-label="تحديث المهام"><RefreshCw size={17} /></button></div></header>
      {loading ? <ListSkeleton rows={2} /> : error ? <div className="supervisor-followup-empty" role="alert"><p>{error}</p><button className="pd-secondary" onClick={() => void load()}>إعادة المحاولة</button></div> : pending.length ? <div className="supervisor-followup-rows">{pending.slice(0, 4).map((row) => <button type="button" key={row.reportId} onClick={onOpenTasks}><span className="supervisor-followup-icon"><ClipboardList size={20} /></span><span><b>{row.pilgrim?.fullName || "بلاغ مساعدة"}</b><small>{reportLocation(row)}</small><time>{reportDate(row.createdAt)}</time></span><StatusPill status={row.status} /><ArrowLeft size={17} /></button>)}</div> : <div className="supervisor-followup-empty is-compact"><CheckCircle2 size={26} strokeWidth={1.5} /><div><h3>لا توجد مهام معلّقة</h3><p>ستظهر هنا البلاغات عند إسنادها إلى حسابك.</p></div><button className="pd-link" onClick={onOpenReports}>بلاغات الحملة <ArrowLeft size={17} /></button></div>}
      {!loading && !error && pending.length > 0 && <footer><span>{pending.length} مهام بانتظار المتابعة</span><button className="pd-link" onClick={onOpenTasks}>كل مهامي <ArrowLeft size={17} /></button></footer>}
    </article>

  </section>;
}
