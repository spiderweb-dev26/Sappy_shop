"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Copy, Check, FileSpreadsheet, ListChecks, AlertTriangle } from "lucide-react";

type Req = "required" | "recommended" | "optional";
const FIELDS: { h: string; req: Req; blank: string; desc: string; aliases: string[] }[] = [
  { h: "Name", req: "required", blank: "row is skipped", desc: "The item's name — the only mandatory column.", aliases: ["name", "item", "item name", "product", "title"] },
  { h: "Category", req: "optional", blank: "stored empty", desc: "A grouping label, e.g. Tools or PPE.", aliases: ["category", "type", "group"] },
  { h: "Quantity", req: "optional", blank: "defaults to 1", desc: "Whole-number stock count.", aliases: ["quantity", "qty", "count", "amount", "stock"] },
  { h: "Selling Price", req: "recommended", blank: "shows as “-”", desc: "Your sell price in ETB. Auto-fills new sales.", aliases: ["selling price", "sell price", "price", "mrp", "retail price", "retail", "unit price", "sell"] },
  { h: "Cost", req: "optional", blank: "marked UNKNOWN", desc: "What you paid. Leave empty if you don't know it.", aliases: ["cost", "purchase value", "unit cost", "value", "buy price", "purchase price"] },
  { h: "Location", req: "optional", blank: "stored empty", desc: "Where the item lives (shelf / bin).", aliases: ["location", "loc", "bin", "shelf", "where"] },
  { h: "Notes", req: "optional", blank: "stored empty", desc: "Free-text remarks.", aliases: ["notes", "note", "description", "desc", "remarks"] },
];
const reqStyle: Record<Req, string> = {
  required: "bg-emerald-deep text-mint",
  recommended: "bg-mint text-emerald-deep",
  optional: "bg-emerald-50 text-emerald-700 border border-emerald-100",
};
const SAMPLE: (string | number)[][] = [
  ["Name", "Category", "Quantity", "Selling Price", "Cost", "Location", "Notes"],
  ["Cordless Drill", "Tools", 4, 2500, 1800, "Shelf A-3", "18V brushless"],
  ["Safety Goggles", "PPE", 25, 120, "", "Bin 12", "anti-fog"],
  ["USB-C Cable", "Electronics", 60, 150, 90, "Drawer 2", "1m braided"],
];
const CSV_TEXT = SAMPLE.map((r) => r.map((c) => { const s = String(c); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(",")).join("\n");

async function copyCsv(setCopied: (b: boolean) => void) {
  try { await navigator.clipboard.writeText(CSV_TEXT); }
  catch {
    const ta = document.createElement("textarea"); ta.value = CSV_TEXT; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch {}
    ta.remove();
  }
  setCopied(true); setTimeout(() => setCopied(false), 1800);
}
async function downloadTemplate() {
  try {
    const r = await fetch("/api/inventory/template", { cache: "no-store" });
    if (!r.ok) throw new Error("Template unavailable");
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sappy-legacy-import-template.xlsx";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch {}
}

export default function ImportGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-emerald-900/55 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 18 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} onClick={(e) => e.stopPropagation()} className="relative max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-2xl">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-mint/40 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-deep via-emerald-500 to-mint" />
            <div className="relative flex max-h-[92vh] flex-col">
              <div className="relative overflow-hidden border-b border-emerald-100 px-5 pb-5 pt-6 sm:px-7" style={{ backgroundImage: "radial-gradient(rgba(6,95,70,0.05) 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
                <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-emerald-500 transition hover:bg-mint/40 active:scale-90" aria-label="Close"><X style={{ width: 18, height: 18 }} /></button>
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-deep text-mint shadow-soft"><FileSpreadsheet style={{ width: 22, height: 22 }} /></span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600/80">Excel / CSV import</p>
                    <h2 className="font-display text-2xl font-black leading-tight tracking-tight text-emerald-deep sm:text-3xl">How to build your file</h2>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                  <Legend dot="bg-emerald-deep" label="required" />
                  <Legend dot="bg-mint" ring="ring-emerald-200" label="recommended" />
                  <Legend dot="bg-emerald-100" ring="ring-emerald-200" label="optional" />
                  <span className="text-emerald-900/45">· row 1 = headers · data from row 2 · first sheet only</span>
                </div>
              </div>
              <div className="relative flex-1 space-y-3 overflow-auto px-5 py-5 sm:px-7">
                {FIELDS.map((f, i) => (
                  <motion.div key={f.h} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }} className="rounded-2xl border border-emerald-100 bg-cream/40 p-3.5 transition hover:border-emerald-200 hover:bg-cream/70 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <code className="rounded-lg bg-white px-2.5 py-1 font-mono text-sm font-bold text-emerald-deep shadow-sm">{f.h}</code>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${reqStyle[f.req]}`}>{f.req}</span>
                      </div>
                      <span className="text-[11px] text-emerald-900/50">if blank → <span className="font-semibold text-emerald-700">{f.blank}</span></span>
                    </div>
                    <p className="mt-2 text-sm leading-snug text-emerald-900/70">{f.desc}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-600/60">also accepts</span>
                      {f.aliases.map((a) => (
                        <span key={a} className="cursor-default rounded-md border border-emerald-100 bg-white px-2 py-0.5 font-mono text-[11px] text-emerald-700 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-deep">{a}</span>
                      ))}
                    </div>
                  </motion.div>
                ))}
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 sm:p-4">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle style={{ width: 16, height: 16, marginTop: 1 }} className="shrink-0 text-amber-600" />
                    <p className="text-sm leading-snug text-amber-800"><span className="font-bold">Two gotchas.</span> A header must <em>equal</em> an accepted name — <code className="rounded bg-white px-1">Cost (ETB)</code> won't match, so keep currency out of headers. And <code className="rounded bg-white px-1">Price</code> always means <em>sell</em> price; for buy price use <code className="rounded bg-white px-1">Cost</code>.</p>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700"><ListChecks style={{ width: 14, height: 14 }} /> Worked example</div>
                  <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-soft">
                    <table className="w-full text-left text-xs">
                      <thead><tr className="bg-mint/20 text-[10px] uppercase tracking-wider text-emerald-700">{SAMPLE[0].map((h) => <th key={String(h)} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
                      <tbody className="divide-y divide-emerald-50">{SAMPLE.slice(1).map((r, ri) => (
                        <tr key={ri} className="text-emerald-900/80">{r.map((c, ci) => <td key={ci} className={`px-3 py-2 ${ci === 0 ? "font-semibold text-emerald-deep" : ""} ${c === "" ? "text-amber-600" : ""}`}>{c === "" ? <span className="text-[10px] uppercase tracking-wide">unknown</span> : String(c)}</td>)}</tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="relative flex flex-col gap-2 border-t border-emerald-100 bg-cream/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <button onClick={() => copyCsv(setCopied)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-deep shadow-soft transition hover:bg-mint/30 active:scale-[0.98]">
                  {copied ? <Check style={{ width: 16, height: 16 }} /> : <Copy style={{ width: 16, height: 16 }} />} {copied ? "Copied CSV!" : "Copy CSV sample"}
                </button>
                <div className="flex gap-2">
                  <button onClick={onClose} className="flex-1 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-deep transition hover:bg-mint/30 active:scale-[0.98] sm:flex-none">Got it</button>
                  <button onClick={downloadTemplate} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-deep px-4 py-2.5 text-sm font-bold text-mint shadow-soft transition hover:bg-emerald-800 active:scale-[0.98] sm:flex-none"><Download style={{ width: 16, height: 16 }} /> .xlsx template</button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
function Legend({ dot, label, ring }: { dot: string; label: string; ring?: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-emerald-800 shadow-sm"><span className={`h-2.5 w-2.5 rounded-full ${dot} ${ring ? "ring-1 " + ring : ""}`} />{label}</span>;
}