import { savePilgrimRegistration } from "../services/pilgrimRegistrationService.js";
import WorkspaceBanner from "../components/workspace/WorkspaceBanner.jsx";
import CampaignOverviewCharts from "./CampaignOverviewCharts.jsx";
import { useCallback, useEffect, useState } from "react";
import { StatusPill, CopyReportNumber, ListSkeleton, Toast } from "../components/workspace/WorkspacePrimitives.jsx";
import { reportLocation, reportMapLink, reportDate } from "../utils/workspacePresentation.js";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, BriefcaseBusiness, CheckCircle2, ClipboardList, Gauge, LoaderCircle, LogOut, MapPin, Plus, RefreshCw, ShieldCheck, UsersRound, X } from "lucide-react";
import { getCurrentUser, logout } from "../auth/auth.js";
import { workspaceSections } from "../auth/workspaceSections.js";
import { getCampaignAnalytics } from "../services/campaignService.js";
import { getMyCampaignAccommodations } from "../services/accommodationService.js";
import { getPilgrims, updatePilgrim, deletePilgrim } from "../services/pilgrimService.js";
import { getEmployeesBySupervisor, getAllAuthorizedStaff, getStaffReports, acceptPilgrimReport, advanceReportStatus } from "../services/authorizedStaffService.js";
import { presentApiError } from "../utils/errorMessages.js";
import PilgrimAddMethodDialog from "./PilgrimAddMethodDialog.jsx";
import PilgrimDirectory from "./PilgrimDirectory.jsx";
import ReportDirectory from "./ReportDirectory.jsx";
import SupervisorRecordsPanel from "./SupervisorRecordsPanel.jsx";
import CampaignManagementPanel from "./CampaignManagementPanel.jsx";
import MosqueIllustration from "../components/workspace/MosqueIllustration.jsx";
import logo from "../assets/logos/ons-logo-optimized.png";
import "../styles/Workspace.css";
import "../styles/WorkspacePolish.css";

const labels = { CAMPAIGN_OWNER: "مالك الحملة", CAMPAIGN_ADMIN: "مالك الحملة", SUPERVISOR: "مشرف", REPRESENTATIVE: "مندوب", REGULAR_EMPLOYEE: "مندوب" };
const statusLabels = { OPEN: "مفتوح", ASSIGNED: "مسند", IN_PROGRESS: "قيد التنفيذ", RESOLVED: "مكتمل", CANCELLED: "ملغي" };
const icons = { overview: BarChart3, pilgrims: UsersRound, team: UsersRound, management: BriefcaseBusiness, reports: ClipboardList, records: ClipboardList };
const idOf = (row) => row?.id ?? row?.Id ?? row?.pilgrimId ?? row?.accommodationId;
const asList = (value) => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];
const messageOf = (error, fallback) => presentApiError(error, fallback).message;

function AssignedReports({ user, onCount }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const result = asList(await getStaffReports()); setRows(result); onCount?.(result.length); }
    catch (failure) { if (/you dont have reports|there is no reports/i.test(failure.message || "")) { setRows([]); onCount?.(0); } else setError(messageOf(failure, "تعذر تحميل البلاغات الآن. أعد المحاولة.")); }
    finally { setLoading(false); }
  }, [onCount]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener("focus", refresh);
    window.addEventListener("ons-report-updated", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("ons-report-updated", refresh); };
  }, [load]);
  async function act(row) {
    if (busy !== null) return;
    setBusy(row.reportId); setError(""); setNotice("");
    try {
      if (row.status === "OPEN") {
        const pilgrimId = idOf(row.pilgrim) ?? row.pilgrimId;
        if (!pilgrimId) throw new Error("بيانات الحاج المرتبط بالبلاغ غير مكتملة.");
        await acceptPilgrimReport(user.id, pilgrimId, row.reportId);
      } else await advanceReportStatus(user.id, row.reportId);
      await load(); setNotice(row.status === "ASSIGNED" ? "بدأت المساعدة. عند الانتهاء اضغط إكمال المساعدة." : row.status === "IN_PROGRESS" ? "اكتملت المساعدة، وتم تحديث حالة البلاغ للحاج." : "تم استلام البلاغ وإضافته إلى مهامك.");
      window.dispatchEvent(new CustomEvent("ons-report-updated"));
    } catch (failure) { setError(messageOf(failure, "تعذر تحديث البلاغ. أعد المحاولة.")); }
    finally { setBusy(null); }
  }
  const combined = rows;
  const filtered = combined.toSorted((a, b) => ({ IN_PROGRESS: 0, ASSIGNED: 1, OPEN: 2, RESOLVED: 3, CANCELLED: 4 }[a.status] ?? 5) - ({ IN_PROGRESS: 0, ASSIGNED: 1, OPEN: 2, RESOLVED: 3, CANCELLED: 4 }[b.status] ?? 5)).filter((row) => (!status || row.status === status) && `${row.caseNumber || ""} ${row.pilgrim?.fullName || ""}`.toLocaleLowerCase("ar").includes(query.trim().toLocaleLowerCase("ar")));
  const pages = Math.max(1, Math.ceil(filtered.length / 10)); const currentPage = Math.min(page, pages);
  return <section className="pilgrim-directory ons-assigned-reports" dir="rtl" aria-label="بلاغاتي المسندة" aria-busy={loading}>
    <header className="pd-heading"><div><span className="ons-kicker">مهامي المسندة · {combined.length} بلاغ</span><p>هذه بلاغاتك التي استلمتها فقط؛ ابدأ المساعدة ثم حدّثها عند اكتمالها.</p></div><div className="pd-actions"><button className="pd-secondary" disabled={busy !== null || loading} onClick={() => void load()}><RefreshCw size={18} /> تحديث</button></div></header>
    <div className="pd-toolbar"><label className="pd-search"><input aria-label="بحث في بلاغاتي" placeholder="رقم البلاغ أو اسم الحاج" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label><select aria-label="حالة البلاغ" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">كل الحالات</option>{Object.entries(statusLabels).filter(([value]) => value !== "OPEN").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    {error && <div className="pd-error ons-list-error" role="alert"><span>{error}</span><button className="pd-secondary" disabled={loading} onClick={() => void load()}>إعادة المحاولة</button></div>}
    <Toast message={notice} onDismiss={setNotice} />
    {loading && !combined.length ? <ListSkeleton rows={3} /> : <div className="ons-task-grid">{filtered.slice((currentPage - 1) * 10, currentPage * 10).map((row) => {
      const mapUrl = reportMapLink(row);
      return <article className={`ons-task-card is-${String(row.status).toLowerCase()}`} key={row.reportId}>
        <header><CopyReportNumber value={row.caseNumber || row.reportId} /><StatusPill status={row.status} /></header><h2>{row.pilgrim?.fullName || "بلاغ مساعدة"}</h2><p className="ons-task-location"><MapPin size={19} />{reportLocation(row)}</p><time className="ons-muted">{reportDate(row.createdAt)}</time>
        <footer>{["OPEN", "ASSIGNED", "IN_PROGRESS"].includes(row.status) ? <button className="pd-primary" disabled={busy !== null || loading} onClick={() => void act(row)}>{busy === row.reportId ? "جارٍ التحديث…" : row.status === "OPEN" ? "استلام البلاغ" : row.status === "ASSIGNED" ? "بدء المساعدة" : "إكمال المساعدة"}</button> : <span className="ons-task-completed">{row.status === "RESOLVED" ? <CheckCircle2 size={19} /> : null}{row.status === "CANCELLED" ? "ملغي" : "مكتمل"}</span>}{mapUrl && <a className="pd-secondary" href={mapUrl} target="_blank" rel="noopener noreferrer"><MapPin size={18} />فتح الموقع على الخريطة</a>}</footer>
      </article>;
    })}</div>}
    {!loading && !filtered.length && !error && <div className="pd-empty"><CheckCircle2 size={28} /><b>{query || status ? "لا توجد نتائج مطابقة" : "لا توجد بلاغات معروضة"}</b><p>{query || status ? "غيّر البحث أو الحالة المحددة." : "حدّث القائمة أو ابحث عن بلاغات قريبة."}</p></div>}
    <footer className="pd-pagination"><span>{filtered.length} بلاغ · صفحة {currentPage} من {pages}</span><div><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>السابق</button><button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>التالي</button></div></footer>
  </section>;
}

function CampaignWorkspace({ user, activation, onLogout }) {
  const owner = ["CAMPAIGN_OWNER", "CAMPAIGN_ADMIN"].includes(user.role);
  const supervisor = user.role === "SUPERVISOR";
  const campaign = user.campaign;
  const name = campaign?.campaignName || campaign?.user?.name || "الحملة الحالية";
  const delegate = !owner && !supervisor;
  const sections = workspaceSections(user.role).filter((item) => !delegate || item.id !== "tracking");
  const supervisorNavGroups = [
    { label: "نظرة عامة", ids: ["overview"] },
    { label: "إدارة الحجاج", ids: ["pilgrims"] },
    { label: "التشغيل والمتابعة", ids: ["team", "accommodations", "reports", "myReports"] },
    { label: "التقارير", ids: ["analytics"] },
  ].map((group) => ({ ...group, items: sections.filter((item) => group.ids.includes(item.id)) })).filter((group) => group.items.length);
  const [requestedSection, setSection] = useState(["REPRESENTATIVE", "REGULAR_EMPLOYEE"].includes(user.role) ? "myReports" : "overview");
  const section = sections.some((item) => item.id === requestedSection) ? requestedSection : "overview";
  const [mobileNav, setMobileNav] = useState(false);
  const [externalHelpOpen,setExternalHelpOpen] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [teamCounts, setTeamCounts] = useState(null);
  const [teamError, setTeamError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [editor, setEditor] = useState(null);
  const [addMethodOpen, setAddMethodOpen] = useState(false);
  const [newPilgrimDraft, setNewPilgrimDraft] = useState({});
  const [registrationCheckpoint, setRegistrationCheckpoint] = useState(null);
  const [qrCard, setQrCard] = useState(null);
  const [includeQrCard, setIncludeQrCard] = useState(false);
  const [staffDisplayName, setStaffDisplayName] = useState(user.name && user.name !== user.email ? user.name : "");
  const [stays, setStays] = useState([]);
  const [selectedStayId, setSelectedStayId] = useState("");
  const [staysLoading, setStaysLoading] = useState(false);
  const [staysFailed, setStaysFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [editorError, setEditorError] = useState("");
  const [listVersion, setListVersion] = useState(0);
  const [reportFilterStatus, setReportFilterStatus] = useState("");
  const current = sections.find((item) => item.id === section) || sections[0];
  useEffect(() => {
    if (!supervisor && !delegate) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const responses = await Promise.allSettled(supervisor ? [getEmployeesBySupervisor(), getStaffReports()] : [getStaffReports()]);
      const email = user.email.toLowerCase();
      const candidates = [];
      for (const response of responses) if (response.status === "fulfilled") for (const row of asList(response.value)) { candidates.push(row, row.authorizedStaff); let current = row.supervisor; for (let depth = 0; current && depth < 4; depth += 1) { candidates.push(current); current = current.supervisor; } }
      const own = candidates.find((entry) => String(entry?.user?.email || entry?.email || "").toLowerCase() === email);
      const actualName = own?.user?.name || own?.name;
      if (!cancelled && actualName) setStaffDisplayName(actualName);
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [supervisor, delegate, user.email]);
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true); setSummaryError("");
    try {
      if (owner) {
        const [summary, team] = await Promise.allSettled([getCampaignAnalytics(), getAllAuthorizedStaff()]);
        if (team.status === "fulfilled") { const rows = asList(team.value); setTeamCounts({ supervisors: rows.filter((row) => row.staffRole === "SUPERVISOR").length, representatives: rows.filter((row) => row.staffRole === "REGULAR_EMPLOYEE").length }); setTeamError(""); }
        else { setTeamCounts(null); setTeamError(messageOf(team.reason, "تعذر تحديث أعداد الفريق.")); }
        if (summary.status === "rejected") throw summary.reason;
        setAnalytics(summary.value);
      } else if (supervisor) setAnalytics(await getCampaignAnalytics());
      else { const reports = asList(await getStaffReports()); setAnalytics({ totalReports: reports.length, resolvedReports: reports.filter((row) => row.status === "RESOLVED").length, inProgressReports: reports.filter((row) => ["ASSIGNED", "IN_PROGRESS"].includes(row.status)).length }); }
    } catch (failure) {
      if (/you dont have reports|there is no reports/i.test(failure.message || "")) setAnalytics({ totalReports: 0, resolvedReports: 0, inProgressReports: 0 });
      else setSummaryError(messageOf(failure, "تعذر تحديث الملخص الآن. أعد المحاولة."));
    } finally { setSummaryLoading(false); }
  }, [owner, supervisor]);
  useEffect(() => { const timer = window.setTimeout(() => void loadSummary(), 0); return () => window.clearTimeout(timer); }, [loadSummary]);
  function changeSection(id) { setSection(id); setMobileNav(false); setNotice(""); setEditor(null); setAddMethodOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function openEditor(row = "new", draft = {}) {
    setNewPilgrimDraft(draft); setRegistrationCheckpoint(null); setQrCard(draft.qrCard || null); setIncludeQrCard(Boolean(draft.qrCard?.cardNumber)); setEditor(row); setEditorError(""); setNotice(""); setSelectedStayId(String(idOf(row?.accommodation) || "")); setStaysFailed(false); setStaysLoading(true);
    if (owner || supervisor) {
      try {
        if (owner) { const pilgrims = asList(await getPilgrims()); setStays([...new Map(pilgrims.filter((item) => item.accommodation).map((item) => [idOf(item.accommodation), item.accommodation])).values()]); }
        else setStays(asList(await getMyCampaignAccommodations()));
      }
      catch { setStaysFailed(true); setEditorError("تعذر تحميل خيارات السكن. أغلق النموذج وأعد فتحه قبل الحفظ."); }
      finally { setStaysLoading(false); }
    }
  }
  async function savePilgrim(event) {
    event.preventDefault(); if (saving) return;
    const form = new FormData(event.currentTarget); setSaving(true); setEditorError("");
    const data = { fullName: String(form.get("fullName")).trim(), nationality: String(form.get("nationality")).trim(), phoneNumber: String(form.get("phoneNumber")).trim(), visaNumber: String(form.get("visaNumber")).trim(), accommodation: selectedStayId ? { Id: Number(selectedStayId) } : null };
    const card = includeQrCard && qrCard ? { cardNumber: String(form.get("qrCardNumber") || "").trim(), cardType: String(form.get("qrCardType") || "").trim(), status: String(form.get("qrCardStatus") || "ACTIVE"), imageReference: String(form.get("qrCardImage") || "").trim() } : null;
    let progress = registrationCheckpoint;
    try {
      const fresh = editor === "new";
      if (fresh) await savePilgrimRegistration({ pilgrim: data, card, checkpoint: progress, onCheckpoint: (checkpoint) => { if (!progress?.pilgrimSaved) { setListVersion((value) => value + 1); void loadSummary(); } progress = checkpoint; setRegistrationCheckpoint(checkpoint); } });
      else await updatePilgrim(idOf(editor), data);
      setEditor(null); setNotice(fresh && card ? "تمت إضافة الحاج وبطاقته وربطهما بنجاح." : fresh ? "تمت إضافة الحاج بنجاح." : "تم حفظ بيانات الحاج بنجاح.");
      setListVersion((value) => value + 1); void loadSummary();
    } catch (failure) {
      const message = messageOf(failure, "تعذر إكمال الحفظ. أعد المحاولة.");
      setEditorError(progress?.pilgrimSaved ? `الحاج محفوظ بالفعل. لم يكتمل ربط البطاقة: ${message} إعادة المحاولة تُكمل البطاقة فقط.` : message);
    } finally { setSaving(false); }
  }
  async function removePilgrim(row) {
    if (!window.confirm(`حذف سجل الحاج ${row.fullName}؟`)) return;
    try { await deletePilgrim(idOf(row)); setNotice("تم حذف سجل الحاج."); setListVersion((value) => value + 1); void loadSummary(); }
    catch (failure) { setNotice(messageOf(failure, "تعذر حذف الحاج. تحقق من السجلات المرتبطة به.")); }
  }
  const formRecord = editor === "new" ? newPilgrimDraft : editor;
  const metrics = owner || supervisor ? [["الحجاج", analytics?.totalPilgrims, UsersRound], ["البلاغات", analytics?.totalReports, ClipboardList], ["المكتملة", analytics?.resolvedReports, CheckCircle2], ["نسبة الإنجاز", analytics?.resolutionRate == null ? null : `${analytics.resolutionRate}%`, Gauge]] : [["بلاغاتي", analytics?.totalReports, ClipboardList], ["قيد التنفيذ", analytics?.inProgressReports, Gauge], ["المكتملة", analytics?.resolvedReports, CheckCircle2]];
  return <main className={`campaign-workspace role-${user.role.toLowerCase()} ons-workspace-theme ons-role-${supervisor ? "supervisor" : owner ? "campaign" : "delegate"}`} dir="rtl">
    {mobileNav && <button className="workspace-mobile-scrim" aria-label="إغلاق القائمة" onClick={() => setMobileNav(false)} />}
    <aside className={`workspace-sidebar ${mobileNav ? "is-open" : ""}`}>
      <a className="workspace-brand" href="/" aria-label="أُنس"><img src={logo} alt="أُنس" /></a>
      <div className="workspace-campaign"><span className="workspace-campaign-icon"><BriefcaseBusiness size={20} /></span><span><small>الحملة الحالية</small><b>{name}</b><em>{labels[user.role]}</em></span></div>
      <span className="workspace-nav-title">{supervisor ? "إدارة الحملة" : "مساحة العمل"}</span>
      <nav className="workspace-nav" aria-label="التنقل الداخلي">{supervisor ? supervisorNavGroups.map((group) => <div className="workspace-nav-group-block" key={group.label}><span className="supervisor-nav-group">{group.label}</span>{group.items.map((item) => { const Icon = icons[item.icon]; return <div className="workspace-nav-item" key={item.id}><button type="button" className={section === item.id ? "is-active" : ""} aria-current={section === item.id ? "page" : undefined} onClick={() => changeSection(item.id)}><Icon size={19} />{item.label}</button></div>; })}</div>) : sections.map((item) => { const Icon = icons[item.icon]; return <div className="workspace-nav-item" key={item.id}><button type="button" className={section === item.id ? "is-active" : ""} aria-current={section === item.id ? "page" : undefined} onClick={() => changeSection(item.id)}><Icon size={19} />{item.label}</button></div>; })}</nav>
      <div className="workspace-sidebar-spacer" /><div className="workspace-help"><ShieldCheck size={20} /><b>أُنس معك في الميدان</b><span>بيانات حملتك ومهامك في مساحة واحدة.</span></div><button className="workspace-logout" onClick={onLogout}><LogOut size={17} />تسجيل الخروج</button>
    </aside>
    <section className="workspace-main"><header className="workspace-header"><div className="workspace-header-actions"><button className="workspace-mobile-menu pd-link" aria-label="فتح قائمة التنقل" onClick={() => setMobileNav(true)}><BriefcaseBusiness size={20} /></button><span className="workspace-breadcrumb">أُنس / {labels[user.role]}</span></div><span className="workspace-profile" title={user.email}><span className="workspace-avatar">{((supervisor || delegate) && staffDisplayName ? staffDisplayName : user.name && user.name !== user.email ? user.name : labels[user.role]).slice(0, 1)}</span><span><b>{supervisor ? "المشرف" : delegate ? "المساعد" : user.name && user.name !== user.email ? user.name : labels[user.role]}</b>{supervisor || delegate ? <small>{staffDisplayName || user.email}</small> : user.name && user.name !== user.email && <small>{labels[user.role]}</small>}</span></span></header>
      <div className="workspace-page-content">{supervisor && section === "overview" ? <section className="supervisor-hero" aria-labelledby="supervisor-hero-title"><div className="supervisor-hero-copy"><span className="supervisor-hero-eyebrow"><ShieldCheck size={16} />{staffDisplayName ? `أهلًا وسهلًا بك، يا ${staffDisplayName}` : "أهلًا بك في مساحة الإشراف"}</span><h1 id="supervisor-hero-title">شرفُ الإشراف..<br /><span>أمانةٌ في خدمة ضيوف الرحمن</span></h1><p>بعنايتك بفريقك، وحسن تنظيمك، وسرعة استجابتك، تسهم في أن يجد ضيوف الرحمن العون والطمأنينة. كل متابعة قد تصنع فرقًا في رحلة حاج.</p><div className="supervisor-hero-actions"><button className="workspace-primary-button" onClick={() => setAddMethodOpen(true)}><Plus size={18} />إضافة حاج</button><button className="workspace-secondary-button" onClick={() => changeSection("pilgrims")}><UsersRound size={18} />حجاج الحملة</button></div></div><div className="supervisor-hero-art"><MosqueIllustration /><blockquote>«كُلُّكُمْ رَاعٍ، وَكُلُّكُمْ مَسْؤُولٌ عَنْ رَعِيَّتِهِ»<cite>رسول الله ﷺ · متفق عليه</cite></blockquote></div></section> : <WorkspaceBanner variant={supervisor ? "supervisor" : owner ? "campaign" : "delegate"} eyebrow={supervisor ? `مساحة الإشراف · ${name}` : `${labels[user.role]} · ${name}`} title={owner && section === "overview" ? "حملتك أمامك، بكل وضوح" : current.label} description={current.description} />}
        {section === "overview" && <>
          {activation?.paymentConfirmed && <p className="workspace-notice is-success" role="status">تم تأكيد الدفع وتفعيل الحملة.</p>}
          {!supervisor && <section className="ons-metrics-strip" aria-label="ملخص المتابعة"><header><Gauge size={18} /><span>ملخص المتابعة</span></header><div className="workspace-stats" style={{"--metric-columns":metrics.length}}>{metrics.map(([label, value, Icon]) => <article key={label} className="workspace-stat"><span className="workspace-stat-icon"><Icon size={20} /></span><span className="workspace-stat-label">{label}</span><b>{summaryLoading || summaryError ? "—" : value ?? "—"}</b></article>)}</div></section>}
          {owner && <div className="workspace-owner-context"><span>الحملة الحالية: <b>{name}</b></span>{campaign?.status && <StatusPill status={campaign.status} />}</div>}
          {owner && teamCounts && <div className="workspace-team-summary"><span><ShieldCheck size={20} /><b>{teamCounts.supervisors}</b> مشرفون</span><span><UsersRound size={20} /><b>{teamCounts.representatives}</b> مناديب</span><button className="pd-link" onClick={() => changeSection("team")}>إدارة الفريق <ArrowRight size={17} /></button></div>}
          {owner && teamError && <p className="workspace-notice is-error" role="alert">{teamError}</p>}
          {summaryError && <p className="workspace-notice is-error" role="alert">{summaryError}<button className="pd-link" onClick={() => void loadSummary()}>إعادة المحاولة</button></p>}
          {owner && <div className="ons-owner-overview"><CampaignOverviewCharts owner analytics={analytics} loading={summaryLoading} error={summaryError} onRetry={() => void loadSummary()} refreshKey={listVersion} onOpenStays={() => changeSection("accommodations")} /></div>}
          {supervisor && <div className="supervisor-chart-area"><CampaignOverviewCharts owner={false} analytics={analytics} loading={summaryLoading} error={summaryError} onRetry={() => void loadSummary()} refreshKey={listVersion} onOpenReports={(status = "") => { setReportFilterStatus(status); changeSection("reports"); }} /></div>}
          {delegate && <section className="ons-external-help"><div><ShieldCheck size={23} /><span><b>مساعدة حاج خارج الحملة</b><small>اطّلع على حالة بلاغه باستخدام رقم السجل.</small></span></div><button className="workspace-secondary-button" onClick={() => setExternalHelpOpen(true)}>عرض حالة البلاغ <ArrowRight size={16} /></button></section>}
          <section className="workspace-panel supervisor-shortcuts"><div className="workspace-panel-heading"><div><h3>{supervisor ? "مساحة العمل" : "ابدأ من هنا"}</h3><p>{supervisor ? "وصول مباشر إلى سجلات الحملة وأدوات المتابعة." : "اختر المهمة التي تريد إنجازها."}</p></div><button className="workspace-secondary-button" disabled={summaryLoading} onClick={() => void loadSummary()}><RefreshCw size={16} />تحديث الملخص</button></div><div className="workspace-task-grid">{sections.filter((item) => supervisor ? ["team", "accommodations"].includes(item.id) : owner ? ["pilgrims", "team", "accommodations"].includes(item.id) : item.id !== "overview").map((item) => { const Icon = icons[item.icon]; return <button type="button" key={item.id} onClick={() => changeSection(item.id)}><span><Icon size={23} /></span><b>{item.label}</b><small>{item.description}</small><ArrowRight size={18} /></button>; })}</div></section>
        </>}
        {section === "pilgrims" && <>{notice && <p className="workspace-notice" role="status">{notice}</p>}<PilgrimDirectory campaignName={name} role={owner ? "CAMPAIGN_OWNER" : supervisor ? "SUPERVISOR" : "REPRESENTATIVE"} refreshKey={listVersion} onAdd={owner || supervisor ? () => setAddMethodOpen(true) : undefined} onEdit={owner || supervisor ? (row) => void openEditor(row) : undefined} onDelete={owner || supervisor ? (row) => void removePilgrim(row) : undefined} /></>}
        {section === "team" && (owner ? <CampaignManagementPanel staffOnly onChanged={() => void loadSummary()} /> : <SupervisorRecordsPanel initialKind="employees" allowedKinds={["employees"]} />)}
        {section === "analytics" && (owner || supervisor) && <CampaignManagementPanel />}
        {section === "accommodations" && (owner || supervisor) && <SupervisorRecordsPanel ownerMode={owner} initialKind="accommodations" allowedKinds={["accommodations"]} onChanged={() => void loadSummary()} />}
        {section === "reports" && !owner && <ReportDirectory key={reportFilterStatus} initialStatus={reportFilterStatus} role={supervisor ? "SUPERVISOR" : "REPRESENTATIVE"} />}
        {section === "myReports" && <AssignedReports user={user} />}
      </div>
    </section>
    {!owner && !supervisor && <nav className="ons-delegate-bottom-nav" aria-label="تنقل المندوب">{sections.map((item) => { const Icon = icons[item.icon]; return <button key={item.id} type="button" className={section === item.id ? "is-active" : ""} aria-current={section === item.id ? "page" : undefined} onClick={() => changeSection(item.id)}><Icon size={20} /><span>{item.label}</span></button>; })}<button type="button" onClick={onLogout}><LogOut size={20} /><span>تسجيل الخروج</span></button></nav>}
    {externalHelpOpen && delegate && <div className="workspace-modal-backdrop"><section className="workspace-modal ons-external-help-dialog" role="dialog" aria-modal="true" aria-labelledby="external-help-title"><button type="button" className="workspace-modal-close" aria-label="إغلاق" onClick={() => setExternalHelpOpen(false)}><X size={20} /></button><h2 id="external-help-title">مساعدة حاج خارج الحملة</h2><p className="workspace-modal-description">اعرض حالة البلاغ برقم سجله. المعلومات المتاحة تخضع لصلاحيات حسابك.</p><ReportDirectory role="REPRESENTATIVE" trackingOnly /></section></div>}
    {addMethodOpen && (owner || supervisor) && <PilgrimAddMethodDialog onClose={() => setAddMethodOpen(false)} onManual={() => { setAddMethodOpen(false); void openEditor(); }} onDraft={(draft) => { setAddMethodOpen(false); void openEditor("new", draft); }} onExisting={(record) => { setAddMethodOpen(false); void openEditor(record); }} />}
    {editor && <div className="workspace-modal-backdrop"><section className="workspace-modal" role="dialog" aria-modal="true" aria-labelledby="pilgrim-editor-title"><button className="workspace-modal-close" aria-label="إغلاق النموذج" disabled={saving} onClick={() => setEditor(null)}><X size={20} /></button><h2 id="pilgrim-editor-title">{editor === "new" ? "إضافة حاج" : "تعديل بيانات الحاج"}</h2><p className="workspace-modal-description">سيُحفظ السجل ضمن {name} ويظهر لجميع موظفي الحملة.</p>{editor === "new" && newPilgrimDraft.qrImported && <p className="workspace-notice is-info">{newPilgrimDraft.qrMissingFields?.length ? `تمت قراءة ${newPilgrimDraft.qrCard ? "رقم البطاقة والبيانات المتوفرة" : "البيانات المتوفرة"}. الرمز لا يحتوي على: ${newPilgrimDraft.qrMissingFields.map((key) => ({ fullName: "الاسم", nationality: "الجنسية", phoneNumber: "الجوال", visaNumber: "التأشيرة" })[key]).join("، ")}. أكملها قبل الحفظ.` : "تمت تعبئة بيانات الحاج من الرمز. راجعها ثم احفظ الحاج والبطاقة."}</p>}{registrationCheckpoint?.pilgrimSaved && <p className="workspace-notice is-info">الحاج محفوظ. يمكنك إكمال ربط البطاقة أو إغلاق النموذج والعودة إلى سجله.</p>}<form className="workspace-form" onSubmit={savePilgrim} key={editor === "new" ? "new" : idOf(editor)}><div className="workspace-form-row"><label>الاسم الكامل<input readOnly={Boolean(registrationCheckpoint?.pilgrimSaved)} name="fullName" required maxLength={120} defaultValue={formRecord?.fullName || ""} /></label><label>الجنسية<input readOnly={Boolean(registrationCheckpoint?.pilgrimSaved)} name="nationality" required maxLength={60} defaultValue={formRecord?.nationality || ""} /></label></div><div className="workspace-form-row"><label>رقم الجوال<input readOnly={Boolean(registrationCheckpoint?.pilgrimSaved)} name="phoneNumber" type="tel" pattern="\+?[0-9]{8,15}" dir="ltr" required defaultValue={formRecord?.phoneNumber || ""} /></label><label>رقم التأشيرة<input readOnly={Boolean(registrationCheckpoint?.pilgrimSaved)} name="visaNumber" required dir="ltr" defaultValue={formRecord?.visaNumber || ""} /></label></div>{(owner || supervisor) && <label>السكن (اختياري)<select name="accommodationId" value={selectedStayId} onChange={(event) => setSelectedStayId(event.target.value)} disabled={staysLoading || saving || Boolean(registrationCheckpoint?.pilgrimSaved)}><option value="">غير مرتبط بسكن</option>{stays.map((stay) => <option key={idOf(stay)} value={idOf(stay)}>{stay.accommodationName || stay.name}</option>)}</select>{owner && <small>القائمة تعرض المساكن المرتبطة بحجاج الحملة حاليًا.</small>}</label>}{editor === "new" && qrCard && <fieldset className="qr-registration-card"><legend>بطاقة الحاج المقروءة</legend><label className="qr-card-toggle"><input type="checkbox" checked={includeQrCard} onChange={(event) => setIncludeQrCard(event.target.checked)} disabled={saving} />إضافة البطاقة تلقائيًا مع الحاج</label>{includeQrCard && <><div className="workspace-form-row"><label>رقم البطاقة (HID)<input name="qrCardNumber" required maxLength={50} dir="ltr" defaultValue={qrCard.cardNumber} disabled={saving} /></label><label>نوع البطاقة<input name="qrCardType" required maxLength={30} defaultValue={qrCard.cardType || "NUSUK"} disabled={saving} /></label></div><div className="workspace-form-row"><label>الحالة<select name="qrCardStatus" defaultValue={qrCard.status || "ACTIVE"} disabled={saving}><option value="ACTIVE">فعّالة</option><option value="INACTIVE">غير فعّالة</option><option value="EXPIRED">منتهية</option></select></label><label>مرجع الصورة (اختياري)<input name="qrCardImage" maxLength={255} defaultValue={qrCard.imageReference || ""} disabled={saving} /></label></div><small>ستُربط البطاقة بالحاج المحفوظ مباشرة، ويولّد النظام معرّفها تلقائيًا.</small></>}</fieldset>}{editorError && <p className="workspace-notice is-error" role="alert">{editorError}</p>}<div className="workspace-modal-actions"><button className="workspace-primary-button" disabled={saving || staysLoading || staysFailed}>{saving ? <LoaderCircle className="workspace-spin" size={16} /> : <Plus size={16} />}{saving ? "جارٍ الحفظ…" : registrationCheckpoint?.pilgrimSaved && includeQrCard ? "إكمال ربط البطاقة" : includeQrCard ? "حفظ الحاج والبطاقة" : "حفظ الحاج"}</button><button type="button" className="workspace-secondary-button" disabled={saving} onClick={() => setEditor(null)}>{registrationCheckpoint?.pilgrimSaved ? "إغلاق" : "إلغاء"}</button></div></form></section></div>}
  </main>;
}

export default function DashboardWorkspace({ expectedRole, activation = null }) {
  const navigate = useNavigate(); const user = getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  const owner = ["CAMPAIGN_OWNER", "CAMPAIGN_ADMIN"].includes(user.role);
  if (!workspaceSections(user.role).length || (expectedRole && user.role !== expectedRole && !(expectedRole === "CAMPAIGN_OWNER" && owner))) return <Navigate to="/dashboard" replace />;
  return <CampaignWorkspace user={user} activation={activation} onLogout={() => { void logout(); navigate("/login", { replace: true }); }} />;
}
