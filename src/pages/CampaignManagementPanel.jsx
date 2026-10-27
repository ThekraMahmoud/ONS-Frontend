import { StatusDonut } from "../components/workspace/InteractiveCharts.jsx";
import { ListSkeleton, Toast, StatusPill } from "../components/workspace/WorkspacePrimitives.jsx";
import { useCallback, useEffect, useState } from "react";
import { BarChart3, CheckCircle2, Plus, RefreshCw, Search, ShieldCheck, UsersRound, X } from "lucide-react";
import { getMyCampaign, getCampaignAnalytics, emailCampaignAnalytics } from "../services/campaignService.js";
import { getAllAuthorizedStaff, addEmployee, createAuthorizedStaff, updateAuthorizedStaff, deleteAuthorizedStaff } from "../services/authorizedStaffService.js";
import { presentApiError } from "../utils/errorMessages.js";

const idOf = (row) => row?.id ?? row?.Id ?? row?.user?.id;
const messageOf = (error) => presentApiError(error, "تعذر إكمال العملية الآن. أعد المحاولة.").message;

export default function CampaignManagementPanel({ onChanged, staffOnly = false }) {
  const [campaign, setCampaign] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [staff, setStaff] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editorError, setEditorError] = useState("");
  const [editor, setEditor] = useState(null);
  const [newRole, setNewRole] = useState("SUPERVISOR");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (staffOnly) {
        const [profile, members] = await Promise.allSettled([getMyCampaign(), getAllAuthorizedStaff()]);
        if (profile.status === "fulfilled") setCampaign(profile.value);
        else setError(messageOf(profile.reason));
        if (members.status === "fulfilled") setStaff(Array.isArray(members.value) ? members.value : []);
        else if (/there is no staff/i.test(members.reason?.message || "")) setStaff([]);
        else setError(messageOf(members.reason));
      } else setAnalytics(await getCampaignAnalytics());
    } catch (failure) { setError(messageOf(failure)); }
    finally { setLoading(false); }
  }, [staffOnly]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function saveStaff(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setEditorError(""); setNotice("");
    const data = { name: String(form.get("name")).trim(), email: String(form.get("email")).trim(), phoneNumber: String(form.get("phoneNumber")).trim(), active: form.get("active") === "on" };
    try {
      if (editor !== "new") await updateAuthorizedStaff(idOf(editor), data);
      else if (newRole === "SUPERVISOR") await createAuthorizedStaff(idOf(campaign), { ...data, password: String(form.get("password")), staffRole: "SUPERVISOR" });
      else {
        const supervisorId = Number(form.get("supervisorId"));
        if (!staff.some((row) => idOf(row) === supervisorId && row.staffRole === "SUPERVISOR" && row.user?.active)) throw new Error("اختر مشرفًا نشطًا من الحملة.");
        await addEmployee({ ...data, password: String(form.get("password")), staffRole: "REGULAR_EMPLOYEE", supervisorId });
      }
      setEditor(null); setNotice(newRole === "REGULAR_EMPLOYEE" && editor === "new" ? "تمت إضافة المندوب وربطه بالمشرف المحدد." : "تم حفظ بيانات الموظف."); await load(); onChanged?.();
    } catch (failure) { setEditorError(messageOf(failure)); }
    finally { setBusy(false); }
  }
  async function remove(row) {
    if (!window.confirm(`حذف ${row.user?.name || row.name} من الحملة؟`)) return;
    setBusy(true); setNotice("");
    try { await deleteAuthorizedStaff(idOf(row)); setNotice("تم حذف الحساب من الفريق."); await load(); onChanged?.(); }
    catch (failure) { setError(messageOf(failure)); }
    finally { setBusy(false); }
  }
  const supervisors = staff.filter((row) => row.staffRole === "SUPERVISOR");
  const activeSupervisors = supervisors.filter((row) => row.user?.active);
  const filtered = staff.filter((row) => (!filter || row.staffRole === filter) && `${row.user?.name || row.name || ""} ${row.user?.email || row.email || ""} ${row.user?.phoneNumber || ""}`.toLocaleLowerCase("ar").includes(query.trim().toLocaleLowerCase("ar")));
  const [page, setPage] = useState(1); const pages = Math.max(1, Math.ceil(filtered.length / 10)); const currentPage = Math.min(page, pages);

  if (staffOnly) return <section className="pilgrim-directory">
    <header className="pd-heading"><div><span className="pd-eyebrow">فريق واحد، مسؤوليات واضحة</span><h2>المشرفون والمناديب</h2><p>أضف موظفًا، وحدّد المشرف المسؤول عند إنشاء حساب المندوب.</p></div><div className="pd-actions"><button className="pd-secondary" disabled={busy || loading} onClick={() => void load()}><RefreshCw size={16} /> تحديث</button><button className="pd-primary" disabled={busy || loading || !campaign} onClick={() => { setEditor("new"); setNewRole("SUPERVISOR"); setEditorError(""); }}><Plus size={17} /> إضافة موظف</button></div></header>
    <div className="pd-summary"><span><ShieldCheck size={19} /><b>{loading || error ? "—" : supervisors.length}</b> مشرفون</span><span><UsersRound size={19} /><b>{loading || error ? "—" : staff.length - supervisors.length}</b> مناديب</span><span><CheckCircle2 size={19} /><b>{loading || error ? "—" : staff.filter((row) => row.user?.active).length}</b> حسابات نشطة</span></div>
    <div className="pd-toolbar"><label className="pd-search"><Search size={17} /><input aria-label="بحث في الفريق" value={query} placeholder="ابحث بالاسم أو البريد أو الجوال…" onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label><select aria-label="دور الموظف" value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}><option value="">كل الفريق</option><option value="SUPERVISOR">المشرفون</option><option value="REGULAR_EMPLOYEE">المناديب</option></select></div>
    {error && <p className="pd-error" role="alert">{error}</p>}<Toast message={notice} onDismiss={setNotice} />
    {loading ? <ListSkeleton rows={4} /> : <div className="pd-table-scroll"><table><thead><tr><th>الموظف</th><th>الدور</th><th>التواصل</th><th>المشرف المسؤول</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>{filtered.slice((currentPage - 1) * 10, currentPage * 10).map((row) => <tr key={idOf(row)}><td data-label="الموظف"><b>{row.user?.name || row.name}</b><small>#{idOf(row)}</small></td><td data-label="الدور">{row.staffRole === "SUPERVISOR" ? "مشرف" : "مندوب"}</td><td data-label="التواصل" dir="ltr">{row.user?.email || row.email}<small>{row.user?.phoneNumber || "—"}</small></td><td data-label="المشرف المسؤول">{row.staffRole === "SUPERVISOR" ? "—" : row.supervisor?.user?.name || row.supervisor?.name || "غير معين"}</td><td data-label="الحالة"><StatusPill status={row.user?.active ? "ACTIVE" : "INACTIVE"} /></td><td data-label="الإجراءات"><button className="pd-link" disabled={busy} onClick={() => { setEditor(row); setEditorError(""); }}>تعديل</button><button className="pd-link pd-danger" disabled={busy} onClick={() => void remove(row)}>حذف</button></td></tr>)}</tbody></table>{!filtered.length && !error && <div className="pd-empty"><UsersRound size={28} /><b>لا يوجد أعضاء معروضون</b><p>{query || filter ? "غيّر البحث أو التصفية." : "ابدأ بإضافة مشرف، ثم أضف المناديب لفريقه."}</p></div>}</div>}
    <footer className="pd-pagination"><span>{filtered.length} موظف · صفحة {currentPage} من {pages}</span><div><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>السابق</button><button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>التالي</button></div></footer>
    {editor && <div className="workspace-modal-backdrop"><section className="workspace-modal" role="dialog" aria-modal="true" aria-labelledby="staff-editor-title"><button className="workspace-modal-close" aria-label="إغلاق" disabled={busy} onClick={() => setEditor(null)}><X size={20} /></button><span className="pd-eyebrow">فريق الحملة</span><h2 id="staff-editor-title">{editor === "new" ? "إضافة موظف" : "تعديل بيانات الموظف"}</h2><form className="workspace-form" onSubmit={saveStaff} key={editor === "new" ? "new" : idOf(editor)}>
      {editor === "new" && <label>الدور<select value={newRole} onChange={(event) => setNewRole(event.target.value)}><option value="SUPERVISOR">مشرف</option><option value="REGULAR_EMPLOYEE">مندوب</option></select></label>}
      {editor === "new" && newRole === "REGULAR_EMPLOYEE" && <label>المشرف المسؤول<select name="supervisorId" required defaultValue=""><option value="" disabled>اختر مشرفًا نشطًا من الحملة</option>{activeSupervisors.map((row) => <option key={idOf(row)} value={idOf(row)}>{row.user?.name || row.name}</option>)}</select>{!activeSupervisors.length && <small>أضف مشرفًا نشطًا أولًا لإسناد المندوب إليه.</small>}</label>}
      <label>الاسم الكامل<input name="name" required minLength={3} maxLength={100} defaultValue={editor.user?.name || editor.name || ""} /></label><div className="workspace-form-row"><label>البريد الإلكتروني<input name="email" required type="email" dir="ltr" defaultValue={editor.user?.email || editor.email || ""} /></label><label>رقم الجوال<input name="phoneNumber" required type="tel" dir="ltr" pattern="05[0-9]{8}" defaultValue={editor.user?.phoneNumber || editor.phoneNumber || ""} /></label></div>
      {editor === "new" && <label>كلمة المرور المؤقتة<input name="password" required minLength={8} type="password" autoComplete="new-password" /></label>}<label><input name="active" type="checkbox" defaultChecked={editor === "new" || editor.user?.active} /> حساب نشط</label>
      {editorError && <p className="workspace-notice is-error" role="alert">{editorError}</p>}<div className="workspace-modal-actions"><button className="workspace-primary-button" disabled={busy || (editor === "new" && newRole === "REGULAR_EMPLOYEE" && !activeSupervisors.length)}>{busy ? "جارٍ الحفظ…" : "حفظ الموظف"}</button><button type="button" className="workspace-secondary-button" disabled={busy} onClick={() => setEditor(null)}>إلغاء</button></div>
    </form></section></div>}
  </section>;

  const total = Number(analytics?.totalReports) || 0;
  return <section className="workspace-panel campaign-analytics-panel"><header className="workspace-panel-heading"><div><h3>صورة واضحة عن أداء الحملة</h3><p>أعداد البلاغات ومراحل معالجتها من بيانات الحملة الحالية.</p></div><button className="workspace-secondary-button" disabled={busy || loading} onClick={() => void load()}><RefreshCw size={16} /> تحديث</button></header>{error && <p className="workspace-notice is-error" role="alert">{error}</p>}<Toast message={notice} onDismiss={setNotice} />{loading ? <ListSkeleton rows={3} /> : analytics && <><div className="ons-campaign-performance"><div className="ons-performance-summary"><span className="ons-kicker">مؤشر الإنجاز</span><strong>{analytics?.resolutionRate == null ? "—" : `${analytics.resolutionRate}%`}</strong><p>{analytics.totalPilgrims ?? "—"} حاج · {total} بلاغ</p><small>نسبة البلاغات المكتملة من إجمالي بلاغات الحملة.</small></div><StatusDonut values={{ OPEN: analytics.openReports, ASSIGNED: analytics.assignedReports, IN_PROGRESS: analytics.inProgressReports, RESOLVED: analytics.resolvedReports, CANCELLED: analytics.cancelledReports }} /></div><div className="campaign-analytics-footer"><span><BarChart3 size={18} /> ملخص أداء الحملة جاهز للمشاركة عبر البريد المسجل.</span><button className="workspace-primary-button" disabled={busy} onClick={async () => { setBusy(true); setError(""); setNotice(""); try { await emailCampaignAnalytics(); setNotice("تم إرسال تقرير الحملة إلى بريدها المسجل."); } catch (failure) { setError(messageOf(failure)); } finally { setBusy(false); } }}>{busy ? "جارٍ الإرسال…" : "إرسال التقرير إلى بريد الحملة"}</button></div></>}</section>;
}
