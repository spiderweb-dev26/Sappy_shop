"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, Receipt, Trash2, Search, Check, Plus, X, Undo2 } from "lucide-react";
import { etb, fmtDateTime, ymd } from "@/lib/format";
import QrScanner from "@/components/QrScanner";
import { useResource } from "@/components/useResource";
import { PageSkeleton, ErrorBanner, Spinner } from "@/components/LoadState";
import MasterModal from "@/components/MasterModal";
import CreditBook from "@/components/CreditBook";
type Item = { id: string; serial: string; name: string; sellingPrice: number | null; purchaseValue: number | null };
type Sale = { id: string; saleNo: string; itemName: string; serial: string; quantity: number; unitPrice: number; discount: number; total: number; paymentMethod: string | null; refunded: boolean; refundedAt: string | null; createdAt: string };
type Line = { key: string; query: string; serial: string; name: string; itemId: string; qty: string; unit: string; discount: string };
const inp = "w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-sm text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";
const PAY_METHODS = ["Cash", "Telebirr", "Awash Bank", "CBE (Azeb)", "CBE (Yohannes)", "Abyssinia Bank"];
const newLine = (n: number): Line => ({ key: "L" + n + "-" + Math.random().toString(36).slice(2, 7), query: "", serial: "", name: "", itemId: "", qty: "1", unit: "", discount: "" });
const lineTotal = (l: Line) => Math.max(0, (Number(l.unit) || 0) * (Number(l.qty) || 1) - (Number(l.discount) || 0));
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export default function SalesClient() {
  const iRes = useResource<{ items: Item[] }>("/api/inventory");
  const sRes = useResource<{ sales: Sale[] }>("/api/sales");
  const items = iRes.data?.items || []; const sales = sRes.data?.sales || [];
  const loading = (iRes.loading && !iRes.data) || (sRes.loading && !sRes.data);
  const error = iRes.error || sRes.error;
  const [lines, setLines] = useState<Line[]>([newLine(0)]);
  const [note, setNote] = useState(""); const [pay, setPay] = useState("Cash"); const [saleDate, setSaleDate] = useState(() => ymd(new Date()));
  const [scan, setScan] = useState(false); const scanTarget = useRef<string | null>(null);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(""); const [msgKind, setMsgKind] = useState<"ok" | "err">("ok");
  const [pendingVoid, setPendingVoid] = useState<null | { kind: "refund" | "delete"; id: string }>(null);
  const masterStatus = useResource<{ set: boolean }>("/api/master/status");
  const [masterSet, setMasterSet] = useState<boolean | null>(null);
  useEffect(() => { if (masterStatus.data) setMasterSet(!!masterStatus.data.set); }, [masterStatus.data]);
  const flash = (m: string, k: "ok" | "err") => { setMsg(m); setMsgKind(k); };
  const setLine = (key: string, patch: Partial<Line>) => setLines((p) => p.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const grand = lines.reduce((a, l) => a + lineTotal(l), 0);
  const today = ymd(new Date());
  const todaySales = useMemo(() => sales.filter((s) => ymd(new Date(s.createdAt)) === today).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [sales, today]);
  const todayNet = todaySales.filter((s) => !s.refunded).reduce((a, s) => a + (s.total || 0), 0);
  const filledLines = lines.filter((l) => l.name.trim() || l.serial.trim());

  function pickInto(key: string, i: Item) { const cur = lines.find((l) => l.key === key); setLine(key, { serial: i.serial, name: i.name, itemId: i.id, query: "", unit: cur && cur.unit !== "" ? cur.unit : i.sellingPrice != null ? String(i.sellingPrice) : "" }); }
  function onScan(raw: string) {
    setScan(false);
    const norm = (v: string) => (v || "").toUpperCase().replace(/[^A-Z0-9-]+/g, "");
    const code = norm(raw);
    if (!code) { scanTarget.current = null; return; }
    const i = items.find((x) => norm(x.serial) === code) || items.find((x) => x.id === code);
    const name = i?.name || code;
    const unit = i?.sellingPrice != null ? String(i.sellingPrice) : "";
    if (scanTarget.current) setLines((p) => p.map((l) => (l.key === scanTarget.current ? { ...l, serial: i?.serial || code, name, itemId: i?.id || "", query: "", unit: l.unit || unit } : l)));
    else {
      const ex = lines.find((l) => norm(l.serial) === code);
      if (ex) setLine(ex.key, { qty: String((Number(ex.qty) || 1) + 1) });
      else setLines((p) => [...p.filter((l) => l.name || l.serial || l.query), { ...newLine(Date.now()), serial: i?.serial || code, name, itemId: i?.id || "", unit }]);
    }
    if (!i) flash("Scanned " + code + " not found in stock - enter unit price manually.", "err");
    scanTarget.current = null;
  }

  async function record(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); flash("", "ok");
    const todo = filledLines;
    if (!todo.length) { flash("Add at least one item to the ticket.", "err"); setBusy(false); return; }
    const bad = todo.find((l) => l.unit === "" || !(Number(l.qty) >= 1));
    if (bad) { flash(`Line "${bad.name || bad.serial || "?"}" needs a unit price and qty.`, "err"); setBusy(false); return; }
    let done = 0;
    for (const l of todo) {
      try {
        const r = await fetch("/api/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serial: l.serial || undefined, name: l.name || undefined, itemId: l.itemId || undefined, quantity: Number(l.qty) || 1, unitPrice: Number(l.unit), discount: Number(l.discount) || 0, paymentMethod: pay, note: note || undefined, date: saleDate, backdated: saleDate < ymd(new Date()) }) });
        const d = await r.json(); if (!r.ok) throw new Error(d?.error || "Failed"); done++;
      } catch (err: any) { flash(`Stopped at line ${done + 1}: ${err?.message || "failed"}. ${done} recorded.`, "err"); setBusy(false); sRes.reload(); return; }
    }
    sRes.reload(); setLines([newLine(Date.now())]); setNote(""); flash(`Recorded ${done} sale${done > 1 ? "s" : ""} · ${pay}.`, "ok"); setBusy(false);
  }

  function askVoid(kind: "refund" | "delete", id: string) { setPendingVoid({ kind, id }); }
  async function performVoid(pw: string) {
    if (!pendingVoid) return;
    const { kind, id } = pendingVoid;
    if (kind === "refund") {
      const r = await fetch(`/api/sales/${id}/refund`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ masterPassword: pw }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Refund failed");
      sRes.reload(); flash(j?.refunded ? "Sale refunded - removed from totals." : "Refund reversed - sale restored.", "ok");
    } else {
      const r = await fetch(`/api/sales/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ masterPassword: pw }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Delete failed");
      sRes.reload(); flash("Sale deleted.", "ok");
    }
    setPendingVoid(null);
  }
  const retry = () => { iRes.reload(); sRes.reload(); };

  return (
    <div>
      <header className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600/80">Transactions</p><h1 className="mt-1 font-display text-3xl font-black tracking-tight text-emerald-deep md:text-4xl">Sales</h1><p className="mt-1 text-sm text-emerald-900/60">Record by name, serial or QR scan. Today (net): <span className="font-display font-bold text-emerald-deep">{etb(todayNet)}</span></p></header>
      {error && <div className="mb-4"><ErrorBanner error={error} onRetry={retry} /></div>}
      {msg && !error && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={`mb-4 rounded-xl border px-4 py-2.5 text-sm font-medium ${msgKind === "err" ? "border-red-200 bg-red-50 text-red-600" : "border-emerald-200 bg-mint/30 text-emerald-800"}`}>{msg}</motion.div>}
      {loading ? <PageSkeleton /> : (<>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-2xl border border-emerald-100 bg-white p-4 shadow-soft sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-deep text-mint"><Receipt style={{ width: 15, height: 15 }} /></span><span className="font-display text-lg font-black text-emerald-deep">New ticket</span><span className="rounded-full bg-mint/50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">{filledLines.length} line{filledLines.length === 1 ? "" : "s"}</span></div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { scanTarget.current = null; setScan(true); }} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-deep shadow-soft transition hover:bg-mint/30 active:scale-95"><ScanLine style={{ width: 15, height: 15 }} /> Scan</button>
              <button type="button" onClick={() => setLines((p) => [...p, newLine(Date.now())])} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-deep shadow-soft transition hover:bg-mint/30 active:scale-95"><Plus style={{ width: 15, height: 15 }} /> Line</button>
            </div>
          </div>
          <div className="space-y-3">
            <AnimatePresence initial={false}>{lines.map((l) => {
              const t = l.query.trim().toLowerCase();
              const sugg = t ? items.filter((i) => i.name.toLowerCase().includes(t) || i.serial.toLowerCase().includes(t)).slice(0, 5) : [];
              const resolved = items.find((i) => i.serial && i.serial === l.serial) || items.find((i) => i.id === l.itemId);
              return (
                <motion.div key={l.key} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="relative rounded-xl border border-emerald-100 bg-cream/40 p-3">
                  <button type="button" disabled={lines.length === 1} onClick={() => setLines((p) => p.length > 1 ? p.filter((x) => x.key !== l.key) : p)} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-400 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-90 disabled:opacity-30"><X style={{ width: 13, height: 13 }} /></button>
                  <div className="flex items-start gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-3 text-emerald-400" style={{ width: 15, height: 15 }} />
                      <input value={l.query || (l.name ? `${l.name}  ·  ${l.serial}` : "")} onChange={(e) => setLine(l.key, { query: e.target.value, serial: "", name: "", itemId: "" })} placeholder="Search stock / type item / serial" className={inp + " pl-9"} />
                      {sugg.length > 0 && <ul className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-emerald-100 bg-white shadow-soft">{sugg.map((i) => <li key={i.id}><button type="button" onClick={() => pickInto(l.key, i)} className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-sm hover:bg-mint/30"><span className="min-w-0 truncate font-medium text-emerald-deep">{i.name}</span><span className="shrink-0 text-right"><span className="block font-display text-xs font-black text-emerald-deep">{i.sellingPrice != null ? etb(i.sellingPrice) : "-"}</span><span className="block font-mono text-[10px] text-emerald-600/60">{i.serial}</span></span></button></li>)}</ul>}
                    </div>
                    <button type="button" onClick={() => { scanTarget.current = l.key; setScan(true); }} className="shrink-0 rounded-xl border border-emerald-200 bg-white p-2.5 text-emerald-deep transition hover:bg-mint/30 active:scale-95"><ScanLine style={{ width: 16, height: 16 }} /></button>
                  </div>
                  {resolved && <div className="mt-2 inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-full bg-mint/50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800"><Check style={{ width: 12, height: 12 }} className="shrink-0" /><span className="truncate">{resolved.name}</span>{resolved.sellingPrice != null && <span>· sell {etb(resolved.sellingPrice)}</span>}</div>}
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Mini label="Qty"><input type="number" min={1} value={l.qty} onChange={(e) => setLine(l.key, { qty: e.target.value })} className={inp} /></Mini>
                    <Mini label="Unit (ETB)"><input type="number" min={0} step="0.01" value={l.unit} onChange={(e) => setLine(l.key, { unit: e.target.value })} className={inp} placeholder="0.00" /></Mini>
                    <Mini label="Discount"><input type="number" min={0} step="0.01" value={l.discount} onChange={(e) => setLine(l.key, { discount: e.target.value })} className={inp} placeholder="0.00" /></Mini>
                    <div className="flex flex-col justify-end"><div className="rounded-lg bg-emerald-deep/5 px-3 py-2.5 text-right"><div className="text-[9px] uppercase tracking-[0.14em] text-emerald-600/70">Line</div><div className="font-display text-sm font-black text-emerald-deep">{etb(lineTotal(l))}</div></div></div>
                  </div>
                </motion.div>
              );
            })}</AnimatePresence>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div><label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Date</label><input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value || ymd(new Date()))} className={inp} /></div>
            <div><label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Payment method</label><select value={pay} onChange={(e) => setPay(e.target.value)} className={inp}>{PAY_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
            <div><label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Note (all lines)</label><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" className={inp} /></div>
            <div className="flex items-end justify-between gap-4 sm:justify-end">
              <div className="text-right"><div className="text-[10px] uppercase tracking-[0.18em] text-emerald-600/70">Grand total</div><motion.div key={grand} initial={{ scale: 0.92 }} animate={{ scale: 1 }} className="font-display text-2xl font-black leading-none text-emerald-deep">{etb(grand)}</motion.div></div>
              <button type="button" onClick={record} disabled={busy} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-deep px-5 py-3 text-sm font-black text-mint shadow-soft transition hover:-translate-y-0.5 hover:bg-emerald-800 active:scale-95 disabled:opacity-50">{busy ? <Spinner className="h-4 w-4 border-mint/30 border-t-mint" /> : <Receipt style={{ width: 16, height: 16 }} />} {busy ? "Recording..." : "Record"}</button>
            </div>
          </div>
        </motion.div>

        <div className="mb-6 rounded-2xl border border-emerald-100 bg-white shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 bg-mint/15 px-5 py-3.5">
            <div className="flex items-center gap-2"><span className="font-display text-lg font-black text-emerald-deep">Today's sales</span><span className="rounded-full bg-emerald-deep px-2.5 py-0.5 text-[11px] font-black text-mint">{todaySales.length}</span></div>
            <div className="text-right"><div className="text-[10px] uppercase tracking-[0.16em] text-emerald-900/50">Net today</div><div className="font-display text-xl font-black text-emerald-deep">{etb(todayNet)}</div></div>
          </div>
          {todaySales.length === 0 ? <p className="px-5 py-10 text-center text-sm text-emerald-900/55">No sales yet today - record one above.</p> : (
            <ul className="divide-y divide-emerald-50">
              {todaySales.map((s, i) => (
                <motion.li key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="w-14 shrink-0 font-mono text-xs text-emerald-700">{timeOf(s.createdAt)}</span>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm font-semibold ${s.refunded ? "text-emerald-900/40 line-through" : "text-emerald-deep"}`}>{s.itemName}</div>
                    <div className="font-mono text-[11px] text-emerald-600/60">{s.saleNo}{s.serial ? ` · ${s.serial}` : ""}</div>
                  </div>
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">{s.paymentMethod || "Cash"}</span>{s.backdated && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">Backdated</span>}
                  <span className="text-xs text-emerald-900/60">×{s.quantity}</span>
                  {s.refunded && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-red-600">Refunded</span>}
                  <span className={`font-display text-sm font-black ${s.refunded ? "text-emerald-900/40 line-through" : "text-emerald-deep"}`}>{etb(s.total)}</span>
                  <button onClick={() => askVoid("refund", s.id)} title={s.refunded ? "Reverse refund" : "Refund"} className={`rounded-lg p-2 transition active:scale-90 ${s.refunded ? "text-emerald-600 hover:bg-mint/40" : "text-amber-600 hover:bg-amber-50"}`}><Undo2 style={{ width: 15, height: 15 }} /></button>
                </motion.li>
              ))}
            </ul>
          )}
        </div>

        <div className="mb-6 space-y-3 md:hidden">
          {sales.length === 0 && <div className="rounded-2xl border border-emerald-100 bg-white py-12 text-center text-sm text-emerald-900/55">No sales recorded yet.</div>}
          {sales.map((s) => (
            <div key={s.id} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={`truncate text-sm font-semibold ${s.refunded ? "text-emerald-900/40 line-through" : "text-emerald-deep"}`}>{s.itemName}</div>
                  <div className="font-mono text-[11px] text-emerald-600/60">{s.saleNo}</div>
                  <div className="mt-0.5 text-[11px] text-emerald-900/55">{fmtDateTime(s.createdAt)}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`font-display text-base font-black ${s.refunded ? "text-emerald-900/40 line-through" : "text-emerald-deep"}`}>{etb(s.total)}</div>
                  <div className="text-[10px] text-emerald-900/50">x{s.quantity}</div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">{s.paymentMethod || "Cash"}</span>{s.backdated && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">Backdated</span>}
                {s.refunded && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-red-600">Refunded</span>}
              </div>
              <div className="mt-3 flex items-center justify-end gap-1 border-t border-emerald-50 pt-2">
                <button onClick={() => askVoid("refund", s.id)} title={s.refunded ? "Reverse refund" : "Refund"} className={`rounded-lg p-2 transition active:scale-90 ${s.refunded ? "text-emerald-600 hover:bg-mint/40" : "text-amber-600 hover:bg-amber-50"}`}><Undo2 style={{ width: 15, height: 15 }} /></button>
                <button onClick={() => askVoid("delete", s.id)} title="Delete" className="rounded-lg p-2 text-emerald-600/70 transition hover:bg-red-50 hover:text-red-600 active:scale-90"><Trash2 style={{ width: 15, height: 15 }} /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden md:block overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-soft">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead><tr className="border-b border-emerald-100 bg-mint/20 text-[11px] uppercase tracking-wider text-emerald-700"><th className="px-5 py-3 font-semibold">When</th><th className="px-5 py-3 font-semibold">Sale #</th><th className="px-5 py-3 font-semibold">Item</th><th className="px-5 py-3 font-semibold">Payment</th><th className="px-5 py-3 text-right font-semibold">Qty</th><th className="px-5 py-3 text-right font-semibold">Total</th><th className="px-5 py-3 text-right font-semibold">Actions</th></tr></thead>
            <tbody className="divide-y divide-emerald-50">
              {sales.length === 0 && <tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-emerald-900/55">No sales recorded yet.</td></tr>}
              {sales.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-cream/60">
                  <td className="px-5 py-3 text-xs text-emerald-900/60">{fmtDateTime(s.createdAt)}</td>
                  <td className="px-5 py-3 font-mono text-xs text-emerald-700">{s.saleNo}</td>
                  <td className="px-5 py-3"><div className={`font-semibold ${s.refunded ? "text-emerald-900/40 line-through" : "text-emerald-deep"}`}>{s.itemName}</div>{s.refunded && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold uppercase text-red-600">Refunded</span>}</td>
                  <td className="px-5 py-3"><span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">{s.paymentMethod || "Cash"}</span>{s.backdated && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">Backdated</span>}</td>
                  <td className="px-5 py-3 text-right font-bold text-emerald-deep">{s.quantity}</td>
                  <td className={`px-5 py-3 text-right font-display font-bold ${s.refunded ? "text-emerald-900/40 line-through" : "text-emerald-deep"}`}>{etb(s.total)}</td>
                  <td className="px-5 py-3"><div className="flex items-center justify-end gap-1">
                    <button onClick={() => askVoid("refund", s.id)} title={s.refunded ? "Reverse refund" : "Refund"} className={`rounded-lg p-2 transition active:scale-90 ${s.refunded ? "text-emerald-600 hover:bg-mint/40" : "text-amber-600 hover:bg-amber-50"}`}><Undo2 style={{ width: 15, height: 15 }} /></button>
                    <button onClick={() => askVoid("delete", s.id)} title="Delete" className="rounded-lg p-2 text-emerald-600/70 transition hover:bg-red-50 hover:text-red-600 active:scale-90"><Trash2 style={{ width: 15, height: 15 }} /></button>
                  </div></td>
                </tr>))}
            </tbody>
          </table>
        </div>
        <CreditBook />
      </>)}
      <MasterModal open={pendingVoid !== null} mode={masterSet ? "verify" : "set"} onClose={() => setPendingVoid(null)} onVerified={performVoid} onMasterSet={() => setMasterSet(true)} verifyTitle={pendingVoid?.kind === "delete" ? "Confirm delete" : "Confirm void"} verifySubtitle="Enter the master password to void this sale." setTitle="Set master password" setSubtitle="Create a master password first - it protects voiding and deleting sales." confirmLabel={pendingVoid?.kind === "delete" ? "Delete sale" : "Void sale"} />
      {scan && <QrScanner onScan={onScan} onClose={() => { setScan(false); scanTarget.current = null; }} />}
    </div>
  );
}
function Mini({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700/80">{label}</label>{children}</div>; }