import QrImageInput from "../components/kiosk/QrImageInput.jsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle, QrCode, RefreshCw, UserRound, X } from "lucide-react";
import QrCameraScanner from "../components/kiosk/QrCameraScanner.jsx";
import { getPilgrims, identifyPilgrimByCardNumber, scanPilgrimCardImage } from "../services/pilgrimService.js";
import { readPilgrimQr } from "../utils/pilgrimQr.js";
import { presentApiError } from "../utils/errorMessages.js";
import "../styles/PilgrimAddMethod.css";

const cameraCopy = {
  cameraPreview: "معاينة رمز بطاقة الحاج", cameraRequesting: "جارٍ تشغيل الكاميرا…", cameraLive: "الكاميرا تعمل",
  qrInstructions: "أظهر البطاقة كاملة بوضوح، خصوصًا QR ورقم الحاج HID؛ بعض بطاقات نُسك تحتاج قراءة الرقم من الصورة.",
  cameraRetry: "إعادة المحاولة", cameraCancel: "العودة للاختيار", manual: "إدخال يدوي",
  cameraPermissionDenied: "اسمح باستخدام الكاميرا من المتصفح، أو استخدم الإدخال اليدوي.",
  cameraUnavailable: "لا توجد كاميرا متاحة. يمكنك إضافة الحاج يدويًا.", cameraBusy: "الكاميرا مستخدمة في تطبيق آخر. أغلقه وأعد المحاولة.",
  cameraSecureContext: "الكاميرا لا تعمل عبر عنوان HTTP على الشبكة. على هذا الماك افتح localhost:5173، أو اقرأ QR من صورة أدناه.", cameraUnsupported: "هذا المتصفح لا يدعم الكاميرا.",
  cameraError: "تعذر تشغيل الكاميرا. أعد المحاولة أو استخدم الإدخال اليدوي.", qrDecoderUnsupported: "تعذر قراءة الرمز في هذا المتصفح.",
};
const idOf = (row) => row?.id ?? row?.Id ?? row?.pilgrimId;
export default function PilgrimAddMethodDialog({ onClose, onManual, onDraft, onExisting }) {
  const [phase, setPhase] = useState("choice");
  const [retryToken, setRetryToken] = useState(0);
  const [error, setError] = useState("");
  const [existing, setExisting] = useState(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const decoded = useCallback(async (value, imageFile) => {
    setPhase("loading"); setError("");
    let cardNumber = ""; let qrData = null; let readStage = "qr";
    try {
      const parsed = readPilgrimQr(value); qrData = parsed; cardNumber = parsed.cardNumber;
      readStage = "campaign";
      const own = await getPilgrims();
      if (!alive.current) return;
      if (!Array.isArray(own)) throw new Error("تعذر التحقق من سجلات الحملة الآن.");
      if (parsed.hasDetails) {
        const match = parsed.draft.visaNumber && own.find((row) => row.visaNumber === parsed.draft.visaNumber);
        if (match) { setExisting(match); setPhase("existing"); return; }
        if (cardNumber) {
          readStage = "identify";
          const response = await identifyPilgrimByCardNumber(cardNumber);
          if (!alive.current) return;
          const record = response?.data ?? response?.result ?? response;
          const linked = own.find((row) => (idOf(record) != null && String(idOf(row)) === String(idOf(record))) || (record.visaNumber && row.visaNumber === record.visaNumber));
          if (!linked) throw new Error("البطاقة مرتبطة بسجل خارج حجاج الحملة. لا يمكن إنشاء نسخة مكررة منه.");
          setExisting(linked); setPhase("existing"); return;
        }
        onDraft({ ...parsed.draft, qrImported: true, qrCard: parsed.card, qrMissingFields: parsed.missingFields });
        return;
      }
      cardNumber = parsed.cardNumber;
      if (!cardNumber && imageFile) {
        readStage = "ocr";
        const scan = await scanPilgrimCardImage(imageFile);
        if (!alive.current) return;
        cardNumber = String(scan?.cardNumber ?? scan?.CardNumber ?? "").trim();
      }
      if (!cardNumber) throw new Error("الرمز لا يحتوي على بيانات يمكن قراءتها. يمكنك إضافة الحاج يدويًا.");
      readStage = "identify";
      const response = await identifyPilgrimByCardNumber(cardNumber);
      if (!alive.current) return;
      const record = response?.data ?? response?.result ?? response;
      const match = own.find((row) => (idOf(record) != null && String(idOf(row)) === String(idOf(record))) || (record.visaNumber && record.visaNumber === row.visaNumber));
      if (!match) throw new Error("البطاقة مرتبطة بسجل موجود خارج قائمة حجاج هذه الحملة. لا يمكن إنشاء نسخة مكررة منه.");
      setExisting(match); setPhase("existing");
    } catch (failure) {
      if (!alive.current) return;
      if (cardNumber && /card not found|pilgrim not found/i.test(failure.message || "")) {
        onDraft({ ...(qrData?.draft || {}), qrImported: true, qrCard: qrData?.card || { cardNumber, cardType: "NUSUK", status: "ACTIVE", imageReference: "" }, qrMissingFields: qrData?.missingFields || ["fullName", "nationality", "phoneNumber", "visaNumber"] });
        return;
      }
      if (readStage === "ocr") {
        setError(failure.status === 422
          ? "الرمز رابط نُسك، ولم يظهر رقم HID بوضوح في الصورة. أظهر البطاقة كاملة أمام الكاميرا أو اختر صورة كاملة لها."
          : "خدمة قراءة صورة البطاقة غير متاحة الآن. تأكد من تشغيل خدمة ONS AI على المنفذ 8000 ثم أعد المحاولة.");
        setPhase("error"); return;
      }
      setError(/card not found|pilgrim not found/i.test(failure.message || "")
        ? "الرمز يحتوي على رقم بطاقة فقط، ولا توجد بيانات مسجلة لهذه البطاقة. أضف بيانات الحاج يدويًا."
        : presentApiError(failure, "تعذر قراءة بيانات الحاج. أعد المحاولة أو استخدم الإدخال اليدوي.").message);
      setPhase("error");
    }
  }, [onDraft]);
  const reset = () => { setError(""); setExisting(null); setPhase("choice"); };
  return <div className="workspace-modal-backdrop pilgrim-add-backdrop"><section className="workspace-modal pilgrim-add-dialog" role="dialog" aria-modal="true" aria-labelledby="pilgrim-add-method-title"><button className="workspace-modal-close" type="button" aria-label="إغلاق" onClick={onClose}><X size={20} /></button><span className="pd-eyebrow">حجاج الحملة</span><h2 id="pilgrim-add-method-title">{phase === "choice" ? "كيف تريد إضافة الحاج؟" : "إضافة الحاج عبر QR"}</h2>
    {phase === "choice" ? <><p className="pilgrim-add-intro">اختر طريقة الإدخال، ثم راجع البيانات وأكمل الحفظ.</p><div className="pilgrim-add-methods"><button onClick={() => setPhase("scan")}><span><QrCode size={29} /></span><b>مسح QR</b><small>امسح بالكاميرا أو اقرأ صورة الرمز لتعبئة البيانات المتوفرة.</small><ArrowRight size={18} /></button><button onClick={onManual}><span><UserRound size={29} /></span><b>إدخال يدوي</b><small>أدخل بيانات الحاج وأضفه مباشرة إلى حملتك.</small><ArrowRight size={18} /></button></div><QrImageInput onDecoded={decoded}/></> : phase === "scan" ? <><QrCameraScanner copy={cameraCopy} retryToken={retryToken} onDecoded={decoded} onCancel={reset} onManualEntry={onManual} onRetry={() => setRetryToken((token) => token + 1)} /><QrImageInput onDecoded={decoded}/></> : phase === "loading" ? <div className="pilgrim-qr-loading" role="status"><LoaderCircle size={28} className="workspace-spin" /><b>جارٍ قراءة البيانات والتحقق من السجل…</b></div> : phase === "existing" ? <div className="pilgrim-qr-existing"><CheckCircle2 size={32} /><h3>الحاج مسجّل في حملتك بالفعل</h3><b>{existing.fullName}</b><p>يمكنك فتح سجله ومراجعة بياناته.</p><button className="workspace-primary-button" onClick={() => onExisting(existing)}>فتح سجل الحاج</button><button className="pd-link" onClick={reset}>قراءة رمز آخر</button></div> : <><p className="pd-error" role="alert">{error}</p><QrImageInput onDecoded={decoded}/><div className="pd-actions"><button className="workspace-primary-button" onClick={() => { setRetryToken((token) => token + 1); setPhase("scan"); }}><RefreshCw size={16} /> مسح الرمز مجددًا</button><button className="workspace-secondary-button" onClick={onManual}>إدخال البيانات يدويًا</button></div></>}
  </section></div>;
}
