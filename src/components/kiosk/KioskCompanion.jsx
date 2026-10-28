import {useEffect,useRef,useState} from "react";
import {Accessibility,ArrowLeft,CheckCircle2,Contrast,Globe,Heart,HelpCircle,LifeBuoy,MapPin,Plus,QrCode,RotateCcw,UserRound,Volume2,X} from "lucide-react";

const labels={
 ar:{help:"اشرح لي",large:"نص أكبر",contrast:"وضوح أعلى",close:"إغلاق",guide:"معك خطوة بخطوة",intro:"خذ وقتك. اختر ما تحتاجه، ويمكنك الرجوع في أي وقت.",waiting:"لحظات طمأنينة",calm:"طلبك معنا، وتستطيع متابعة حالته في أي وقت.",count:"سبحان الله",reset:"ابدأ من جديد",tips:"ابقَ في مكان واضح قرب الجهاز ليسهل الوصول إليك.",listen:"استمع للشرح",missing:"اتبع الخطوات المصوّرة أعلاه، وخذ وقتك في الاختيار."},
 en:{help:"Guide me",large:"Larger text",contrast:"High contrast",close:"Close",guide:"With you, step by step",intro:"Take your time. Choose what you need and go back at any time.",waiting:"A moment of reassurance",calm:"Your request is with us. Check its status at any time.",count:"Subhan Allah",reset:"Start again",tips:"Stay somewhere visible near the kiosk so the team can reach you.",listen:"Listen to the guide",missing:"Follow the illustrated steps above and take your time."},
 ur:{help:"رہنمائی",large:"بڑا متن",contrast:"واضح منظر",close:"بند کریں"},tr:{help:"Bana anlat",large:"Büyük yazı",contrast:"Yüksek kontrast",close:"Kapat"},fr:{help:"Guidez-moi",large:"Grand texte",contrast:"Contraste élevé",close:"Fermer"},id:{help:"Panduan",large:"Teks besar",contrast:"Kontras tinggi",close:"Tutup"},bn:{help:"সহায়িকা",large:"বড় লেখা",contrast:"উচ্চ কনট্রাস্ট",close:"বন্ধ করুন"},fa:{help:"راهنما",large:"متن بزرگ",contrast:"وضوح بیشتر",close:"بستن"},sw:{help:"Niongoze",large:"Maandishi makubwa",contrast:"Uwazi zaidi",close:"Funga"},ha:{help:"Jagorance",large:"Babban rubutu",contrast:"Karin haske",close:"Rufe"},zh:{help:"使用指南",large:"大号字体",contrast:"高对比度",close:"关闭"},ru:{help:"Помощь",large:"Крупный текст",contrast:"Контраст",close:"Закрыть"}
};
function guideSteps(screen,t){
 if(screen==='welcome')return [[Globe,t.choose,t.menuHint],[LifeBuoy,t.menu,t.lostHint]];
 if(screen==='menu')return [[LifeBuoy,t.lost,t.lostHint],[MapPin,t.restroom,t.restroomHint],[MapPin,t.gate,t.gateHint]];
 if(screen==='assistance')return [[QrCode,t.scan,t.scanHint],[UserRound,t.manual,t.manualHint]];
 if(screen==='identity')return [[QrCode,t.scan,t.qrInstructions||t.scanHint],[UserRound,t.manual,t.manualHint]];
 if(screen==='report-tracking')return [[CheckCircle2,t.reportSuccessTitle,t.reportTrackHint],[QrCode,t.reportTrackTitle,t.reportTrackingRefresh],[MapPin,t.reportWaitingForRepresentative,t.sessionNote]];
 return [[MapPin,t.menu,t.sessionNote]];
}
export default function KioskCompanion({screen,language,t,largeText,onLargeText,highContrast,onContrast}){
 const [open,setOpen]=useState(false);const [clips,setClips]=useState({});const [audioState,setAudioState]=useState('idle');
 const dialog=useRef(null);const audio=useRef(null);const copy={...labels.en,...labels[language]};
 if(!labels[language]?.guide){copy.guide=t.helpTitle||copy.guide;copy.intro=t.welcomeHospitality||copy.intro;}
 useEffect(()=>{let active=true;fetch('/audio/kiosk/index.json').then(r=>r.ok?r.json():{}).then(data=>{if(active)setClips(data);}).catch(()=>{});return()=>{active=false;};},[]);
 useEffect(()=>()=>{audio.current?.pause();},[screen,language]);
 useEffect(()=>{
  if(!open)return;
  const previous=document.activeElement;dialog.current?.querySelector('button')?.focus();
  const key=event=>{if(event.key==='Escape')setOpen(false);if(event.key!=='Tab')return;const buttons=[...dialog.current.querySelectorAll('button:not(:disabled),a[href]')];const first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}};
  document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus?.();audio.current?.pause();};
 },[open]);
 const clip=clips[language]?.[screen];
 async function play(){if(!clip)return;audio.current?.pause();const player=new Audio(clip);audio.current=player;setAudioState('playing');player.onended=()=>setAudioState('idle');try{await player.play();}catch{setAudioState('error');}}
 return <>
  <div className="kiosk-accessibility-dock" aria-label={copy.help}><button type="button" onClick={()=>setOpen(true)}><HelpCircle size={22}/><span>{copy.help}</span></button><button type="button" aria-pressed={largeText} onClick={onLargeText}><Accessibility size={22}/><span>{copy.large}</span></button><button type="button" aria-pressed={highContrast} onClick={onContrast}><Contrast size={22}/><span>{copy.contrast}</span></button></div>

  {open&&<div className="kiosk-help-backdrop" onClick={event=>event.target===event.currentTarget&&setOpen(false)}><section ref={dialog} className="kiosk-help-dialog" role="dialog" aria-modal="true" aria-labelledby="kiosk-help-title" dir={language==='ar'||language==='ur'||language==='fa'?'rtl':'ltr'}><header><span><Heart size={19}/>{t.welcome}</span><button type="button" aria-label={copy.close} onClick={()=>setOpen(false)}><X size={24}/></button></header><h2 id="kiosk-help-title">{copy.guide}</h2><p>{copy.intro}</p><ol>{guideSteps(screen,t).filter(([,title])=>title).map(([Icon,title,hint],index)=><li key={index}><span className="kiosk-help-step-icon"><Icon size={27}/></span><div><small>{new Intl.NumberFormat(language).format(index+1)}</small><h3>{title}</h3>{hint&&<p>{hint}</p>}</div></li>)}</ol>{clip?<button type="button" className="kiosk-guide-audio" onClick={play} aria-busy={audioState==='playing'}><Volume2 size={22}/>{copy.listen}</button>:<p className="kiosk-guide-note">{copy.missing}</p>}{audioState==='error'&&<p role="alert">{t.audioUnavailable}</p>}<button type="button" className="kiosk-help-continue" onClick={()=>setOpen(false)}>{copy.close}<ArrowLeft size={20}/></button></section></div>}
 </>;
}

export function KioskReassurance({language}){const [count,setCount]=useState(0);const copy={...labels.en,...labels[language]};
  return <section className="kiosk-reassurance"><span className="kiosk-reassurance-mark"><Heart size={24}/></span><div><h2>{copy.waiting}</h2><p>{copy.tips}</p></div><button type="button" className="kiosk-tasbih" onClick={()=>setCount(v=>v+1)} aria-label={`${copy.count}: ${count}`}><span>{copy.count}</span><b aria-live="polite">{new Intl.NumberFormat(language).format(count)}</b><Plus size={19}/></button>{count>0&&<button type="button" className="kiosk-counter-reset" aria-label={copy.reset} onClick={()=>setCount(0)}><RotateCcw size={18}/></button>}</section>;
}
