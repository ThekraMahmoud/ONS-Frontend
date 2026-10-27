import { useEffect, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, CreditCard, Flower2, UserRound, ClipboardList } from "lucide-react";
import { DetailsDrawer } from "./WorkspacePrimitives.jsx";

function CardQr({ value }) {
  const [matrix, setMatrix] = useState(null);
  useEffect(() => {
    let live = true;
    if (!value) return;
    import("@zxing/library").then(({ QRCodeWriter, BarcodeFormat }) => {
      const bits = new QRCodeWriter().encode(String(value), BarcodeFormat.QR_CODE, 0, 0, new Map());
      let path = "";
      for (let y = 0; y < bits.getHeight(); y++) for (let x = 0; x < bits.getWidth(); x++) if (bits.get(x, y)) path += `M${x},${y}h1v1h-1z`;
      if (live) setMatrix({ size: bits.getWidth(), path });
    }).catch(() => { if (live) setMatrix({ failed: true }); });
    return () => { live = false; };
  }, [value]);
  if (!matrix) return <span className="pilgrim-book-qr-loading" role="status">جارٍ تجهيز الرمز…</span>;
  if (matrix.failed) return <p className="ons-muted">تعذر عرض الرمز؛ رقم البطاقة ظاهر أدناه.</p>;
  return <figure className="pilgrim-book-qr"><svg viewBox={`0 0 ${matrix.size} ${matrix.size}`} role="img" aria-label={`رمز QR لرقم البطاقة ${value}`} shapeRendering="crispEdges"><rect width={matrix.size} height={matrix.size} fill="#fff" /><path d={matrix.path} fill="#123f34" /></svg><figcaption>رمز QR لرقم البطاقة المسجّل</figcaption><b dir="ltr">{value}</b></figure>;
}

export default function PilgrimBooklet({ pilgrim, card, details, cardContent, reportsContent, onClose, busy = false }) {
  const [page, setPage] = useState("details");
  const pages = [{ key: "details", label: "بيانات الحاج", Icon: UserRound }, { key: "card", label: "البطاقة والرمز", Icon: CreditCard }, { key: "reports", label: "البلاغات", Icon: ClipboardList }];
  const index = pages.findIndex((item) => item.key === page);
  return <DetailsDrawer className="ons-pilgrim-booklet" title="كتيّب الحاج" titleId="pilgrim-book-title" onClose={onClose} closeDisabled={busy}>
    <div className="pilgrim-book-spread"><aside className="pilgrim-book-cover"><div className="pilgrim-book-emblem"><Flower2 size={32} strokeWidth={1} /><span>أُنس</span><small>في ضيافة الرحمن</small></div><div className="pilgrim-book-arch"><UserRound size={54} strokeWidth={1} /></div><span className="pilgrim-book-label">سجل الحاج</span><h3>{pilgrim.fullName}</h3><span className="pilgrim-book-nationality">{pilgrim.nationality || "الجنسية غير مسجلة"}</span><div className="pilgrim-book-cover-footer"><BookOpen size={20} /><span>رحلةٌ يرافقها الاهتمام</span><b dir="ltr">#{pilgrim.id ?? pilgrim.Id ?? pilgrim.pilgrimId}</b></div></aside>
      <section className="pilgrim-book-pages"><nav aria-label="صفحات كتيّب الحاج">{pages.map(({ key, label, Icon }) => <button key={key} className={page === key ? "is-active" : ""} type="button" aria-pressed={page === key} onClick={() => setPage(key)} disabled={busy}><Icon size={17} />{label}</button>)}</nav><div className="pilgrim-book-page" key={page}><span className="pilgrim-book-page-kicker">أُنس / {pages[index].label}</span>{page === "details" ? <><h3>بيانات تُسهّل العناية</h3><p className="pilgrim-book-subtitle">البيانات الأساسية المسجّلة للحاج في الحملة.</p>{details}<button type="button" className="pilgrim-book-next" onClick={() => setPage("card")}>البطاقة ورمز التعريف <ChevronLeft size={18} /></button></> : page === "card" ? <>{cardContent}{card?.cardNumber && <CardQr key={card.cardNumber} value={card.cardNumber} />}</> : reportsContent}</div><footer className="pilgrim-book-pagination"><button type="button" disabled={index === 0 || busy} onClick={() => setPage(pages[index - 1].key)}><ChevronRight size={18} />السابق</button><span>صفحة {new Intl.NumberFormat("ar-SA").format(index + 1)} من ٣</span><button type="button" disabled={index === 2 || busy} onClick={() => setPage(pages[index + 1].key)}>التالي<ChevronLeft size={18} /></button></footer></section>
    </div>
  </DetailsDrawer>;
}
