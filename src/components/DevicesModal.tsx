"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Monitor, Smartphone, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useResource } from "@/components/useResource";
import { fmtDateTime } from "@/lib/format";
type S = { id: string; sid: string; device: string | null; lastSeenAt: string };
export default function DevicesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const res = useResource<{ sessions: S[]; currentSid: string | null }>("/api/sessions");
  const [currentSid, setCurrentSid] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      fetch("/api/sessions/ua", { method: "POST" }).catch(() => {});
      res.reload();
    }
  }, [open]);
  useEffect(() => { if (res.data) setCurrentSid(res.data.currentSid); }, [res.data]);
  const sessions = res.data?.sessions || [];
  async function logout(s: S) {
    if (s.sid === currentSid) { signOut({ callbackUrl: "/login" }); return; }
    await fetch(`/api/sessions/${s.id}`, { method: "DELETE" });
    res.reload();
  }
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-emerald-900/50 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 14 }} onClick={(e) => e.stopPropagation()} className="relative max-h-[85vh] w-full max-w-md overflow-auto rounded-2xl border border-emerald-100 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-deep text-mint"><Monitor style={{ width: 17, height: 17 }} /></span><h2 className="font-display text-lg font-black text-emerald-deep">Your devices</h2></div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-emerald-500 hover:bg-mint/40"><X style={{ width: 18, height: 18 }} /></button>
            </div>
            <p className="mb-3 text-xs text-emerald-900/55">Every device currently signed in to your account. Log out any device you don't recognise.</p>
            <div className="space-y-2">
              {res.error && <p className="py-6 text-center text-sm text-red-600">Couldn&apos;t load devices. {String(res.error)}</p>}{!res.error && sessions.length === 0 && <p className="py-6 text-center text-sm text-emerald-900/55">Loading devices…</p>}
              {sessions.map((s) => {
                const isCurrent = s.sid === currentSid;
                const mobile = /Android|iOS/.test(s.device || "");
                const Ic = mobile ? Smartphone : Monitor;
                return (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white p-3 shadow-soft">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isCurrent ? "bg-emerald-deep text-mint" : "bg-emerald-50 text-emerald-700"}`}><Ic style={{ width: 18, height: 18 }} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-deep">{s.device || "Unknown device"}{isCurrent && <span className="rounded-full bg-mint/60 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-800">This device</span>}</div>
                      <div className="text-xs text-emerald-900/55">Last active {fmtDateTime(s.lastSeenAt)}</div>
                    </div>
                    <button onClick={() => logout(s)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 active:scale-95"><LogOut style={{ width: 13, height: 13 }} /> {isCurrent ? "Log out" : "Log out"}</button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}