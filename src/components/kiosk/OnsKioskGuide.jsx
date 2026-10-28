import {useEffect, useRef, useState, useSyncExternalStore} from "react";
import {getKioskNarrator} from "../../utils/kioskNarrator.js";
import {kioskLanguages} from "../../i18n/kioskLocales.js";
import {Move, RotateCcw, Volume2} from "lucide-react";
import "../../styles/OnsKioskGuide.css";

function OnsCharacter({speaking}) {
  return <svg className={`ons-guide-character${speaking ? " is-speaking" : ""}`} viewBox="0 0 180 214" aria-hidden="true">
    <ellipse cx="90" cy="203" rx="48" ry="7" fill="#0d463a" opacity=".12"/>
    <path d="M54 178l-4 20q14 8 29 0l3-20m16 0l3 20q16 8 29 0l-4-20" fill="#0b3932"/>
    <path d="M49 115Q25 133 20 158q1 12 13 8l28-32" fill="#176b56" stroke="#0d463a" strokeWidth="3"/>
    <g className="ons-guide-hand"><path d="M127 120q23 10 28-13l4-13" fill="none" stroke="#176b56" strokeWidth="19" strokeLinecap="round"/><path d="M152 98l-1-12m7 11l3-15m1 18l7-11" fill="none" stroke="#e5bc91" strokeWidth="6" strokeLinecap="round"/></g>
    <path d="M52 113Q90 99 128 113l12 71q-50 23-100 0z" fill="#176b56" stroke="#0d463a" strokeWidth="3"/>
    <path d="M76 111l14 20 14-20M90 131v59" fill="none" stroke="#e3c588" strokeWidth="3"/>
    <path d="M60 123v59m60-59v59" stroke="#ffffff" strokeOpacity=".1" strokeWidth="3"/>
    <rect x="104" y="139" width="20" height="26" rx="5" fill="#fff9e9"/>
    <path d="M110 157v-8l4-4 4 4v8m-11 3h14" stroke="#b18a43" strokeWidth="1.8" fill="none"/>
    <g className="ons-guide-head">
    <circle cx="48" cy="76" r="11" fill="#e5bc91"/><circle cx="132" cy="76" r="11" fill="#e5bc91"/>
    <path d="M48 50Q90 14 132 50v31q-2 35-42 39-40-4-42-39z" fill="#f0d0ab" stroke="#d6ad82" strokeWidth="2"/>
    <path d="M44 55Q42 21 90 16q48 5 46 39l-7 7q-39-12-78 0z" fill="#fffaf0" stroke="#d4bd8b" strokeWidth="2"/>
    <path d="M47 48q43-15 86 0v12q-43-12-86 0z" fill="#0d463a"/>
    <path d="M58 43l6-6 6 6m40 0l6-6 6 6" fill="none" stroke="#c7a66a" strokeWidth="2"/>
    <g className="ons-guide-eyes" fill="#183b32"><ellipse cx="73" cy="77" rx="4" ry="5"/><ellipse cx="107" cy="77" rx="4" ry="5"/></g>
    <path d="M66 67q7-4 13 0m22 0q7-4 13 0" fill="none" stroke="#624d37" strokeWidth="2.5" strokeLinecap="round"/>
    <ellipse cx="61" cy="89" rx="7" ry="4" fill="#d68e73" opacity=".3"/><ellipse cx="119" cy="89" rx="7" ry="4" fill="#d68e73" opacity=".3"/>
    <path className="ons-guide-smile" d="M80 95q10 10 20 0" fill="none" stroke="#744d37" strokeWidth="3" strokeLinecap="round"/>
    <ellipse className="ons-guide-mouth" cx="90" cy="99" rx="7" ry="5" fill="#744d37"/>
    </g>
  </svg>;
}
export default function OnsKioskGuide({screen,language,t,identityMethod,phase}) {
  const [clips,setClips]=useState({});
  const narrator=getKioskNarrator();
  const narration=useSyncExternalStore(narrator.subscribe,narrator.getSnapshot,narrator.getSnapshot);
  const {playing,failed}=narration;
  const guide=useRef(null);
  const drag=useRef(null);
  const suppressClick=useRef(false);
  const [position,setPosition]=useState(null);
  function boundedPosition(left,top,width){
    const height=guide.current?.getBoundingClientRect().height||160;
    const fittedWidth=Math.min(width,window.innerWidth-16);
    return {left:Math.max(8,Math.min(left,window.innerWidth-fittedWidth-8)),top:Math.max(8,Math.min(top,window.innerHeight-height-8)),width:fittedWidth};
  }
  function beginDrag(event){
    if(!event.isPrimary||event.button!==0)return;
    const bounds=guide.current.getBoundingClientRect();
    suppressClick.current=false;
    drag.current={pointerId:event.pointerId,x:event.clientX,y:event.clientY,left:bounds.left,top:bounds.top,width:bounds.width};
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event){
    const start=drag.current;
    if(!start||start.pointerId!==event.pointerId)return;
    const dx=event.clientX-start.x,dy=event.clientY-start.y;
    if(!suppressClick.current&&Math.hypot(dx,dy)<7)return;
    suppressClick.current=true;
    event.preventDefault();
    setPosition(boundedPosition(start.left+dx,start.top+dy,start.width));
  }
  function endDrag(){drag.current=null;}
  function moveWithKeys(event){
    if(event.key==='Escape'&&position){event.preventDefault();setPosition(null);return;}
    const steps={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]};
    const step=steps[event.key];if(!step)return;
    event.preventDefault();const bounds=guide.current.getBoundingClientRect();
    setPosition(boundedPosition(bounds.left+step[0],bounds.top+step[1],bounds.width));
  }
  useEffect(()=>{
    const resize=()=>setPosition(current=>{
      if(!current)return current;
      const height=guide.current?.getBoundingClientRect().height||160;
      const width=Math.min(current.width,window.innerWidth-16);
      return {left:Math.max(8,Math.min(current.left,window.innerWidth-width-8)),top:Math.max(8,Math.min(current.top,window.innerHeight-height-8)),width};
    });
    window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);
  },[]);
  // Keep a dragged position between steps only while it leaves the new task clear.
  useEffect(()=>{
    const frame=window.requestAnimationFrame(()=>{
      const terminal=guide.current?.closest('.kiosk-terminal');
      const task=terminal?.querySelector('.kiosk-flow-screen,.kiosk-service-screen,.kiosk-arrival');
      if(!task)return;
      const area=task.getBoundingClientRect();
      setPosition(current=>{
        if(!current)return current;
        const bounds=guide.current?.getBoundingClientRect();
        if(!bounds)return current;
        const overlaps=bounds.left<area.right&&bounds.right>area.left&&bounds.top<area.bottom&&bounds.bottom>area.top;
        return overlaps?null:current;
      });
    });
    return()=>window.cancelAnimationFrame(frame);
  },[screen,phase]);
  const name=["ar","fa","ur"].includes(language)?"اُنس":"Ons";
  const audioLabels={ar:["اسمع الشرح","إيقاف الصوت"],en:["Listen","Pause audio"],ur:["سنیں","آواز روکیں"],fr:["Écouter","Pause"],id:["Dengarkan","Jeda"],tr:["Dinle","Duraklat"],bn:["শুনুন","বিরতি"],fa:["گوش کنید","توقف صدا"],ha:["Saurara","Dakatar"],sw:["Sikiliza","Sitisha"],zh:["听讲解","暂停"],ru:["Слушать","Пауза"],am:["ያዳምጡ","አቁም"]};
  const [listenLabel]=audioLabels[language]||audioLabels.en;
  const audioKey=phase || (screen === "identity" ? `identity-${identityMethod}` : screen);
  const clip=clips[language]?.[audioKey];
  const planKey=JSON.stringify([screen,language,audioKey,Object.keys(clips).length]);
  const canSpeak=screen === "welcome" ? Object.keys(clips).length>0 : !!clip;
  useEffect(()=>{let active=true;fetch('/audio/kiosk/index.json').then(r=>r.ok?r.json():{}).then(value=>{if(active)setClips(value);}).catch(()=>{});return()=>{active=false;};},[]);
  useEffect(()=>{
    const plan=screen === "welcome" ? kioskLanguages.filter(item=>clips[item.code]?.welcome).map(item=>({language:item.code,clip:clips[item.code].welcome})) : clip?[{language,clip}]:[];
    narrator.setPlan(plan,planKey,screen === "welcome");
    return()=>narrator.clear(planKey);
  },[clips,screen,language,clip,narrator,planKey]);
  return <aside ref={guide} style={position?{position:"fixed",left:position.left,top:position.top,right:"auto",bottom:"auto",maxWidth:"calc(100vw - 16px)",margin:0,zIndex:50}:undefined} className={`ons-kiosk-guide is-voice-only${position ? " is-positioned" : ""}`} aria-label={name}>
    <button type="button" className="ons-guide-avatar" title={language==="ar"?"اضغط على اُنس لإعادة الشرح، واسحبه لتغيير مكانه.":"Press Ons to replay. Drag to move."} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag} onKeyDown={moveWithKeys} onClick={()=>{if(suppressClick.current){suppressClick.current=false;return;}if(canSpeak)narrator.replay();}} aria-label={`${name} — ${failed ? t.audioUnavailable : language==="ar" ? "إعادة الشرح" : listenLabel}`} aria-busy={narration.loading}>
      <span className="ons-guide-move" aria-hidden="true"><Move size={16}/></span><span key={`${screen}-${audioKey}`} className="ons-guide-stage"><OnsCharacter speaking={playing}/></span><span className="ons-guide-name">{name}{playing?<RotateCcw size={18}/>:<Volume2 size={18}/>}</span><span className={`ons-guide-audio-wave${playing?" is-playing":""}`} aria-hidden="true">{Array.from({length:9},(_,index)=><i key={index} style={{"--wave-delay":`${index*-.09}s`}}/>)}</span>
    </button>
  </aside>;
}
