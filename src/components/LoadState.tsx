"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export function Spinner({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600 ${className}`} />;
}

export function ProgressLoader({ label = "Loading your workspace", tone = "dark" }: { label?: string; tone?: "dark" | "light" }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let v = 0;
    const id = setInterval(() => {
      v = Math.min(100, v + Math.random() * 12 + 5);
      setP(Math.floor(v));
      if (v >= 100) clearInterval(id);
    }, 110);
    return () => clearInterval(id);
  }, []);
  const status = p < 25 ? "Connecting…" : p < 55 ? "Fetching data…" : p < 85 ? "Preparing views…" : "Almost there…";
  const light = tone === "light";
  return (
    <div className="w-full" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
      <div className="mb-1.5 flex items-end justify-between">
        <span className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${light ? "text-mint/80" : "text-emerald-600/80"}`}>{label}</span>
        <span className={`font-display text-lg font-black tabular-nums leading-none ${light ? "text-mint" : "text-emerald-deep"}`}>{p}%</span>
      </div>
      <div className={`h-2.5 w-full overflow-hidden rounded-full ${light ? "bg-white/15" : "bg-emerald-900/10"}`}>
        <div className={`relative h-full rounded-full transition-all duration-150 ${light ? "bg-gradient-to-r from-mint to-white" : "bg-gradient-to-r from-emerald-600 to-mint"}`} style={{ width: `${p}%` }}>
          <div className="skeleton-sheen absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
      </div>
      <div className={`mt-1.5 text-[11px] font-medium ${light ? "text-mint/60" : "text-emerald-900/55"}`}>{status}</div>
    </div>
  );
}

function Sheen({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-emerald-900/[0.06] ${className}`}>
      <div aria-hidden className="skeleton-sheen absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <>
      {/* the "screen" loading in the background */}
      <div className="space-y-6" aria-hidden>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-soft">
              <Sheen className="h-9 w-9 rounded-xl" />
              <Sheen className="mt-4 h-7 w-24" />
              <Sheen className="mt-2 h-3 w-16" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-soft">
          <Sheen className="h-10 w-full rounded-xl" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Sheen key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        </div>
      </div>

      {/* full-screen veil + progress card on top */}
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-cream/70 backdrop-blur-[3px]" aria-busy="true">
        <div className="w-[min(90vw,420px)] rounded-3xl border border-emerald-100 bg-white/95 p-6 shadow-lift">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-emerald-100"><img src="/logo.svg?v=2" alt="" className="h-9 w-9" /></span>
            <div><div className="font-display text-lg font-black leading-tight text-emerald-deep">Sappy Legacy</div><div className="text-[11px] text-emerald-900/55">Hold tight — fetching your numbers.</div></div>
          </div>
          <ProgressLoader />
        </div>
      </div>
    </>
  );
}

export function ErrorBanner({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50/80 p-4 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600"><AlertTriangle style={{ width: 18, height: 18 }} /></span>
        <div>
          <p className="text-sm font-bold text-red-700">Something needs attention</p>
          <p className="mt-0.5 break-words text-sm text-red-600/90">{error}</p>
        </div>
      </div>
      <button onClick={onRetry} className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-95"><RefreshCw style={{ width: 15, height: 15 }} /> Retry</button>
    </div>
  );
}