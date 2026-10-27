import "../styles/EmbraceIllustration.css";

const captions = {
  welcome: {
    title: "أُنسٌ يقرّب المسافات",
    description: "رفقةٌ وعناية، في كل خطوة.",
    label: "رسم متحرك يعبّر عن الاحتضان والترابط",
  },
  team: {
    title: "فريقٌ يلتقي على العناية",
    description: "أدوار تتكامل لخدمة ضيوف الرحمن.",
    label: "رسم متحرك لفريق يتكاتف لخدمة الحجاج",
  },
};

export default function EmbraceIllustration({ variant = "welcome", className = "" }) {
  const copy = captions[variant] || captions.welcome;

  return (
    <figure className={`auth-embrace-illustration is-${variant} ${className}`.trim()} role="img" aria-label={copy.label}>
      <svg className="auth-embrace-art" viewBox="0 0 360 230" aria-hidden="true">
        <path className="embrace-arch" d="M42 184V112C42 35 98 17 180 17s138 18 138 95v72" />
        <path className="embrace-arch-inner" d="M60 184v-69c0-61 47-82 120-82s120 21 120 82v69" />
        <ellipse className="embrace-ground" cx="180" cy="197" rx="104" ry="8" />

        <g className="team-connections">
          <path d="M102 48h156" />
          <circle cx="102" cy="48" r="7" />
          <circle cx="180" cy="48" r="7" />
          <circle cx="258" cy="48" r="7" />
        </g>

        <g className="gather gather-left">
          <circle className="figure-head" cx="111" cy="112" r="17" />
          <path className="figure-body figure-left" d="M76 191c1-39 12-59 35-59s35 20 36 59z" />
        </g>
        <g className="gather gather-right">
          <circle className="figure-head figure-head-light" cx="249" cy="112" r="17" />
          <path className="figure-body figure-right" d="M213 191c1-39 13-59 36-59s34 20 35 59z" />
        </g>
        <g className="figure-center">
          <circle className="figure-head figure-head-gold" cx="180" cy="91" r="19" />
          <path className="figure-body figure-main" d="M139 191c2-49 16-75 41-75s39 26 41 75z" />
        </g>

        <path className="embrace-arm arm-left" d="M154 144c-19-18-43-23-62-12-18 10-18 29 0 39 12 7 23 8 34 5" />
        <path className="embrace-arm arm-right" d="M206 144c19-18 43-23 62-12 18 10 18 29 0 39-12 7-23 8-34 5" />
        <path className="embrace-heart" d="M180 158c-9-8-20-3-18 7 1 7 12 15 18 19 6-4 17-12 18-19 2-10-9-15-18-7z" />
      </svg>
      <figcaption>
        <b>{copy.title}</b>
        <span>{copy.description}</span>
      </figcaption>
    </figure>
  );
}
