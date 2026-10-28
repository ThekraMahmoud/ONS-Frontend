import {useState} from 'react';
import {Accessibility,Check,ChevronDown,Globe,MapPin,Pause,Volume2} from 'lucide-react';
import logo from '../../assets/logos/ons-logo-optimized.png';
import KioskLanguageFlag from './KioskLanguageFlag.jsx';

const primaryCodes=['ar','en','ur','id','tr','fr','fa','sw'];
export default function KioskWelcomeScreen({locale,t,languages,languageCode,onSelect,onSwitchDevice,textScale,onScale,expanded,onExpanded,narration,onToggleAudio}){
 const [accessOpen,setAccessOpen]=useState(false);
 const ar=locale.code==='ar';
 const primary=primaryCodes.map(code=>languages.find(item=>item.code===code)).filter(Boolean);
 const others=languages.filter(item=>!primaryCodes.includes(item.code));
 function languageButton(item){
   const speaking=narration.playing&&narration.language===item.code;
   const selected=languageCode===item.code;
   return <button type="button" key={item.code} className={`arrival-language-button${speaking?' is-speaking':''}${selected?' is-selected':''}`} onClick={()=>onSelect(item.code)} aria-current={speaking?'true':undefined} aria-label={item.nativeName}>
     <span className="arrival-flag"><KioskLanguageFlag code={item.code}/></span><span className="arrival-language-name" lang={item.code} dir={item.dir}>{item.nativeName}</span><span className="arrival-language-status" aria-hidden="true">{speaking?<Volume2 size={15}/>:selected?<Check size={15}/>:null}</span>
   </button>;
 }
 return <section className="kiosk-arrival" aria-labelledby="kiosk-welcome-title">
  <header className="arrival-header">
   <div className="arrival-header-start"><button type="button" className="arrival-device" onClick={onSwitchDevice}><MapPin size={16}/>{t.switchDevice}</button><span className="arrival-divider"/><button type="button" className="arrival-current-language" onClick={()=>{document.getElementById('arrival-language-title')?.focus();}}><Globe size={18}/><span>{locale.nativeName}</span><ChevronDown size={13}/></button></div>
   <img className="arrival-logo" src={logo} alt="أُنس ONS"/>
   <div className="arrival-header-end"><div className="arrival-text-sizes" role="group" aria-label={t.textSize}>{[1,1.15,1.3].map((scale,index)=><button key={scale} type="button" style={{fontSize:14+index*3}} aria-label={`${t.textSize} ${Math.round(scale*100)}%`} aria-pressed={textScale===scale} onClick={()=>onScale(scale)}>A</button>)}</div><span className="arrival-divider"/><button type="button" className="arrival-access" aria-label={t.accessibility} onClick={()=>setAccessOpen(value=>!value)} aria-expanded={accessOpen} aria-controls="arrival-access-panel"><Accessibility size={19}/><span>{t.accessibility}</span></button></div>
   {accessOpen&&<div id="arrival-access-panel" className="arrival-access-panel"><strong>{t.accessibility}</strong><p>{t.textSize}</p><div className="arrival-text-sizes">{[1,1.15,1.3].map(scale=><button type="button" key={scale} aria-pressed={textScale===scale} onClick={()=>onScale(scale)}>{Math.round(scale*100)}%</button>)}</div><button type="button" className="arrival-audio-toggle" onClick={onToggleAudio}>{narration.playing?<Pause size={18}/>:<Volume2 size={18}/>}<span>{ar?(narration.playing?'إيقاف الشرح':'تشغيل الشرح'):t.audioAssistance}</span></button></div>}
  </header>
  <div className="arrival-layout">
   <section className="arrival-language-panel" aria-labelledby="arrival-language-title">
    <div className="arrival-language-intro"><span className="arrival-globe"><Globe size={29}/></span><h2 id="arrival-language-title" tabIndex={-1}>{ar?'اختر لغتك':t.choose}</h2><p>{ar?'لنقدم لك المساعدة باللغة التي تفضلها.':t.menuHint}</p></div>
    <div className="arrival-language-grid">{primary.map(languageButton)}</div>
    <button type="button" className="arrival-more-languages" aria-expanded={expanded} aria-controls="arrival-extra-languages" onClick={()=>onExpanded(!expanded)}><Globe size={18}/><span>{t.otherLanguages}</span><ChevronDown size={15} className={expanded?'is-expanded':''}/></button>
    {expanded&&<div id="arrival-extra-languages" className="arrival-language-grid arrival-extra-languages">{others.map(languageButton)}</div>}
   </section>
   <div className="arrival-welcome-copy" dir={locale.dir}><p className="arrival-eyebrow">{ar?'في ضيافة الرحمن..':t.menuWelcome}</p><h1 id="kiosk-welcome-title">{ar?<><span>أُنسُك</span> عندنا</>:t.welcome}</h1><p className="arrival-description">{ar?'نساعدك خطوة بخطوة في الحرم المكي لخدمات الإرشاد والمساعدة لضيوف الرحمن.':t.menuHint}</p>{ar&&<figure className="arrival-quran" lang="ar" dir="rtl"><blockquote>﴿ وَتَعَاوَنُواْ عَلَى ٱلۡبِرِّ وَٱلتَّقۡوَىٰ ﴾</blockquote><figcaption>سورة المائدة</figcaption></figure>}<span className="arrival-gold-rule" aria-hidden="true"/></div>
  </div>
 </section>;
}
