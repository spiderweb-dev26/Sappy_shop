"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Check, Plus, FileDown, Trash2 } from "lucide-react";
import { etb, fmtDate, ymd } from "@/lib/format";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useResource } from "@/components/useResource";
import { Spinner } from "@/components/LoadState";
type Credit = { id: string; customer: string; detail: string | null; amount: number; date: string; paid: boolean; paidAt: string | null };
const inp = "w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-sm text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";
export default function CreditBook() {
  const res = useResource<{ credits: Credit[] }>("/api/credits");
  const credits = res.data?.credits || [];
  const [customer, setCustomer] = useState(""); const [detail, setDetail] = useState(""); const [amount, setAmount] = useState(""); const [date, setDate] = useState(() => ymd(new Date()));
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(""); const [msgKind, setMsgKind] = useState<"ok" | "err">("ok");
  const outstanding = credits.filter((c) => !c.paid);
  const totalOut = outstanding.reduce((a, c) => a + (c.amount || 0), 0);
  const flash = (m: string, k: "ok" | "err") => { setMsg(m); setMsgKind(k); };
  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); flash("", "ok");
    try {
      const r = await fetch("/api/credits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer, detail, amount, date, backdated: date < ymd(new Date()) }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j?.error || "Failed");
      res.reload(); setCustomer(""); setDetail(""); setAmount(""); flash("Credit recorded.", "ok");
    } catch (e: any) { flash(e?.message || "Failed", "err"); } finally { setBusy(false); }
  }
  async function markPaid(id: string) { await fetch(`/api/credits/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paid: true }) }); res.reload(); }
  async function del(id: string) { if (!confirm("Delete this credit record?")) return; await fetch(`/api/credits/${id}`, { method: "DELETE" }); res.reload(); }
  function pdf() {
    if (!outstanding.length) return;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" }); const headH = 30;
    autoTable(doc, {
      margin: { top: headH + 6, bottom: 16, left: 12, right: 12 },
      head: [["Date", "Customer", "Items / detail", "Amount (ETB)"]],
      body: outstanding.map((c) => [fmtDate(c.date), c.customer, c.detail || "-", String(c.amount)]),
      styles: { fontSize: 8, cellPadding: 2.2, textColor: [30, 30, 30], overflow: "linebreak" },
      headStyles: { fillColor: [6, 95, 70], textColor: [167, 243, 208], fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: [255, 248, 231] },
      didDrawPage: () => { const pw = doc.internal.pageSize.getWidth(); doc.setFillColor(6, 95, 70); doc.rect(0, 0, pw, headH, "F"); doc.setTextColor(167, 243, 208); doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text("SAPPY LEGACY", 12, 12); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("CREDIT BOOK - OUTSTANDING", 12, 17.5); doc.setTextColor(255, 248, 231); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(`Outstanding ${etb(totalOut)}`, 12, 25); },
    });
    const fy = (doc as any).lastAutoTable.finalY;
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(6, 95, 70);
    doc.text(`Total outstanding: ${etb(totalOut)}`, doc.internal.pageSize.getWidth() - 12, fy + 8, { align: "right" });
    doc.save(`credit-book-${ymd(new Date())}.pdf`);
  }
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-2xl border border-emerald-100 bg-white p-4 shadow-soft sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-deep text-mint"><CreditCard style={{ width: 17, height: 17 }} /></span><div><h2 className="font-display text-xl font-black text-emerald-deep">Credit book</h2><p className="text-xs text-emerald-900/55">Items taken on credit (pay later).</p></div></div>
        <div className="text-right"><div className="text-[10px] uppercase tracking-[0.16em] text-emerald-900/50">Outstanding</div><div className="font-display text-xl font-black text-emerald-deep">{etb(totalOut)}</div></div>
      </div>
      <form onSubmit={add} className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" className={inp} />
        <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Items taken (e.g. 2x Scissors)" className={inp + " lg:col-span-2"} />
        <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (ETB)" className={inp} />
        <div className="flex gap-2"><input type="date" value={date} onChange={(e) => setDate(e.target.value || ymd(new Date()))} className={inp} /><button type="submit" disabled={busy} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-deep px-4 py-2 text-sm font-black text-mint shadow-soft transition hover:bg-emerald-800 active:scale-95 disabled:opacity-50">{busy ? <Spinner className="h-4 w-4 border-mint/30 border-t-mint" /> : <Plus style={{ width: 15, height: 15 }} />} Add</button></div>
      </form>
      {msg && <div className={`mb-3 rounded-xl border px-3 py-2 text-sm font-medium ${msgKind === "err" ? "border-red-200 bg-red-50 text-red-600" : "border-emerald-200 bg-mint/30 text-emerald-800"}`}>{msg}</div>}
      <div className="mb-3 flex justify-end"><button onClick={pdf} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-deep shadow-soft transition hover:-translate-y-0.5 hover:bg-mint/30 active:scale-95"><FileDown style={{ width: 14, height: 14 }} /> PDF</button></div>
      {outstanding.length === 0 ? <p className="py-6 text-center text-sm text-emerald-900/55">No outstanding credit - everyone has settled up.</p> : (
        <div className="space-y-2">
          {outstanding.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-100 bg-cream/40 p-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-emerald-deep">{c.customer}</div>
                <div className="text-xs text-emerald-900/60">{c.detail || "-"}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-900/50">{fmtDate(c.date)}{c.backdated && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-700">Backdated</span>}</div>
              </div>
              <div className="font-display text-base font-black text-emerald-deep">{etb(c.amount)}</div>
              <button onClick={() => markPaid(c.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-deep px-3 py-1.5 text-xs font-bold text-mint transition hover:bg-emerald-800 active:scale-95"><Check style={{ width: 13, height: 13 }} /> Mark paid</button>
              <button onClick={() => del(c.id)} title="Delete" className="rounded-lg p-2 text-emerald-600/70 transition hover:bg-red-50 hover:text-red-600 active:scale-90"><Trash2 style={{ width: 15, height: 15 }} /></button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}