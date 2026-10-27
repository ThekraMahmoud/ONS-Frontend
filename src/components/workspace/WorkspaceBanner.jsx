import MosqueIllustration from "./MosqueIllustration.jsx";

const messages = {
  supervisor: "بالعناية نُطمئن، وبأُنس نرافق.",
  campaign: "رحلةٌ تجمعنا، وعنايةٌ تصل إلى كل حاج.",
  admin: "إتقان التنظيم.. أثرٌ يمتدّ إلى كل رحلة.",
  delegate: "خطوتك نحوهم.. طمأنينةٌ لهم.",
};
export default function WorkspaceBanner({ eyebrow, title, description, variant = "supervisor" }) {
  return <section className={`ons-role-banner ons-banner-${variant}`}><div className="ons-role-banner-copy"><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p><small>{messages[variant] || messages.delegate}</small></div><div className="ons-role-banner-art"><MosqueIllustration variant={variant} /></div></section>;
}
