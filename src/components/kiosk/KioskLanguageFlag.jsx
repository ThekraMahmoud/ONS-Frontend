const flagContent = {
ar: (
  <>
    <image
href="/flags/saudi-flag.png"
      x="0"
      y="0"
      width="60"
      height="60"
      preserveAspectRatio="xMidYMid slice"
    />
  </>
),
 en: <><rect width="60" height="60" fill="#17356e" /><path d="m0 0 60 60M60 0 0 60" stroke="#fff" strokeWidth="13" /><path d="m0 0 60 60M60 0 0 60" stroke="#c9273d" strokeWidth="5" /><path d="M30 0v60M0 30h60" stroke="#fff" strokeWidth="19" /><path d="M30 0v60M0 30h60" stroke="#c9273d" strokeWidth="9" /></>,
  ur: <><rect width="60" height="60" fill="#075b42" /><rect width="13" height="60" fill="#fff" /><path d="M35 17a14 14 0 1 0 13 21 17 17 0 1 1-13-21Z" fill="#fff" /><path d="m43 18 1.4 3.2 3.5.3-2.7 2.2.9 3.4-3.1-1.8-3 1.8.8-3.4-2.6-2.2 3.4-.3Z" fill="#fff" /></>,
  id: <><rect width="60" height="30" fill="#d92732" /><rect y="30" width="60" height="30" fill="#fff" /></>,
  bn: <><rect width="60" height="60" fill="#087c52" /><circle cx="34" cy="30" r="13" fill="#e52d3a" /></>,
  tr: <><rect width="60" height="60" fill="#e5223c" /><path d="M29 17a13 13 0 1 0 12 21 16 16 0 1 1-12-21Z" fill="#fff" /><path d="m43 24 1.7 4 4.3.3-3.3 2.7 1.1 4.2-3.8-2.2-3.8 2.2 1-4.2-3.2-2.7 4.2-.3Z" fill="#fff" /></>,
  fa: <><rect width="60" height="20" fill="#15905a" /><rect y="20" width="60" height="20" fill="#fff" /><rect y="40" width="60" height="20" fill="#d83243" /><circle cx="30" cy="30" r="6" fill="#d83243" /></>,
  fr: <><rect width="20" height="60" fill="#1c3f91" /><rect x="20" width="20" height="60" fill="#fff" /><rect x="40" width="20" height="60" fill="#e43a4a" /></>,
  ha: <><rect width="20" height="60" fill="#16864f" /><rect x="20" width="20" height="60" fill="#fff" /><rect x="40" width="20" height="60" fill="#16864f" /></>,
  ru: <><rect width="60" height="20" fill="#fff" /><rect y="20" width="60" height="20" fill="#2451a4" /><rect y="40" width="60" height="20" fill="#d93645" /></>,
  zh: <><rect width="60" height="60" fill="#d92731" /><path d="m18 10 2.5 6 6.5.5-5 4 1.7 6-5.7-3.5-5.5 3.5 1.5-6-4.7-4 6.2-.5Z" fill="#ffde55" /><circle cx="37" cy="15" r="2.2" fill="#ffde55" /><circle cx="44" cy="23" r="2.2" fill="#ffde55" /><circle cx="43" cy="33" r="2.2" fill="#ffde55" /><circle cx="36" cy="40" r="2.2" fill="#ffde55" /></>,
  sw: <><rect width="60" height="60" fill="#208a4c" /><path d="M0 0h60v60Z" fill="#1689ca" /><path d="m0 0 60 60" stroke="#f4d23c" strokeWidth="19" /><path d="m0 0 60 60" stroke="#151d21" strokeWidth="10" /></>,
  am: <><rect width="60" height="20" fill="#15964b" /><rect y="20" width="60" height="20" fill="#f5d339" /><rect y="40" width="60" height="20" fill="#d93940" /><circle cx="30" cy="30" r="11" fill="#1767a9" /><path d="m30 20 2.4 7.2h7.5l-6 4.5 2.3 7.2-6.2-4.5-6.1 4.5 2.3-7.2-6-4.5h7.4Z" fill="#f9da4f" /></>,
};

export default function KioskLanguageFlag({ code }) {
  return (
    <svg className="kiosk-language-flag" viewBox="0 0 60 60" aria-hidden="true" focusable="false">
      <defs><clipPath id={`kiosk-flag-${code}`}><circle cx="30" cy="30" r="29" /></clipPath></defs>
      <g clipPath={`url(#kiosk-flag-${code})`}>{flagContent[code] || flagContent.en}</g>
      <circle cx="30" cy="30" r="29" fill="none" stroke="#d9d9d2" strokeWidth="2" />
    </svg>
  );
}
