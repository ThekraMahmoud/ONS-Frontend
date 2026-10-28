import {useRef,useState} from "react";
import {ImagePlus,LoaderCircle} from "lucide-react";
export default function QrImageInput({onDecoded}){
 const input=useRef(null);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function read(event){
  const file=event.target.files?.[0];event.target.value="";if(!file)return;
  setError("");
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError("اختاري صورة PNG أو JPG أو WebP واضحة للرمز.");return;}
  if(file.size>12*1024*1024){setError("الصورة كبيرة. اختاري صورة أقل من 12 ميجابايت.");return;}
  setBusy(true);const url=URL.createObjectURL(file);
  try{const {BrowserQRCodeReader}=await import('@zxing/browser');const result=await new BrowserQRCodeReader().decodeFromImageUrl(url);const value=result.getText();if(!value)throw new Error('empty');await onDecoded(value,file);}
  catch{setError("ما قدرنا نقرأ QR من الصورة. قرّبي الرمز واختاري صورة واضحة وكاملة له.");}
  finally{URL.revokeObjectURL(url);setBusy(false);}
 }
 return <div className="ons-qr-image-input"><input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={read} hidden/><button className="workspace-secondary-button" type="button" disabled={busy} onClick={()=>input.current?.click()}>{busy?<LoaderCircle className="workspace-spin" size={18}/>:<ImagePlus size={18}/>} {busy?"جارٍ قراءة الصورة…":"قراءة QR من صورة"}</button><small>تُقرأ الصورة داخل المتصفح، ولا تُحفظ تلقائيًا.</small>{error&&<p className="pd-error" role="alert">{error}</p>}</div>;
}
