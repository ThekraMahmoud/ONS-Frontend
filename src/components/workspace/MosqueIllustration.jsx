import RoleArchitecture from "./RoleArchitecture.jsx";
import { useId } from "react";

// Original, decorative vector architecture; never placed behind working data.
export default function MosqueIllustration({ className = "", variant = "supervisor" }) {
  const id = useId().replace(/:/g, "");
  if (variant !== "supervisor") return <RoleArchitecture variant={variant} className={className} />;
  return <svg className={`ons-mosque-art ${className}`} viewBox="0 0 420 260" fill="none" aria-hidden="true" focusable="false">
    <defs><linearGradient id={`${id}-stone`} x1="210" y1="64" x2="210" y2="250" gradientUnits="userSpaceOnUse"><stop stopColor="#F1DEAF" /><stop offset="1" stopColor="#B8995C" /></linearGradient><linearGradient id={`${id}-dome`} x1="210" y1="87" x2="210" y2="172" gradientUnits="userSpaceOnUse"><stop stopColor="#6B9C7C" /><stop offset="1" stopColor="#215F4A" /></linearGradient><pattern id={`${id}-stars`} width="64" height="64" patternUnits="userSpaceOnUse"><path d="M32 8 49 15 56 32 49 49 32 56 15 49 8 32 15 15Z M14 14H50V50H14Z" stroke="#DCC58E" strokeWidth=".5" opacity=".35" /></pattern></defs>
    <path d="M31 248V137C31 74 85 21 148 21H273C337 21 390 75 390 138V248" stroke="#D8BE7B" strokeOpacity=".3" />
    <path d="M44 248V139C44 80 91 34 149 34H272C331 34 378 81 378 139V248" fill={`url(#${id}-stars)`} stroke="#D8BE7B" strokeOpacity=".2" />
    <circle cx="319" cy="64" r="17" fill="#DFCA91" fillOpacity=".13" /><path d="M325 49A16 16 0 1 0 333 74A15 15 0 0 1 325 49Z" fill="#DCC58E" />
    <g stroke="#DCC58E" strokeLinecap="round"><path d="M91 66V74M87 70H95M277 35V41M274 38H280M355 111V119M351 115H359" opacity=".7" /><path d="M113 104q7-6 14 0q7-6 14 0M264 78q5-5 10 0q5-5 10 0" opacity=".45" /></g>
    <g fill={`url(#${id}-stone)`} stroke="#E6CF96" strokeWidth=".7">
      <path d="M76 239V100H91V239ZM72 102V96H95V102ZM74 90V84H93V90ZM78 84V62L84 50 90 62V84ZM81 50V39H86V50ZM70 152V145H97V152Z" />
      <path d="M329 239V100H344V239ZM325 102V96H348V102ZM327 90V84H346V90ZM331 84V62L337 50 343 62V84ZM334 50V39H339V50ZM323 152V145H350V152Z" />
    </g>
    <path d="M113 240V163H308V240Z" fill="#D2B67B" /><path d="M106 166H315V173H106Z" fill="#ECD59B" />
    <path d="M159 164C157 135 172 112 210 94C248 112 263 135 261 164Z" fill={`url(#${id}-dome)`} stroke="#DCC58E" />
    <path d="M210 94V78M206 79H214M175 161C173 137 188 116 210 98M245 161C247 137 232 116 210 98M210 101V162" stroke="#AFCA9B" strokeOpacity=".45" />
    <path d="M207 70A5 5 0 1 0 214 75A5 5 0 0 1 207 70Z" fill="#EAD49B" />
    <path d="M102 240V186H163V240M257 240V186H318V240" fill="#DEC58C" />
    <path d="M97 186C99 172 110 159 132 151C153 160 164 172 167 186ZM253 186C255 172 266 159 288 151C309 160 320 172 323 186Z" fill="#5C896D" stroke="#DCC58E" />
    <g fill="#174939" stroke="#F1DEAF" strokeWidth="1.2"><path d="M190 240V207Q190 190 210 179Q230 190 230 207V240ZM123 240V213Q123 204 133 198Q143 204 143 213V240ZM277 240V213Q277 204 287 198Q297 204 297 213V240Z" /></g>
    <g stroke="#9A7F49"><path d="M183 240V205Q183 185 210 171Q237 185 237 205V240M114 240V212Q114 198 133 190Q152 198 152 212V240M268 240V212Q268 198 287 190Q306 198 306 212V240" /></g>
    <path d="M46 241H374M31 249H390" stroke="#DCC58E" strokeOpacity=".65" /><path d="M68 255H352" stroke="#DCC58E" strokeOpacity=".25" />
  </svg>;
}
