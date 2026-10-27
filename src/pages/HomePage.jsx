import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, HeartHandshake, Menu, ShieldCheck, UsersRound, X } from "lucide-react";
import { Link } from "react-router-dom";
import makkahImage from "../assets/images/makkah-madinah-enhanced.jpg";
import EmbraceIllustration from "../components/EmbraceIllustration";
import Reveal from "../components/Reveal";
import "../styles/HomePage.css";

const logo = "/ons-logo.png";

const navLinks = [["عن أُنس", "about"], ["رحلة الفريق", "how"], ["الأسئلة الشائعة", "faq"]];

export default function HomePage() {
  const heroRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  useEffect(() => {
    const updateScrollState = () => setNavScrolled(window.scrollY > 24);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let frame = 0;
    const updateParallax = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        hero.style.setProperty("--hero-scroll-y", `${Math.min(window.scrollY * 0.08, 56)}px`);
      });
    };
    const updatePointer = (event) => {
      const bounds = hero.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      hero.style.setProperty("--hero-shift-x", `${x * 5}px`);
      hero.style.setProperty("--hero-shift-y", `${y * 4}px`);
    };
    const resetPointer = () => {
      hero.style.setProperty("--hero-shift-x", "0px");
      hero.style.setProperty("--hero-shift-y", "0px");
    };
    updateParallax();
    window.addEventListener("scroll", updateParallax, { passive: true });
    if (!window.matchMedia("(pointer: coarse)").matches) {
      hero.addEventListener("pointermove", updatePointer, { passive: true });
      hero.addEventListener("pointerleave", resetPointer);
    }
    return () => {
      window.removeEventListener("scroll", updateParallax);
      hero.removeEventListener("pointermove", updatePointer);
      hero.removeEventListener("pointerleave", resetPointer);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <main className="ons-public" dir="rtl">
      <header className={`ons-nav-wrap ${navScrolled ? "is-scrolled" : ""}`}>
        <Link to="/" className="ons-logo" aria-label="أُنس — الرئيسية"><img src={logo} alt="أُنس"/></Link>
        <button className="ons-menu-toggle" type="button" aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X/> : <Menu/>}</button>
        <nav className={`ons-nav ${menuOpen ? "is-open" : ""}`} aria-label="القائمة الرئيسية">{navLinks.map(([label, id]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>)}<Link className="ons-mobile-register" to="/register" onClick={() => setMenuOpen(false)}>ابدأ مع أُنس <ArrowLeft size={16}/></Link></nav>
        <div className="ons-nav-actions"><Link className="ons-login-link" to="/login">تسجيل الدخول <ArrowLeft size={15}/></Link><Link className="ons-register-link" to="/register">ابدأ مع أُنس <ArrowLeft size={15}/></Link></div>
      </header>
    <section ref={heroRef} className="ons-hero" id="home" style={{ "--hero-image": `url("${makkahImage}")` }}>
      <div className="ons-hero-image" aria-hidden="true"/><div className="ons-hero-shade" aria-hidden="true"/>
      <div className="ons-hero-inner">
        <div className="ons-hero-copy">
          <span className="ons-hero-manifesto">أُنس يسبق خطاك</span>
          <h1>لأن ضيوف الرحمن<br/><em>يستحقون الأجمل</em></h1>
          <p>نصنع تجربة أكثر تنظيمًا، وعنايةً أقرب، ورحلةً يملؤها الاطمئنان.</p>
          <ul className="ons-hero-points" aria-label="ما تقدمه أُنس"><li className="ons-hero-point"><span><HeartHandshake size={23}/></span><b>عناية ترافق الرحلة</b></li><li className="ons-hero-point"><span><UsersRound size={23}/></span><b>وفريق حاضر حين تحتاجه</b></li></ul>
        </div>
      </div>
    </section>

    <Reveal className="reveal-editorial"><section className="ons-story" id="about">
      <div className="ons-story-copy"><span className="ons-section-kicker">معًا لخدمة ضيوف الرحمن</span><h2>منصة أُنس<br/><em>لتنظيم الجهود وصناعة الأثر</em></h2><p>مساحة تجمع فرق الحج والعمرة، وتيسّر تنسيق العمل ومتابعة طلبات المساعدة؛ لتبقى العناية أقرب إلى ضيوف الرحمن.</p></div>
      <div className="ons-value-cards"><article><span><UsersRound size={23}/></span><b>تنظيم متكامل</b><small>لفرق الخدمة ومهامهم ضمن نظام واحد</small></article><article><span><HeartHandshake size={23}/></span><b>عناية أقرب</b><small>لضيوف الرحمن واحتياجاتهم</small></article><article><span><ShieldCheck size={23}/></span><b>متابعة أسهل</b><small>وإدارة أوضح لكل خطوة</small></article></div>
    </section></Reveal>

    <Reveal className="reveal-hadith"><section className="ons-hadith" aria-label="حديث شريف"><div className="hadith-inner"><span className="hadith-kicker">قال رسول الله صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ:</span><blockquote>«وَاللَّهُ فِي عَوْنِ الْعَبْدِ مَا كَانَ الْعَبْدُ فِي عَوْنِ أَخِيهِ»</blockquote><cite>رواه مسلم (2699)</cite></div></section></Reveal>

    <Reveal className="reveal-workflow"><section className="ons-workflow" id="how"><div className="ons-workflow-heading"><span className="ons-section-kicker">فريق يعمل معًا</span><h2>أدوار متصلة،<br/><em>وعناية أقرب</em></h2><p>كل عضو يعرف مسؤوليته، وتتكامل الجهود حول احتياج الحاج.</p><Link className="ons-text-link" to="/register">أنشئ حساب حملتك <ArrowLeft size={16}/></Link></div>
      <div className="ons-flow-visual"><div className="flow-roles"><div className="flow-path" aria-hidden="true"><span/></div><article className="flow-node flow-owner"><span className="flow-node-icon"><ShieldCheck size={20}/></span><small>إدارة الحملة</small><b>صاحب الحملة</b><p>يدير الحملة ويضيف المشرفين.</p><em>١</em></article><article className="flow-node flow-supervisor"><span className="flow-node-icon"><UsersRound size={20}/></span><small>تنظيم الفريق</small><b>المشرف</b><p>ينظم فريقه ويضيف المندوبين.</p><em>٢</em></article><article className="flow-node flow-rep"><span className="flow-node-icon"><HeartHandshake size={20}/></span><small>المتابعة الميدانية</small><b>المندوب</b><p>يتابع مسؤولياته وطلبات المساعدة.</p><em>٣</em></article></div><div className="flow-beneficiary"><span><HeartHandshake size={19}/></span><div><b>الحاج محور العناية</b><small>تتكامل الأدوار لتكون الخدمة أقرب</small></div></div></div>
    </section></Reveal>

    <Reveal className="ons-closing-reveal"><section className="ons-closing"><EmbraceIllustration variant="team" className="closing-illustration"/><div className="closing-content"><span className="ons-section-kicker">حياك الله في أُنس</span><h2>ابدأ بخطوة،<br/><em>واجمع فريقك على العناية</em></h2><p>أنشئ حساب حملتك، ثم أكمل خطوات التفعيل لإدارة فريقك.</p><Link className="ons-button-gold" to="/register">إنشاء حساب حملة <ArrowLeft size={17}/></Link></div></section></Reveal>

    <Reveal><section className="ons-faq" id="faq"><div className="ons-faq-heading"><span className="ons-section-kicker">بداية واضحة</span><h2>أسئلة تتبادر<br/><em>إلى بالك</em></h2><p>إن كانت هذه أول زيارة لك، فهذه إجابات تساعدك على البدء.</p><Link className="ons-text-link" to="/login">لديك حساب؟ سجّل الدخول <ArrowLeft size={16}/></Link></div><div className="ons-faq-list"><details><summary>كيف أبدأ مع أُنس؟ <ChevronDown size={17}/></summary><p>أنشئ حساب حملتك، أكمل خطوة التفعيل، ثم سجّل الدخول لإدارة فريقك.</p></details><details><summary>كيف يتوزع العمل بين أعضاء الفريق؟ <ChevronDown size={17}/></summary><p>صاحب الحملة يضيف المشرفين، والمشرف يضيف المندوبين، ولكل عضو مساحة تناسب دوره.</p></details><details><summary>هل يمكن متابعة طلبات المساعدة؟ <ChevronDown size={17}/></summary><p>يمكن للمندوب متابعة مسؤولياته وطلبات المساعدة المرتبطة بدوره.</p></details></div></section></Reveal>

    <footer className="ons-footer"><div className="ons-footer-main"><Link to="/" className="ons-footer-brand"><img src={logo} alt="أُنس"/><span>في ضيافة الرحمن<br/><b>أُنسُك عندنا</b></span></Link><nav className="ons-footer-links" aria-label="روابط التذييل"><a href="#about">عن أُنس</a><a href="#how">رحلة الفريق</a><a href="#faq">الأسئلة الشائعة</a><Link to="/login">تسجيل الدخول</Link><Link to="/register">إنشاء حساب حملة</Link></nav></div><div className="ons-footer-bottom"><span>© أُنس — منصة لتنظيم خدمة ضيوف الرحمن</span></div></footer>
  </main>;
}
