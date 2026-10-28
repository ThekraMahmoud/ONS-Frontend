import { useEffect, useState } from "react";

// Generated locally: report links never pass through a third-party QR service.
export default function ReportQrCode({ url }) {
  const [code, setCode] = useState(null);
  useEffect(() => {
    let active = true;
    import("@zxing/library").then(({ QRCodeWriter, BarcodeFormat }) => {
      if (!url) { if (active) setCode(null); return; }
      try {
        const matrix = new QRCodeWriter().encode(url, BarcodeFormat.QR_CODE, 0, 0, new Map());
        const size = matrix.getWidth(); const pixels = [];
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (matrix.get(x,y)) pixels.push(`M${x} ${y}h1v1h-1z`);
        if (active) setCode({size,path:pixels.join("")});
      } catch { if (active) setCode(null); }
    }).catch(() => {if(active)setCode(null);});
    return () => { active = false; };
  }, [url]);
  return code ? <svg className="ons-report-qr-code" viewBox={`0 0 ${code.size} ${code.size}`} role="img" aria-label="رمز QR لرابط متابعة البلاغ" shapeRendering="crispEdges"><rect width={code.size} height={code.size} fill="#fff"/><path d={code.path} fill="#082e26"/></svg> : <p role="status">جارٍ تجهيز رمز المتابعة…</p>;
}
