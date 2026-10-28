import ReportQrCode from "../components/kiosk/ReportQrCode.jsx";
import {buildReportTrackingLink,getReportShareOrigin} from "../utils/reportShareLink.js";
import "../styles/ReportShare.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Accessibility, ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Copy, DoorOpen, Globe, Home, Languages, LifeBuoy,
  MapPin, QrCode, RefreshCw, Search, ShieldCheck, Toilet, UserRound, Volume2, VolumeX, X,
} from "lucide-react";
import logo from "../assets/logos/ons-logo-optimized.png";
import goldenWelcomePhoto from "../assets/Golden Welcome at the Grand Mosque.png";
import makkahPhoto from "../assets/images/kiosk-makkah.jpg";
import madinahPhoto from "../assets/images/kiosk-madinah.jpg";
import { getKiosks } from "../services/kioskService.js";
import { createQrIdentificationRequest, identifyPilgrimByCardNumber, scanPilgrimCardImage } from "../services/pilgrimService.js";
import { createSelfServiceReport, getReportTrackingHistory } from "../services/assistanceReportService.js";
import { getKioskLanguage, kioskLanguages } from "../i18n/kioskLocales.js";
import NearestPlacePanel from "../components/kiosk/NearestPlacePanel.jsx";
import QrCameraScanner from "../components/kiosk/QrCameraScanner.jsx";
import KioskLanguageFlag from "../components/kiosk/KioskLanguageFlag.jsx";
import "../styles/PilgrimKiosk.css";

const primaryLanguageCodes = ["ar", "en", "ur", "tr", "bn", "id", "ha", "fr", "fa", "sw", "zh", "ru"];
const DEVICE_SESSION_KEY = "ons-pilgrim-kiosk-device";

function getSavedDeviceId() {
  const device = getSavedDevice();
  return device?.id ?? device?.Id ?? device?.kioskId ?? null;
}

function getSavedDevice() {
  try {
    const raw = window.sessionStorage.getItem(DEVICE_SESSION_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    return saved && typeof saved === "object" ? saved : { id: saved };
  } catch { return null; }
}

function saveDevice(record) {
  try { window.sessionStorage.setItem(DEVICE_SESSION_KEY, JSON.stringify(record)); }
  catch { /* The selected device still remains available in memory for this route. */ }
}

function readKioskList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.devicesActivity)) return response.devicesActivity;
  if (Array.isArray(response?.data?.devicesActivity)) return response.data.devicesActivity;
  if (Array.isArray(response?.result?.devicesActivity)) return response.result.devicesActivity;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.result)) return response.result;
  return [];
}

function getKioskId(kiosk) {
  return kiosk?.id ?? kiosk?.Id ?? kiosk?.kioskId ?? null;
}

function getPilgrimCampaignId(pilgrim) {
  return pilgrim?.campaignId ?? pilgrim?.CampaignId ?? pilgrim?.campaignID
    ?? pilgrim?.campaign?.id ?? pilgrim?.campaign?.Id
    // Some pilgrim responses expose the linked campaign through accommodation.
    ?? pilgrim?.accommodation?.campaignId ?? pilgrim?.accommodation?.CampaignId
    ?? pilgrim?.accommodation?.campaign?.id ?? pilgrim?.accommodation?.campaign?.Id;
}

function maskSensitiveValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.length <= 4 ? "•".repeat(text.length) : `${"•".repeat(Math.min(8, text.length - 4))}${text.slice(-4)}`;
}

function getCardNumberFromQr(payload) {
  const value = String(payload ?? "").trim();
  if (!value) return "";
  const hidCardNumber = (input) => String(input ?? "").match(/\b447\d{12}\b/)?.[0] || "";
  const normalizeCardNumber = (input) => {
    const candidate = String(input ?? "").trim();
    if (!candidate) return "";
    return hidCardNumber(candidate) || (candidate.length <= 50 ? candidate : "");
  };
  const findCardNumber = (record) => {
    if (!record || typeof record !== "object") return "";
    const keys = ["cardNumber", "card_number", "cardNo", "CardNumber", "hid", "hidNumber", "documentNumber", "pilgrimCardNumber"];
    for (const key of keys) {
      const candidate = normalizeCardNumber(record[key]);
      if (candidate) return candidate;
    }
    for (const nested of Object.values(record)) {
      if (nested && typeof nested === "object") {
        const candidate = findCardNumber(nested);
        if (candidate) return candidate;
      }
    }
    return "";
  };
  try {
    const parsed = JSON.parse(value);
    const cardNumber = findCardNumber(parsed);
    if (cardNumber) return cardNumber;
  } catch { /* QR codes may contain a plain card number or a URL. */ }
  try {
    const url = new URL(value);
    for (const key of ["cardNumber", "card_number", "cardNo", "hid", "hidNumber", "documentNumber"]) {
      const cardNumber = normalizeCardNumber(url.searchParams.get(key));
      if (cardNumber) return cardNumber;
    }
  } catch { /* The QR value is not a URL. */ }
  const cardNumber = normalizeCardNumber(value);
  if (cardNumber) return cardNumber;
  throw new Error("لا يحتوي رمز QR على رقم بطاقة صالح.");
}

function formatReportTime(value, languageCode) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(languageCode, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function getRegisteredSite(kiosk = {}) {
  const locationName = kiosk.locationName || "";
  const name = String(locationName);
  if (/(^|\b|\s)(makkah|mecca)(\b|\s|$)|مكة/i.test(name)) return "makkah";
  if (/(^|\b|\s)(madinah|medina)(\b|\s|$)|المدينة/i.test(name)) return "madinah";

  const latitude = Number(kiosk.latitude ?? kiosk.Latitude);
  const longitude = Number(kiosk.longitude ?? kiosk.Longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const distanceKm = (lat, lon) => {
    const radians = (degrees) => degrees * Math.PI / 180;
    const deltaLat = radians(latitude - lat);
    const deltaLon = radians(longitude - lon);
    const value = Math.sin(deltaLat / 2) ** 2
      + Math.cos(radians(lat)) * Math.cos(radians(latitude)) * Math.sin(deltaLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  };
  if (distanceKm(21.3891, 39.8579) <= 60) return "makkah";
  if (distanceKm(24.4672, 39.6111) <= 60) return "madinah";
  return null;
}

function PilgrimKioskPage() {
  const devicePreview = new URLSearchParams(window.location.search).get("preview") === "device";
  const [languageCode, setLanguageCode] = useState(null);
  const [screen, setScreen] = useState("device-selection");
  const [deviceList, setDeviceList] = useState({ status: "loading", records: [], error: null });
  const [deviceQuery, setDeviceQuery] = useState("");
  const [largeText, setLargeText] = useState(false);
  const [showOtherLanguages, setShowOtherLanguages] = useState(false);
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const [identityMethod, setIdentityMethod] = useState(null);
  const [qrPayload, setQrPayload] = useState("");
  const [qrStatus, setQrStatus] = useState("idle");
  const [qrError, setQrError] = useState("");
  const [qrIdentificationRequest, setQrIdentificationRequest] = useState(null);
  const [cameraRetryToken, setCameraRetryToken] = useState(0);
  const [manualCardNumber, setManualCardNumber] = useState("");
  const [manualStatus, setManualStatus] = useState("idle");
  const [manualError, setManualError] = useState("");
  const [pilgrimRecord, setPilgrimRecord] = useState(null);
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);
  const [reportStatus, setReportStatus] = useState("idle");
  const [reportTracking, setReportTracking] = useState({ status: "idle", record: null });
  const [reportError, setReportError] = useState("");
  const [reportCaseNumber, setReportCaseNumber] = useState("");
  const [createdReportId, setCreatedReportId] = useState(null);
  const [shareLink, setShareLink] = useState("");
  const [shareLinkError, setShareLinkError] = useState("");
  useEffect(() => {
    if (!createdReportId) return;
    let active = true;
    getReportShareOrigin().then(origin => { const link=buildReportTrackingLink(origin,createdReportId);if (active) {setShareLink(link);setShareLinkError("");} }).catch(() => {if(active){setShareLink("");setShareLinkError("تعذر تجهيز رابط المتابعة على الشبكة. تأكد من اتصال الجهاز بشبكة Wi-Fi.");}});
    return () => {active=false;};
  }, [createdReportId]);
  const [referenceCopied, setReferenceCopied] = useState(false);
  const reportRequestLock = useRef(false);
  const [placeType, setPlaceType] = useState(null);
  const [device, setDevice] = useState(() => {
    const saved = getSavedDevice();
    return saved ? { status: "selected", record: saved } : { status: "unselected", record: null };
  });
  const locale = getKioskLanguage(languageCode);
  const t = locale.messages;
  const manualCardLabel = locale.code === "ar" ? "رقم بطاقة نسك (HID)" : locale.code === "en" ? "Nusuk card number (HID)" : "Card number (HID)";
  const manualCardHint = locale.code === "ar" ? "أدخلي رقم البطاقة الموجود على بطاقة الحاج، وسيتم التحقق منها مثل مسح QR." : locale.code === "en" ? "Enter the card number printed on the pilgrim card. It will be verified like a QR scan." : t.scanHint;
  const manualCardSubmitLabel = locale.code === "ar" ? "التحقق من البطاقة" : locale.code === "en" ? "Verify card" : t.manualSubmit;

  const handleQrDecoded = useCallback(async (value, imageFile) => {
    setQrPayload(value);
    setQrStatus("loading");
    setQrError("");
    setQrIdentificationRequest(null);
    setPilgrimRecord(null);
    setDetailsConfirmed(false);
    setReportStatus("idle");
    setReportTracking({ status: "idle", record: null });
    setReportError("");
    setReportCaseNumber(""); setCreatedReportId(null);
    try {
      let cardNumber = "";
      try { cardNumber = getCardNumberFromQr(value); }
      catch { /* Some QR codes contain a URL or encoded card data; use the backend OCR scan below. */ }

      if (cardNumber) {
        const identification = await createQrIdentificationRequest(cardNumber);
        setQrIdentificationRequest(identification);
        const identificationStatus = String(identification?.status ?? identification?.Status ?? "").toUpperCase();
        if (identificationStatus === "FAILED") throw new Error("Pilgrim card not found");
      }

      if (!cardNumber) {
        if (!imageFile) throw new Error("تعذر تجهيز صورة البطاقة لمسحها.");
        const scanResult = await scanPilgrimCardImage(imageFile);
        setQrIdentificationRequest(scanResult);
        cardNumber = String(scanResult?.cardNumber ?? scanResult?.CardNumber ?? "").trim();
        if (!cardNumber) throw new Error("لم يتمكن النظام من استخراج رقم البطاقة من الصورة.");
        const scanStatus = String(scanResult?.status ?? scanResult?.Status ?? "").toUpperCase();
        if (scanStatus === "FAILED") throw new Error("Pilgrim card not found");
      }

      const response = await identifyPilgrimByCardNumber(cardNumber);
      setPilgrimRecord({ ...(response?.data ?? response?.result ?? response), cardNumber });
      setQrStatus("found");
    } catch (error) {
      const message = String(error.message || "");
      setQrError(error.status === 404 || /card not found|pilgrim not found/i.test(message)
        ? "notFound"
        : error.status === 401 || error.status === 403
          ? "unauthorized"
          : error.status === 400 || error.status === 422 || /QR.*card number|رقم بطاقة|could not extract|could not read the card/i.test(message)
            ? "invalidFormat"
          : error.status >= 500 ? "serverError" : "networkError");
      setQrStatus("error");
    }
  }, []);

  const loadDevices = useCallback(async () => {
    setDeviceList((current) => ({ ...current, status: "loading", error: null }));
    try {
      const response = await getKiosks();
      const records = readKioskList(response);
      setDeviceList({ status: "ready", records, error: null });
      const savedId = getSavedDeviceId();
      const savedCode = getSavedDevice()?.kioskCode;
      const selected = records.find((record) =>
        (savedCode && record.kioskCode === savedCode)
        || (savedId != null && getKioskId(record) != null && String(getKioskId(record)) === String(savedId)));
      setDevice(selected ? { status: "selected", record: selected } : { status: "unselected", record: null });
    } catch (error) {
      setDeviceList({ status: "error", records: [], error });
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadDevices(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDevices]);

  useEffect(() => {
    const oldLang = document.documentElement.lang;
    const oldDir = document.documentElement.dir;
    document.documentElement.lang = locale.code;
    document.documentElement.dir = locale.dir;
    return () => {
      document.documentElement.lang = oldLang || "ar";
      document.documentElement.dir = oldDir || "rtl";
    };
  }, [locale.code, locale.dir]);


  const registeredSite = useMemo(() => (device.record ? getRegisteredSite(device.record) : null), [device]);
  const activeSite = registeredSite;
  const photo = activeSite === "madinah" ? madinahPhoto : makkahPhoto;
  const screenPhoto = ["welcome", "menu", "assistance", "identity", "report-tracking"].includes(screen) ? goldenWelcomePhoto : photo;
  const isRTL = locale.dir === "rtl";
  const linkedCampaignId = getPilgrimCampaignId(pilgrimRecord);
  const trackedStatus = String(reportTracking.record?.status ?? reportTracking.record?.Status ?? "").toUpperCase();
  const trackedStatusLabel = t[`reportStatus${trackedStatus}`] || t.reportTrackingUnknown;
  const trackedCreatedAt = formatReportTime(reportTracking.record?.createdAt ?? reportTracking.record?.CreatedAt, locale.code);
  const trackedReportId = reportTracking.record?.reportId ?? reportTracking.record?.ReportId ?? null;
  const reportCampaignName = pilgrimRecord?.campaignName ?? pilgrimRecord?.CampaignName ?? "";
  const displayedReportStatus = trackedStatus || (reportStatus === "created" ? "OPEN" : "");
  const displayedReportStatusLabel = t[`reportStatus${displayedReportStatus}`] || t.reportTrackingUnknown;
  const trackedStaffName = reportTracking.record?.assigneeName
    || reportTracking.record?.authorizedStaff?.user?.name
    || reportTracking.record?.authorizedStaff?.name
    || reportTracking.record?.AuthorizedStaff?.user?.name
    || reportTracking.record?.AuthorizedStaff?.name;
  const reportTimelineSteps = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED"];
  const activeTimelineIndex = ({ OPEN: 0, ASSIGNED: 1, IN_PROGRESS: 2, RESOLVED: 3 })[displayedReportStatus] ?? -1;

  const beginService = (nextScreen) => setScreen(nextScreen);
  const goBack = () => {
    if (screen === "identity") setScreen("assistance");
    else if (screen !== "menu") setScreen("menu");
    else setScreen("welcome");
  };
  const switchToManualEntry = () => {
    setIdentityMethod("manual");
    setManualCardNumber("");
    setManualStatus("idle");
    setManualError("");
    setPilgrimRecord(null);
    setDetailsConfirmed(false);
    setReportStatus("idle");
    setReportError("");
    setReportCaseNumber(""); setCreatedReportId(null);
    setScreen("identity");
  };
  const resetSession = () => {
    setIdentityMethod(null);
    setQrPayload("");
    setQrStatus("idle");
    setQrError("");
    setManualCardNumber("");
    setManualStatus("idle");
    setManualError("");
    setPilgrimRecord(null);
    setDetailsConfirmed(false);
    setReportStatus("idle");
    setReportTracking({ status: "idle", record: null });
    setReportError("");
    setReportCaseNumber(""); setCreatedReportId(null);
    setPlaceType(null);
    setLanguageCode(null);
    setScreen(device.record ? "welcome" : "device-selection");
  };
  const selectLanguage = (code) => {
    setIdentityMethod(null);
    setQrPayload("");
    setManualCardNumber("");
    setManualStatus("idle");
    setManualError("");
    setPilgrimRecord(null);
    setDetailsConfirmed(false);
    setReportStatus("idle");
    setReportTracking({ status: "idle", record: null });
    setReportError("");
    setReportCaseNumber(""); setCreatedReportId(null);
    setPlaceType(null);
    setLanguageCode(code);
    setScreen("menu");
  };

  const chooseDevice = (record) => {
    setDevice({ status: "selected", record });
    if (getKioskId(record) !== null) saveDevice(record);
  };

  const submitManualLookup = async (event) => {
    event.preventDefault();
    let cardNumber;
    try { cardNumber = getCardNumberFromQr(manualCardNumber); }
    catch {
      setManualError("manualInvalid");
      setManualStatus("error");
      return;
    }
    setManualStatus("loading");
    setManualError("");
    setPilgrimRecord(null);
    setDetailsConfirmed(false);
    setReportStatus("idle");
    setReportTracking({ status: "idle", record: null });
    setReportError("");
    setReportCaseNumber(""); setCreatedReportId(null);
    try {
      const identification = await createQrIdentificationRequest(cardNumber);
      setQrIdentificationRequest(identification);
      const identificationStatus = String(identification?.status ?? identification?.Status ?? "").toUpperCase();
      if (identificationStatus === "FAILED") throw new Error("Pilgrim card not found");

      const response = await identifyPilgrimByCardNumber(cardNumber);
      setPilgrimRecord({ ...(response?.data ?? response?.result ?? response), cardNumber });
      setManualStatus("found");
    } catch (error) {
      const backendMessage = String(error.message || "");
      const errorKey = error.status === 404 || /card not found|pilgrim not found/i.test(backendMessage) ? "manualNotFound"
        : error.status === 401 || error.status === 403 ? "manualUnauthorized"
          : /campaign not found/i.test(backendMessage) ? "reportCampaignNotFound"
          : error.status === 400 ? "manualInvalid"
            : error.status >= 500 ? "manualServerError" : "manualNetworkError";
      setManualError(errorKey);
      setManualStatus("error");
    }
  };

  const confirmPilgrimDetails = () => {
    setDetailsConfirmed(true);
  };

  const submitAssistanceReport = async () => {
    if (reportRequestLock.current || reportStatus === "loading") return;
    if (!detailsConfirmed) return;
    const pilgrimId = pilgrimRecord?.id ?? pilgrimRecord?.Id;
    const kioskId = getKioskId(device.record);
    const cardNumber = String(pilgrimRecord?.cardNumber || pilgrimRecord?.CardNumber || pilgrimRecord?.card_number || "").trim();
    if (!Number.isInteger(Number(kioskId)) || Number(kioskId) < 1) {
      setReportStatus("error");
      setReportError(device.record
        ? "تعذر إرسال الطلب لأن بيانات الجهاز لا تتضمن معرّفه."
        : "اختاري جهاز الخدمة أولًا لإرسال طلب المساعدة.");
      if (!device.record) setScreen("device-selection");
      return;
    }
    if (!cardNumber) {
      setReportStatus("error");
      setReportError(locale.code === "ar" ? "لا يمكن إرسال البلاغ لأن سجل الحاج لا يحتوي على رقم بطاقة." : "The pilgrim record has no card number required to submit this report.");
      return;
    }
    reportRequestLock.current = true;
    setReportStatus("loading");
    setReportTracking({ status: "idle", record: null });
    setReportError("");
    try {
      if (!pilgrimRecord?.cardNumber && !pilgrimRecord?.CardNumber && !pilgrimRecord?.card_number) {
        const identification = await identifyPilgrimByCardNumber(cardNumber);
        const holder = identification?.data ?? identification?.result ?? identification;
        if (Number(holder?.id ?? holder?.Id ?? holder?.pilgrimId) !== Number(pilgrimId)) {
          throw new Error(locale.code === "ar" ? "رقم البطاقة لا يخص الحاج المعروض." : "This card does not belong to the displayed pilgrim.");
        }
      }
      const response = await createSelfServiceReport({ cardNumber, kioskId: Number(kioskId) });
      const persistedCaseNumber = response?.caseNumber ?? response?.CaseNumber;
      if (!persistedCaseNumber) throw new Error("The server did not return a report reference.");
      setReportCaseNumber(persistedCaseNumber);
      setCreatedReportId(response?.reportId ?? response?.ReportId);
      setReportTracking({ status: "ready", record: response });
      setReferenceCopied(false);
      setReportStatus("created");
      setScreen("report-tracking");
    } catch (error) {
      setReportStatus("error");
      const message = String(error.message || "");

      setReportError(/لا يخص|does not belong/i.test(message) ? message
        : /pilgrim not found/i.test(message) ? t.manualNotFound
        : /kiosk not found/i.test(message) ? t.reportKioskNotFound
          : /campaign not found/i.test(message) ? t.reportCampaignNotFound
            : error.status === 401 || error.status === 403 ? t.manualUnauthorized
              : t.reportCreateError);
    } finally {
      reportRequestLock.current = false;
    }
  };

  const copyReportReference = async () => {
    try {
      if (window.navigator.clipboard?.writeText) {
        await window.navigator.clipboard.writeText(reportCaseNumber);
      } else {
        const input = document.createElement("textarea");
        input.value = reportCaseNumber;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("Copy was not permitted");
      }
      setReferenceCopied(true);
      window.setTimeout(() => setReferenceCopied(false), 2200);
    } catch {
      setReferenceCopied(false);
    }
  };

  const refreshReportTracking = useCallback(async () => {
    if (!Number.isInteger(Number(createdReportId)) || Number(createdReportId) < 1) {
      setReportTracking({ status: "error", record: null });
      return;
    }
    setReportTracking((current) => ({ ...current, status: current.record ? current.status : "loading" }));
    try {
      const response = await getReportTrackingHistory(createdReportId);
      const record = response?.data ?? response?.result ?? response;
      setReportTracking({ status: "ready", record });
    } catch (error) {
      setReportTracking((current) => ({ status: "error", record: current.record, error }));
    }
  }, [createdReportId]);

  useEffect(() => {
    if (screen !== "report-tracking" || reportStatus !== "created") return undefined;
    const initialTimeout = window.setTimeout(() => void refreshReportTracking(), 0);
    const intervalId = window.setInterval(() => void refreshReportTracking(), 10000);
    return () => {
      window.clearTimeout(initialTimeout);
      window.clearInterval(intervalId);
    };
  }, [refreshReportTracking, reportStatus, screen]);

  const filteredDevices = useMemo(() => {
    const query = deviceQuery.trim().toLocaleLowerCase(locale.code);
    if (!query) return deviceList.records;
    return deviceList.records.filter((record) => [record.kioskCode, record.locationName]
      .some((value) => String(value || "").toLocaleLowerCase(locale.code).includes(query)));
  }, [deviceList.records, deviceQuery, locale.code]);
  const playWelcomeAudio = () => {
    if (!("speechSynthesis" in window)) {
      setAudioUnavailable(true);
      return;
    }
    window.speechSynthesis.cancel();
    const message = new SpeechSynthesisUtterance(t.officialSlogan);
    message.lang = locale.code;
    window.speechSynthesis.speak(message);
    setAudioUnavailable(false);
  };


  const kioskApplication = (
    <main className={`kiosk-terminal kiosk-${screen} ${screenPhoto ? "has-location-photo" : "no-location-photo"}${largeText ? " kiosk-large-text" : ""}`} lang={locale.code} dir={locale.dir}>
      {screenPhoto && <div className="kiosk-photo" style={{ "--kiosk-photo": `url(${screenPhoto})` }} aria-hidden="true" />}
      <div className="kiosk-scrim" aria-hidden="true" />

      <header className="kiosk-terminal-header">
        <div className="kiosk-terminal-brand">
          <img src={logo} alt="ONS" />
          <span className="kiosk-brand-divider" />
          <span className="kiosk-brand-label">ONS</span>
        </div>
        {/* <div className={`kiosk-location-chip is-${String(device.record?.status || device.status).toLowerCase()}`} role="status" aria-live="polite">
          {deviceList.status === "loading" && !device.record ? <RefreshCw size={17} className="kiosk-spin" /> : <MapPin size={18} />}
          <span>{deviceStatusText}</span>
        </div> */}
        {screen !== "device-selection" && (
          <div className="kiosk-header-actions">
            <button type="button" className="kiosk-header-button" onClick={() => setScreen("device-selection")} aria-label={device.record ? t.switchDevice : t.deviceSetupTitle} title={device.record ? t.switchDevice : t.deviceSetupTitle}>
              <MapPin size={20} /><span>{device.record ? t.switchDevice : t.deviceSetupTitle}</span>
            </button>
            {screen !== "welcome" && <>
              <button type="button" className="kiosk-header-button kiosk-back-button" onClick={goBack} aria-label={t.back}>
                {isRTL ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}<span>{t.back}</span>
              </button>
              <button type="button" className="kiosk-header-button" onClick={() => setScreen("welcome")} aria-label={t.changeLanguage}>
                <Languages size={20} /><span>{t.changeLanguage}</span>
              </button>
            </>}
            <button type="button" className="kiosk-header-button kiosk-home-button" onClick={resetSession} aria-label={t.home}>
              <Home size={20} /><span>{t.home}</span>
            </button>
          </div>
        )}
      </header>

      {screen === "device-selection" && (
        <section className="kiosk-site-setup kiosk-device-selection" aria-labelledby="kiosk-site-title" dir="rtl">
          <div className="kiosk-site-setup-panel">
            <span className="kiosk-site-setup-step">{t.deviceSimulationLabel}</span>
            <h1 id="kiosk-site-title">{t.deviceSetupTitle}</h1>
            <p>{t.deviceSetupDescription}</p>
            <div className="kiosk-device-list" aria-live="polite">
              {deviceList.status === "loading" && <div className="kiosk-device-list-state"><RefreshCw size={20} className="kiosk-spin" /><span>{t.deviceLoading}</span></div>}
              {deviceList.status === "error" && <div className="kiosk-device-list-state is-error"><MapPin size={21} /><span>{deviceList.error?.status === 401 || deviceList.error?.status === 403 ? "تعذر تحميل الأجهزة: الخادم رفض الوصول إلى قائمة الأجهزة. راجعي صلاحيات API الحالية." : t.deviceLoadError}</span><button type="button" onClick={() => void loadDevices()}>{t.deviceRetry}</button></div>}
              {deviceList.status === "ready" && deviceList.records.length === 0 && <div className="kiosk-device-list-state is-empty"><MapPin size={23} /><b>{t.deviceEmptyTitle}</b><span>{t.deviceEmptyHint}</span><button type="button" onClick={() => void loadDevices()}>{t.deviceRetry}</button></div>}
              {deviceList.status === "ready" && deviceList.records.length > 0 && <label className="kiosk-device-search">
                <Search size={19} aria-hidden="true" />
                <input type="search" value={deviceQuery} onChange={(event) => setDeviceQuery(event.target.value)} placeholder={t.deviceSearch} aria-label={t.deviceSearch} />
              </label>}
              {deviceList.status === "ready" && filteredDevices.length === 0 && deviceList.records.length > 0 && <div className="kiosk-device-list-state">{t.noDeviceMatches}</div>}
              {deviceList.status === "ready" && filteredDevices.map((record, index) => {
                const id = getKioskId(record);
                const status = String(record.status || "UNKNOWN").toUpperCase();
                const selected = Boolean(device.record) && (record.kioskCode
                  ? record.kioskCode === device.record.kioskCode
                  : id != null && String(getKioskId(device.record)) === String(id));
                const city = getRegisteredSite(record) === "makkah" ? t.cityMakkah : getRegisteredSite(record) === "madinah" ? t.cityMadinah : "";
                const statusLabel = status === "ACTIVE" ? t.deviceStatusActive : status === "INACTIVE" ? t.deviceStatusInactive : status === "MAINTENANCE" ? t.deviceStatusMaintenance : t.deviceStatusUnknown;
                return (
                  <button type="button" key={id ?? record.kioskCode ?? index} className={`kiosk-device-option${selected ? " is-selected" : ""}`} onClick={() => chooseDevice(record)} aria-pressed={selected}>
                    <span className="kiosk-device-option-icon"><MapPin size={23} /></span>
                    <span className="kiosk-device-option-copy"><b>{record.kioskCode || `${t.deviceId} ${id ?? "—"}`}</b><small>{record.locationName || t.deviceNoLocation}{city && ` · ${city}`}</small></span>
                    <span className={`kiosk-device-status is-${status.toLowerCase()}`}>{statusLabel}</span>
                    {selected && <ShieldCheck className="kiosk-device-option-check" size={22} />}
                  </button>
                );
              })}
            </div>
            <div className="kiosk-site-temporary-note"><ShieldCheck size={18} /><span>{t.deviceSimulationNote}</span></div>
            <button type="button" className="kiosk-site-continue" disabled={!device.record || deviceList.status !== "ready"} onClick={() => setScreen(detailsConfirmed ? "identity" : "welcome")}>{t.deviceContinue} <ArrowLeft size={20} /></button>
          </div>
        </section>
      )}

      {screen === "welcome" && (
        <section className="kiosk-welcome-screen" aria-labelledby="kiosk-welcome-title">
          <div className="kiosk-welcome-brand-side">
            <div className="kiosk-welcome-brand-content">
              <span className="kiosk-brand-emblem"><img src={logo} alt="" /></span>
              <h1 id="kiosk-welcome-title">{t.welcome}</h1>
              <p className="kiosk-welcome-motto">{t.welcomeReassurance}</p>
              <p className="kiosk-welcome-supporting">{t.welcomeHospitality}</p>
              <p className="kiosk-welcome-original-slogan">{t.officialSlogan}</p>
              <div className="kiosk-brand-rule"><i /><i /><i /></div>
              {/* {device.record && !registeredSite && <div className="kiosk-config-note"><MapPin size={16} /><span>{t.noLocation}: {device.record.locationName}</span></div>} */}
            </div>
            <small className="kiosk-photo-caption">{device.record?.locationName || t.cityMakkah}</small>
          </div>
          <div className="kiosk-language-side">
            <div className="kiosk-language-heading">
              <span className="kiosk-terminal-step">01 <i /> 02</span>
              <h2>{t.choose}</h2>
              <p>{t.menuHint}</p>
              <div className="kiosk-welcome-tools">
                <button type="button" className="kiosk-welcome-tool" onClick={playWelcomeAudio} aria-label={t.audioAssistance || "المساعدة الصوتية"} title={audioUnavailable ? (t.audioUnavailable || "الصوت غير متاح على هذا الجهاز") : (t.audioAssistance || "المساعدة الصوتية")}>
                  {audioUnavailable ? <VolumeX size={20} /> : <Volume2 size={20} />}<span>{t.audioAssistance || "استمع للترحيب"}</span>
                </button>
                <button type="button" className={`kiosk-welcome-tool${largeText ? " is-active" : ""}`} onClick={() => setLargeText((value) => !value)} aria-pressed={largeText} aria-label={t.accessibility || "إمكانية الوصول"}>
                  <Accessibility size={20} /><span>{t.textSize || "تكبير النص"}</span>
                </button>
              </div>
            </div>
            <div className="kiosk-language-grid">
              {primaryLanguageCodes.map((code) => kioskLanguages.find((language) => language.code === code)).filter(Boolean).map((language) => (
                <button
                  type="button"
                  key={language.code}
                  className={`kiosk-language-tile${language.code === locale.code ? " is-selected" : ""}`}
                  onClick={() => selectLanguage(language.code)}
                  lang={language.code}
                  dir={language.dir}
                >
                  <span className="kiosk-language-symbol"><KioskLanguageFlag code={language.code} /></span>
                  <span className="kiosk-language-native">{language.nativeName}</span>
                  {language.code === locale.code && <span className="kiosk-selected-mark"><ShieldCheck size={15} /></span>}
                </button>
              ))}
              <button
                type="button"
                className="kiosk-language-other"
                aria-expanded={showOtherLanguages}
                onClick={() => setShowOtherLanguages((value) => !value)}
              >
                <Globe size={23} aria-hidden="true" />
                <span>{t.otherLanguages}</span>
                <span className={`kiosk-language-other-chevron${showOtherLanguages ? " is-open" : ""}`} aria-hidden="true">⌄</span>
              </button>
              {showOtherLanguages && kioskLanguages.filter((language) => !primaryLanguageCodes.includes(language.code)).map((language) => (
                <button
                  type="button"
                  key={language.code}
                  className={`kiosk-language-tile${language.code === locale.code ? " is-selected" : ""}`}
                  onClick={() => selectLanguage(language.code)}
                  lang={language.code}
                  dir={language.dir}
                >
                  <span className="kiosk-language-symbol"><KioskLanguageFlag code={language.code} /></span>
                  <span className="kiosk-language-native">{language.nativeName}</span>
                  {language.code === locale.code && <span className="kiosk-selected-mark"><ShieldCheck size={15} /></span>}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {screen === "menu" && (
        <section className="kiosk-service-screen" aria-labelledby="kiosk-menu-title">
          <div className="kiosk-screen-heading">
            <span className="kiosk-screen-step">{t.menuWelcome}</span>
            <h1 id="kiosk-menu-title">{t.menu}</h1>
            <p>{t.menuHint}</p>
          </div>
          <div className="kiosk-service-grid">
            <button type="button" className="kiosk-service-tile is-help" onClick={() => beginService("assistance")}>
              <span className="kiosk-service-icon"><LifeBuoy size={38} strokeWidth={1.8} /></span>
              <span className="kiosk-service-copy"><b>{t.lost}</b><small>{t.lostHint}</small></span>
              <span className="kiosk-service-action" aria-hidden="true">{isRTL ? <ArrowLeft size={23} /> : <ArrowRight size={23} />}</span>
            </button>
            <button type="button" className="kiosk-service-tile" onClick={() => { setPlaceType("restroom"); beginService("places"); }}>
              <span className="kiosk-service-icon is-restroom"><Toilet size={37} strokeWidth={1.8} /></span>
              <span className="kiosk-service-copy"><b>{t.restroom}</b><small>{t.restroomHint}</small></span>
              <span className="kiosk-service-action" aria-hidden="true">{isRTL ? <ArrowLeft size={23} /> : <ArrowRight size={23} />}</span>
            </button>
            <button type="button" className="kiosk-service-tile" onClick={() => { setPlaceType("gate"); beginService("places"); }}>
              <span className="kiosk-service-icon is-gate"><DoorOpen size={37} strokeWidth={1.8} /></span>
              <span className="kiosk-service-copy"><b>{t.gate}</b><small>{t.gateHint}</small></span>
              <span className="kiosk-service-action" aria-hidden="true">{isRTL ? <ArrowLeft size={23} /> : <ArrowRight size={23} />}</span>
            </button>
          </div>
          <div className="kiosk-service-footer"><span><ShieldCheck size={18} />{t.sessionNote}</span><span>{device.record && <><MapPin size={18} />{device.record.locationName || t.deviceNoLocation}</>}</span></div>
        </section>
      )}

      {screen === "assistance" && (
        <section className="kiosk-flow-screen" aria-labelledby="kiosk-flow-title">
          <div className="kiosk-flow-card">
            <span className="kiosk-flow-step"><LifeBuoy size={22} />{t.helpTitle}</span>
            <h1 id="kiosk-flow-title">{t.helpTitle}</h1><p className="kiosk-flow-intro">{t.helpHint}</p>
            <div className="kiosk-method-grid">
              <button type="button" className="kiosk-method-tile" onClick={() => { setIdentityMethod("qr"); setQrPayload(""); setQrStatus("idle"); setQrError(""); setScreen("identity"); }}>
                <span className="kiosk-method-symbol"><QrCode size={32} /></span><b>{t.scan}</b><small>{t.scanHint}</small>
              </button>
              <button type="button" className="kiosk-method-tile" onClick={() => { setIdentityMethod("manual"); setScreen("identity"); }}>
                <span className="kiosk-method-symbol is-manual"><UserRound size={32} /></span><b>{t.manual}</b><small>{t.manualHint}</small>
              </button>
            </div>
            <div className="kiosk-privacy-note"><ShieldCheck size={18} /><span>{t.sessionNote}</span></div>
          </div>
        </section>
      )}

      {screen === "identity" && (
        <section className="kiosk-flow-screen" aria-labelledby="kiosk-flow-title">
          <div className={`kiosk-flow-card kiosk-result-card${identityMethod === "qr" ? " is-scanner-card" : " is-manual-card"}`}>
            <button type="button" className="kiosk-inline-close" aria-label={t.back} onClick={goBack}><X size={21} /></button>
            <span className="kiosk-flow-step">{identityMethod === "qr" ? <><QrCode size={22} />{t.scan}</> : <><UserRound size={22} />{t.manual}</>}</span>
            <h1 id="kiosk-flow-title">{identityMethod === "qr" ? (qrPayload ? t.qrCapturedTitle : t.scan) : t.manual}</h1>

            {identityMethod === "qr" && !qrPayload && <QrCameraScanner
              key={cameraRetryToken}
              copy={t}
              retryToken={cameraRetryToken}
              onDecoded={handleQrDecoded}
              onCancel={goBack}
              onManualEntry={switchToManualEntry}
              onRetry={() => setCameraRetryToken((token) => token + 1)}
            />}

            {identityMethod === "qr" && qrStatus === "loading" && <div className="kiosk-verifying" role="status" aria-live="polite">
              <span className="kiosk-verifying-spinner" aria-hidden="true" />
              <b>{t.qrVerifying || (locale.code === "ar" ? "جارٍ التحقق من البطاقة لدى الخادم…" : "Verifying the card with the server…")}</b>
            </div>}

            {identityMethod === "qr" && qrStatus === "error" && <div className="kiosk-manual-result">
              <p className="kiosk-manual-error" role="alert">{qrError === "notFound" ? t.manualNotFound : qrError === "unauthorized" ? t.manualUnauthorized : qrError === "serverError" ? t.manualServerError : qrError === "invalidFormat" ? (locale.code === "ar" ? "لم أجد رقم بطاقة صالحًا داخل رمز QR. تأكدي من أن الرمز يخص بطاقة حاج." : "No valid card number was found in this QR code. Make sure it belongs to a pilgrim card.") : t.manualNetworkError}</p>
              <button type="button" className="kiosk-retry-button" onClick={() => { setQrPayload(""); setQrStatus("idle"); setQrError(""); setCameraRetryToken((token) => token + 1); }}><RefreshCw size={19} />{t.cameraRetry}</button>
              <button type="button" className="kiosk-scanner-cancel" onClick={switchToManualEntry}><UserRound size={18} />{t.manual}</button>
            </div>}

            {identityMethod === "manual" && manualStatus === "loading" && <div className="kiosk-verifying" role="status" aria-live="polite">
              <span className="kiosk-verifying-spinner" aria-hidden="true" />
              <b>{locale.code === "ar" ? "جارٍ التحقق من البطاقة لدى الخادم…" : locale.code === "en" ? "Verifying the card with the server…" : t.manualLoading}</b>
              <p>{manualCardHint}</p>
            </div>}

            {identityMethod === "manual" && manualStatus !== "found" && manualStatus !== "loading" && <>
              <p className="kiosk-flow-intro">{manualCardHint}</p>
              <form className="kiosk-manual-form" onSubmit={submitManualLookup}>
                <label htmlFor="kiosk-pilgrim-card">{manualCardLabel}</label>
                <input id="kiosk-pilgrim-card" type="text" inputMode="numeric" autoComplete="off" maxLength={50} value={manualCardNumber} onChange={(event) => { setManualCardNumber(event.target.value); setManualError(""); setManualStatus("idle"); }} required aria-invalid={manualStatus === "error"} dir="ltr" />
                {manualStatus === "error" && <p className="kiosk-manual-error" role="alert">{manualError === "manualInvalid" ? (locale.code === "ar" ? "أدخلي رقم بطاقة صالحًا." : locale.code === "en" ? "Enter a valid card number." : t[manualError]) : t[manualError]}</p>}
                <button type="submit" className="kiosk-retry-button" disabled={manualStatus === "loading"}>
                  {manualStatus === "loading" ? <RefreshCw size={19} className="kiosk-spin" /> : <Search size={19} />}
                  {manualStatus === "loading" ? t.manualLoading : manualCardSubmitLabel}
                </button>
              </form>
            </>}

            {(identityMethod === "manual" && manualStatus === "found" || identityMethod === "qr" && qrStatus === "found") && <div className="kiosk-manual-result">
              {reportStatus === "created" ? <div className="kiosk-report-success-screen" role="status" aria-live="polite">
                <span className="kiosk-report-success-icon"><CheckCircle2 size={42} /></span>
                <h2>{t.reportSuccessTitle}</h2>
                <p>{t.reportSuccessMessage}</p>
                <div className="kiosk-report-reference"><span>{t.reportReference}</span><strong dir="ltr">{reportCaseNumber}</strong></div>
                <button type="button" className="kiosk-retry-button kiosk-track-report-button" onClick={() => setScreen("report-tracking")}><Search size={18} />{t.reportTrackButton}</button>
                <button type="button" className="kiosk-retry-button" onClick={resetSession}><Home size={18} />{t.home}</button>
              </div> : <>
                <dl>
                  <div><dt>{t.manualName}</dt><dd>{pilgrimRecord?.fullName || pilgrimRecord?.FullName || "—"}</dd></div>
                  <div><dt>{t.manualNationality}</dt><dd>{pilgrimRecord?.nationality || pilgrimRecord?.Nationality || "—"}</dd></div>
                  {(pilgrimRecord?.phoneNumber || pilgrimRecord?.PhoneNumber) && <div><dt>{t.manualPhoneNumber}</dt><dd dir="ltr">{pilgrimRecord.phoneNumber ?? pilgrimRecord.PhoneNumber}</dd></div>}
                  {(pilgrimRecord?.visaNumber || pilgrimRecord?.VisaNumber) && <div><dt>{t.manualVisaNumber}</dt><dd dir="ltr">{maskSensitiveValue(pilgrimRecord.visaNumber ?? pilgrimRecord.VisaNumber)}</dd></div>}
                  {(pilgrimRecord?.campaignName || pilgrimRecord?.CampaignName) && <div><dt>{t.manualCampaignName}</dt><dd>{pilgrimRecord.campaignName || pilgrimRecord.CampaignName}</dd></div>}
                  {getPilgrimCampaignId(pilgrimRecord) != null && <div><dt>{t.manualCampaignId}</dt><dd dir="ltr">{getPilgrimCampaignId(pilgrimRecord)}</dd></div>}
                </dl>
                {!detailsConfirmed ? <>
              <p className="kiosk-manual-notice">{identityMethod === "qr"
                ? (locale.code === "ar"
                  ? `تم التحقق من البطاقة وحفظ طلب المسح في النظام${qrIdentificationRequest?.requestId || qrIdentificationRequest?.RequestId ? ` (رقم الطلب: ${qrIdentificationRequest.requestId ?? qrIdentificationRequest.RequestId})` : ""}.`
                  : `The card was verified and its scan request was saved${qrIdentificationRequest?.requestId || qrIdentificationRequest?.RequestId ? ` (request #${qrIdentificationRequest.requestId ?? qrIdentificationRequest.RequestId})` : ""}.`)
                : (locale.code === "ar" ? "تم التحقق من رقم البطاقة لدى الخادم وربطه بسجل الحاج." : locale.code === "en" ? "The server verified the card and matched it to the pilgrim record." : t.manualRecordNotice)}</p>
                  <div className="kiosk-confirm-actions">
                    <button type="button" className="kiosk-retry-button" onClick={confirmPilgrimDetails}>{t.manualConfirm}</button>
                    <button type="button" className="kiosk-scanner-cancel" onClick={() => { setManualStatus("idle"); setPilgrimRecord(null); setDetailsConfirmed(false); setReportStatus("idle"); setReportError(""); setReportCaseNumber(""); setCreatedReportId(null); }}>{t.manualReject}</button>
                  </div>
                </> : <section className="kiosk-report-submit-panel" aria-labelledby="kiosk-report-submit-title">
                  <div className="kiosk-manual-confirmed"><b><ShieldCheck size={17} />{t.manualConfirmedTitle}</b><span>{t.manualConfirmStatus}</span></div>
                  <h2 id="kiosk-report-submit-title">{t.reportStepTitle}</h2>
                  <p>{t.reportRoutingNote}</p>
                  {!pilgrimRecord?.cardNumber && !pilgrimRecord?.CardNumber && !pilgrimRecord?.card_number && <span className="kiosk-report-error" role="status">{locale.code === "ar" ? "سجل الحاج لا يحتوي على رقم بطاقة، لذلك لا يمكن إرسال البلاغ بهذه الطريقة." : "This pilgrim record has no card number, so this report cannot be submitted."}</span>}

                  {!linkedCampaignId && <span className="kiosk-report-error" role="alert">{t.reportCampaignUnavailable}</span>}
                  {reportStatus === "error" && <span className="kiosk-report-error" role="alert">{reportError}</span>}
                  <button type="button" className="kiosk-retry-button" onClick={submitAssistanceReport} disabled={!linkedCampaignId || (!pilgrimRecord?.cardNumber && !pilgrimRecord?.CardNumber && !pilgrimRecord?.card_number) || reportStatus === "loading"}>
                    {reportStatus === "loading" ? <RefreshCw size={18} className="kiosk-spin" /> : <LifeBuoy size={18} />}
                    {reportStatus === "loading" ? t.reportSubmitting : t.reportCreate}
                  </button>
                </section>}
                <button type="button" className="kiosk-scanner-cancel" onClick={() => { setManualStatus("idle"); setPilgrimRecord(null); setDetailsConfirmed(false); setReportStatus("idle"); setReportError(""); setReportCaseNumber(""); setCreatedReportId(null); }}>{t.startLookupAgain}</button>
              </>}
            </div>}
          </div>
        </section>
      )}

      {screen === "report-tracking" && (
        <section className="kiosk-flow-screen kiosk-success-layout" aria-labelledby="kiosk-success-title">
          <div className="kiosk-success-page">
            <header className="kiosk-success-heading">
              <span className="kiosk-report-success-icon"><CheckCircle2 size={38} /></span>
              <div>
                <span className="kiosk-success-eyebrow">ONS · {t.reportIdLabel}</span>
                <h1 id="kiosk-success-title">{t.reportSuccessTitle}</h1>
                <p>{locale.code === "ar" ? "تم تسجيل بلاغك بنجاح. يمكنك متابعة حالة طلبك في أي وقت." : t.reportSuccessMessage}</p>
              </div>
            </header>

            <div className="kiosk-success-grid">
              <article className="kiosk-success-panel kiosk-report-details-panel">
                <div className="kiosk-success-panel-heading">
                  <span className="kiosk-success-panel-icon"><ClipboardList size={23} /></span>
                  <div><h2>{t.reportInfoTitle}</h2><p>{t.reportInfoHint}</p></div>
                </div>
                <div className="kiosk-success-reference">
                  <span>{trackedReportId != null ? t.reportIdLabel : t.reportReference}</span>
                  <strong dir="ltr">{trackedReportId ?? reportCaseNumber}</strong>
                  {trackedReportId != null && reportCaseNumber && <div className="kiosk-case-reference">
                    <div><span>{t.reportCaseLabel}</span><code dir="ltr">{reportCaseNumber}</code></div>
                    <button type="button" onClick={copyReportReference} aria-label={`${t.reportCopy} ${t.reportCaseLabel}`} title={t.reportCopy}>
                      <Copy size={16} />{referenceCopied ? t.reportCopied : t.reportCopy}
                    </button>
                  </div>}
                </div>
                <dl className="kiosk-success-facts">
                  <div><dt>{reportTracking.status === "ready" ? t.reportStatusCurrent : t.reportStatusInitial}</dt><dd><span className="kiosk-live-status-dot" />{displayedReportStatusLabel}</dd></div>
                  {device.record?.locationName && <div><dt>{locale.code === "ar" ? "موقع الجهاز" : "Kiosk location"}</dt><dd>{device.record.locationName}</dd></div>}
                  {trackedCreatedAt && <div><dt>{t.reportTrackingCreatedAt}</dt><dd>{trackedCreatedAt}</dd></div>}
                  {reportCampaignName && <div><dt>{t.manualCampaignName}</dt><dd>{reportCampaignName}</dd></div>}
                  {activeTimelineIndex >= 1 && trackedStaffName && <div><dt>{t.reportRepresentative}</dt><dd>{trackedStaffName}</dd></div>}
                </dl>
                <div className="kiosk-report-qr">{shareLink ? <><ReportQrCode url={shareLink}/><div><strong>{locale.code === "ar" ? "تابع طلبك من جوالك" : "Track your request on your phone"}</strong><p>{locale.code === "ar" ? "امسح الرمز لعرض الحالة واسم المندوب وآخر التحديثات. يجب أن يكون الجوال والجهاز على نفس شبكة Wi-Fi." : "Scan to see the status and latest updates. Connect your phone to the same Wi-Fi network."}</p><a href={shareLink} target="_blank" rel="noopener noreferrer" dir="ltr">{shareLink}</a></div></> : <p role="status">{shareLinkError || (locale.code === "ar" ? "جارٍ تجهيز رابط المتابعة…" : "Preparing tracking link…")}</p>}</div>
              </article>

              <article className="kiosk-success-panel kiosk-report-timeline-panel">
                <div className="kiosk-success-panel-heading">
                  <span className="kiosk-success-panel-icon is-gold"><CheckCircle2 size={23} /></span>
                  <div><h2>{t.reportTimelineTitle}</h2><p>{t.reportTimelineHint}</p></div>
                </div>
                {reportTracking.status === "loading" && <p className="kiosk-tracking-message" role="status"><RefreshCw size={16} className="kiosk-spin" />{t.reportTrackingLoading}</p>}
                {reportTracking.status === "not-found" && <p className="kiosk-tracking-message is-error" role="status">{t.reportTrackingNotFound}</p>}
                {reportTracking.status === "error" && <p className="kiosk-tracking-message is-error" role="alert">{t.reportTrackingError}</p>}
                {trackedStatus === "CANCELLED" ? <p className="kiosk-tracking-cancelled">{trackedStatusLabel}</p> : <ol className="kiosk-report-timeline" aria-label={t.reportTrackTitle}>
                  {reportTimelineSteps.map((step, index) => {
                    const reached = activeTimelineIndex >= 0 && index <= activeTimelineIndex;
                    const current = step === displayedReportStatus;
                    const stepLabel = t[`reportStatus${step}`];
                    return <li key={step} className={`${reached ? "is-reached" : ""} ${current ? "is-current" : ""}`}>
                      <span className="kiosk-report-timeline-dot" aria-hidden="true">{reached ? <CheckCircle2 size={17} /> : null}</span>
                      <span className="kiosk-report-timeline-copy"><b>{stepLabel}</b>
                        {step === "OPEN" && displayedReportStatus === "OPEN" && <small>{t.reportWaitingForRepresentative}</small>}
                        {step === "OPEN" && trackedCreatedAt && <small>{trackedCreatedAt}</small>}
                        {step === "ASSIGNED" && reached && trackedStaffName && <small>{t.reportAcceptedBy} {trackedStaffName}</small>}
                      </span>
                    </li>;
                  })}
                </ol>}
                <button type="button" className="kiosk-retry-button kiosk-success-refresh" onClick={refreshReportTracking} disabled={reportTracking.status === "loading"}>
                  {reportTracking.status === "loading" ? <RefreshCw size={18} className="kiosk-spin" /> : <RefreshCw size={18} />}{t.reportTrackingRefresh}
                </button>
              </article>
            </div>
            <button type="button" className="kiosk-success-home" onClick={resetSession}><Home size={18} />{t.home}</button>
          </div>
        </section>
      )}

      {screen === "places" && <NearestPlacePanel kiosk={device.record} type={placeType} language={locale.code} onBack={goBack} />}

      <footer className="kiosk-terminal-footer">
        <span>ONS <i>·</i> {t.sessionNote}</span>
        {screen !== "welcome" && screen !== "device-selection" && <button type="button" onClick={resetSession}><Home size={17} />{t.startOver}</button>}
        {device.record && <span className="kiosk-footer-location">{device.record.kioskCode}</span>}
      </footer>
    </main>
  );

  if (!devicePreview) return kioskApplication;
  return (
    <div className="kiosk-device-preview">
      <div className="kiosk-device-topline"><span className="kiosk-device-camera" /><span>ONS · PILGRIM KIOSK</span></div>
      <div className="kiosk-device-screen">{kioskApplication}</div>
      <div className="kiosk-device-chin"><img src={logo} alt="ONS" /><span>أُنس</span></div>
      <div className="kiosk-device-stand" aria-hidden="true"><i /><b /></div>
      <a className="kiosk-device-clean-link" href="/pilgrim-kiosk">فتح شاشة الكشك بدون إطار</a>
    </div>
  );
}

export default PilgrimKioskPage;
