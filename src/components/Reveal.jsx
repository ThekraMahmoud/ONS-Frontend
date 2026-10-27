import { useEffect, useRef, useState } from "react";

export default function Reveal({ children, className = "", delay = 0 }) {
  const element = useRef(null);
  const [visible, setVisible] = useState(() => typeof window !== "undefined" && (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches));

  useEffect(() => {
    if (!element.current) return;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    observer.observe(element.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={element} className={`ons-reveal ${visible ? "is-visible" : ""} ${className}`} style={{ "--reveal-delay": `${delay}ms` }}>{children}</div>;
}
