"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { X } from "lucide-react";
export default function QrScanner({ onScan, onClose }: { onScan: (s: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null); const [err, setErr] = useState("");
  useEffect(() => {
    let stream: MediaStream | null = null; let raf = 0; let stopped = false;
    const tick = () => {
      const v = videoRef.current;
      if (v && v.readyState === v.HAVE_ENOUGH_DATA) {
        const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
        const ctx = c.getContext("2d")!; ctx.drawImage(v, 0, 0, c.width, c.height);
        const code = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height, { inversionAttempts: "dontInvert" });
        if (code?.data) { stopped = true; onScan(code.data.trim()); return; }
      }
      if (!stopped) raf = requestAnimationFrame(tick);
    };
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => { stream = s; if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); } raf = requestAnimationFrame(tick); })
      .catch(() => setErr("Camera unavailable. Type the serial instead."));
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [onScan]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-emerald-900/60 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-emerald-100 bg-cream p-3 shadow-2xl">
        <div className="mb-3 flex items-center justify-between px-1">
          <div><div className="font-display text-lg font-black text-emerald-deep">Scan QR</div><div className="text-[11px] uppercase tracking-[0.16em] text-emerald-600/70">Point at a label</div></div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-emerald-600 hover:bg-mint/50"><X style={{ width: 18, height: 18 }} /></button>
        </div>
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-mint/70" />
          <div className="pointer-events-none absolute left-6 right-6 h-0.5 bg-mint shadow-[0_0_12px_2px_rgba(167,243,208,0.8)] animate-scanline" />
          {["left-4 top-4 border-l-2 border-t-2", "right-4 top-4 border-r-2 border-t-2", "left-4 bottom-4 border-l-2 border-b-2", "right-4 bottom-4 border-r-2 border-b-2"].map((c) => <span key={c} className={`pointer-events-none absolute h-6 w-6 border-mint ${c}`} />)}
        </div>
        {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">{err}</p>}
      </div>
    </div>
  );
}