import GregorianDatePicker from "../components/GregorianDatePicker.jsx";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, BarChart3, Building2, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, Phone, ShieldCheck, UsersRound } from "lucide-react";
import logo from "../assets/logos/ons-logo-optimized.png";
import makkahRegistrationImage from "../assets/images/makkah-registration.jpg";
import madinahLoginImage from "../assets/images/madinah-login.jpg";
import EmbraceMark from "../components/EmbraceMark";
import EmbraceIllustration from "../components/EmbraceIllustration";
import { login } from "../auth/auth.js";
import { createCampaign, toCampaignRegistrationPayload } from "../services/campaignService.js";
import { presentApiError } from "../utils/errorMessages.js";
import "../styles/AuthPage.css";

export default function AuthPage({ mode }) {
  const navigate = useNavigate();
  const isRegister = mode === "register";
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem("ons-login-email") || ""; }
    catch { return ""; }
  });
  const [password, setPassword] = useState("");
  const [campaignPassword, setCampaignPassword] = useState("");
  const [startDate,setStartDate] = useState("");
  const [endDate,setEndDate] = useState("");
  const [remember, setRemember] = useState(() => {
    try { return Boolean(localStorage.getItem("ons-login-email")); }
    catch { return false; }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);

  function clearModeFeedback() {
    setError(""); setSuccess(""); setShowRecovery(false); setShowPassword(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      if (!isRegister) {
        const signedInUser = await login(email, password);
        try {
          if (remember) localStorage.setItem("ons-login-email", email.trim());
          else localStorage.removeItem("ons-login-email");
        } catch { /* Remembering an email is optional if browser storage is unavailable. */ }
        navigate(signedInUser?.role === "CAMPAIGN_OWNER" ? "/campaign-dashboard" : "/dashboard");
        return;
      }

      const form = new FormData(event.currentTarget);
      const campaign = {
        campaignName: String(form.get("campaignName") || "").trim(),
        contactNumber: String(form.get("contactNumber") || "").trim(),
        startDate: String(form.get("startDate") || ""),
        endDate: String(form.get("endDate") || ""),
        email: email.trim(),
        password: campaignPassword,
      };
      if (!campaign.password) throw new Error("أدخلي كلمة مرور الحملة لإكمال التسجيل.");
      if (!/^05\d{8}$/.test(campaign.contactNumber)) {
        throw new Error("رقم التواصل يجب أن يبدأ بـ05 ويتكوّن من 10 أرقام.");
      }
      if (!campaign.startDate || !campaign.endDate) throw new Error("اختاري تاريخ بداية الحملة ونهايتها من التقويم الميلادي.");
      if (campaign.startDate > campaign.endDate) throw new Error("تاريخ نهاية الحملة يجب أن يكون بعد تاريخ البداية.");
      const checkoutCampaign = { ...campaign };
      delete checkoutCampaign.password;
      const registrationPayload = toCampaignRegistrationPayload(campaign);
      let registration;
      try {
        registration = await createCampaign(registrationPayload);
      } catch (registrationError) {
        if (registrationError.status !== 502 || !registrationError.data?.campaignId) throw registrationError;
        registration = registrationError.data;
      }
      if (!registration?.campaignId) throw new Error("تعذر فتح خطوة التفعيل الآن. حاول مجددًا.");
      setSuccess("تم تسجيل الحملة بنجاح. جارٍ فتح خطوة التفعيل.");
      window.setTimeout(() => navigate("/payment", { state: { campaign: checkoutCampaign, registration } }), 450);
    } catch (submitError) {
      setError(presentApiError(submitError, "تعذر إكمال الطلب. تحققي من البيانات وحاولي مرة أخرى."));
    } finally {
      setSubmitting(false);
    }
  }

  return <main className={`auth-page ${isRegister ? "auth-page-register" : "auth-page-login"}`} dir="rtl">
    <section className="auth-brand-panel">
      <img key={mode} className="auth-scene-image" src={isRegister ? makkahRegistrationImage : madinahLoginImage} alt={isRegister ? "الكعبة والمسجد الحرام وقت الغروب" : "المسجد النبوي وقبته الخضراء وقت الغروب"} />
      <div className="auth-scene-shade" />
      {!isRegister && <EmbraceIllustration variant="welcome"/>}
      <div className="auth-brand-copy"><span className="auth-brand-eyebrow">أهلًا بك في أُنس</span><h1>{isRegister ? <>ابدأ بتنظيم<br/><em>رعاية حملتك</em></> : <>أهلًا بعودتك<br/><em>إلى أُنس</em></>}</h1><p>{isRegister ? "أنشئ مساحة موحدة لفريق حملتك، وتابع خطوات التفعيل بوضوح. نحن معك في خدمة ضيوف الرحمن." : "سجّل الدخول للوصول إلى مساحة العمل المناسبة لدورك في الحملة."}</p></div>
      <div className="auth-brand-benefits" aria-label="مزايا أُنس">
        <div><span><UsersRound size={20}/></span><b>إدارة فريقك</b><small>أضف المشرفين والمندوبين</small></div>
        <div><span><ShieldCheck size={20}/></span><b>متابعة البلاغات</b><small>تابع الحالات بوضوح</small></div>
        <div><span><BarChart3 size={20}/></span><b>تنظيم أفضل</b><small>أدوات تسهّل إدارة الحملة</small></div>
      </div>
    </section>
    <section className="auth-form-side"><header className="auth-form-header"><Link to="/" className="auth-logo"><img src={logo} alt="أُنس"/></Link><div className="auth-top-link"><Link to="/">العودة إلى الموقع <ArrowLeft size={15}/></Link></div></header><div className="auth-card">
      <span className="auth-kicker">{isRegister ? "انضم إلى أُنس" : "مساحة العمل الداخلية"}</span>
      <h2>{isRegister ? "تسجيل حملة جديدة" : "تسجيل الدخول"}</h2>
      <p className="auth-intro">{isRegister ? "يسعدنا أن نرافق حملتكم. ابدأ بإدخال بياناتها الأساسية." : "أدخل بيانات حسابك للمتابعة."}</p>
      {isRegister && <div className="auth-progress" aria-label="الخطوة الأولى من خطوتين"><span className="is-current"><i>١</i><b>بيانات الحملة</b></span><span className="auth-progress-line"/><span><i>٢</i><b>تفعيل الحساب</b></span></div>}
      {success ? <div className="auth-success" role="status"><span className="auth-success-icon"><EmbraceMark/><CheckCircle2 size={25}/></span><b>خطوة جميلة اكتملت</b><span>{success}</span></div> : <form key={mode} className="auth-form" onSubmit={handleSubmit}>
        {isRegister && <>
          <label>اسم الحملة<div className="auth-input"><Building2 size={17}/><input name="campaignName" maxLength={100} required placeholder="أدخل اسم الحملة" autoComplete="organization"/></div></label>
          <div className="auth-fields-two auth-single-field"><label>رقم التواصل<div className="auth-input"><Phone size={16}/><input name="contactNumber" type="tel" inputMode="numeric" pattern="05[0-9]{8}" maxLength="10" title="أدخل رقمًا يبدأ بـ05 ويتكوّن من 10 أرقام." required placeholder="05xxxxxxxx"/></div></label></div>
          <div className="auth-fields-two auth-campaign-dates"><GregorianDatePicker name="startDate" label="تاريخ البداية" value={startDate} onChange={setStartDate} /><GregorianDatePicker name="endDate" label="تاريخ النهاية" value={endDate} onChange={setEndDate} min={startDate} /></div>
        </>}
        <label>البريد الإلكتروني<div className="auth-input"><Mail size={17}/><input type="email" name="email" inputMode="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="أدخل البريد الإلكتروني"/></div></label>
        {!isRegister && <><label>كلمة المرور<div className="auth-input"><LockKeyhole size={17}/><input name="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required placeholder="أدخل كلمة المرور"/><button className="auth-show-password" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label><div className="auth-options"><label><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)}/> تذكرني</label><button type="button" aria-expanded={showRecovery} onClick={() => setShowRecovery((value) => !value)}>نسيت كلمة المرور؟</button></div></>}
        {isRegister && <label>كلمة مرور الحملة<div className="auth-input"><LockKeyhole size={17}/><input name="password" type={showPassword ? "text" : "password"} value={campaignPassword} onChange={(event) => setCampaignPassword(event.target.value)} autoComplete="new-password" minLength={8} required placeholder="أنشئ كلمة مرور للحملة"/><button className="auth-show-password" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>}
        {showRecovery && <p className="auth-recovery-note">لا تتوفر إعادة تعيين آلية في نسخة العرض. يرجى التواصل مع مسؤول الحساب.</p>}
        {error && <div className="auth-error" role="alert"><p>{error.message}</p></div>}
        <button className="auth-submit" type="submit" disabled={submitting} aria-busy={submitting}>{submitting ? "جارٍ المعالجة…" : isRegister ? "متابعة إلى التفعيل" : "تسجيل الدخول"}<ArrowRight size={17}/></button>
      </form>}
      <div className="auth-card-footer">{isRegister ? <>لديك حساب بالفعل؟ <Link to="/login" onClick={clearModeFeedback}>سجّل الدخول</Link></> : <>تدير حملة جديدة؟ <Link to="/register" onClick={clearModeFeedback}>أنشئ حساب حملة</Link></>}</div>
    </div><footer className="auth-legal">أُنس — لكم من القلب أُنس، ومنا اهتمام.</footer></section>
  </main>;
}
