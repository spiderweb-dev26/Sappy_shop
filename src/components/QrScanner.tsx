"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { X } from "lucide-react";
const C39: Record<string, string> = {
  "0":"nnnwwnwnn","1":"wnnwnnnnw","2":"nnwwnnnnw","3":"wnwwnnnnn","4":"nnnwwnnnw","5":"wnnwwnnnn","6":"nnwwwnnnn","7":"nnnwnnwnw","8":"wnnwnnwnn","9":"nnwwnnwnn",
  "A":"wnnnnwnnw","B":"nnwnnwnnw","C":"wnwnnwnnn","D":"nnnnwwnnw","E":"wnnnwwnnn","F":"nnwnwwnnn","G":"nnnnnwwnw","H":"wnnnnwwnn","I":"nnwnnwwnn","J":"nnnnwwwnn",
  "K":"wnnnnnnww","L":"nnwnnnnww","M":"wnwnnnnwn","N":"nnnnwnnww","O":"wnnnwnnwn","P":"nnwnwnnwn","Q":"nnnnnnwww","R":"wnnnnnwwn","S":"nnwnnnwwn","T":"nnnnwnwwn",
  "U":"wwnnnnnnw","V":"nwwnnnnnw","W":"wwwnnnnnn","X":"nwnnwnnnw","Y":"wwnnwnnnn","Z":"nwwnwnnnn",
  "-":"nwnnnnwnw",".":"wwnnnnwnn"," ":"nwwnnnwnn","*":"nwnnwnwnn"
};
const REV: Record<string, string> = {}; for (const k in C39) REV[C39[k]] = k;
function decodeRow(bin: number[]): string | null {
  const runs: { v: number; len: number }[] = [];
  for (let i = 0; i < bin.length; i++) { const v = bin[i]; if (runs.length && runs[runs.length - 1].v === v) runs[runs.length - 1].len++; else runs.push({ v, len: 1 }); }
  for (let s = 0; s < runs.length - 9; s++) {
    if (runs[s].v !== 1) continue;
    let out = ""; let i = s; let ok = true;
    while (i + 8 < runs.length) {
      const g = runs.slice(i, i + 9); let alt = true;
      for (let k = 0; k < 9; k++) if (g[k].v !== (k % 2 === 0 ? 1 : 0)) { alt = false; break; }
      if (!alt) { ok = false; break; }
      const lens = g.map((r) => r.len); const so = [...lens].sort((a, b) => a - b); const thr = (so[5] + so[6]) / 2;
      let pat = ""; for (let k = 0; k < 9; k++) pat += lens[k] > thr ? "w" : "n";
      if ((pat.match(/w/g) || []).length !== 3) { ok = false; break; }
      const ch = REV[pat]; if (!ch) { ok = false; break; }
      out += ch; i += 9; if (i < runs.length && runs[i].v === 0) i += 1; else { ok = false; break; }
      if (ch === "*") { if (out.length > 1) break; }
    }
    if (ok && out.length >= 3 && out.startsWith("*") && out.endsWith("*")) { const b = out.slice(1, -1); if (b.length >= 2) return b; }
  }
  return null;
}
export default function QrScanner({ onScan, onClose }: { onScan: (s: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null); const [err, setErr] = useState("");
  useEffect(() => {
    let stream: MediaStream | null = null; let raf = 0; let stopped = false;
    const anyW = window as any;
    const bd = anyW.BarcodeDetector ? new anyW.BarcodeDetector({ formats: ["code_39", "code_128", "ean_13", "qr_code"] }) : null;
    const tick = async () => {
      const v = videoRef.current;
      if (v && v.readyState === v.HAVE_ENOUGH_DATA) {
        if (bd) { try { const codes = await bd.detect(v); if (codes?.length) { stopped = true; onScan(String(codes[0].rawValue).trim()); return; } } catch {} }
        const W = 800, H = Math.max(1, Math.round((800 * v.videoHeight) / v.videoWidth));
        const c = document.createElement("canvas"); c.width = W; c.height = H;
        const x = c.getContext("2d")!; x.drawImage(v, 0, 0, W, H);
        const d = x.getImageData(0, 0, W, H).data;
        for (const f of [0.35, 0.42, 0.47, 0.5, 0.53, 0.58, 0.65]) {
          const y = Math.floor(H * f); let sum = 0; const g = new Array(W);
          for (let px = 0; px < W; px++) { const o = (y * W + px) * 4; const gg = (d[o] + d[o + 1] + d[o + 2]) / 3; g[px] = gg; sum += gg; }
          const avg = sum / W; const bin = g.map((vv) => (vv < avg * 0.9 ? 1 : 0));
          const s1 = decodeRow(bin); if (s1) { stopped = true; onScan(s1); return; }
          const s2 = decodeRow(bin.map((b) => 1 - b)); if (s2) { stopped = true; onScan(s2); return; }
        }
        const q = jsQR(d, W, H, { inversionAttempts: "dontInvert" });
        if (q?.data) { stopped = true; onScan(q.data.trim()); return; }
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
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-100 bg-cream p-3 shadow-2xl">
        <div className="mb-3 flex items-center justify-between px-1">
          <div><div className="font-display text-lg font-black text-emerald-deep">Scan barcode</div><div className="text-[11px] uppercase tracking-[0.16em] text-emerald-600/70">Line the barcode up in the slot</div></div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-emerald-600 hover:bg-mint/50"><X style={{ width: 18, height: 18 }} /></button>
        </div>
        <div className="relative aspect-[2/1] overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-x-5 inset-y-[30%] rounded-lg border-2 border-mint/80" />
          <div className="pointer-events-none absolute left-5 right-5 top-1/2 h-0.5 bg-mint shadow-[0_0_12px_2px_rgba(167,243,208,0.8)] animate-scanline" />
        </div>
        {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">{err}</p>}
      </div>
    </div>
  );
}