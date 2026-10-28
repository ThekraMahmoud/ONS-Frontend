import { useEffect, useRef, useState } from "react";
import { Camera, CircleAlert, RefreshCw, UserRound, X } from "lucide-react";

function getCameraErrorKey(error) {
  switch (error?.name) {
    case "NotAllowedError":
    case "PermissionDeniedError": return "cameraPermissionDenied";
    case "NotFoundError":
    case "DevicesNotFoundError": return "cameraUnavailable";
    case "NotReadableError":
    case "TrackStartError": return "cameraBusy";
    case "SecurityError": return "cameraSecureContext";
    default: return "cameraError";
  }
}

export default function QrCameraScanner({
  copy,
  onDecoded,
  onCancel,
  onManualEntry,
  retryToken,
  onRetry,
}) {
  const videoRef = useRef(null);
  const decodedHandler = useRef(onDecoded);
  useEffect(() => { decodedHandler.current = onDecoded; }, [onDecoded]);
  const [status, setStatus] = useState("requesting");
  const [errorKey, setErrorKey] = useState(null);

  useEffect(() => {
    let mounted = true;
    let stream;
    let controls;
    let decodedOnce = false;

    const stopStream = () => {
      controls?.stop();
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const start = async () => {
      if (!window.isSecureContext && !["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) {
        setStatus("error");
        setErrorKey("cameraSecureContext");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setErrorKey("cameraUnsupported");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) throw new Error("Camera preview is unavailable.");
        video.srcObject = stream;
        await video.play();
        if (!mounted) return;

        setStatus("scanning");
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (!mounted) return;
        const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 180 });
        controls = await reader.decodeFromVideoElement(video, (result) => {
          if (!result || !mounted || decodedOnce) return;
          const value = result.getText();
          if (!value) return;
          decodedOnce = true;
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (!mounted) return;
            const imageFile = blob ? new File([blob], "pilgrim-card.jpg", { type: "image/jpeg" }) : null;
            setStatus("decoded");
            stopStream();
            decodedHandler.current(value, imageFile);
          }, "image/jpeg", 0.88);
        });
        if (!mounted) controls?.stop();
      } catch (error) {
        if (!mounted) return;
        setStatus("error");
        setErrorKey(getCameraErrorKey(error));
        stopStream();
      }
    };

    void start();
    return () => {
      mounted = false;
      stopStream();
    };
  }, [retryToken]);

  return (
    <div className="kiosk-scanner">
      <div className="kiosk-scanner-preview">
        <video ref={videoRef} autoPlay muted playsInline aria-label={copy.cameraPreview} />
        <span className="kiosk-scanner-frame" aria-hidden="true"><i /><i /><i /><i /></span>
        {status === "requesting" && <div className="kiosk-scanner-overlay"><RefreshCw className="kiosk-spin" size={24} /><span>{copy.cameraRequesting}</span></div>}
        {(status === "error" || status === "decoder-unsupported") && (
          <div className="kiosk-scanner-overlay is-error">
            <CircleAlert size={26} />
            <span>{copy[errorKey || (status === "decoder-unsupported" ? "qrDecoderUnsupported" : "cameraError")]}</span>
          </div>
        )}
        {status === "scanning" && <span className="kiosk-scanner-live"><Camera size={15} />{copy.cameraLive}</span>}
      </div>
      <p className="kiosk-scanner-instructions">{copy.qrInstructions}</p>
      <div className="kiosk-scanner-actions">
        {(status === "error" || status === "decoder-unsupported") && <button type="button" className="kiosk-retry-button" onClick={onRetry}><RefreshCw size={18} />{copy.cameraRetry}</button>}
        {onManualEntry && <button type="button" className="kiosk-retry-button kiosk-scanner-manual-entry" onClick={onManualEntry}><UserRound size={18} />{copy.manual}</button>}
        <button type="button" className="kiosk-scanner-cancel" onClick={onCancel}><X size={18} />{copy.cameraCancel}</button>
      </div>
    </div>
  );
}
