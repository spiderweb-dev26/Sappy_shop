"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, KeyRound, ShieldCheck, AlertTriangle } from "lucide-react";

type Mode = "verify" | "set" | "change";
const inp = "w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-sm text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";

export default function MasterModal(props: {
  open: boolean;
  mode: Mode;
  onClose: () => void;
  onVerified?: (pw: string) => Promise<void>;
  onMasterSet?: () => void;
  verifyTitle?: string;
  verifySubtitle?: string;
  setTitle?: string;
  setSubtitle?: string;
  confirmLabel?: string;
}) {
  const { open, mode, onClose, onVerified, onMasterSet, verifyTitle, verifySubtitle, setTitle, setSubtitle, confirmLabel } = props;
  const [phase, setPhase] = useState<Mode>(mode);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [current, setCurrent] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setPhase(mode); setPw(""); setPw2(""); setCurrent(""); setErr(""); }
  }, [open]);

  const title = phase === "verify" ? (verifyTitle || "Master password") : phase === "set" ? (setTitle || "Create master password") : "Change master password";
  const subtitle = phase === "verify" ? (verifySubtitle || "Enter the master password to continue.") : phase === "set" ? (setSubtitle || "This code protects deletions, resets and new sign-ups.") : "Enter the current code, then choose a new one.";
  const primary = phase === "verify" ? (confirmLabel || "Confirm") : phase === "set" ? "Set master password" : "Update master password";
  const Icon = phase === "verify" ? ShieldCheck : KeyRound;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      if (phase === "verify") {
        if (!pw) { setErr("Enter the master password."); setBusy(false); return; }
        if (onVerified) await onVerified(pw);
        onClose();
      } else if (phase === "set") {
        if (pw.length < 6) { setErr("Use at least 6 characters."); setBusy(false); return; }
        if (pw !== pw2) { setErr("The two entries don't match."); setBusy(false); return; }
        const r = await fetch("/api/master/set", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
        const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j?.error || "Could not set master password");
        onMasterSet?.(); setPhase("verify");
        if (onVerified) await onVerified(pw);
        onClose();
      } else {
        if (!current) { setErr("Enter the current master password."); setBusy(false); return; }
        if (pw.length < 6) { setErr("New password needs at least 6 characters."); setBusy(false); return; }
        if (pw !== pw2) { setErr("The two new entries don't match."); setBusy(false); return; }
        const r = await fetch("/api/master/set", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current, password: pw }) });
        const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j?.error || "Could not update master password");
        onMasterSet?.(); onClose();
      }
    } catch (e: any) { setErr(e?.message || "Failed"); } finally { setBusy(false); }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => { if (!busy) onClose(); }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-emerald-900/55 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ type: "spring", stiffness: 320, damping: 28 }} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-emerald-100 bg-white p-6 shadow-2xl">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-mint/40 blur-2xl" />
            <button onClick={() => { if (!busy) onClose(); }} className="absolute right-4 top-4 rounded-lg p-1.5 text-emerald-500 transition hover:bg-mint/40" aria-label="Close"><X style={{ width: 18, height: 18 }} /></button>
            <div className="relative mb-4 flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-deep text-mint shadow-soft">
                <span className="absolute inset-0 animate-ping rounded-2xl bg-emerald-deep/30" style={{ animationDuration: "2.4s" }} />
                <Icon className="relative" style={{ width: 22, height: 22 }} />
              </div>
              <div><h2 className="font-display text-xl font-black leading-tight text-emerald-deep">{title}</h2><p className="mt-0.5 max-w-[15rem] text-xs leading-snug text-emerald-900/55">{subtitle}</p></div>
            </div>
            <form onSubmit={submit} className="relative space-y-3">
              {phase === "change" && <div><label className="mb-1.5 block text-xs font-semibold text-emerald-800">Current master password</label><input type="password" autoFocus value={current} onChange={(e) => setCurrent(e.target.value)} className={inp} placeholder="••••••" autoComplete="current-password" /></div>}
              <div><label className="mb-1.5 block text-xs font-semibold text-emerald-800">{phase === "verify" ? "Master password" : phase === "set" ? "New master password" : "New master password"}</label><input type="password" autoFocus={phase !== "change"} value={pw} onChange={(e) => setPw(e.target.value)} className={inp} placeholder={phase === "verify" ? "••••••" : "min 6 characters"} autoComplete={phase === "verify" ? "current-password" : "new-password"} /></div>
              {phase !== "verify" && <div><label className="mb-1.5 block text-xs font-semibold text-emerald-800">Confirm {phase === "change" ? "new " : ""}master password</label><input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={inp} placeholder="repeat" autoComplete="new-password" /></div>}
              {err && <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"><AlertTriangle style={{ width: 15, height: 15, marginTop: 1 }} className="shrink-0" /> {err}</motion.div>}
              <div className="flex gap-3 pt-1">
                <button type="button" disabled={busy} onClick={onClose} className="flex-1 rounded-xl border border-emerald-200 py-2.5 text-sm font-semibold text-emerald-deep transition hover:bg-mint/30 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={busy} className="flex-1 rounded-xl bg-emerald-deep py-2.5 text-sm font-bold text-mint shadow-soft transition hover:bg-emerald-800 disabled:opacity-60">{busy ? "Working..." : primary}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}