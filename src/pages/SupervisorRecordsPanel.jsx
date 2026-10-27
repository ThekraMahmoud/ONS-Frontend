import { ListSkeleton, Toast, StatusPill } from "../components/workspace/WorkspacePrimitives.jsx";
import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Search, X, Building2, UsersRound, Phone, Mail, MapPin, Pencil, Trash2 } from "lucide-react";
import { getEmployeesBySupervisor, addEmployee, updateEmployee, deleteEmployee } from "../services/authorizedStaffService.js";
import { getPilgrims, searchCampaignPilgrims, getPilgrimById, addPilgrim, updatePilgrim, deletePilgrim } from "../services/pilgrimService.js";
import { getMyCampaignAccommodations, getAccommodationById, addAccommodation, updateAccommodation, deleteAccommodation, updateAccommodationStatus } from "../services/accommodationService.js";
import { getPilgrimCards, getPilgrimCardById, addPilgrimCard, updatePilgrimCard, deletePilgrimCard } from "../services/pilgrimCardService.js";
import { presentApiError } from "../utils/errorMessages.js";

const getId = (row) => row?.id ?? row?.Id ?? row?.pilgrimId ?? row?.accommodationId ?? row?.user?.id;
const listOf = (value) => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : value ? [value] : [];
const errorOf = (error) => presentApiError(error, "تعذر إكمال العملية.").message;
const definitions = {
  employees: { label: "المناديب", fields: [["name", "الاسم"], ["email", "البريد الإلكتروني", "email"], ["phoneNumber", "رقم الجوال", "tel"], ["password", "كلمة المرور المؤقتة", "password"]] },
  pilgrims: { label: "الحجاج", fields: [["fullName", "الاسم الكامل"], ["nationality", "الجنسية"], ["phoneNumber", "رقم الجوال", "tel"], ["visaNumber", "رقم التأشيرة"], ["accommodationId", "رقم السكن (اختياري)", "number"]] },
  accommodations: { label: "السكن", fields: [["name", "اسم السكن"], ["address", "العنوان"], ["city", "المدينة"], ["latitude", "خط العرض (اختياري)", "number"], ["longitude", "خط الطول (اختياري)", "number"]] },
  cards: { label: "بطاقات الحجاج", fields: [["id", "رقم سجل البطاقة", "number"], ["pilgrimId", "رقم سجل الحاج", "number"], ["cardNumber", "رقم البطاقة HID"], ["cardType", "نوع البطاقة"], ["imageReference", "مرجع الصورة (اختياري)"]] },
};

export default function SupervisorRecordsPanel({ onChanged, initialKind = "employees", allowedKinds = Object.keys(definitions), ownerMode = false }) {
  const [kind, setKind] = useState(initialKind);
  const [rows, setRows] = useState([]);
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const definition = definitions[kind];
  const singular = { employees: "مندوب", pilgrims: "حاج", accommodations: "سكن", cards: "بطاقة حاج" }[kind];
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const filtered = rows.filter((row) => `${row.user?.name || row.fullName || row.accommodationName || row.name || ""} ${row.user?.email || ""} ${row.user?.phoneNumber || ""} ${row.cardNumber || ""} ${row.city || ""} ${row.address || ""}`.toLocaleLowerCase("ar").includes(query.trim().toLocaleLowerCase("ar")));
  const pages = Math.max(1, Math.ceil(filtered.length / 10)); const currentPage = Math.min(page, pages);
  const load = useCallback(async () => {
    setBusy(true); setMessage(""); setFailed(false); setRows([]);
    try {
      if (kind === "pilgrims") setRows(listOf(await getPilgrims()));
      if (kind === "employees") setRows(listOf(await getEmployeesBySupervisor()));
      if (kind === "cards") setRows(listOf(await getPilgrimCards()));
      if (kind === "accommodations") {
        if (ownerMode) {
          const pilgrims = listOf(await getPilgrims()); const stays = new Map();
          for (const pilgrim of pilgrims) { const stay = pilgrim.accommodation; if (!getId(stay)) continue; if (!stays.has(getId(stay))) stays.set(getId(stay), { ...stay, pilgrims: [] }); stays.get(getId(stay)).pilgrims.push(pilgrim); }
          setRows([...stays.values()]);
        } else setRows(listOf(await getMyCampaignAccommodations()));
      }
    } catch (error) {
      if (!/there are no employees|no accommodation/i.test(error?.message || "")) { setMessage(errorOf(error)); setFailed(true); }
    } finally { setBusy(false); }
  }, [kind, ownerMode]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function action(operation, success) {
    setBusy(true); setMessage(""); setFailed(false);
    try { await operation(); setEditor(null); await load(); setMessage(success); onChanged?.(); }
    catch (error) { setMessage(errorOf(error)); setFailed(true); }
    finally { setBusy(false); }
  }
  async function search(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setMessage(""); setFailed(false);
    try {
      const id = String(form.get("recordId") || "");
      const result = kind === "cards" ? await getPilgrimCardById(id)
        : id ? await getPilgrimById(id)
          : await searchCampaignPilgrims({ fullName: String(form.get("fullName") || ""), visaNumber: String(form.get("visaNumber") || "") });
      setRows(listOf(result));
    } catch (error) { setRows([]); setMessage(errorOf(error)); setFailed(true); }
    finally { setBusy(false); }
  }
  function save(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const body = Object.fromEntries(form.entries()); const fresh = editor === "new";
    let operation;
    if (kind === "employees") {
      body.active = form.get("active") === "on";
      if (fresh) { body.staffRole = "REGULAR_EMPLOYEE"; operation = () => addEmployee(body); }
      else { delete body.password; operation = () => updateEmployee(getId(editor), body); }
    } else if (kind === "pilgrims") {
      body.accommodation = body.accommodationId ? { id: Number(body.accommodationId) } : null; delete body.accommodationId;
      operation = fresh ? () => addPilgrim(body) : () => updatePilgrim(getId(editor), body);
    } else if (kind === "accommodations") {
      body.latitude = body.latitude === "" ? null : Number(body.latitude); body.longitude = body.longitude === "" ? null : Number(body.longitude);
      operation = fresh ? () => addAccommodation(body) : async () => {
        await updateAccommodation(getId(editor), body);
        if (body.status !== editor.status) await updateAccommodationStatus(getId(editor), body.status);
      };
    } else {
      const pilgrimId = Number(body.pilgrimId); delete body.pilgrimId; if (!fresh) body.id = Number(body.id);
      operation = fresh ? () => addPilgrimCard(pilgrimId, body) : () => updatePilgrimCard(getId(editor), body);
    }
    void action(operation, fresh && ownerMode && kind === "accommodations" ? "تمت إضافة السكن. سيظهر في هذه القائمة بعد ربط حاج به." : "تم حفظ السجل بنجاح.");
  }
  async function edit(row) {
    if (kind !== "accommodations") { setEditor(row); return; }
    setBusy(true);
    try { setEditor(await getAccommodationById(getId(row))); }
    catch (error) { setMessage(errorOf(error)); setFailed(true); }
    finally { setBusy(false); }
  }
  function remove(row) {
    if (!window.confirm("حذف هذا السجل؟")) return;
    const removeByKind = { employees: deleteEmployee, pilgrims: deletePilgrim, accommodations: deleteAccommodation, cards: deletePilgrimCard };
    void action(() => removeByKind[kind](getId(row)), "تم الحذف.");
  }
  return <section className={`workspace-panel campaign-data-panel ons-records-panel is-${kind}`} dir="rtl">
    <div className="workspace-panel-heading ons-records-heading"><div><span className="pd-eyebrow">{kind === "employees" ? "رفاق العناية" : kind === "accommodations" ? "مساكن ضيوف الرحمن" : "سجلات الحملة"}</span><h3>{kind === "employees" ? "فريق المندوبين" : kind === "accommodations" ? "إقامةٌ يطمئنّون إليها" : definition.label}</h3><p>{kind === "employees" ? "فريق حملتك ووسائل التواصل، في مساحة واحدة." : kind === "accommodations" ? "نظّم مساكن الحملة، وتابع الحجاج المرتبطين بكل موقع." : "سجلات الحملة وبياناتها."}</p></div><div className="pd-actions"><button className="workspace-secondary-button" aria-label="تحديث القائمة" disabled={busy} onClick={() => void load()}><RefreshCw size={16} /></button><button className="workspace-primary-button" disabled={busy} type="button" onClick={() => { setEditor("new"); setMessage(""); }}><Plus size={17} /> إضافة {singular}</button></div></div>
    {ownerMode && kind === "accommodations" && <p className="workspace-notice is-info">المعروض هنا هو السكن المرتبط بحجاج حملتك. قائمة المساكن غير المشغولة غير متاحة لحساب مالك الحملة حاليًا.</p>}
    <nav className="workspace-modal-actions" aria-label="سجلات المشرف">{Object.entries(definitions).filter(([key]) => allowedKinds.length > 1 && allowedKinds.includes(key)).map(([key, value]) => <button key={key} type="button" disabled={busy} className={key === kind ? "workspace-primary-button" : "workspace-secondary-button"} onClick={() => { setKind(key); setEditor(null); }}>{value.label}</button>)}</nav>
    {message && failed && !editor && <p className="workspace-notice is-error" role="alert">{message}</p>}<Toast message={!failed && !editor ? message : ""} onDismiss={setMessage} />
    {(kind === "pilgrims" || kind === "cards") && <form className="workspace-form" onSubmit={search}>
      <label>رقم السجل<input name="recordId" type="number" min="1" required={kind === "cards"} /></label>
      {kind === "pilgrims" && <div className="workspace-form-row"><label>أو اسم الحاج<input name="fullName" /></label><label>أو رقم التأشيرة<input name="visaNumber" /></label></div>}
      <button className="workspace-secondary-button" disabled={busy}>بحث</button>
    </form>}
    {editor && <div className="workspace-modal-backdrop"><section className="workspace-modal" role="dialog" aria-modal="true" aria-labelledby="record-editor-title"><button className="workspace-modal-close" aria-label="إغلاق النموذج" disabled={busy} onClick={() => setEditor(null)}><X size={20} /></button><form className="workspace-form" onSubmit={save} key={`${kind}-${editor === "new" ? "new" : getId(editor)}`}>
      <h2 id="record-editor-title">{editor === "new" ? "إضافة" : "تعديل"} {singular}</h2>
      {definition.fields.filter(([name]) => (name !== "password" || editor === "new") && !(kind === "cards" && name === "id" && editor === "new")).map(([name, label, type = "text"]) => {
        const value = (name === "id" ? getId(editor) : undefined) ?? editor.user?.[name] ?? editor[name] ?? (name === "accommodationId" ? getId(editor.accommodation) : name === "pilgrimId" ? getId(editor.pilgrim) : name === "cardType" ? "NUSUK" : "") ?? "";
        return <label key={name}>{label}{name === "city" ? <select name={name} defaultValue={value || "Makkah"}><option value="Makkah">مكة المكرمة</option><option value="Madinah">المدينة المنورة</option></select> : <input name={name} type={type} defaultValue={value} pattern={name === "phoneNumber" && kind === "employees" ? "05[0-9]{8}" : undefined} step={type === "number" ? ["latitude", "longitude"].includes(name) ? "any" : "1" : undefined} min={name === "latitude" ? -90 : name === "longitude" ? -180 : type === "number" ? 1 : undefined} max={name === "latitude" ? 90 : name === "longitude" ? 180 : undefined} maxLength={name === "name" ? 100 : name === "address" ? 255 : undefined} minLength={type === "password" ? 8 : undefined} required={!label.includes("اختياري") && !(kind === "cards" && name === "pilgrimId" && editor !== "new")} readOnly={kind === "cards" && ["id", "pilgrimId"].includes(name) && editor !== "new"} autoComplete={type === "password" ? "new-password" : undefined} />}</label>;
      })}
      {kind === "employees" && <label><input type="checkbox" name="active" defaultChecked={editor === "new" || (editor.user?.active ?? editor.active)} /> حساب نشط</label>}
      {["cards", "accommodations"].includes(kind) && <label>الحالة<select name="status" defaultValue={editor.status || "ACTIVE"}><option value="ACTIVE">نشط</option><option value="INACTIVE">غير نشط</option>{kind === "cards" && <option value="EXPIRED">منتهي</option>}</select></label>}
      {message && failed && <p className="workspace-notice is-error" role="alert">{message}</p>}
      <div className="workspace-modal-actions"><button className="workspace-primary-button" disabled={busy}>حفظ</button><button type="button" className="workspace-secondary-button" disabled={busy} onClick={() => setEditor(null)}>إلغاء</button></div>
    </form></section></div>}
    {busy && !editor && <ListSkeleton rows={3} />}
    <div className="pd-toolbar"><label className="pd-search"><Search size={17} /><input aria-label={`بحث في ${definition.label}`} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={`بحث في ${definition.label} المعروضة…`} /></label><span className="pd-eyebrow">{filtered.length} سجل</span></div>
    {["employees", "accommodations"].includes(kind) ? <div className="ons-record-grid">{filtered.slice((currentPage - 1) * 10, currentPage * 10).map((row) => {
      const employee = kind === "employees"; const person = row.user || row; const title = employee ? person.name : row.accommodationName || row.name;
      const Icon = employee ? UsersRound : Building2;
      return <article className="ons-record-card" key={getId(row)}><header><span className="ons-record-emblem"><Icon size={25} strokeWidth={1.5} /></span><div><small>{employee ? "مندوب الحملة" : row.city === "Makkah" ? "مكة المكرمة" : row.city === "Madinah" ? "المدينة المنورة" : row.city || "سكن الحملة"}</small><h4>{title || "—"}</h4></div>{employee && <StatusPill status={person.active ? "ACTIVE" : "INACTIVE"} />}</header><div className="ons-record-details">{employee ? <><span><Phone size={16} /><b dir="ltr">{person.phoneNumber || "—"}</b></span><span><Mail size={16} /><b dir="ltr">{person.email || "—"}</b></span></> : <><span><MapPin size={16} /><b>{row.address || "العنوان غير متوفر"}</b></span><span><UsersRound size={16} /><b>{Array.isArray(row.pilgrims) ? `${row.pilgrims.length} حاج مرتبط بالسكن` : "عدد الحجاج غير متوفر"}</b></span></>}</div><footer><span>السجل <b dir="ltr">#{getId(row)}</b></span><div><button className="workspace-text-action" disabled={busy} onClick={() => void edit(row)}><Pencil size={14} /> تعديل</button>{!employee && <button className="workspace-text-action" disabled={busy} onClick={() => { void action(async () => { const current = await getAccommodationById(getId(row)); await updateAccommodationStatus(getId(row), current.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"); }, "تم تغيير حالة السكن."); }}>تغيير الحالة</button>}<button className="workspace-text-action pd-danger" disabled={busy} onClick={() => remove(row)} aria-label={`حذف ${title}`}><Trash2 size={15} /></button></div></footer></article>;
    })}</div> : <><div className="workspace-table-scroll"><table className="workspace-table"><thead><tr><th>رقم السجل</th><th>{kind === "cards" ? "رقم البطاقة" : "الاسم"}</th>{kind === "employees" && <><th>البريد الإلكتروني</th><th>الجوال</th><th>الحالة</th></>}{kind === "accommodations" && <><th>المدينة</th><th>العنوان</th><th>الحجاج</th></>}{kind === "cards" && <><th>الحاج المرتبطة به</th><th>نوع البطاقة</th><th>الحالة</th></>}<th>الإجراءات</th></tr></thead><tbody>{filtered.slice((currentPage - 1) * 10, currentPage * 10).map((row) => <tr key={getId(row)}><td data-label="رقم السجل">#{getId(row)}</td><td data-label={kind === "cards" ? "رقم البطاقة" : "الاسم"}><b>{row.user?.name ?? row.fullName ?? row.accommodationName ?? row.name ?? row.cardNumber}</b></td>{kind === "employees" && <><td data-label="البريد الإلكتروني" dir="ltr">{row.user?.email || row.email || "—"}</td><td data-label="الجوال" dir="ltr">{row.user?.phoneNumber || row.phoneNumber || "—"}</td><td data-label="الحالة"><StatusPill status={(row.user?.active ?? row.active) ? "ACTIVE" : "INACTIVE"} /></td></>}{kind === "accommodations" && <><td data-label="المدينة">{row.city === "Makkah" ? "مكة المكرمة" : row.city === "Madinah" ? "المدينة المنورة" : row.city || "—"}</td><td data-label="العنوان">{row.address || "—"}</td><td data-label="الحجاج">{row.pilgrims?.length ?? "—"}</td></>}{kind === "cards" && <><td data-label="الحاج المرتبطة به">{row.pilgrim?.fullName || `#${getId(row.pilgrim) ?? "—"}`}</td><td data-label="نوع البطاقة">{row.cardType}</td><td data-label="الحالة"><StatusPill status={row.status} /></td></>}<td data-label="الإجراءات"><button className="workspace-text-action" type="button" disabled={busy} onClick={() => void edit(row)}>تعديل</button><button className="workspace-text-action pd-danger" type="button" disabled={busy} onClick={() => remove(row)}>حذف</button>{kind === "accommodations" && <button className="workspace-text-action" disabled={busy} onClick={() => { void action(async () => { const current = await getAccommodationById(getId(row)); await updateAccommodationStatus(getId(row), current.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"); }, "تم تغيير حالة السكن."); }}>تغيير الحالة</button>}</td></tr>)}</tbody></table></div></>}
    {!filtered.length && !busy && <div className="pd-empty"><b>{query ? "لا توجد نتائج مطابقة" : "لا توجد سجلات معروضة"}</b><p>{kind === "cards" ? "ابحث برقم سجل البطاقة، أو أضف بطاقة مرتبطة بحاج." : `${ownerMode && kind === "accommodations" ? "تظهر هنا المساكن بعد ربط حجاج الحملة بها." : `أضف ${singular} ليظهر هنا، أو حدّث القائمة.`}`}</p></div>}
    <footer className="pd-pagination"><span>صفحة {currentPage} من {pages}</span><div><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>السابق</button><button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>التالي</button></div></footer>
  </section>;
}
