import {useCallback,useEffect,useState} from "react";
import {useParams,Link} from "react-router-dom";
import {RefreshCw,ShieldCheck,UserRound,Clock3} from "lucide-react";
import {getReportTrackingHistory} from "../services/assistanceReportService.js";
import {StatusPill} from "../components/workspace/WorkspacePrimitives.jsx";
import {reportDate} from "../utils/workspacePresentation.js";
import {presentApiError} from "../utils/errorMessages.js";
import logo from "../assets/logos/ons-logo-optimized.png";
import "../styles/ReportShare.css";
export default function ReportTrackingPage(){
 const {reportId}=useParams();const [record,setRecord]=useState(null);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 const load=useCallback(async()=>{setLoading(true);setError("");try{const response=await getReportTrackingHistory(reportId);setRecord(response?.data??response);}catch(failure){setError(presentApiError(failure,"تعذر تحديث حالة البلاغ. أعد المحاولة.").message);}finally{setLoading(false);}},[reportId]);
 useEffect(()=>{let active=true;const refresh=()=>{if(active && document.visibilityState==='visible')void load();};const initial=setTimeout(refresh,0);const timer=setInterval(refresh,10000);return()=>{active=false;clearTimeout(initial);clearInterval(timer);};},[load]);
 const history=[...(record?.history||[])].sort((a,b)=>String(b.changedAt||'').localeCompare(String(a.changedAt||'')));
 return <main className="ons-public-report" dir="rtl"><header><img src={logo} alt="أُنس"/><span>معك حتى تطمئن</span></header><section className="ons-public-report-card"><span className="ons-share-kicker"><ShieldCheck size={17}/>متابعة طلب المساعدة</span><h1>نرافقك في كل خطوة</h1><p>تتحدث حالة طلبك تلقائيًا كل عشر ثوانٍ.</p>{error&&<p className="pd-error" role="alert">{error}</p>}{record?<><div className="ons-share-status"><StatusPill status={record.status}/><b dir="ltr">{record.caseNumber||`#${record.reportId}`}</b></div><div className="ons-share-assignee"><UserRound size={21}/><div><small>المندوب المسؤول</small><b>{record.assigneeName||(record.status === "OPEN" ? "بانتظار استلام المندوب" : "اسم المندوب غير متاح")}</b></div></div><ol className="ons-share-history"><li><Clock3 size={17}/><div><b>تم تسجيل طلب المساعدة</b><time>{reportDate(record.createdAt)}</time></div></li>{history.toReversed().map((change,index)=><li key={`${change.changedAt}-${index}`}><Clock3 size={17}/><div><StatusPill status={change.newStatus}/><time>{reportDate(change.changedAt)}</time></div></li>)}</ol></>:loading?<p role="status">جارٍ تحميل حالة طلبك…</p>:null}<button className="pd-primary" disabled={loading} onClick={()=>void load()}><RefreshCw size={17}/>{loading?"جارٍ التحديث…":"تحديث الحالة"}</button><p className="ons-share-privacy">يُعرض هنا وضع الطلب فقط، دون بيانات الحاج الشخصية.</p></section><Link to="/">أُنس · خدمة ضيوف الرحمن</Link></main>;
}
