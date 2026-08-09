"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, FileDown, Trash2, ClipboardList } from "lucide-react";
import { etb, fmtDate } from "@/lib/format";
import { downloadPurchaseOrderPdf } from "@/lib/pdf";
import { useResource } from "@/components/useResource";
import { PageSkeleton, ErrorBanner } from "@/components/LoadState";
type U = { name?: string | null; email?: string } | null;
type Line = { description: string; quantity: number; unitCost: number };
type Order = { id: string; poNo: string; supplier: string; status: string; note: string | null; lines: Line[]; totalCost: number; createdAt: string; user?: U };
const inp = "w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-sm text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";
const badge: any = { draft: "bg-amber-50 text-amber-700", ordered: "bg-mint/60 text-emerald-800", received: "bg-emerald-100 text-emerald-800" };
const emptyLine = (): Line => ({ description: "", quantity: 1, unitCost: 0 });
function byLabel(u?: U) { return u?.name || (u?.email ? u.email.split("@")[0] : null); }
export default function PoClient() {
  const res = useResource<{ orders: Order[] }>("/api/purchase-orders");
  const orders = res.data?.orders || []; const loading = res.loading && !res.data; const error = res.error;
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const [supplier, setSupplier] = useState(""); const [status, setStatus] = useState("draft"); const [note, setNote] = useState(""); const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const total = lines.reduce((a, l) => a + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0);
  function reset() { setSupplier(""); setStatus("draft"); setNote(""); setLines([emptyLine()]); setMsg(""); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    const clean = lines.filter((l) => l.description.trim());
    if (!supplier.trim() || clean.length === 0) { setMsg("Add a supplier and at least one line."); setBusy(false); return; }
    try { const r = await fetch("/api/purchase-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplier, status, note: note || undefined, lines: clean }) }); const data = await r.json(); if (!r.ok) throw new Error(data.error || "Failed"); res.reload(); setOpen(false); reset(); }
    catch (e: any) { setMsg(e?.message || "Failed"); } finally { setBusy(false); }
  }
  async function del(id: string) { if (!confirm("Delete this PO?")) return; await fetch(`/api/purchase-orders/${id}`, { method: "DELETE" }); res.reload(); }
  return (
    <div>
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600/80">Procurement</p><h1 className="mt-1 font-display text-3xl font-black tracking-tight text-emerald-deep md:text-4xl">Purchase Orders</h1><p className="mt-1 text-sm text-emerald-900/60">{orders.length} shared order(s) on record.</p></div>
        <button onClick={() => { reset(); setOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-deep px-4 py-2.5 text-sm font-semibold text-mint shadow-soft transition hover:bg-emerald-800 active:scale-[0.98]"><Plus style={{ width: 16, height: 16 }} /> New PO</button>
      </header>
      {error && !loading && <div className="mb-4"><ErrorBanner error={error} onRetry={res.reload} /></div>}
      {loading ? <PageSkeleton /> : (
        <div className="grid gap-3">
          {orders.length === 0 && <div className="rounded-2xl border border-emerald-100 bg-white py-16 text-center shadow-soft"><ClipboardList className="mx-auto mb-3 text-emerald-300" style={{ width: 32, height: 32 }} /><p className="text-sm text-emerald-900/55">No purchase orders yet.</p></div>}
          {orders.map((o, i) => (
            <motion.div key={o.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }} className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(6,95,70,0.12)] sm:p-5">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-bold text-emerald-deep">{o.poNo}</span><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${badge[o.status] || badge.draft}`}>{o.status}</span></div><div className="mt-1 font-display text-lg font-bold text-emerald-deep">{o.supplier}</div><div className="text-xs text-emerald-900/55">{fmtDate(o.createdAt)} · {o.lines.length} line(s){byLabel(o.user) ? ` · by ${byLabel(o.user)}` : ""}</div></div>
              <div className="flex items-center gap-3"><div className="text-right"><div className="text-[10px] uppercase tracking-[0.16em] text-emerald-900/45">Total</div><div className="font-display text-xl font-black text-emerald-deep">{etb(o.totalCost)}</div></div>
                <div className="flex gap-1"><button onClick={() => downloadPurchaseOrderPdf(o)} title="PDF" className="rounded-lg p-2 text-emerald-600 transition hover:bg-mint/40 hover:text-emerald-deep active:scale-90"><FileDown style={{ width: 17, height: 17 }} /></button><button onClick={() => del(o.id)} title="Delete" className="rounded-lg p-2 text-emerald-600/70 transition hover:bg-red-50 hover:text-red-600 active:scale-90"><Trash2 style={{ width: 17, height: 17 }} /></button></div>
              </div>
            </motion.div>))}
        </div>)}
      <AnimatePresence>{open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-emerald-900/40 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 14 }} onClick={(e) => e.stopPropagation()} className="relative max-h-[92vh] w-full max-w-lg overflow-auto rounded-2xl border border-emerald-100 bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-center justify-between"><h2 className="font-display text-lg font-black text-emerald-deep">New Purchase Order</h2><button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-emerald-500 hover:bg-mint/40"><X style={{ width: 18, height: 18 }} /></button></div>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><label className="mb-1.5 block text-xs font-semibold text-emerald-800">Supplier *</label><input required value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inp} placeholder="Vendor name" autoFocus /></div><div><label className="mb-1.5 block text-xs font-semibold text-emerald-800">Status</label><select value={status} onChange={(e) => setStatus(e.target.value)} className={inp}><option value="draft">Draft</option><option value="ordered">Ordered</option><option value="received">Received</option></select></div></div>
              <div><label className="mb-1.5 block text-xs font-semibold text-emerald-800">Line items</label>
                <div className="space-y-2.5">{lines.map((l, idx) => (
                  <div key={idx} className="relative rounded-xl border border-emerald-100 bg-cream/40 p-3">
                    <button type="button" onClick={() => setLines(lines.length > 1 ? lines.filter((_, j) => j !== idx) : lines)} title="Remove line" className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-400 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-90"><X style={{ width: 13, height: 13 }} /></button>
                    <input value={l.description} onChange={(e) => setLines(lines.map((x, j) => j === idx ? { ...x, description: e.target.value } : x))} className={inp + " pr-7"} placeholder="Description" />
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Mini label="Qty"><input type="number" min={0} value={l.quantity} onChange={(e) => setLines(lines.map((x, j) => j === idx ? { ...x, quantity: Number(e.target.value) } : x))} className={inp} placeholder="0" /></Mini>
                      <Mini label="Unit cost (ETB)"><input type="number" min={0} step="0.01" value={l.unitCost} onChange={(e) => setLines(lines.map((x, j) => j === idx ? { ...x, unitCost: Number(e.target.value) } : x))} className={inp} placeholder="0.00" /></Mini>
                    </div>
                  </div>))}</div>
                <button type="button" onClick={() => setLines([...lines, emptyLine()])} className="mt-2 text-xs font-semibold text-emerald-600 hover:text-emerald-800">+ Add line</button>
              </div>
              <div><label className="mb-1.5 block text-xs font-semibold text-emerald-800">Note</label><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={inp + " resize-none"} placeholder="Optional" /></div>
              <div className="flex items-center justify-between rounded-xl bg-emerald-deep px-4 py-3 text-mint"><span className="text-xs uppercase tracking-[0.16em] text-mint/70">Order total</span><span className="font-display text-2xl font-black">{etb(total)}</span></div>
              {msg && <p className="text-sm font-medium text-red-600">{msg}</p>}
              <div className="flex gap-3 pt-1"><button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-emerald-200 py-2.5 text-sm font-semibold text-emerald-deep hover:bg-mint/30">Cancel</button><button type="submit" disabled={busy} className="flex-1 rounded-xl bg-emerald-deep py-2.5 text-sm font-semibold text-mint hover:bg-emerald-800 disabled:opacity-50">{busy ? "Saving..." : "Create PO"}</button></div>
            </form>
          </motion.div>
        </div>)}
      </AnimatePresence>
    </div>
  );
}
function Mini({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700/80">{label}</label>{children}</div>; }