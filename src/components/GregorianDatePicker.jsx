import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { dateParts, firstWeekday, formatGregorian, isoDate, monthDays } from "../utils/gregorianCalendar.js";
import "../styles/GregorianDatePicker.css";

const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const weekdays = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
export default function GregorianDatePicker({ name, label, value, onChange, min = "", max = "", disabled = false }) {
  const today = new Date(); const todayValue = isoDate(today.getFullYear(), today.getMonth()+1,today.getDate());
  const initial = dateParts(value) || dateParts(min) || dateParts(todayValue);
  const [position,setPosition] = useState({top:0,left:0,width:310});
  const pendingFocus=useRef(null);
  const [open,setOpen] = useState(false); const [view,setView] = useState({year:initial.year,month:initial.month});
  const root=useRef(null), popup=useRef(null), trigger=useRef(null), daysRef=useRef({}); const id=useId();
  const valid=(date)=>(!min || date>=min)&&(!max || date<=max);
  useEffect(()=>{
    if(!open) return;
    const closeOutside=(event)=>{if(!root.current?.contains(event.target)&&!popup.current?.contains(event.target))setOpen(false);};
    document.addEventListener("pointerdown",closeOutside);
    const selected=dateParts(value);const firstAllowed=Array.from({length:monthDays(view.year,view.month)},(_,i)=>i+1).find(day=>(!min||isoDate(view.year,view.month,day)>=min)&&(!max||isoDate(view.year,view.month,day)<=max));
    const day=pendingFocus.current ?? (selected?.year===view.year && selected?.month===view.month ? selected.day : firstAllowed);
    pendingFocus.current=null;
    daysRef.current[day]?.focus();
    return ()=>document.removeEventListener("pointerdown",closeOutside);
  },[open,view.year,view.month,value,min,max]);
  const choose=(date)=>{if(!valid(date))return;onChange(date);setOpen(false);trigger.current?.focus();};
  const moveMonth=(delta)=>{const next=new Date(Date.UTC(view.year,view.month-1+delta,1));setView({year:next.getUTCFullYear(),month:next.getUTCMonth()+1});};
  function keyDay(event,day){
    const offset={ArrowLeft:1,ArrowRight:-1,ArrowDown:7,ArrowUp:-7}[event.key];
    if(offset!==undefined){event.preventDefault();const next=new Date(Date.UTC(view.year,view.month-1,day+offset));if(next.getUTCMonth()===view.month-1)daysRef.current[next.getUTCDate()]?.focus();else{pendingFocus.current=next.getUTCDate();setView({year:next.getUTCFullYear(),month:next.getUTCMonth()+1});}}
  }
  const first=firstWeekday(view.year,view.month), count=monthDays(view.year,view.month);
  const cells=Array.from({length:Math.ceil((first+count)/7)*7},(_,i)=>i-first+1);
  const years=Array.from({length:Math.max(today.getFullYear()+15,view.year)-Math.min(today.getFullYear()-5,view.year)+1},(_,i)=>Math.min(today.getFullYear()-5,view.year)+i);
  return <div className="ons-gregorian-field" ref={root} onKeyDown={(event)=>{if(event.key==="Escape"){event.preventDefault();setOpen(false);trigger.current?.focus();}}}>
    <label id={`${id}-label`}>{label}<small>ميلادي</small></label><input type="hidden" name={name} value={value} />
    <button ref={trigger} className="ons-date-trigger" type="button" disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-calendar`} aria-labelledby={`${id}-label ${id}-value`} onClick={()=>{if(!open){const rect=trigger.current.getBoundingClientRect();const width=Math.min(310,window.innerWidth-32);const height=Math.min(394,window.innerHeight-32);setPosition({width,left:Math.max(16,Math.min(rect.right-width,window.innerWidth-width-16)),top:Math.max(16,Math.min(rect.bottom+8,window.innerHeight-height-16))});const selected=dateParts(value)||dateParts(min)||dateParts(todayValue);setView({year:selected.year,month:selected.month});}setOpen(!open);}}><CalendarDays size={18}/><span id={`${id}-value`} className={value ? "" : "is-placeholder"}>{formatGregorian(value)||"اختر التاريخ"}</span></button>
    {open && createPortal(<section ref={popup} style={{position:"fixed",...position,maxHeight:"calc(100dvh - 32px)",overflowY:"auto"}} className="ons-date-calendar" dir="rtl" id={`${id}-calendar`} role="dialog" aria-label={`${label} · التقويم الميلادي`}>
      <header><b>التقويم الميلادي</b><button type="button" aria-label="إغلاق التقويم" onClick={()=>{setOpen(false);trigger.current?.focus();}}><X size={16}/></button></header>
      <div className="ons-calendar-controls"><button type="button" onClick={()=>moveMonth(-1)} aria-label="الشهر السابق"><ChevronRight size={18}/></button><select aria-label="الشهر الميلادي" value={view.month} onChange={(event)=>setView({...view,month:Number(event.target.value)})}>{months.map((month,i)=><option key={month} value={i+1}>{month}</option>)}</select><select aria-label="السنة الميلادية" value={view.year} onChange={(event)=>setView({...view,year:Number(event.target.value)})}>{years.map(year=><option key={year}>{year}</option>)}</select><button type="button" onClick={()=>moveMonth(1)} aria-label="الشهر التالي"><ChevronLeft size={18}/></button></div>
      <table role="grid" aria-label={`${months[view.month-1]} ${view.year}`}><thead><tr>{weekdays.map(day=><th key={day} scope="col">{day}</th>)}</tr></thead><tbody>{Array.from({length:cells.length/7},(_,week)=><tr key={week}>{cells.slice(week*7,week*7+7).map((day,index)=>{const date=isoDate(view.year,view.month,day);return <td key={index}>{day<1||day>count?<span/>:<button ref={node=>{daysRef.current[day]=node;}} type="button" tabIndex={date===value||(!value&&day===1)?0:-1} aria-label={formatGregorian(date)} aria-pressed={date===value} aria-current={date===todayValue?"date":undefined} disabled={!valid(date)} className={date===value?"is-selected":""} onKeyDown={event=>keyDay(event,day)} onClick={()=>choose(date)}>{day}</button>}</td>;})}</tr>)}</tbody></table>
      <footer><button type="button" disabled={!valid(todayValue)} onClick={()=>choose(todayValue)}>اليوم</button><span dir="ltr">{value || "YYYY-MM-DD"}</span><button type="button" disabled={!value} onClick={()=>{onChange("");setOpen(false);trigger.current?.focus();}}>مسح</button></footer>
    </section>,document.body)}
  </div>;
}
