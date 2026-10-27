import { Link } from "react-router-dom";
import { KeyRound } from "lucide-react";
import logo from "../assets/logos/ons-logo-optimized.png";
import "../styles/SetPasswordPage.css";

export default function SetPasswordPage() {
  return (
    <main className="first-password-page" dir="rtl">
      <header className="first-password-header">
        <Link to="/" aria-label="العودة إلى أُنس"><img src={logo} alt="أُنس" /></Link>
      </header>
      <section className="first-password-card" role="status">
        <span className="first-password-icon"><KeyRound size={23} /></span>
        <span className="first-password-kicker">حماية حسابك</span>
        <h1>لا يمكن تحديد أول دخول لهذا الحساب</h1>
        <p>
          الـBackend يوفّر مسارًا لتغيير كلمة المرور، لكنه لا يرسل علامة توضّح أن الحساب
          يستخدم كلمة مؤقتة أو أن هذه أول مرة يسجل فيها. لذلك لا يمكن فتح هذه الخطوة تلقائيًا
          بأمان دون تخمين حالة الحساب.
        </p>
        <Link className="first-password-submit" to="/login">العودة إلى تسجيل الدخول</Link>
      </section>
      <p className="first-password-footer">أُنس — عناية ترافق رحلتك</p>
    </main>
  );
}
