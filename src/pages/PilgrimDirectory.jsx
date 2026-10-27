import PilgrimBooklet from "../components/workspace/PilgrimBooklet.jsx";
import { StatusPill, DetailsDrawer, ListSkeleton, CopyReportNumber } from "../components/workspace/WorkspacePrimitives.jsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, UsersRound, Plus, CreditCard, MapPin, Phone, UserRound, X, LoaderCircle, ArrowUpDown, TicketCheck } from "lucide-react";
import { getPilgrims, getPilgrimReports } from "../services/pilgrimService.js";
import { addPilgrimCard, getPilgrimCardForPilgrim } from "../services/pilgrimCardService.js";
import { presentApiError } from "../utils/errorMessages.js";
import "../styles/PilgrimDirectory.css";

const idOf = (row) => row?.id ?? row?.Id ?? row?.pilgrimId;
const listOf = (value) => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : value ? [value] : [];
const errorOf = (error) => presentApiError(error, "تعذر تحميل البيانات.").message;
const cardInfoOf = (row) => {
  const raw = row?.pilgrimCard ?? row?.card ?? row?.cardDetails ?? null;
  const known = ["pilgrimCard", "card", "cardDetails", "cardNumber", "cardId"].some((key) => Object.hasOwn(row || {}, key));
  const cardNumber = typeof raw === "string" ? raw : raw?.cardNumber ?? raw?.CardNumber ?? row?.cardNumber ?? row?.CardNumber;
  return { known, card: cardNumber ? { ...((typeof raw === "object" && raw) || {}), cardNumber } : raw };
};

const unique = (rows) => [...new Map(rows.filter(Boolean).map((row) => [String(idOf(row) ?? row.visaNumber), row])).values()];

export default function PilgrimDirectory({ role, records, refreshKey = 0, externalLoading = false, externalError = "", onReload, onAdd, onEdit, onDelete, onManageCards, campaignName = "" }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [nationality, setNationality] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const closeDetails = useCallback(() => setSelected(null), []);
  const [reports, setReports] = useState([]);
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [cardFormOpen, setCardFormOpen] = useState(false);
  const [cardBusy, setCardBusy] = useState(false);
  const [cardError, setCardError] = useState("");
  const [assignedCards, setAssignedCards] = useState({});
  const [cardLookupErrors, setCardLookupErrors] = useState({});
  const [cardNotice, setCardNotice] = useState("");
  const owner = role === "CAMPAIGN_OWNER";
  const load = useCallback(async () => {
    if (records !== undefined) return;
    setLoading(true); setError(""); 
    try {
      setRows(unique(listOf(await getPilgrims())));
    } catch (failure) { setError(errorOf(failure)); }
    finally { setLoading(false); }
  }, [records]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load, refreshKey]);
  useEffect(() => {
    const refresh = () => { if (onReload) onReload(); else void load(); };
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("ons-pilgrim-saved", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("ons-pilgrim-saved", refresh); };
  }, [load, onReload]);
  const combined = useMemo(() => unique(records ?? rows), [records, rows]);
  useEffect(() => {
    if (role !== "SUPERVISOR" || !combined.length) return;
    let stopped = false;
    const timer = window.setTimeout(async () => {
      let cursor = 0;
      const worker = async () => {
        while (cursor < combined.length && !stopped) {
          const pilgrim = combined[cursor++]; const id = String(idOf(pilgrim));
          try {
            const result = await getPilgrimCardForPilgrim(id);
            if (!stopped) {
              setAssignedCards((previous) => ({ ...previous, [id]: result.hasCard ? result.card : null }));
              setCardLookupErrors((previous) => { const next = { ...previous }; delete next[id]; return next; });
            }
          } catch (failure) { if (!stopped) setCardLookupErrors((previous) => ({ ...previous, [id]: presentApiError(failure, "تعذر التحقق من البطاقة. أعد المحاولة.").message })); }
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, combined.length) }, worker));
    }, 0);
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [combined, role]);
  async function refreshSelectedCard() {
    if (!selected || cardBusy) return;
    const id = String(idOf(selected)); setCardBusy(true); setCardError("");
    try { const result = await getPilgrimCardForPilgrim(id); setAssignedCards((previous) => ({ ...previous, [id]: result.hasCard ? result.card : null })); setCardLookupErrors((previous) => { const next = { ...previous }; delete next[id]; return next; }); }
    catch (failure) { setCardError(errorOf(failure)); }
    finally { setCardBusy(false); }
  }
  const nationalities = [...new Set(combined.map((row) => row.nationality).filter(Boolean))].sort();
  const cardDetails = (row) => Object.hasOwn(assignedCards, String(idOf(row))) ? assignedCards[String(idOf(row))] : cardInfoOf(row).card;
  const cardKnown = (row) => Object.hasOwn(assignedCards, String(idOf(row))) || cardInfoOf(row).known;
  const allCardsKnown = combined.length > 0 && combined.every(cardKnown);
  const attachedCount = combined.filter((row) => Boolean(cardDetails(row))).length;
  const filtered = combined.filter((row) => {
    const terms = [row.fullName, row.visaNumber, row.phoneNumber, idOf(row), row.accommodation?.name, row.identityNumber, row.nationalId, row.passportNumber, row.passportNo];
    return (!nationality || row.nationality === nationality)
      && (!query.trim() || terms.some((value) => String(value ?? "").toLocaleLowerCase("ar").includes(query.trim().toLocaleLowerCase("ar"))));
  }).sort((a, b) => sortBy === "name" ? String(a.fullName || "").localeCompare(String(b.fullName || ""), "ar") : String(a.visaNumber || "").localeCompare(String(b.visaNumber || ""), "ar", { numeric: true }));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  async function open(row) {
    setSelected(row); setReports([]); setDetailError(""); setCardError(""); setCardNotice(""); setCardFormOpen(false);
    if (owner) return;
    setDetailLoading(true);
    try { setReports(listOf(await getPilgrimReports(idOf(row)))); }
    catch (failure) { if (!/no reports|there is no/i.test(failure.message || "")) setDetailError(errorOf(failure)); }
    finally { setDetailLoading(false); }
  }
  async function saveCard(event) {
    event.preventDefault();
    if (!selected || cardBusy) return;
    const form = new FormData(event.currentTarget);
    const cardNumber = String(form.get("cardNumber") || "").trim();
    const payload = { cardNumber, cardType: String(form.get("cardType") || "").trim(), status: String(form.get("status")), imageReference: String(form.get("imageReference") || "").trim() || null };
    setCardBusy(true); setCardError(""); setCardNotice("");
    try {
      await addPilgrimCard(idOf(selected), payload);
      setAssignedCards((current) => ({ ...current, [String(idOf(selected))]: { ...payload } }));
      setCardFormOpen(false); setCardNotice("تمت إضافة البطاقة وربطها بالحاج بنجاح.");
      try { const saved = await getPilgrimCardForPilgrim(idOf(selected)); setAssignedCards((previous) => ({ ...previous, [String(idOf(selected))]: saved.hasCard ? saved.card : null })); } catch { setCardNotice("تمت إضافة البطاقة. تعذر تحديث قراءتها الآن؛ أعد التحقق من البطاقة."); }
      if (onReload) onReload(); else void load();
    } catch (failure) { setCardError(errorOf(failure)); }
    finally { setCardBusy(false); }
  }
  const selectedCard = selected && cardDetails(selected);
  const selectedCardKnown = selected && cardKnown(selected);
  const profileDetails = selected && (    <dl className="ons-detail-fields">{[["الجنسية", selected.nationality], ["رقم الجوال", selected.phoneNumber], ["رقم التأشيرة", selected.visaNumber], ["السكن", selected.accommodation?.name], ["الحملة", selected.campaignName || selected.campaign?.user?.name || selected.campaignId]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? "غير مسجل"}</dd></div>)}</dl>);
  const profileCard = selected && <section className="pilgrim-card-management"><header><span><CreditCard size={20} /></span><div><b>بطاقة الحاج</b><small>{selectedCard ? "بطاقة مضافة ومرتبطة بالحاج" : selectedCardKnown ? "لا توجد بطاقة مضافة لهذا الحاج" : "التحقق من بطاقة الحاج"}</small></div>{selectedCardKnown && <span className={`pilgrim-card-presence ${selectedCard ? "is-present" : "is-absent"}`}>{selectedCard ? "مضافة" : "غير مضافة"}</span>}</header>
    {cardNotice && <p className="pilgrim-card-success" role="status">{cardNotice}</p>}
    {selectedCard ? <><dl className="pilgrim-card-data">{[["رقم سجل البطاقة", selectedCard.id ?? selectedCard.Id], ["رقم البطاقة", selectedCard.cardNumber], ["نوع البطاقة", selectedCard.cardType], ["مرجع الصورة", selectedCard.imageReference || "غير مرفق"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd dir={label === "رقم البطاقة" ? "ltr" : undefined}>{value ?? "غير مسجل"}</dd></div>)}<div><dt>الحالة</dt><dd><StatusPill status={selectedCard.status} /></dd></div></dl><button className="pd-secondary" type="button" disabled={cardBusy} onClick={() => void refreshSelectedCard()}><RefreshCw size={16} />تحديث البطاقة</button></> : !selectedCardKnown ? <div className="pilgrim-card-check">{cardLookupErrors[String(idOf(selected))] ? <><p role="alert">{cardLookupErrors[String(idOf(selected))]}</p><button className="pd-secondary" type="button" disabled={cardBusy} onClick={() => void refreshSelectedCard()}>إعادة التحقق</button></> : <p role="status"><LoaderCircle size={18} className="workspace-spin" />جارٍ التحقق من وجود البطاقة…</p>}</div> : !cardFormOpen ? <div className="pilgrim-card-empty"><CreditCard size={34} strokeWidth={1} /><p>أضف بيانات البطاقة لربطها بسجل الحاج وعرض رمزها.</p><button type="button" className="workspace-primary-button" onClick={() => { setCardError(""); setCardFormOpen(true); }}><Plus size={17} />إضافة بطاقة للحاج</button></div> : <form className="pilgrim-card-form" onSubmit={saveCard}><button type="button" className="pilgrim-card-form-close" disabled={cardBusy} aria-label="إلغاء إضافة البطاقة" onClick={() => setCardFormOpen(false)}><X size={17} /></button><label>الحاج<input value={selected.fullName} readOnly /></label><div className="pilgrim-card-form-row"><label>رقم البطاقة (HID)<input name="cardNumber" maxLength={50} dir="ltr" required disabled={cardBusy} /></label></div><div className="pilgrim-card-form-row"><label>نوع البطاقة<input name="cardType" defaultValue="NUSUK" maxLength={30} required disabled={cardBusy} /></label><label>حالة البطاقة<select name="status" defaultValue="ACTIVE" required disabled={cardBusy}><option value="ACTIVE">فعّالة</option><option value="INACTIVE">غير فعّالة</option><option value="EXPIRED">منتهية</option></select></label></div><label>مرجع الصورة (اختياري)<input name="imageReference" maxLength={255} dir="ltr" disabled={cardBusy} placeholder="اسم الملف أو مرجع الصورة" /></label>{cardError && <p className="pd-error" role="alert">لم تتم الإضافة. {cardError}</p>}<button className="workspace-primary-button" disabled={cardBusy}>{cardBusy ? <LoaderCircle size={17} className="workspace-spin" /> : <CreditCard size={17} />}{cardBusy ? "جارٍ الحفظ…" : "حفظ البطاقة وربطها بالحاج"}</button></form>}
    {cardError && !cardFormOpen && <p className="pd-error" role="alert">{cardError}</p>}
  </section>;
  const profileReports = selected && (<section><h3>بلاغات الحاج</h3>{detailLoading ? <ListSkeleton rows={2} /> : detailError ? <p className="pd-error" role="alert">{detailError}</p> : !reports.length ? <p className="ons-muted">لا توجد بلاغات متاحة لهذا الحاج.</p> : <div className="pd-table-scroll"><table><thead><tr><th>رقم البلاغ</th><th>الحالة</th><th>تاريخ الإنشاء</th></tr></thead><tbody>{reports.map((report) => <tr key={report.reportId}><td data-label="البلاغ"><CopyReportNumber value={report.caseNumber || report.reportId} /></td><td data-label="الحالة"><StatusPill status={report.status} /></td><td data-label="تاريخ الإنشاء">{report.createdAt ? new Date(report.createdAt).toLocaleString("ar-SA") : "—"}</td></tr>)}</tbody></table></div>}</section>);
  const selectedPanel = selected && (role === "SUPERVISOR" ? <PilgrimBooklet key={idOf(selected)} pilgrim={selected} card={selectedCard} details={profileDetails} cardContent={profileCard} reportsContent={profileReports} onClose={closeDetails} busy={cardBusy} /> : <DetailsDrawer title="ملف الحاج" titleId="pilgrim-details-title" onClose={closeDetails}><div className="pilgrim-profile-heading"><span className="pilgrim-profile-avatar"><UserRound size={26} /></span><h3>{selected.fullName}</h3></div>{profileDetails}{!owner && profileReports}</DetailsDrawer>);
  return <section className="pilgrim-directory" dir="rtl">
    {selectedPanel}
    <header className="pd-heading"><div className="pd-heading-copy"><span className="pd-eyebrow">مساحة الحملة{campaignName ? ` · ${campaignName}` : ""}</span><h2>{role === "SUPERVISOR" ? "سجل الحجاج" : role === "ADMIN" ? "دليل الحجاج" : "حجاج الحملة"}</h2><p>{role === "SUPERVISOR" ? "لكل حاج عناية، ولكل رحلة رفيق. افتح الملف لإدارة بياناته وبطاقته." : role === "ADMIN" ? "جميع الحجاج المسجلين في النظام، مع البحث وعرض التفاصيل." : "جميع حجاج الحملة، مع بياناتهم الأساسية."}</p></div><div className="pd-actions"><button type="button" className="pd-secondary" disabled={loading || externalLoading} onClick={() => { if (onReload) onReload(); else void load(); }}><RefreshCw size={16} /> تحديث</button>{onManageCards && <button type="button" className="pd-secondary" onClick={onManageCards}><TicketCheck size={16} /> إدارة البطاقات</button>}{onAdd && <button type="button" className="pd-primary" onClick={onAdd}><Plus size={17} /> إضافة حاج</button>}</div></header>
    <div className="pd-stat-grid"><article><span><UsersRound size={18} /></span><small>حجاج الحملة</small><b>{loading || externalLoading || error || externalError ? "—" : combined.length}</b></article><article><span><MapPin size={18} /></span><small>مرتبطون بسكن</small><b>{loading || externalLoading || error || externalError ? "—" : combined.filter((row) => row.accommodation).length}</b></article><article><span><UserRound size={18} /></span><small>الجنسيات</small><b>{loading || externalLoading || error || externalError ? "—" : nationalities.length}</b></article>{allCardsKnown && <article><span><CreditCard size={18} /></span><small>لديهم بطاقة</small><b>{attachedCount}</b></article>}</div>

    <div className="pd-toolbar ons-pilgrim-filters"><label className="ons-filter-field ons-pilgrim-search"><span>ابحث عن حاج</span><div className="pd-search"><Search size={17} /><input aria-label="بحث في القائمة" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="الاسم، التأشيرة، أو رقم الجوال…" /></div></label><label className="ons-filter-field"><span>الجنسية</span><select aria-label="تصفية حسب الجنسية" value={nationality} onChange={(event) => { setNationality(event.target.value); setPage(1); }}><option value="">كل الجنسيات</option>{nationalities.map((value) => <option key={value}>{value}</option>)}</select></label><label className="ons-filter-field"><span><ArrowUpDown size={13} /> الترتيب</span><select aria-label="ترتيب الحجاج" value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1); }}><option value="name">حسب الاسم</option><option value="visa">حسب التأشيرة</option></select></label>{(query || nationality) && <button type="button" className="pd-link ons-clear-filters" onClick={() => {setQuery("");setNationality("");setPage(1);}}>مسح التصفية</button>}</div>
    {(error || externalError) && <p className="pd-error" role="alert">{error || externalError}</p>}
    {loading || externalLoading ? <ListSkeleton /> : <>{role === "SUPERVISOR" ? <div className="supervisor-pilgrim-grid">{visible.map((row) => { const linked = cardDetails(row); const known = cardKnown(row); return <article className="supervisor-pilgrim-card" key={idOf(row) ?? row.visaNumber}><header><span className="supervisor-pilgrim-avatar">{String(row.fullName || "ح").trim().slice(0, 1)}</span><div><h3>{row.fullName || "حاج"}</h3><small>رقم السجل <b dir="ltr">#{idOf(row) ?? "—"}</b></small></div><span className="supervisor-pilgrim-nationality">{row.nationality || "—"}</span></header><div className="supervisor-pilgrim-info"><span><Phone size={15} /><b dir="ltr">{row.phoneNumber || "—"}</b></span><span><MapPin size={15} /><b>{row.accommodation?.name || "غير مرتبط بسكن"}</b></span></div><div className="supervisor-pilgrim-visa"><span>رقم التأشيرة</span><b dir="ltr">{row.visaNumber || "—"}</b></div><div className={`supervisor-card-status ${linked ? "is-linked" : known ? "is-empty" : "is-unknown"}`}><CreditCard size={15} /><span>{linked ? `بطاقة ${linked.cardNumber}` : known ? "غير مضافة · أضف بطاقة" : cardLookupErrors[String(idOf(row))] ? "تعذر التحقق من البطاقة" : "جارٍ التحقق من البطاقة…"}</span></div><footer><button type="button" className="supervisor-open-pilgrim" onClick={() => void open(row)}><UserRound size={16} /> فتح الملف وإدارة البطاقة</button><div>{onEdit && <button type="button" className="pd-link" onClick={() => onEdit(row)}>تعديل</button>}{onDelete && <button type="button" className="pd-link pd-danger" onClick={() => onDelete(row)}>حذف</button>}</div></footer></article>; })}</div> : <div className="pd-table-scroll"><table><thead><tr><th>الحاج</th><th>الجنسية</th><th>التأشيرة</th><th>الجوال</th><th>السكن</th>{(onEdit || onDelete) && <th>الإجراءات</th>}</tr></thead><tbody>{visible.map((row) => <tr className="ons-clickable-row" tabIndex={0} aria-label={`فتح ملف ${row.fullName}`} onClick={() => void open(row)} onKeyDown={(event) => { if (event.target === event.currentTarget && ["Enter", " "].includes(event.key)) { event.preventDefault(); void open(row); } }} key={idOf(row) ?? row.visaNumber}><td data-label="الحاج"><b>{row.fullName}</b><small>#{idOf(row) ?? "—"}</small></td><td data-label="الجنسية">{row.nationality || "—"}</td><td data-label="التأشيرة" dir="ltr">{row.visaNumber || "—"}</td><td data-label="الجوال" dir="ltr">{row.phoneNumber || "—"}</td><td data-label="السكن">{row.accommodation?.name || <span className="ons-no-accommodation">غير مرتبط بسكن</span>}</td>{(onEdit || onDelete) && <td data-label="الإجراءات">{onEdit && <button className="pd-link" onClick={(event) => { event.stopPropagation(); onEdit(row); }}>تعديل</button>}{onDelete && <button className="pd-link pd-danger" onClick={(event) => { event.stopPropagation(); onDelete(row); }}>حذف</button>}</td>}</tr>)}</tbody></table></div>}{!filtered.length && <div className="pd-empty"><UsersRound size={28} /><b>{query || nationality ? "لا توجد نتائج مطابقة" : "لا توجد سجلات معروضة بعد"}</b><p>{onAdd ? "أضف حاجًا، وسيظهر في القائمة بعد الحفظ." : "لا يوجد حجاج مسجلون بعد، أو لا توجد نتائج تطابق البحث."}</p></div>}<footer className="pd-pagination"><span>{filtered.length} نتيجة · صفحة {currentPage} من {pages}</span><div><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>السابق</button><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>التالي</button></div></footer></>}
  </section>;
}
