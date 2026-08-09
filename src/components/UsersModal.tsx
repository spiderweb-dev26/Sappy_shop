"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Plus, Pencil, KeyRound, Trash2 } from "lucide-react";
import { useResource } from "@/components/useResource";
import MasterModal from "@/components/MasterModal";
type U = { id: string; name: string | null; email: string; createdAt: string };
const inp = "w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-sm text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";
export default function UsersModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const res = useResource<{ users: U[] }>("/api/users");
  const mstat = useResource<{ set: boolean }>("/api/master/status");
  const users = res.data?.users || [];
  const [masterSet, setMasterSet] = useState<boolean | null>(null);
  useEffect(() => { if (mstat.data) setMasterSet(!!mstat.data.set); }, [mstat.data]);
  useEffect(() => { if (open) res.reload(); }, [open]);
  const [showAdd, setShowAdd] = useState(false);
  const [add, setAdd] = useState({ name: "", email: "", password: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ name: "", email: "" });
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPass, setNewPass] = useState("");
  const [msg, setMsg] = useState(""); const [msgKind, setMsgKind] = useState<"ok" | "err">("ok");
  const [pending, setPending] = useState<null | { type: "add" | "edit" | "reset" | "delete"; id?: string }>(null);
  const flash = (m: string, k: "ok" | "err") => { setMsg(m); setMsgKind(k); };

  async function perform(pw: string) {
    if (!pending) return;
    if (pending.type === "add") {
      const r = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...add, masterPassword: pw }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j?.error || "Failed");
      setAdd({ name: "", email: "", password: "" }); setShowAdd(false); flash("User added.", "ok");
    } else if (pending.type === "edit") {
      const r = await fetch(`/api/users/${pending.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...edit, masterPassword: pw }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j?.error || "Failed");
      setEditId(null); flash("User updated.", "ok");
    } else if (pending.type === "reset") {
      const r = await fetch(`/api/users/${pending.id}/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword: newPass, masterPassword: pw }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j?.error || "Failed");
      setResetId(null); setNewPass(""); flash("Password reset.", "ok");
    } else {
      const r = await fetch(`/api/users/${pending.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ masterPassword: pw }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j?.error || "Failed");
      flash("User deleted.", "ok");
    }
    res.reload(); setPending(null);
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-emerald-900/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 14 }} onClick={(e) => e.stopPropagation()} className="relative max-h-[88vh] w-full max-w-md overflow-auto rounded-2xl border border-emerald-100 bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-deep text-mint"><Users style={{ width: 17, height: 17 }} /></span><h2 className="font-display text-lg font-black text-emerald-deep">Manage users</h2></div>
                <button onClick={onClose} className="rounded-lg p-1.5 text-emerald-500 hover:bg-mint/40"><X style={{ width: 18, height: 18 }} /></button>
              </div>
              {msg && <div className={`mb-3 rounded-xl border px-3 py-2 text-sm font-medium ${msgKind === "err" ? "border-red-200 bg-red-50 text-red-600" : "border-emerald-200 bg-mint/30 text-emerald-800"}`}>{msg}</div>}
              <button onClick={() => setShowAdd((v) => !v)} className="mb-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-deep px-3.5 py-2 text-sm font-semibold text-mint shadow-soft transition hover:bg-emerald-800 active:scale-95"><Plus style={{ width: 15, height: 15 }} /> {showAdd ? "Hide" : "Add user"}</button>
              {showAdd && (
                <div className="mb-4 space-y-2 rounded-xl border border-emerald-100 bg-cream/50 p-3">
                  <input value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} placeholder="Full name" className={inp} />
                  <input value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} placeholder="Email" className={inp} />
                  <input type="password" value={add.password} onChange={(e) => setAdd({ ...add, password: e.target.value })} placeholder="Password (min 8)" className={inp} />
                  <button onClick={() => { if (!add.name || !add.email || add.password.length < 8) { flash("Fill name, valid email, 8+ char password.", "err"); return; } setPending({ type: "add" }); }} className="w-full rounded-xl bg-emerald-deep py-2 text-sm font-semibold text-mint hover:bg-emerald-800 active:scale-95">Save new user</button>
                </div>
              )}
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="rounded-xl border border-emerald-100 bg-white p-3 shadow-soft">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-deep text-sm font-black text-mint">{(u.name || u.email).charAt(0).toUpperCase()}</span>
                      <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-emerald-deep">{u.name || "Unnamed"}</div><div className="truncate text-xs text-emerald-900/55">{u.email}</div></div>
                      <button onClick={() => { setEditId(u.id); setEdit({ name: u.name || "", email: u.email }); setResetId(null); }} title="Edit" className="rounded-lg p-2 text-emerald-600 hover:bg-mint/40 active:scale-90"><Pencil style={{ width: 15, height: 15 }} /></button>
                      <button onClick={() => { setResetId(u.id); setEditId(null); setNewPass(""); }} title="Reset password" className="rounded-lg p-2 text-emerald-600 hover:bg-mint/40 active:scale-90"><KeyRound style={{ width: 15, height: 15 }} /></button>
                      <button onClick={() => setPending({ type: "delete", id: u.id })} title="Delete" className="rounded-lg p-2 text-red-500 hover:bg-red-50 active:scale-90"><Trash2 style={{ width: 15, height: 15 }} /></button>
                    </div>
                    {editId === u.id && (
                      <div className="mt-2 space-y-2 rounded-lg bg-cream/60 p-2.5">
                        <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Name" className={inp} />
                        <input value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} placeholder="Email" className={inp} />
                        <div className="flex gap-2"><button onClick={() => setPending({ type: "edit", id: u.id })} className="flex-1 rounded-lg bg-emerald-deep py-1.5 text-xs font-semibold text-mint hover:bg-emerald-800">Save</button><button onClick={() => setEditId(null)} className="flex-1 rounded-lg border border-emerald-200 py-1.5 text-xs font-semibold text-emerald-deep">Cancel</button></div>
                      </div>
                    )}
                    {resetId === u.id && (
                      <div className="mt-2 space-y-2 rounded-lg bg-cream/60 p-2.5">
                        <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="New password (min 8)" className={inp} />
                        <div className="flex gap-2"><button onClick={() => { if (newPass.length < 8) { flash("Password needs 8+ characters.", "err"); return; } setPending({ type: "reset", id: u.id }); }} className="flex-1 rounded-lg bg-emerald-deep py-1.5 text-xs font-semibold text-mint hover:bg-emerald-800">Reset</button><button onClick={() => setResetId(null)} className="flex-1 rounded-lg border border-emerald-200 py-1.5 text-xs font-semibold text-emerald-deep">Cancel</button></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <MasterModal open={pending !== null} mode={masterSet ? "verify" : "set"} onClose={() => setPending(null)} onVerified={perform} onMasterSet={() => setMasterSet(true)} verifyTitle="Master password required" verifySubtitle="Enter the master password to manage users." setTitle="Set master password" setSubtitle="Create a master password first - it protects adding, editing, resetting and deleting users." confirmLabel="Confirm" />
    </>
  );
}