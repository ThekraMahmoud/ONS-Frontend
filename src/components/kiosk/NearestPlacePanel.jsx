import {presentApiError} from "../../utils/errorMessages.js";
import { useEffect, useState } from "react";
import { MapPin, RefreshCw, ArrowRight, Navigation, Toilet, DoorOpen } from "lucide-react";
import { getNearestPlace } from "../../services/mapService.js";

export default function NearestPlacePanel({ kiosk, type, onBack, language = "ar" }) {
  const ar = language === "ar";
  const [state, setState] = useState({ loading: true, result: null, error: "" });
  const [retry, setRetry] = useState(0);
  const kioskId = kiosk?.id ?? kiosk?.Id ?? kiosk?.kioskId;
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setState({ loading: true, result: null, error: "" });
      try {
        if (!Number.isInteger(Number(kioskId)) || Number(kioskId) < 1) throw new Error(ar ? "اختاري جهاز الخدمة أولًا." : "Select a service kiosk first.");
        const result = await getNearestPlace(kioskId, type === "restroom" ? "BATHROOM" : "GATE");
        if (!result?.name || !Number.isFinite(Number(result.latitude)) || !Number.isFinite(Number(result.longitude)) || result.latitude == null || result.longitude == null) throw new Error(ar ? "تعذر تحديد موقع الوجهة." : "The destination location is unavailable.");
        if (active) setState({ loading: false, result, error: "" });
      } catch (error) {
        const text = /No matching|No reachable/i.test(error.message || "") ? (ar ? "لم يُعثر على مكان قريب يمكن الوصول إليه. جرّبي مرة أخرى أو استعيني بأحد الموظفين." : "No reachable place was found. Retry or ask a staff member.") : /inactive/i.test(error.message || "") ? (ar ? "جهاز الخدمة غير نشط حاليًا." : "This kiosk is currently inactive.") : /429|RESOURCE_EXHAUSTED|quota/i.test(error.message || "") ? (ar ? "خدمة الاتجاهات مشغولة الآن. انتظر قليلًا ثم حاول مجددًا." : "Directions are busy right now. Wait a moment and try again.") : presentApiError(error, ar ? "تعذر تحديد الاتجاه الآن. حاول مجددًا أو اطلب مساعدة الموظفين." : "Directions are unavailable. Try again or ask a staff member.").message;
        if (active) setState({ loading: false, result: null, error: text });
      }
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [kioskId, type, retry, ar]);
  const result = state.result;
  const distance = Number(result?.route?.distanceMeters);
  const seconds = Number(String(result?.route?.duration || "").replace(/s$/, ""));
  const mapsUrl = result ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${result.latitude},${result.longitude}`)}&travelmode=walking${kiosk?.latitude != null && kiosk?.longitude != null ? `&origin=${encodeURIComponent(`${kiosk.latitude},${kiosk.longitude}`)}` : ""}` : "";
  const title = type === "restroom" ? (ar ? "أقرب دورة مياه" : "Nearest restroom") : (ar ? "أقرب بوابة" : "Nearest gate");
  return <section className="kiosk-flow-screen"><div className="kiosk-flow-card kiosk-result-card" dir={ar ? "rtl" : "ltr"}>
    <span className="kiosk-result-icon is-place">{type === "restroom" ? <Toilet size={34} /> : <DoorOpen size={34} />}</span><h1>{title}</h1>
    {state.loading ? <p role="status"><RefreshCw className="kiosk-spin" size={22} /> {ar ? "جارٍ البحث عن أقرب مكان ومسار المشي…" : "Finding the nearest place and walking route…"}</p> : state.error ? <p className="kiosk-report-error" role="alert">{state.error}</p> : <>
      <h2>{result.name}</h2><p><MapPin size={18} /> {ar ? "الانطلاق من" : "Starting at"} {kiosk?.locationName || kiosk?.kioskCode}</p>
      <div className="pd-summary">{Number.isFinite(distance) && distance > 0 && <span>{distance >= 1000 ? `${(distance / 1000).toFixed(1)} ${ar ? "كم" : "km"}` : `${Math.round(distance)} ${ar ? "متر" : "m"}`}</span>}{seconds > 0 && <span>{Math.max(1, Math.ceil(seconds / 60))} {ar ? "دقيقة مشيًا تقريبًا" : "min walk (approx.)"}</span>}</div>
      <a className="kiosk-retry-button" href={mapsUrl} target="_blank" rel="noopener noreferrer"><Navigation size={19} /> {ar ? "عرض مسار المشي على الخريطة" : "Open walking directions"}</a>
    </>}
    {!state.loading && <button type="button" className="kiosk-retry-button" onClick={() => setRetry((value) => value + 1)}><RefreshCw size={18} /> {ar ? "إعادة البحث" : "Search again"}</button>}
    <button type="button" className="kiosk-scanner-cancel" onClick={onBack}><ArrowRight size={18} /> {ar ? "العودة للخدمات" : "Back to services"}</button>
  </div></section>;
}
