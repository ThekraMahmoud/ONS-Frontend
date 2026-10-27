export default function EmbraceMark({ className = "", label = "" }) {
  return <svg className={`embrace-mark ${className}`} viewBox="0 0 180 110" fill="none" aria-hidden={label ? undefined : "true"} role={label ? "img" : undefined} aria-label={label || undefined}>
    <path className="embrace-line embrace-line-left" d="M80 94C49 91 21 70 20 45 19 25 36 13 55 18c15 4 25 18 30 37"/>
    <path className="embrace-line embrace-line-right" d="M100 94c31-3 59-24 60-49 1-20-16-32-35-27-15 4-25 18-30 37"/>
    <circle className="embrace-light" cx="90" cy="62" r="4"/>
  </svg>;
}
