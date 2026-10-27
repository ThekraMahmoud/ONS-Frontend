import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, CalendarDays, Check, CheckCircle2, CreditCard, ExternalLink, LoaderCircle, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { createCampaignPayment, verifyCampaignPayment } from "../services/campaignService.js";
import { presentApiError } from "../utils/errorMessages.js";
import "../styles/FlowPages.css";

const logo = "/ons-logo.png";
const CHECKOUT_STORAGE_KEY = "ons-campaign-checkout";
const PAYMENT_CALLBACK_KEY = "ons-moyasar-payment-id";
const publishableKey = import.meta.env.VITE_MOYASAR_PUBLISHABLE_KEY;
const moyasarScriptUrl = "https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.14/dist/moyasar.umd.min.js";
const moyasarStyleUrl = "https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.14/dist/moyasar.css";
const statusCopy = {
  PENDING: "بانتظار إتمام الدفع",
  PAID: "تم تأكيد الدفع وتفعيل الحملة",
  FAILED: "تعذرت عملية الدفع",
  EXPIRED: "انتهت صلاحية رابط الدفع",
  CANCELED: "أُلغيت عملية الدفع",
};

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [checkout] = useState(() => readCheckout(location.state));
  const campaign = checkout?.campaign;
  const registration = checkout?.registration;
  const [payment, setPayment] = useState(() => checkout?.payment || paymentFromRegistration(registration));
  const [processing, setProcessing] = useState(false);
  const [loadingPaymentDetails, setLoadingPaymentDetails] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const moyasarFormRef = useRef(null);
  const detailsRequestedRef = useRef(false);
  const callbackAttemptedRef = useRef("");
  const callbackPaymentId = new URLSearchParams(location.search).get("id") || getStoredCallbackId();

  // Store only the campaign summary/payment identifiers needed after Moyasar's 3-D Secure redirect.
  useEffect(() => {
    if (!campaign || !registration?.campaignId) return;
    try {
      sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify({
        campaign: {
          campaignName: campaign.campaignName,
          email: campaign.email,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
        },
        registration,
        payment,
      }));
    } catch { /* The backend hosted payment URL remains available if storage is blocked. */ }
  }, [campaign, payment, registration]);

  // The register response contains the hosted URL and database payment ID. Ask the existing
  // payment endpoint for its saved invoice ID/amount so Moyasar.js can pay that same invoice.
  useEffect(() => {
    if (!registration?.campaignId || !payment?.paymentUrl || payment?.invoiceId || detailsRequestedRef.current) return;
    detailsRequestedRef.current = true;
    let active = true;
    setLoadingPaymentDetails(true);
    createCampaignPayment(registration.campaignId)
      .then((savedPayment) => {
        if (!active) return;
        setPayment((current) => paymentFromApiResponse(savedPayment, current));
      })
      .catch((error) => {
        if (active) setPaymentError(paymentErrorText(error));
      })
      .finally(() => { if (active) setLoadingPaymentDetails(false); });
    return () => { active = false; };
  }, [payment?.invoiceId, payment?.paymentUrl, registration?.campaignId]);

  const amount = Number(payment?.amount);
  const invoiceId = payment?.invoiceId;
  const canPayWithMoyasar = Boolean(
    publishableKey && invoiceId && Number.isInteger(amount) && amount >= 100 && String(payment?.currency || "SAR").toUpperCase() === "SAR",
  );

  useEffect(() => {
    const element = moyasarFormRef.current;
    if (!element || !canPayWithMoyasar || !payment?.id || !registration?.campaignId || payment?.status === "PAID") return undefined;
    let active = true;
    ensureMoyasarSdk()
      .then(() => {
        if (!active || !window.Moyasar) return;
        element.replaceChildren();
        window.Moyasar.init({
          element,
          amount,
          currency: String(payment.currency || "SAR").toUpperCase(),
          description: `تسجيل حملة ${campaign?.campaignName || registration.campaignId}`,
          publishable_api_key: publishableKey,
          invoice_id: invoiceId,
          callback_url: `${window.location.origin}/payment`,
          supported_networks: ["mada", "visa", "mastercard", "unionpay"],
          methods: ["creditcard"],
          language: "ar",
          on_completed: (result) => {
            if (!result?.id) return;
            try { sessionStorage.setItem(PAYMENT_CALLBACK_KEY, result.id); }
            catch { /* The return query still triggers server-side verification. */ }
          },
          on_failure: (error) => {
            if (active) setPaymentError(error?.message || String(error) || "تعذر إكمال الدفع عبر ميسر.");
          },
        });
      })
      .catch(() => {
        if (active) setPaymentError("تعذر تحميل نموذج ميسر. يمكنك استخدام رابط الدفع الآمن.");
      });
    return () => { active = false; };
  }, [amount, canPayWithMoyasar, campaign?.campaignName, invoiceId, payment?.currency, payment?.id, payment?.status, registration?.campaignId]);

  useEffect(() => {
    if (!callbackPaymentId || !registration?.campaignId || !payment?.id) return;
    const attemptKey = `${registration.campaignId}:${callbackPaymentId}`;
    if (callbackAttemptedRef.current === attemptKey) return;
    callbackAttemptedRef.current = attemptKey;
    let active = true;
    setProcessing(true);
    verifyCampaignPayment(registration.campaignId, payment.id)
      .then((verified) => {
        if (!active) return;
        setPayment((current) => paymentFromApiResponse(verified, current));
        const status = String(verified?.status || "").toUpperCase();
        if (status === "PAID") {
          navigateToCampaignPage(navigate, campaign, registration, payment, verified);
          return;
        }
        setPaymentNotice(statusCopy[status] || "عاد ميسر من صفحة الدفع، ولم يؤكد الخادم الدفع بعد.");
        try { sessionStorage.removeItem(PAYMENT_CALLBACK_KEY); } catch { /* Ignore unavailable browser storage. */ }
        window.history.replaceState(window.history.state, "", "/payment");
      })
      .catch((error) => { if (active) setPaymentError(paymentErrorText(error)); })
      .finally(() => { if (active) setProcessing(false); });
    return () => { active = false; };
  }, [callbackPaymentId, campaign, navigate, payment, registration]);

  async function retryPayment() {
    if (!registration?.campaignId || processing) return;
    setProcessing(true);
    setPaymentError("");
    setPaymentNotice("");
    try {
      const created = await createCampaignPayment(registration.campaignId);
      setPayment((current) => paymentFromApiResponse(created, current));
      setPaymentNotice("تم تجهيز الفاتورة من الباك إند.");
    } catch (error) {
      setPaymentError(paymentErrorText(error));
    } finally {
      setProcessing(false);
    }
  }

  async function verifyPayment() {
    if (!registration?.campaignId || !payment?.id || processing) return;
    setProcessing(true);
    setPaymentError("");
    setPaymentNotice("");
    try {
      const verified = await verifyCampaignPayment(registration.campaignId, payment.id);
      setPayment((current) => paymentFromApiResponse(verified, current));
      const status = String(verified?.status || "").toUpperCase();
      if (status === "PAID") {
        navigateToCampaignPage(navigate, campaign, registration, payment, verified);
        return;
      }
      setPaymentNotice(statusCopy[status] || "لم يؤكد مزود الدفع إتمام العملية بعد. يمكنك إعادة التحقق لاحقًا.");
    } catch (error) {
      setPaymentError(paymentErrorText(error));
    } finally {
      setProcessing(false);
    }
  }

  if (!campaign || !registration?.campaignId) return <main className="flow-page" dir="rtl"><section className="flow-card"><h1>بيانات تسجيل الحملة غير موجودة</h1><p className="flow-muted">ابدأ التسجيل من جديد حتى نستخدم معرّف الحملة وجلسة التسجيل التي أنشأها الباك إند.</p><Link className="flow-button" to="/register">العودة إلى تسجيل الحملة</Link></section></main>;

  const status = String(payment?.status || "PENDING").toUpperCase();
  const formattedAmount = payment?.amount == null ? null : new Intl.NumberFormat("ar-SA", { style: "currency", currency: payment.currency || "SAR" }).format(Number(payment.amount) / 100);

  return <main className="flow-page payment-page" dir="rtl">
    <header className="flow-header"><Link to="/" aria-label="أُنس"><img src={logo} alt="أُنس" /></Link><div className="secure-label"><LockKeyhole size={16}/> دفع آمن عبر ميسر</div></header>
    <div className="flow-progress" role="list" aria-label="مراحل تسجيل الحملة"><span className="done" role="listitem"><Check/><span>تسجيل الحملة</span></span><i className="step-done" aria-hidden="true"/><span className="current" role="listitem" aria-current="step"><CreditCard/><span>الدفع والتحقق</span></span><i aria-hidden="true"/><span className={status === "PAID" ? "done" : "upcoming"} role="listitem">{status === "PAID" ? <CheckCircle2/> : <ShieldCheck/>}<span>تفعيل الحملة</span></span></div>
    <div className="checkout-layout">
      <section className="flow-card checkout-form">
        <div className="flow-kicker">الخطوة الثانية من التسجيل</div><h1>أكمل دفع رسوم الحملة</h1><p className="flow-muted">أكملي الدفع عبر نموذج ميسر أو افتحي رابط الفاتورة الذي أنشأه الباك إند. لن نعرض النجاح حتى يؤكد الخادم الدفع.</p>
        <div className={`payment-status-card status-${status.toLowerCase()}`} role="status"><span>{status === "PAID" ? <CheckCircle2/> : status === "FAILED" || status === "EXPIRED" || status === "CANCELED" ? <AlertCircle/> : <CreditCard/>}</span><div><b>{statusCopy[status] || "حالة الدفع"}</b><small>{formattedAmount ? `قيمة الفاتورة: ${formattedAmount}` : "قيمة الفاتورة تظهر في صفحة ميسر."}</small></div></div>
        {loadingPaymentDetails && <p className="payment-disclaimer" role="status">جارٍ تحميل تفاصيل الفاتورة من الباك إند…</p>}
        {paymentError && <p className="payment-error" role="alert">{paymentError}</p>}
        {paymentNotice && <p className="payment-disclaimer" role="status">{paymentNotice}</p>}
        {canPayWithMoyasar && status !== "PAID" && <div className="moyasar-payment"><div className="moyasar-payment-heading">الدفع بالبطاقة عبر ميسر</div><div className="mysr-form" ref={moyasarFormRef}/></div>}
        <div className="payment-actions">
          {payment?.paymentUrl && status !== "PAID" && <a className="flow-button" href={payment.paymentUrl} target="_blank" rel="noreferrer">فتح صفحة الفاتورة الآمنة<ExternalLink size={17}/></a>}
          {payment?.id && status !== "PAID" && <button className="flow-button payment-verify-button" type="button" onClick={verifyPayment} disabled={processing} aria-busy={processing}>{processing ? <><LoaderCircle className="payment-spinner" size={18}/> جارٍ التحقق…</> : <>التحقق من الدفع<RefreshCw size={17}/></>}</button>}
          {!payment?.paymentUrl && status !== "PAID" && <button className="flow-button" type="button" onClick={retryPayment} disabled={processing} aria-busy={processing}>{processing ? <><LoaderCircle className="payment-spinner" size={18}/> جارٍ تجهيز الفاتورة…</> : <>إعادة تجهيز الفاتورة<RefreshCw size={17}/></>}</button>}
        </div>
        {status === "PAID" && <div className="payment-disclaimer"><ShieldCheck size={17}/> تم تأكيد الدفع وتفعيل الحملة من الخادم.</div>}
      </section>
      <aside className="flow-card order-card"><div className="order-top"><span>ملخص التسجيل</span><span className="order-badge">#{registration.campaignId}</span></div><h2>{campaign.campaignName}</h2><p>{campaign.email}</p><div className="order-divider"/><div className="order-line"><span>رقم عملية الدفع</span><b dir="ltr">{payment?.id || registration.paymentId || "—"}</b></div><div className="order-line"><span>حالة الدفع</span><b className={`pending-state status-text-${status.toLowerCase()}`}>{statusCopy[status] || status}</b></div><div className="campaign-period"><div className="period-heading"><CalendarDays size={16}/><b>مدة الحملة</b></div><div className="period-track" aria-hidden="true"><span/></div><div className="period-dates"><div><small>تاريخ البداية</small><b>{formatDate(campaign.startDate)}</b></div><div><small>تاريخ النهاية</small><b>{formatDate(campaign.endDate)}</b></div></div></div><div className="order-divider"/><div className="order-line total"><span>قيمة الفاتورة</span><b>{formattedAmount || "حسب صفحة ميسر"}</b></div><div className="order-foot"><ShieldCheck size={18}/> لا نعرض نجاحًا إلا بعد تأكيد الباك إند</div></aside>
    </div>
  </main>;
}

function navigateToCampaignPage(navigate, campaign, registration, payment, verifiedPayment) {
  const activation = {
    paymentConfirmed: true,
    campaignId: registration.campaignId,
    paymentId: payment.id,
    campaignName: campaign.campaignName,
    email: campaign.email,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    paymentStatus: String(verifiedPayment?.status || "").toUpperCase(),
  };
  try { sessionStorage.setItem("ons-paid-campaign", JSON.stringify(activation)); }
  catch { /* Route state still carries the confirmation for this navigation. */ }
  navigate("/campaign-dashboard", { replace: true, state: activation });
}

function paymentFromRegistration(registration) {
  if (!registration) return null;
  return {
    id: registration.paymentId || registration.id,
    paymentUrl: registration.paymentUrl,
    status: registration.paymentStatus || "PENDING",
    amount: registration.amount,
    currency: registration.currency || "SAR",
  };
}

function paymentFromApiResponse(response, previous = {}) {
  return {
    id: response?.id ?? response?.paymentId ?? previous?.id,
    invoiceId: response?.invoiceId ?? previous?.invoiceId,
    paymentUrl: response?.paymentUrl ?? previous?.paymentUrl,
    status: response?.status ?? response?.paymentStatus ?? previous?.status ?? "PENDING",
    amount: response?.amount ?? previous?.amount,
    currency: response?.currency ?? previous?.currency ?? "SAR",
  };
}

function readCheckout(routeState) {
  if (routeState?.campaign && routeState?.registration) return routeState;
  try {
    const stored = JSON.parse(sessionStorage.getItem(CHECKOUT_STORAGE_KEY) || "null");
    return stored?.campaign && stored?.registration ? stored : null;
  } catch { return null; }
}

function getStoredCallbackId() {
  try { return sessionStorage.getItem(PAYMENT_CALLBACK_KEY) || ""; }
  catch { return ""; }
}

function paymentErrorText(error) {
  const message = String(error?.message || "");
  if (error?.status === 403 && /register this campaign in the same session first/i.test(message)) {
    return "انتهت جلسة تسجيل الحملة أو لم تُرسل مع الطلب. افتحي صفحة الدفع من نفس جلسة التسجيل ثم أعيدي المحاولة.";
  }
  if (error?.status === 403) {
    return `رفض الخادم الطلب (403) على المسار ${error.path || "غير معروف"}${message ? `: ${message}` : ""}`;
  }
  if (/Moyasar invoice creation failed:\s*HTTP\s*401/i.test(message)) {
    return "رفض ميسر إنشاء الفاتورة على الخادم (401). نموذج البطاقة يستخدم Publishable Key، أما إنشاء الفاتورة فيتم عبر إعداد ميسر الخاص بالباك إند.";
  }
  return presentApiError(error, "تعذر إكمال طلب الدفع.").message;
}

function ensureMoyasarSdk() {
  if (window.Moyasar) return Promise.resolve();
  if (!document.querySelector(`link[href="${moyasarStyleUrl}"]`)) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = moyasarStyleUrl;
    document.head.append(stylesheet);
  }
  return new Promise((resolve, reject) => {
    let script = document.querySelector(`script[src="${moyasarScriptUrl}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = moyasarScriptUrl;
      script.async = true;
      document.head.append(script);
    }
    if (window.Moyasar) { resolve(); return; }
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
  });
}

function formatDate(value) {
  if (!value) return "غير محدد";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { dateStyle: "long" }).format(date);
}
