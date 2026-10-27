import AdminPeopleDirectory from "../components/workspace/AdminPeopleDirectory.jsx";
import WorkspaceBanner from "../components/workspace/WorkspaceBanner.jsx";
import { StatusDonut, TrendChart } from "../components/workspace/InteractiveCharts.jsx";
import { ListSkeleton, StatusPill } from "../components/workspace/WorkspacePrimitives.jsx";
import PilgrimDirectory from "./PilgrimDirectory.jsx";
import ReportDirectory from "./ReportDirectory.jsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, Bell, Building2, CalendarDays, CheckCircle2, ChevronLeft, CircleHelp, Clock3, LoaderCircle, LogOut, MapPin, Menu, Plus, RefreshCw, Search, ShieldCheck, UsersRound, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../auth/auth.js";
import {
  deleteAdminCampaign, getAdminCampaigns, getAdminPilgrims, getAdminReports,
  getAdminReportsByStatus, getAdminReportsTrend, getAdminResponseTime, getAdminResolutionTime,
  getAdminSummary, getAdminUsers,
} from "../services/adminDashboardService.js";
import { getAllAuthorizedStaff } from "../services/authorizedStaffService.js";
import { getAllFieldStaff } from "../services/fieldStaffService.js";
import { addKiosk, getKiosks, getKioskActivity, updateKioskStatus, updateKiosk } from "../services/kioskService.js";
import { getAccommodations } from "../services/accommodationService.js";
import { getPilgrimCards } from "../services/pilgrimCardService.js";
import { presentApiError } from "../utils/errorMessages.js";
import "../styles/AdminDashboard.css";
import "../styles/WorkspacePolish.css";

const listOf = (value) => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];
const valueOf = (value, ...keys) => keys.map((key) => value?.[key]).find((item) => item !== undefined && item !== null);
const idOf = (item) => valueOf(item, "id", "Id", "campaignId", "reportId", "pilgrimId", "userId");
const nameOf = (item) => valueOf(item, "name", "fullName", "campaignName", "email") || "بدون اسم";
const errorText = (error) => {
  return presentApiError(error, "تعذر تحميل البيانات من الخادم.").message;
};
const fmt = (value) => new Intl.NumberFormat("ar-SA").format(Number(value) || 0);
const asStatus = (item) => String(valueOf(item, "status", "reportStatus") || "UNKNOWN").toUpperCase();
const roleLabel = (role) => ({ ADMIN: "أدمن", AUTHORIZEDSTAFF: "موظف حملة", FIELDSTAFF: "موظف ميداني", "FIELDـSTAFF": "موظف ميداني" }[String(role || "").replaceAll("_", "").toUpperCase()] || role || "—");

const statusLabel = { OPEN: "مفتوح", ASSIGNED: "مسند", IN_PROGRESS: "قيد المعالجة", RESOLVED: "تم الحل", CANCELLED: "ملغي" };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [data, setData] = useState({ summary: null, statuses: null, trend: [], campaigns: [], users: [], pilgrims: [], reports: [], response: null, resolution: null, authorizedStaff: [], fieldStaff: [], kiosks: [], kioskActivity: [], accommodations: [], notifications: [], pilgrimCards: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [sourceErrors, setSourceErrors] = useState({});
  const [query, setQuery] = useState("");
  const [reportFilterStatus, setReportFilterStatus] = useState("");
  const [classificationFilter,setClassificationFilter] = useState("");
  const [tab, setTab] = useState("campaigns");
  const [selectedNav, setSelectedNav] = useState("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [action, setAction] = useState("");
  const [editingKiosk, setEditingKiosk] = useState(null);
  const [showKioskDialog, setShowKioskDialog] = useState(false);
  const [kioskSaving, setKioskSaving] = useState(false);
  const [kioskFormError, setKioskFormError] = useState("");
  const [statusKiosk, setStatusKiosk] = useState(null);
  const [kioskStatus, setKioskStatus] = useState("ACTIVE");
  const [kioskStatusSaving, setKioskStatusSaving] = useState(false);
  const [kioskStatusError, setKioskStatusError] = useState("");
  const [kioskNotice, setKioskNotice] = useState("");
  const [loadedResources, setLoadedResources] = useState(() => new Set());
  const [loadingResources, setLoadingResources] = useState(() => new Set());

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    const tasks = [getAdminSummary(), getAdminReportsByStatus(), getAdminReportsTrend(), getAdminCampaigns(), getAdminUsers(), getAdminPilgrims(), getAdminReports(), getAdminResponseTime(), getAdminResolutionTime()];
    const results = await Promise.allSettled(tasks);
    const vals = results.map((result) => result.status === "fulfilled" ? result.value : null);
    const next = {
      summary: vals[0], statuses: vals[1], trend: listOf(vals[2]), campaigns: listOf(vals[3]), users: listOf(vals[4]),
      pilgrims: listOf(vals[5]), reports: listOf(vals[6]), response: vals[7], resolution: vals[8],
    };
    setData((previous) => ({ ...previous, ...next }));
    const sourceKeys = ["summary", "statuses", "trend", "campaigns", "users", "pilgrims", "reports", "response", "resolution"];
    setSourceErrors((previous) => {
      const updated = { ...previous };
      results.forEach((result, index) => {
        if (result.status === "rejected") updated[sourceKeys[index]] = errorText(result.reason);
        else delete updated[sourceKeys[index]];
      });
      return updated;
    });
    setLoadedResources((previous) => new Set([...previous, ...sourceKeys.filter((_, index) => results[index].status === "fulfilled")]));
    setLoading(false);
    setRefreshing(false);
  }, []);

  const loadSection = useCallback(async (section, refresh = false) => {
    if (section === "kiosks") {
      if (loadingResources.has("kiosks") || (!refresh && loadedResources.has("kiosks") && loadedResources.has("kioskActivity"))) return;
      setLoadingResources((previous) => new Set([...previous, "kiosks", "kioskActivity"]));
      setSourceErrors((previous) => { const updated = { ...previous }; delete updated.kiosks; delete updated.kioskActivity; return updated; });
      const [kiosksResult, activityResult] = await Promise.allSettled([getKiosks(), getKioskActivity()]);
      setData((previous) => ({
        ...previous,
        ...(kiosksResult.status === "fulfilled" ? { kiosks: listOf(kiosksResult.value) } : {}),
        ...(activityResult.status === "fulfilled" ? { kioskActivity: activityResult.value } : {}),
      }));
      setSourceErrors((previous) => ({
        ...previous,
        ...(kiosksResult.status === "rejected" ? { kiosks: errorText(kiosksResult.reason) } : {}),
        ...(activityResult.status === "rejected" ? { kioskActivity: errorText(activityResult.reason) } : {}),
      }));
      setLoadedResources((previous) => new Set([
        ...previous,
        ...(kiosksResult.status === "fulfilled" ? ["kiosks"] : []),
        ...(activityResult.status === "fulfilled" ? ["kioskActivity"] : []),
      ]));
      setLoadingResources((previous) => { const next = new Set(previous); next.delete("kiosks"); next.delete("kioskActivity"); return next; });
      return;
    }
    const resource = {
      authorizedStaff: ["authorizedStaff", getAllAuthorizedStaff],
      fieldStaff: ["fieldStaff", getAllFieldStaff],
      accommodations: ["accommodations", getAccommodations],
      pilgrimCards: ["pilgrimCards", getPilgrimCards],
    }[section];
    if (!resource) return;
    const [key, request] = resource;
    if (loadingResources.has(key) || (!refresh && loadedResources.has(key))) return;
    setLoadingResources((previous) => new Set([...previous, key]));
    setSourceErrors((previous) => { const updated = { ...previous }; delete updated[key]; return updated; });
    try {
      const response = await request();
      setData((previous) => ({ ...previous, [key]: key === "kioskActivity" ? response : listOf(response) }));
      setLoadedResources((previous) => new Set([...previous, key]));
    } catch (loadError) {
      setSourceErrors((previous) => ({ ...previous, [key]: errorText(loadError) }));
    } finally {
      setLoadingResources((previous) => { const next = new Set(previous); next.delete(key); return next; });
    }
  }, [loadedResources, loadingResources]);

  const loadOverviewSource = useCallback(async (key) => {
    const request = {
      summary: getAdminSummary,
      statuses: getAdminReportsByStatus,
      trend: getAdminReportsTrend,
      campaigns: getAdminCampaigns,
      users: getAdminUsers,
      pilgrims: getAdminPilgrims,
      reports: getAdminReports,
      response: getAdminResponseTime,
      resolution: getAdminResolutionTime,
    }[key];
    if (!request || loadingResources.has(key)) return;
    setLoadingResources((previous) => new Set([...previous, key]));
    setSourceErrors((previous) => { const updated = { ...previous }; delete updated[key]; return updated; });
    try {
      const response = await request();
      const listKeys = ["trend", "campaigns", "users", "pilgrims", "reports"];
      setData((previous) => ({ ...previous, [key]: listKeys.includes(key) ? listOf(response) : response }));
      setLoadedResources((previous) => new Set([...previous, key]));
    } catch (loadError) {
      setSourceErrors((previous) => ({ ...previous, [key]: errorText(loadError) }));
    } finally {
      setLoadingResources((previous) => { const next = new Set(previous); next.delete(key); return next; });
    }
  }, [loadingResources]);

  function selectSection(section) {
    setSelectedNav(section);
    setMobileNav(false);
    setQuery("");
    setClassificationFilter("");
    if (section !== "overview") {
      setTab(section);
      void loadSection(section);
    }
  }

  function refreshCurrent() {
    if (selectedNav === "overview") {
      void load(true);
    } else if (["authorizedStaff", "fieldStaff", "kiosks", "accommodations", "notifications", "pilgrimCards"].includes(tab)) {
      void loadSection(tab, true);
    } else {
      void loadOverviewSource(tab);
    }
  }

  function retryCurrentSection() {
    if (["authorizedStaff", "fieldStaff", "kiosks", "accommodations", "notifications", "pilgrimCards"].includes(tab)) {
      void loadSection(tab, true);
    }
    else void loadOverviewSource(tab);
  }

  useEffect(() => {
    if (!user) { navigate("/login", { replace: true }); return; }
    if (user.role !== "ADMIN") { navigate("/dashboard", { replace: true }); return; }
    const timer = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, navigate, user]);

  const reports = data.reports;
  const tabError = sourceErrors[tab];
  const sectionLoading = loadingResources.has(selectedNav) || (selectedNav === "kiosks" && loadingResources.has("kioskActivity"));
  const tabLoading = selectedNav !== "overview" && (loadingResources.has(tab) || (tab === "kiosks" && loadingResources.has("kioskActivity")) || (loading && !loadedResources.has(tab)));
  const campaignsFiltered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const items = ({ campaigns: data.campaigns, users: data.users, pilgrims: data.pilgrims, reports, authorizedStaff: data.authorizedStaff, fieldStaff: data.fieldStaff, kiosks: data.kiosks, accommodations: data.accommodations, notifications: data.notifications, pilgrimCards: data.pilgrimCards })[tab] || reports;
    return items.filter((item) => (!classificationFilter || asStatus(item) === classificationFilter) && (!normalized || JSON.stringify(item).toLowerCase().includes(normalized)));
  }, [data, query, reports, tab, classificationFilter]);
  const activeCampaigns = useMemo(() => data.campaigns.filter((campaign) => String(valueOf(campaign, "status") || "").toUpperCase() === "ACTIVE").slice(0, 5), [data.campaigns]);
  const recentReports = useMemo(() => [...reports].sort((first, second) => new Date(valueOf(second, "createdAt") || 0) - new Date(valueOf(first, "createdAt") || 0)).slice(0, 5), [reports]);

  async function removeCampaign(campaign) {
    const id = idOf(campaign);
    if (!id || !window.confirm(`هل تريد حذف حملة «${nameOf(campaign)}»؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    setAction(String(id));
    try { await deleteAdminCampaign(id); await loadOverviewSource("campaigns"); }
    catch (removeError) { setError(errorText(removeError)); }
    finally { setAction(""); }
  }

  async function createKiosk(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const kiosk = {
      kioskCode: String(form.get("kioskCode") || "").trim(),
      locationName: String(form.get("locationName") || "").trim(),
      latitude: Number(form.get("latitude")),
      longitude: Number(form.get("longitude")),
      status: String(form.get("status") || "ACTIVE"),
    };
    setKioskSaving(true);
    setKioskFormError("");
    setKioskNotice("");
    try {
      if (editingKiosk) await updateKiosk(idOf(editingKiosk), kiosk);
      else await addKiosk(kiosk);
      setShowKioskDialog(false);
      setKioskNotice(editingKiosk ? "تم تحديث بيانات الكشك بنجاح." : "تمت إضافة الكشك بنجاح.");
      setEditingKiosk(null);
      await loadSection("kiosks", true);
    } catch (createError) {
      setKioskFormError(errorText(createError));
    } finally {
      setKioskSaving(false);
    }
  }

  async function saveKioskStatus(event) {
    event.preventDefault();
    if (!statusKiosk || kioskStatusSaving) return;
    setKioskStatusSaving(true);
    setKioskStatusError("");
    try {
      await updateKioskStatus(idOf(statusKiosk), kioskStatus);
      setStatusKiosk(null);
      setKioskNotice("تم تحديث حالة الجهاز بنجاح.");
      await loadSection("kiosks", true);
    } catch (failure) { setKioskStatusError(errorText(failure)); }
    finally { setKioskStatusSaving(false); }
  }

  function handleLogout() { logout(); navigate("/login", { replace: true }); }

  const summary = data.summary || {};
  const statusData = data.statuses || {};
  const adminName = data.users.find((item) => String(valueOf(item, "email") || "").toLowerCase() === String(user?.email || "").toLowerCase());
  const displayName = valueOf(adminName, "name", "fullName") || (user?.name && user.name !== user.email ? user.name : "مدير النظام");
  const metrics = [
    { label: "إجمالي البلاغات", value: valueOf(summary, "totalReports"), errorKey: "summary", icon: Activity, tone: "green", tab: "reports" },
    { label: "بلاغات مفتوحة", value: valueOf(summary, "openReports"), errorKey: "summary", icon: AlertCircle, tone: "gold", tab: "reports" },
    { label: "قيد المعالجة", value: valueOf(summary, "inProgressReports"), errorKey: "summary", icon: Clock3, tone: "blue", tab: "reports" },
    { label: "تم حلها", value: valueOf(summary, "resolvedReports"), errorKey: "summary", icon: CheckCircle2, tone: "mint", tab: "reports" },
    { label: "الحملات المسجلة", value: data.campaigns.length, errorKey: "campaigns", icon: Building2, tone: "green", tab: "campaigns" },
    { label: "الحجاج المسجلون", value: data.pilgrims.length, errorKey: "pilgrims", icon: UsersRound, tone: "blue", tab: "pilgrims" },
  ];
  const navItems = [["overview", "نظرة عامة", Activity], ["campaigns", "الحملات", Building2], ["reports", "البلاغات", Bell], ["pilgrims", "الحجاج", UsersRound], ["users", "الحسابات والفريق", ShieldCheck], ["kiosks", "الأكشاك", MapPin], ["accommodations", "السكن", Building2], ["pilgrimCards", "بطاقات الحجاج", UsersRound]];
  const navGroups = [
    {label:"الرئيسية",items:navItems.filter(([id])=>id==="overview")},
    {label:"متابعة النظام",items:navItems.filter(([id])=>["campaigns","reports","kiosks"].includes(id))},
    {label:"المستفيدون والفريق",items:navItems.filter(([id])=>["pilgrims","users"].includes(id))},
    {label:"المرافق والسجلات",items:navItems.filter(([id])=>["accommodations","pilgrimCards"].includes(id))},
  ];
  const tabLabels = Object.fromEntries(navItems.filter(([id]) => id !== "overview").map(([id, label]) => [id, label]));
  const tableColumns = {
    campaigns: [["اسم الحملة", (item) => nameOf(item)], ["الحالة", (item) => valueOf(item, "status")], ["تاريخ البداية", (item) => dateLabel(valueOf(item, "startDate"))], ["تاريخ النهاية", (item) => dateLabel(valueOf(item, "endDate"))], ["البريد", (item) => valueOf(item, "email"), "ltr"], ["", () => "action"]],
    users: [["المستخدم", (item) => nameOf(item)], ["البريد الإلكتروني", (item) => valueOf(item, "email"), "ltr"], ["الدور", (item) => roleLabel(valueOf(item, "role"))], ["الحالة", (item) => item.active === false ? "غير نشط" : "نشط"]],
    pilgrims: [["الحاج", (item) => nameOf(item)], ["الجنسية", (item) => valueOf(item, "nationality")], ["رقم التأشيرة", (item) => valueOf(item, "visaNumber")], ["الحملة", (item) => valueOf(item?.campaign, "campaignName")]],
    reports: [["رقم البلاغ", (item) => `#${idOf(item) || "—"}`], ["الحالة", (item) => statusLabel[asStatus(item)] || asStatus(item)], ["الحاج", (item) => valueOf(item?.pilgrim, "fullName", "name")], ["تاريخ الإنشاء", (item) => dateLabel(valueOf(item, "createdAt"))]],
    authorizedStaff: [["الموظف", (item) => valueOf(item?.user, "name") || nameOf(item)], ["البريد", (item) => valueOf(item?.user, "email", "phoneNumber"), "ltr"], ["الدور", (item) => valueOf(item, "staffRole")], ["الحملة", (item) => valueOf(item?.campaign, "campaignName")]],
    fieldStaff: [["الموظف الميداني", (item) => valueOf(item?.user, "name") || nameOf(item)], ["البريد", (item) => valueOf(item?.user, "email"), "ltr"], ["رقم التواصل", (item) => valueOf(item?.user, "phoneNumber"), "ltr"], ["الحالة", (item) => valueOf(item?.user, "active") === false ? "غير نشط" : "نشط"]],
    kiosks: [["رمز الكشك", (item) => valueOf(item, "kioskCode")], ["الموقع", (item) => valueOf(item, "locationName")], ["الحالة", (item) => valueOf(item, "status")], ["آخر اتصال", (item) => dateLabel(valueOf(item, "lastHeartbeat"))], ["الإجراء", () => "kiosk-status"]],
    accommodations: [["السكن", (item) => valueOf(item, "name")], ["المدينة", (item) => valueOf(item, "city")], ["العنوان", (item) => valueOf(item, "address")], ["الحملة", (item) => valueOf(item?.campaign, "campaignName")], ["الحالة", (item) => valueOf(item, "status")]],
    notifications: [["الإشعار", (item) => valueOf(item, "message")], ["الحالة", (item) => valueOf(item, "status")], ["رقم البلاغ", (item) => valueOf(item?.report, "caseNumber", "id")], ["الحملة", (item) => valueOf(item?.campaign, "campaignName")], ["تاريخ الإرسال", (item) => dateLabel(valueOf(item, "sentAt"))]],
    pilgrimCards: [["رقم البطاقة", (item) => valueOf(item, "cardNumber"), "ltr"], ["النوع", (item) => valueOf(item, "cardType")], ["الحالة", (item) => valueOf(item, "status")]],
  };
  const isOverview = selectedNav === "overview";
  const currentTitle = isOverview ? "نظرة عامة" : tabLabels[selectedNav] || "لوحة الإدارة";

  return <div className="admin-shell ons-workspace-theme ons-role-admin" dir="rtl">
    <aside className={`admin-sidebar ${mobileNav ? "is-open" : ""}`}>
      <div className="admin-brand"><img src="/ons-logo.png" alt="أُنس" /><span>أُنس<small>إدارة النظام</small></span><button className="admin-mobile-close" onClick={() => setMobileNav(false)} aria-label="إغلاق القائمة"><X size={18} /></button></div>
      <nav className="admin-nav" aria-label="التنقل الرئيسي">
        {navGroups.map((group) => <div className="admin-nav-group" key={group.label}><span className="admin-side-label">{group.label}</span>{group.items.map(([id, label, Icon]) => <button key={id} className={selectedNav === id ? "is-active" : ""} onClick={() => selectSection(id)}><Icon size={17} /> {label}</button>)}</div>)}
      </nav>
      <div className="admin-side-spacer" />
      <div className="admin-side-user"><span className="admin-avatar">{displayName.slice(0, 1)}</span><span><b>{displayName}</b><small>مسؤول النظام</small></span></div>
      <div className="admin-help"><CircleHelp size={17} /><b>مركز المتابعة</b><span>تعرض اللوحة البيانات المتاحة لحسابك.</span></div>
      <button className="admin-logout" onClick={handleLogout}><LogOut size={17} /> تسجيل الخروج</button>
    </aside>
    {mobileNav && <button className="admin-scrim" onClick={() => setMobileNav(false)} aria-label="إغلاق القائمة" />}
    <main className="admin-main">
      <header className="admin-topbar"><button className="admin-menu-button" onClick={() => setMobileNav(true)} aria-label="فتح القائمة"><Menu size={20} /></button><div className="admin-header-title"><div className="admin-breadcrumb">أُنس <ChevronLeft size={14} /> <b>لوحة الإدارة</b></div><strong>{currentTitle}</strong></div><div className="admin-header-tools"><span className="admin-today"><CalendarDays size={15} />{dateLabel(new Date())}</span><button className="admin-refresh" onClick={refreshCurrent} disabled={loading || refreshing || sectionLoading}><RefreshCw size={15} className={refreshing || sectionLoading ? "is-spinning" : ""} /><span>تحديث</span></button><div className="admin-user"><span className="admin-avatar">{displayName.slice(0, 1)}</span><span><b>{displayName}</b><small>أدمن النظام</small></span></div></div></header>
      <div className="admin-content">
        <WorkspaceBanner variant="admin" eyebrow="أُنس · إدارة النظام" title={isOverview ? `أهلًا بك، ${displayName}` : currentTitle} description={isOverview ? "رؤية تجمع الحملات والفرق والبلاغات، وعناية تمتد إلى ضيوف الرحمن." : "تفاصيل واضحة وإجراءات منظّمة، وفق صلاحيات إدارة النظام."} />
        {error && <div className="admin-inline-error" role="alert"><AlertCircle size={16} /><span>{error}</span><button onClick={refreshCurrent}>إعادة المحاولة</button></div>}
        {isOverview && <>
        <section className="admin-metrics" aria-label="إحصائيات النظام">{metrics.map(({ label, value, errorKey, icon: Icon, tone, tab: target }) => <button className="admin-metric" key={label} onClick={() => { selectSection(target); window.scrollTo({ top: 0, behavior: "smooth" }); }}><span className={`admin-metric-icon ${tone}`}><Icon size={19} /></span><span className="admin-metric-label">{label}</span><b>{loading && !loadedResources.has(errorKey) ? <i className="admin-skeleton-value" aria-label="جارٍ التحميل" /> : sourceErrors[errorKey] ? <span className="admin-metric-error">تعذر التحميل</span> : value == null ? <span className="admin-metric-empty">لا تتوفر بيانات</span> : fmt(value)}</b><span className="admin-metric-link">عرض التفاصيل <ChevronLeft size={12} /></span></button>)}</section>
        <section className="admin-overview-grid">
          <article className="admin-panel"><div className="admin-panel-heading"><div><h2>توزيع البلاغات</h2><p>التوزيع حسب حالات النظام الفعلية</p></div><Activity size={18} /></div>{loading && !loadedResources.has("statuses") ? <PanelLoading /> : sourceErrors.statuses ? <SectionError text={sourceErrors.statuses} onRetry={() => loadOverviewSource("statuses")} /> : <StatusDonut values={statusData} onSelect={(status) => { setReportFilterStatus(status); selectSection("reports"); window.scrollTo({ top: 0 }); }} /> }</article>
          <article className="admin-panel admin-performance"><div className="admin-panel-heading"><div><h2>مؤشرات الأداء</h2><p>متوسط الوقت المسجل في النظام</p></div><Clock3 size={18} /></div>{loading && (!loadedResources.has("response") || !loadedResources.has("resolution")) ? <PanelLoading /> : <><div className="admin-time-row"><span>متوسط الاستجابة</span><b>{sourceErrors.response ? "تعذر التحميل" : data.response?.averageResponseTimeMinutes == null ? "لا تتوفر بيانات" : `${fmt(Math.round(data.response.averageResponseTimeMinutes))} دقيقة`}</b></div><div className="admin-time-row"><span>متوسط الحل</span><b>{sourceErrors.resolution ? "تعذر التحميل" : data.resolution?.averageResolutionTimeMinutes == null ? "لا تتوفر بيانات" : `${fmt(Math.round(data.resolution.averageResolutionTimeMinutes))} دقيقة`}</b></div></>}</article>
        </section>
        <section className="admin-panel admin-trend-panel"><div className="admin-panel-heading"><div><h2>اتجاه البلاغات خلال الأسبوع</h2><p>مرّر على الرسم أو اختر يومًا لاستعراض عدد البلاغات.</p></div><Activity size={18} /></div>{loading && !loadedResources.has("trend") ? <PanelLoading /> : sourceErrors.trend ? <SectionError text={sourceErrors.trend} onRetry={() => loadOverviewSource("trend")} /> : <TrendChart rows={data.trend} /> }</section>
        <section className="admin-recent-grid" aria-label="أحدث بيانات النظام">
          <article className="admin-panel admin-compact-list"><div className="admin-panel-heading"><div><h2>أحدث البلاغات</h2><p>آخر البلاغات المسجلة لدى الخادم</p></div><button className="admin-inline-link" onClick={() => { selectSection("reports"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>كل البلاغات <ChevronLeft size={14} /></button></div>{loading && !loadedResources.has("reports") ? <PanelLoading /> : sourceErrors.reports ? <SectionError text={sourceErrors.reports} onRetry={() => loadOverviewSource("reports")} /> : recentReports.length ? <div className="admin-compact-rows">{recentReports.map((report, index) => <div className="admin-compact-row" key={idOf(report) || index}><span className="admin-report-mark"><Bell size={15} /></span><span className="admin-row-main"><b>{valueOf(report?.pilgrim, "fullName", "name") || `بلاغ #${idOf(report) || "—"}`}</b><small>{valueOf(report, "caseNumber") || `#${idOf(report) || "—"}`} · {dateLabel(valueOf(report, "createdAt"))}</small></span><StatusPill status={asStatus(report)} /></div>)}</div> : <Empty text="لا توجد بلاغات مسجلة." />}</article>
          <article className="admin-panel admin-compact-list"><div className="admin-panel-heading"><div><h2>الحملات النشطة</h2><p>الحملات التي حالتها ACTIVE في النظام</p></div><button className="admin-inline-link" onClick={() => { selectSection("campaigns"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>كل الحملات <ChevronLeft size={14} /></button></div>{loading && !loadedResources.has("campaigns") ? <PanelLoading /> : sourceErrors.campaigns ? <SectionError text={sourceErrors.campaigns} onRetry={() => loadOverviewSource("campaigns")} /> : activeCampaigns.length ? <div className="admin-compact-rows">{activeCampaigns.map((campaign, index) => <div className="admin-compact-row" key={idOf(campaign) || index}><span className="admin-campaign-mark"><Building2 size={16} /></span><span className="admin-row-main"><b>{nameOf(campaign)}</b><small>{valueOf(campaign, "contactNumber") || valueOf(campaign, "email") || "—"}</small></span><span className="admin-pill active">نشطة</span></div>)}</div> : <Empty text="لا توجد حملات نشطة حاليًا." />}</article>
        </section>
        </>}
        {!isOverview && tab === "pilgrims" && <PilgrimDirectory role="ADMIN" records={data.pilgrims} externalLoading={tabLoading} externalError={tabError} onReload={() => void loadOverviewSource("pilgrims")} />}
        {!isOverview && tab === "reports" && <ReportDirectory key={reportFilterStatus} initialStatus={reportFilterStatus} role="ADMIN" records={data.reports} externalLoading={tabLoading} externalError={tabError} onReload={() => void loadOverviewSource("reports")} />}
        {!isOverview && tab === "users" && <AdminPeopleDirectory />}
        {!isOverview && !["pilgrims", "reports", "users"].includes(tab) && <section className="admin-panel admin-directory">
          <div className="admin-directory-heading"><div><h2>{tabLabels[tab] || "السجلات"}</h2><p>ابحث في السجلات وتابع تفاصيلها من مساحة واحدة.</p></div><div className="admin-directory-tools">{tab === "kiosks" && <button className="admin-add-button" type="button" onClick={() => { setEditingKiosk(null); setKioskFormError(""); setShowKioskDialog(true); }}><Plus size={15} /> إضافة كشك</button>}<label className="admin-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث في البيانات" /></label><span className="admin-count">{fmt(campaignsFiltered.length)} سجل</span></div></div>
          {["kiosks","accommodations","pilgrimCards"].includes(tab) && <div className="admin-classification-tools"><label>عرض حسب الحالة<select value={classificationFilter} onChange={event=>setClassificationFilter(event.target.value)}><option value="">جميع الحالات</option><option value="ACTIVE">نشط</option><option value="INACTIVE">غير نشط</option>{tab==="kiosks"&&<option value="MAINTENANCE">صيانة</option>}{tab==="pilgrimCards"&&<option value="EXPIRED">منتهية</option>}</select></label>{classificationFilter&&<button className="pd-link" onClick={()=>setClassificationFilter("")}>عرض الكل</button>}</div>}
          {["accommodations","pilgrimCards"].includes(tab) && <p className="admin-permission-note"><ShieldCheck size={16}/>تغيير الحالة غير متاح لدور الأدمن في صلاحيات النظام الحالية.</p>}
          {tab === "kiosks" && kioskNotice && <div className="admin-kiosk-notice" role="status">{kioskNotice}<button type="button" onClick={() => setKioskNotice("")} aria-label="إخفاء">×</button></div>}
          {tab === "kiosks" && (sectionLoading && !loadedResources.has("kioskActivity") ? <PanelLoading /> : sourceErrors.kioskActivity ? <SectionError text={sourceErrors.kioskActivity} onRetry={() => loadSection("kiosks", true)} /> : data.kioskActivity && <div className="admin-device-summary">{[["","إجمالي الأجهزة",data.kioskActivity.totalDevices],["ACTIVE","نشطة",data.kioskActivity.activeDevices],["INACTIVE","غير نشطة",data.kioskActivity.inactiveDevices],["MAINTENANCE","صيانة",data.kioskActivity.maintenanceDevices]].map(([value,label,count])=><button key={value} type="button" aria-pressed={classificationFilter===value} onClick={()=>setClassificationFilter(value)}><small>{label}</small><b>{fmt(count)}</b><span>عرض التصنيف <ChevronLeft size={12}/></span></button>)}</div>)}
          {tabLoading ? <PanelLoading /> : tabError ? <SectionError text={tabError} onRetry={retryCurrentSection} /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{(tableColumns[tab] || []).map(([label], index) => <th key={`${label}-${index}`}>{label}</th>)}</tr></thead><tbody>{campaignsFiltered.map((item, index) => <tr key={idOf(item) || index}>{(tableColumns[tab] || []).map(([label, getter, direction], columnIndex) => { const content = getter(item); if (content === "action" && tab === "campaigns") return <td data-label={label || "الإجراء"} key={`${label}-${columnIndex}`}><button className="admin-delete" disabled={action === String(idOf(item))} onClick={() => removeCampaign(item)}>{action === String(idOf(item)) ? "جارٍ الحذف…" : "حذف الحملة"}</button></td>; if (content === "kiosk-status") return <td data-label="الإجراء" key="kiosk-status"><div className="admin-kiosk-row-actions"><button className="admin-add-button" type="button" onClick={() => { setEditingKiosk(item); setKioskFormError(""); setShowKioskDialog(true); }}>تعديل البيانات</button><button className="admin-add-button" type="button" onClick={() => { setStatusKiosk(item); setKioskStatus(asStatus(item)); setKioskStatusError(""); }}><RefreshCw size={14} />تغيير الحالة</button></div></td>; const isStatus = label === "الحالة" || label === "الدور"; return <td data-label={label} key={`${label}-${columnIndex}`} dir={direction}>{isStatus ? <span className={`admin-pill ${String(content || "").toLowerCase()}`}>{content || "—"}</span> : columnIndex === 0 ? <b>{content || "—"}</b> : content || "—"}</td>; })}</tr>)}</tbody></table>{campaignsFiltered.length === 0 && <Empty text={query ? "لا توجد نتائج مطابقة." : "لا توجد سجلات متاحة للعرض."} />}</div>}
        </section>}
        <footer className="admin-footer"><MapPin size={14} /> أُنس لخدمة ضيوف الرحمن <span>·</span><CalendarDays size={14} /> بيانات مباشرة من الخادم</footer>
      </div>
    </main>
    {statusKiosk && <div className="admin-dialog-backdrop" onMouseDown={event => event.target === event.currentTarget && !kioskStatusSaving && setStatusKiosk(null)}><section className="admin-kiosk-dialog" role="dialog" aria-modal="true" aria-labelledby="kiosk-status-title" dir="rtl"><button type="button" className="admin-kiosk-close" disabled={kioskStatusSaving} onClick={() => setStatusKiosk(null)} aria-label="إغلاق"><X size={18}/></button><span className="admin-kiosk-eyebrow"><MapPin size={14}/>إدارة الأجهزة</span><h2 id="kiosk-status-title">تحديث حالة الجهاز</h2><p>{statusKiosk.kioskCode} · {statusKiosk.locationName}</p><form className="admin-kiosk-form" onSubmit={saveKioskStatus}><label>حالة الجهاز<select autoFocus value={kioskStatus} disabled={kioskStatusSaving} onChange={event => setKioskStatus(event.target.value)}><option value="ACTIVE">نشط</option><option value="INACTIVE">غير نشط</option><option value="MAINTENANCE">صيانة</option></select></label>{kioskStatusError && <div className="admin-kiosk-form-error" role="alert">{kioskStatusError}</div>}<div className="admin-kiosk-actions"><button type="button" disabled={kioskStatusSaving} onClick={() => setStatusKiosk(null)}>إلغاء</button><button type="submit" disabled={kioskStatusSaving || kioskStatus === asStatus(statusKiosk)} aria-busy={kioskStatusSaving}>{kioskStatusSaving ? "جارٍ الحفظ…" : "حفظ الحالة"}</button></div></form></section></div>}
    {showKioskDialog && <KioskDialog kiosk={editingKiosk} onClose={() => !kioskSaving && setShowKioskDialog(false)} onSubmit={createKiosk} saving={kioskSaving} error={kioskFormError} />}
  </div>;
}

function KioskDialog({ kiosk, onClose, onSubmit, saving, error }) {
  return <div className="admin-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
    <section className="admin-kiosk-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-kiosk-title" dir="rtl">
      <button className="admin-kiosk-close" type="button" onClick={onClose} disabled={saving} aria-label="إغلاق"><X size={18} /></button>
      <span className="admin-kiosk-eyebrow"><MapPin size={14} /> إدارة الأكشاك</span>
      <h2 id="admin-kiosk-title">{kiosk ? "تعديل بيانات الكشك" : "إضافة كشك جديد"}</h2>
      <p>{kiosk ? "حدّثي بيانات الجهاز وموقعه، ثم احفظي التغييرات." : "أدخلي رمز الجهاز وبيانات موقعه."}</p>
      <form className="admin-kiosk-form" onSubmit={onSubmit}><fieldset disabled={saving} className="admin-kiosk-fields">
        <label>رمز الكشك<input name="kioskCode" defaultValue={kiosk?.kioskCode ?? ""} required maxLength={50} placeholder="مثال: ONS-KSK-01" /></label>
        <label>اسم الموقع<input name="locationName" defaultValue={kiosk?.locationName ?? ""} required maxLength={100} placeholder="مثال: بوابة الملك فهد" /></label>
        <div className="admin-kiosk-coordinates">
          <label>خط العرض<input name="latitude" defaultValue={kiosk?.latitude ?? ""} type="number" min="-90" max="90" step="any" required dir="ltr" placeholder="21.4225" /></label>
          <label>خط الطول<input name="longitude" defaultValue={kiosk?.longitude ?? ""} type="number" min="-180" max="180" step="any" required dir="ltr" placeholder="39.8262" /></label>
        </div>
        <label>حالة الكشك<select name="status" defaultValue={kiosk?.status || "ACTIVE"} required><option value="ACTIVE">نشط</option><option value="INACTIVE">غير نشط</option><option value="MAINTENANCE">صيانة</option></select></label>
        {error && <div className="admin-kiosk-form-error" role="alert"><AlertCircle size={15} />{error}</div>}
        <div className="admin-kiosk-actions"><button type="button" onClick={onClose} disabled={saving}>إلغاء</button><button type="submit" disabled={saving} aria-busy={saving}>{saving ? <LoaderCircle className="is-spinning" size={16} /> : <Plus size={16} />}{saving ? "جارٍ الإضافة…" : (kiosk ? "حفظ التغييرات" : "حفظ الكشك")}</button></div></fieldset>
      </form>
    </section>
  </div>;
}

function Empty({ text }) { return <div className="admin-empty"><Building2 size={20} /><span>{text}</span></div>; }
function PanelLoading() { return <ListSkeleton rows={3} />; }
function SectionError({ text, onRetry }) { return <div className="admin-section-error" role="alert"><AlertCircle size={16} /><span>{text}</span><button onClick={onRetry}>إعادة المحاولة</button></div>; }
function dateLabel(value) { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { dateStyle: "medium" }).format(date); }
