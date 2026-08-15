"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Upload, Search, Trash2, QrCode, X, Download, Boxes, Pencil, TrendingUp, TrendingDown, FileSpreadsheet, FileDown, Layers, Check, LayoutGrid } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { etb, fmtDate, ymd } from "@/lib/format";
import { useResource } from "@/components/useResource";
import { PageSkeleton, ErrorBanner, Spinner } from "@/components/LoadState";
import { Counter } from "@/components/Stat";
import MasterModal from "@/components/MasterModal";
import ImportGuideModal from "@/components/ImportGuideModal";
import { makeQrDataUrl, makeQrBlock, buildLabelSvg } from "@/lib/qrClient";
type U = { name?: string | null; email?: string } | null;
type Item = { id: string; serial: string; name: string; category: string | null; quantity: number; location: string | null; notes: string | null; purchaseValue: number | null; sellingPrice: number | null; costUnknown: boolean; dupKeptAt?: string | null; dupKeptBy?: string | null; createdAt: string; user?: U };
const inp = "w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-sm text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";
const empty = { name: "", category: "", quantity: "1", location: "", notes: "", purchaseValue: "", sellingPrice: "", costUnknown: false };
const EM = [6, 95, 70] as [number, number, number];
const MINT = [167, 243, 208] as [number, number, number];
const CREAM = [255, 248, 231] as [number, number, number];
const normName = (s?: string | null) => (s || "").trim().replace(/\s+/g, " ").toLowerCase();
const GRIDS = ["2x2", "3x3", "4x3", "5x3", "5x4", "6x6", "8x8", "10x10", "12x12"];

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function InventoryClient() {
  const res = useResource<{ items: Item[] }>("/api/inventory");
  const masterStatus = useResource<{ set: boolean }>("/api/master/status");
  const items = res.data?.items || []; const loading = res.loading && !res.data; const error = res.error;
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false); const [edit, setEdit] = useState<Item | null>(null);
  const [form, setForm] = useState(empty); const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(""); const [msgKind, setMsgKind] = useState<"ok" | "err">("ok");
  const [label, setLabel] = useState<Item | null>(null);
  const [delTarget, setDelTarget] = useState<Item | null>(null);
  const [masterSet, setMasterSet] = useState<boolean | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [view, setView] = useState<"all" | "dup">("all");
  const [keptIds, setKeptIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [grid, setGrid] = useState("5x3");
  const [sheetBusy, setSheetBusy] = useState(false);
  const [labelUrl, setLabelUrl] = useState("");
  useEffect(() => {
    let alive = true;
    if (!label) { setLabelUrl(""); return; }
    (async () => {
      const block = await makeQrBlock(label.serial);
      const svg = buildLabelSvg(label.name, label.serial, block);
      if (alive) setLabelUrl(svg);
    })();
    return () => { alive = false; };
  }, [label]);
  useEffect(() => { setKeptIds(new Set()); }, [res.data]);
  useEffect(() => { if (masterStatus.data) setMasterSet(!!masterStatus.data.set); }, [masterStatus.data]);
  useEffect(() => { const h = () => masterStatus.reload(); window.addEventListener("sl:master-changed", h); return () => window.removeEventListener("sl:master-changed", h); }, []);

  const flash = (m: string, k: "ok" | "err") => { setMsg(m); setMsgKind(k); };
  function openNew() { setEdit(null); setForm(empty); setOpen(true); }
  function openEdit(i: Item) { setEdit(i); setForm({ name: i.name, category: i.category || "", quantity: String(i.quantity), location: i.location || "", notes: i.notes || "", purchaseValue: i.purchaseValue != null ? String(i.purchaseValue) : "", sellingPrice: i.sellingPrice != null ? String(i.sellingPrice) : "", costUnknown: i.costUnknown }); setOpen(true); }
  const cNum = form.costUnknown ? null : (form.purchaseValue === "" ? null : Number(form.purchaseValue));
  const sNum = form.sellingPrice === "" ? null : Number(form.sellingPrice);
  const margin = (sNum != null && sNum > 0 && cNum != null && cNum >= 0) ? sNum - cNum : null;
  const marginPct = (margin != null && sNum) ? (margin / sNum) * 100 : null;

  const matches = (i: Item) => (i.name + " " + i.serial + " " + (i.category || "") + " " + (i.location || "")).toLowerCase().includes(q.toLowerCase());
  const searched = q ? items.filter(matches) : items;
  const filtered = searched;
  const effective = searched.filter((i) => !i.dupKeptAt && !keptIds.has(i.id));
  const clusterMap = new Map<string, Item[]>();
  for (const i of effective) { const k = normName(i.name); if (!k) continue; const a = clusterMap.get(k); if (a) a.push(i); else clusterMap.set(k, [i]); }
  const clusters = [...clusterMap.entries()].filter(([, a]) => a.length >= 2).map(([k, a]) => ({ key: k, name: a[0].name, items: a })).sort((x, y) => y.items.length - x.items.length || x.name.localeCompare(y.name));
  const dupItemCount = clusters.reduce((a, c) => a + c.items.length, 0);
  const reviewedCount = items.filter((i) => i.dupKeptAt).length;
  const activeNameSet = new Set(clusters.map((c) => c.key));

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const selSet = useMemo(() => new Set(selected), [selected]);
  const filteredSet = useMemo(() => new Set(filtered.map((i) => i.id)), [filtered]);
  const ordered = useMemo(() => selected.map((id) => itemsById.get(id)).filter(Boolean) as Item[], [selected, itemsById]);
  const allSel = filtered.length > 0 && filtered.every((i) => selSet.has(i.id));

  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  function toggleAll() {
    if (allSel) setSelected((prev) => prev.filter((id) => !filteredSet.has(id)));
    else { const add = filtered.filter((i) => !selSet.has(i.id)).map((i) => i.id); setSelected((prev) => [...prev, ...add]); }
  }
  function exitSelect() { setSelectMode(false); setSelected([]); }

  const totals = (rows: Item[]) => {
    const qty = rows.reduce((a, i) => a + (i.quantity || 0), 0);
    const sell = rows.reduce((a, i) => a + (i.sellingPrice != null ? i.sellingPrice * i.quantity : 0), 0);
    const cost = rows.reduce((a, i) => a + (!i.costUnknown && i.purchaseValue != null ? i.purchaseValue * i.quantity : 0), 0);
    const unknown = rows.filter((i) => i.costUnknown).length;
    return { qty, sell, cost, unknown };
  };
  const kpi = totals(filtered);

  function exportXlsx() {
    if (!filtered.length) return;
    setBusy(true); flash("", "ok");
    fetch("/api/inventory/export?q=" + encodeURIComponent(q), { cache: "no-store" })
      .then(async (r) => { if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j?.error || "Export failed"); } return r.blob(); })
      .then((blob) => { triggerDownload(blob, `sappy-legacy-inventory-${ymd(new Date())}.xlsx`); flash(`Exported ${filtered.length} item(s) to Excel.`, "ok"); })
      .catch((e: any) => flash(e?.message || "Export failed", "err"))
      .finally(() => setBusy(false));
  }

  function exportPdf() {
    if (!filtered.length) return;
    const now = new Date(); const t = totals(filtered);
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    const headH = 30;
    autoTable(doc, {
      margin: { top: headH + 6, bottom: 16, left: 12, right: 12 },
      head: [["Serial", "Item", "Category", "Sell (ETB)", "Cost (ETB)", "Qty", "Value (ETB)", "Location", "By"]],
      body: [...filtered.map((i) => [i.serial, i.name, i.category || "-", i.sellingPrice != null ? etb(i.sellingPrice) : "-", i.costUnknown ? "UNKNOWN" : (i.purchaseValue != null ? etb(i.purchaseValue) : "-"), String(i.quantity), i.sellingPrice != null ? etb(i.sellingPrice * i.quantity) : "-", i.location || "-", byLabel(i.user) || "-"]), ["", "TOTAL", "", "", etb(t.cost), String(t.qty), etb(t.sell), "", ""]],
      styles: { fontSize: 8, cellPadding: 2.2, textColor: [30, 30, 30], overflow: "linebreak" },
      headStyles: { fillColor: EM, textColor: MINT, fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: CREAM },
      columnStyles: { 0: { font: "courier", fontSize: 7.5, cellWidth: 30 }, 1: { cellWidth: 54 }, 2: { cellWidth: 24 }, 3: { halign: "right", cellWidth: 24 }, 4: { halign: "right", cellWidth: 24 }, 5: { halign: "right", cellWidth: 14 }, 6: { halign: "right", fontStyle: "bold", cellWidth: 26 }, 7: { cellWidth: 28 }, 8: { cellWidth: 26 } },
      didParseCell: (data: any) => { if (data.section === "body" && data.row.index === filtered.length) { data.cell.styles.fillColor = EM; data.cell.styles.textColor = MINT; data.cell.styles.fontStyle = "bold"; data.cell.styles.fontSize = 8.5; } },
      didDrawPage: (data: any) => {
        const pw = doc.internal.pageSize.getWidth(); const ph = doc.internal.pageSize.getHeight();
        doc.setFillColor(...EM); doc.rect(0, 0, pw, headH, "F");
        doc.setTextColor(...MINT); doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text("SAPPY LEGACY", 12, 12);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("INVENTORY LEDGER", 12, 17.5);
        doc.setTextColor(255, 248, 231); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(`Inventory  -  ${filtered.length} item${filtered.length === 1 ? "" : "s"}`, 12, 25);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(now.toLocaleString("en-GB"), pw - 12, 12, { align: "right" });
        doc.setDrawColor(...MINT); doc.line(12, ph - 10, pw - 12, ph - 10);
        doc.setFontSize(7.5); doc.setTextColor(120, 120, 120); doc.text(`Generated by Sappy Legacy  -  shared workspace  -  units ${t.qty}  -  stock value ${etb(t.sell)}`, 12, ph - 6);
      },
    });
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) { doc.setPage(p); const pw = doc.internal.pageSize.getWidth(); doc.setFillColor(...EM); doc.rect(pw - 52, 20.5, 52, 7, "F"); doc.setTextColor(255, 248, 231); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(`Page ${p} of ${pageCount}`, pw - 12, 25, { align: "right" }); }
    doc.save(`sappy-legacy-inventory-${ymd(now)}.pdf`);
    flash(`Exported ${filtered.length} item(s) to PDF.`, "ok");
  }

  async function downloadSheet() {
    if (!ordered.length) return;
    setSheetBusy(true); flash("", "ok");
    try {
      const labels: { id: string; name: string; serial: string; qr: string | null }[] = [];
      for (const i of ordered) labels.push({ id: i.id, name: i.name, serial: i.serial, qr: await makeQrDataUrl(i.serial) });
      if (!labels.length) throw new Error("No labels returned");
      const [cols, rowsN] = grid.split("x").map((n) => parseInt(n, 10));
      const per = cols * rowsN;
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const m = 8, g = 3, pW = 210, pH = 297;
      const uW = pW - 2 * m, uH = pH - 2 * m - 8;
      const cellW = (uW - (cols - 1) * g) / cols, cellH = (uH - (rowsN - 1) * g) / rowsN;
      const pages = Math.ceil(labels.length / per);
      const nameFs = cellW > 44 ? 8 : cellW > 30 ? 6.5 : 5.5;
      const serFs = cellW > 44 ? 6 : 5;
      for (let i = 0; i < labels.length; i++) {
        const pIdx = Math.floor(i / per);
        if (i > 0 && i % per === 0) doc.addPage();
        if (i % per === 0) { doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(120, 120, 120); doc.text(`Sappy Legacy  -  ${labels.length} label(s)  -  grid ${grid.replace("x", " x ")}  -  page ${pIdx + 1} of ${pages}`, pW / 2, pH - 4, { align: "center" }); }
        const idx = i % per; const col = idx % cols; const row = Math.floor(idx / cols);
        const x = m + col * (cellW + g); const y = m + row * (cellH + g);
        doc.setDrawColor(167, 243, 208); doc.setLineWidth(0.3); doc.roundedRect(x, y, cellW, cellH, 2, 2, "S");
        const pad = 2, textH = 9;
        const qrSize = Math.max(8, Math.min(cellW - 2 * pad, cellH - 2 * pad - textH));
        const qrX = x + (cellW - qrSize) / 2; const qrY = y + pad;
        const L = labels[i];
        if (L.qr) { try { doc.addImage(L.qr, "PNG", qrX, qrY, qrSize, qrSize); } catch {} }
        else { doc.setDrawColor(6, 95, 70); doc.setLineWidth(0.2); doc.roundedRect(qrX, qrY, qrSize, qrSize, 1, 1, "S"); doc.setFontSize(5); doc.setTextColor(6, 95, 70); doc.text("QR n/a", x + cellW / 2, qrY + qrSize / 2, { align: "center" }); }
        const nameY = qrY + qrSize + 3.2;
        doc.setFont("helvetica", "bold"); doc.setFontSize(nameFs); doc.setTextColor(6, 95, 70);
        const nameLines = doc.splitTextToSize(L.name || "", cellW - 2 * pad);
        doc.text(nameLines.slice(0, 2), x + cellW / 2, nameY, { align: "center" });
        doc.setFont("courier", "normal"); doc.setFontSize(serFs); doc.setTextColor(4, 120, 87);
        doc.text(String(L.serial || ""), x + cellW / 2, nameY + (nameLines.length > 1 ? 3.4 : 3.0) + 2.2, { align: "center" });
      }
      doc.save(`sappy-legacy-labels-${ymd(new Date())}-${grid}.pdf`);
      flash(`Downloaded ${labels.length} label(s) as a ${grid.replace("x", " x ")} A4 sheet.`, "ok");
    } catch (e: any) { flash(e?.message || "Could not build sheet", "err"); }
    finally { setSheetBusy(false); }
  }

  async function keepOne(i: Item) {
    setKeptIds((prev) => { const n = new Set(prev); n.add(i.id); return n; });
    try {
      const r = await fetch(`/api/inventory/${i.id}/keep`, { method: "POST" });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j?.error || "Failed");
      res.reload(); flash(`Kept “${i.name}” — removed from duplicates.`, "ok");
    } catch (e: any) {
      setKeptIds((prev) => { const n = new Set(prev); n.delete(i.id); return n; });
      flash(e?.message || "Could not keep", "err");
    }
  }
  async function keepAll(list: Item[]) {
    const ids = list.map((i) => i.id);
    setKeptIds((prev) => { const n = new Set(prev); ids.forEach((id) => n.add(id)); return n; });
    try {
      await Promise.all(ids.map((id) => fetch(`/api/inventory/${id}/keep`, { method: "POST" }).then((r) => (r.ok ? true : Promise.reject(r)))));
      res.reload(); flash(`Kept ${ids.length} items — group cleared.`, "ok");
    } catch {
      setKeptIds((prev) => { const n = new Set(prev); ids.forEach((id) => n.delete(id)); return n; });
      flash("Could not keep all", "err");
    }
  }

  async function openDelete(i: Item) {
    flash("", "ok");
    if (masterSet === null) { try { const r = await fetch("/api/master/status", { cache: "no-store" }); const j = await r.json(); setMasterSet(!!j.set); } catch { setMasterSet(false); } }
    setDelTarget(i);
  }
  async function doDelete(pw: string) {
    if (!delTarget) return;
    const r = await fetch(`/api/inventory/${delTarget.id}/delete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ masterPassword: pw }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j?.error || "Delete failed");
    res.reload(); flash("Item deleted.", "ok"); setDelTarget(null);
  }
  const onMasterSet = () => { setMasterSet(true); window.dispatchEvent(new CustomEvent("sl:master-changed")); };
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const nm = (form.name || "").trim().toLowerCase();
    if (!form.id && nm) {
      const clashes = items.filter((i) => (i.name || "").trim().toLowerCase() === nm);
      if (clashes.length) {
        const dupMsg = `"${(form.name || "").trim()}" is already recorded:\n` + clashes.map((c) => `• ${c.name} — ${c.serial} (qty ${c.quantity})`).join("\n") + "\nEdit the existing item instead of adding a duplicate.";
        alert(dupMsg); alert(dupMsg);
        return;
      }
    }
    e.preventDefault(); setBusy(true); flash("", "ok");
    const sell = Number(form.sellingPrice);
    if (!Number.isFinite(sell) || sell < 0) { flash("Selling price is required.", "err"); setBusy(false); return; }
    const body = { name: form.name, category: form.category || undefined, quantity: Number(form.quantity) || 1, location: form.location || undefined, notes: form.notes || undefined, costUnknown: form.costUnknown, sellingPrice: sell, purchaseValue: form.costUnknown ? undefined : (form.purchaseValue === "" ? undefined : Number(form.purchaseValue)) };
    try {
      const r = edit ? await fetch(`/api/inventory/${edit.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) : await fetch("/api/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error || "Failed");
      res.reload(); setOpen(false); flash(edit ? "Item updated." : "Item created.", "ok");
    } catch (e: any) { flash(e?.message || "Failed", "err"); } finally { setBusy(false); }
  }
  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; setBusy(true); flash("", "ok");
    try { const fd = new FormData(); fd.append("file", file); const r = await fetch("/api/inventory", { method: "POST", body: fd }); const data = await r.json(); if (!r.ok) throw new Error(data.error || "Failed"); res.reload(); flash(`Imported ${data.imported} item(s).`, "ok"); }
    catch (e: any) { flash(e?.message || "Failed", "err"); } finally { setBusy(false); }
  }
  const actions = (i: Item) => (
    <div className="flex items-center gap-1">
      <button onClick={() => setLabel(i)} title="QR label" className="rounded-lg p-2 text-emerald-600 transition hover:bg-mint/40 hover:text-emerald-deep active:scale-90"><QrCode style={{ width: 16, height: 16 }} /></button>
      <button onClick={() => openEdit(i)} title="Edit" className="rounded-lg p-2 text-emerald-600 transition hover:bg-mint/40 hover:text-emerald-deep active:scale-90"><Pencil style={{ width: 16, height: 16 }} /></button>
      <button onClick={() => openDelete(i)} title="Delete" className="rounded-lg p-2 text-emerald-600/70 transition hover:bg-red-50 hover:text-red-600 active:scale-90"><Trash2 style={{ width: 16, height: 16 }} /></button>
    </div>
  );
  const pill = "inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-deep shadow-soft transition hover:-translate-y-0.5 hover:bg-mint/30 active:scale-95";
  const nameCell = (i: Item) => (
    <div className="flex items-center gap-1.5">
      <span className="min-w-0 flex-1 truncate font-semibold text-emerald-deep">{i.name}</span>
      <ItemFlags i={i} dup={activeNameSet.has(normName(i.name))} />
    </div>
  );
  const boxCls = (on: boolean) => `flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${on ? "border-emerald-deep bg-emerald-deep text-mint" : "border-emerald-300 bg-white text-transparent hover:border-emerald-500"}`;
  const colSpan = 8 + (selectMode ? 1 : 0);

  return (
    <div>
      <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600/80">Stock</p><h1 className="mt-1 font-display text-3xl font-black tracking-tight text-emerald-deep md:text-4xl">Inventory</h1><p className="mt-1 text-sm text-emerald-900/60">{view === "dup" ? (clusters.length ? `${dupItemCount} item(s) across ${clusters.length} duplicate group(s)` : "No duplicates to review") : (q ? `${filtered.length} of ${items.length} shown` : `${items.length} item(s) in the shared catalog`)}</p></div>
        <button onClick={openNew} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-deep px-4 py-2.5 text-sm font-semibold text-mint shadow-soft transition hover:-translate-y-0.5 hover:bg-emerald-800 active:scale-[0.98] md:flex-none"><Plus style={{ width: 16, height: 16 }} /> Add item</button>
      </header>

      <div className="mb-4 inline-flex w-full rounded-2xl border border-emerald-100 bg-white/70 p-1 shadow-soft backdrop-blur sm:w-auto">
        <Seg active={view === "all"} onClick={() => setView("all")} label="All items" count={items.length} />
        <Seg active={view === "dup"} onClick={() => setView("dup")} label="Duplicates" count={clusters.length} pulse={clusters.length > 0} />
      </div>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <RibbonTile label="Items in view" value={filtered.length} Icon={Boxes} tint="bg-emerald-deep text-mint" />
        <RibbonTile label="Total units" value={kpi.qty} Icon={TrendingUp} tint="bg-mint text-emerald-deep" delay={0.05} />
        <RibbonTile label="Stock value" value={kpi.sell} Icon={TrendingUp} tint="bg-emerald-600 text-white" money delay={0.1} />
        <RibbonTile label="Unknown cost" value={kpi.unknown} Icon={AlertDot} tint="bg-cream-deep text-emerald-deep" delay={0.15} />
      </motion.section>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-100 bg-white/70 p-2.5 shadow-soft backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <label className={pill + " cursor-pointer"}><Upload style={{ width: 15, height: 15 }} /> Import Excel<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onUpload} /></label>
          <button onClick={() => setGuideOpen(true)} className={pill}><FileSpreadsheet style={{ width: 15, height: 15 }} /> Import guide</button>
          <button onClick={() => { if (selectMode) setSelected([]); setSelectMode((v) => !v); }} className={pill + (selectMode ? " !border-emerald-deep !bg-emerald-deep !text-mint" : "")} title="Select items to print a label sheet">{selectMode ? "Done" : "Select"}</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden text-[11px] font-medium text-emerald-900/50 sm:inline">{view === "dup" ? <>{dupItemCount} in {clusters.length} group{clusters.length === 1 ? "" : "s"}</> : <>Showing <b className="font-bold text-emerald-deep">{filtered.length}</b> of {items.length}</>}</span>
          <span aria-hidden className="hidden h-5 w-px bg-emerald-100 sm:block" />
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600/60">Export</span>
          <button onClick={exportPdf} disabled={!filtered.length || busy} title="Download the filtered list as a branded PDF ledger" className={pill + " disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"}><FileDown style={{ width: 15, height: 15 }} /> PDF</button>
          <button onClick={exportXlsx} disabled={!filtered.length || busy} title="Download the filtered list as an Excel workbook" className={pill + " disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"}><FileSpreadsheet style={{ width: 15, height: 15 }} /> Excel</button>
        </div>
      </div>

      {error && <div className="mb-4"><ErrorBanner error={error} onRetry={res.reload} /></div>}
      {msg && !error && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={`mb-4 rounded-xl border px-4 py-2.5 text-sm font-medium ${msgKind === "err" ? "border-red-200 bg-red-50 text-red-600" : "border-emerald-200 bg-mint/30 text-emerald-800"}`}>{msg}</motion.div>}

      {loading ? <PageSkeleton /> : (<>
        <div className="relative mb-4"><Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400" style={{ width: 16, height: 16 }} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={view === "dup" ? "Filter duplicate groups..." : "Search name, serial, category, location..."} className="w-full rounded-xl border border-emerald-200 bg-white py-2.5 pl-10 pr-4 text-sm text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200" /></div>

        {view === "dup" ? (
          <>
            {clusters.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center rounded-3xl border border-emerald-100 bg-white py-16 text-center shadow-soft">
                <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14 }} className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-deep text-mint shadow-soft"><Check style={{ width: 30, height: 30 }} /></motion.div>
                <h3 className="font-display text-2xl font-black text-emerald-deep">Catalog is clean</h3>
                <p className="mt-1 max-w-xs px-6 text-sm text-emerald-900/60">No duplicate names among your unreviewed items. Nicely kept.</p>
                {reviewedCount > 0 && <p className="mt-3 text-xs text-emerald-900/45">{reviewedCount} item(s) previously reviewed and kept.</p>}
              </motion.div>
            ) : (
              <div className="space-y-4">
                <p className="px-1 text-xs text-emerald-900/55">Grouped by normalized name (trimmed, lowercased). <b className="font-semibold text-emerald-700">Keep</b> marks a row as a legitimate distinct entry, <b className="font-semibold text-emerald-700">Edit</b> fixes a mis-entry, <b className="font-semibold text-emerald-700">Delete</b> removes the redundant one.</p>
                <AnimatePresence>
                  {clusters.map((c, ci) => (
                    <motion.section key={c.key} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ delay: Math.min(ci * 0.04, 0.3) }} className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-soft transition hover:shadow-[0_12px_30px_rgba(6,95,70,0.12)]">
                      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-emerald-deep to-emerald-500" />
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-cream/50 px-4 py-3 pl-5 sm:px-5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><Layers style={{ width: 16, height: 16 }} /></span>
                          <div className="min-w-0">
                            <div className="truncate font-display text-lg font-black leading-tight text-emerald-deep">{c.name}</div>
                            <div className="text-[11px] text-emerald-900/55">{c.items.length} matching entries · normalized <span className="font-mono text-emerald-700">“{c.key}”</span></div>
                          </div>
                        </div>
                        <button onClick={() => keepAll(c.items)} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-deep shadow-soft transition hover:-translate-y-0.5 hover:bg-mint/30 active:scale-95"><Check style={{ width: 13, height: 13 }} /> Keep all</button>
                      </div>
                      <ul className="divide-y divide-emerald-50">
                        <AnimatePresence initial={false}>
                          {c.items.map((i) => (
                            <motion.li key={i.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -12, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }} transition={{ duration: 0.2 }} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5 sm:px-5">
                              <div className="min-w-0">
                                <div className="font-mono text-xs tracking-wide text-emerald-700">{i.serial}</div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-emerald-900/60">
                                  <span className="font-display text-sm font-black text-emerald-deep">{i.sellingPrice != null ? etb(i.sellingPrice) : "—"}</span>
                                  <span className="text-emerald-300">·</span><span>qty {i.quantity}</span>
                                  <span className="text-emerald-300">·</span><span>{i.costUnknown ? "cost unknown" : i.purchaseValue != null ? `cost ${etb(i.purchaseValue)}` : "no cost"}</span>
                                  {i.location && <><span className="text-emerald-300">·</span><span>{i.location}</span></>}
                                </div>
                                <ByLine u={i.user} />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => keepOne(i)} title="Keep as a distinct item" className="inline-flex items-center gap-1 rounded-lg bg-mint/50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 transition hover:-translate-y-0.5 hover:bg-mint active:scale-95"><Check style={{ width: 12, height: 12 }} /> Keep</button>
                                <button onClick={() => openEdit(i)} title="Edit" className="rounded-lg p-2 text-emerald-600 transition hover:bg-mint/40 hover:text-emerald-deep active:scale-90"><Pencil style={{ width: 15, height: 15 }} /></button>
                                <button onClick={() => openDelete(i)} title="Delete" className="rounded-lg p-2 text-emerald-600/70 transition hover:bg-red-50 hover:text-red-600 active:scale-90"><Trash2 style={{ width: 15, height: 15 }} /></button>
                              </div>
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    </motion.section>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        ) : (<>
          <div className="space-y-3 md:hidden">
            {filtered.length === 0 && <div className="rounded-2xl border border-emerald-100 bg-white py-14 text-center shadow-soft"><Boxes className="mx-auto mb-3 text-emerald-300" style={{ width: 32, height: 32 }} /><p className="px-6 text-sm font-medium text-emerald-900/60">{items.length === 0 ? "No items yet - add one or import Excel." : "No matches."}</p></div>}
            {filtered.map((i, idx) => (
              <motion.div key={i.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.03, 0.3) }} onClick={selectMode ? () => toggle(i.id) : undefined} className={`rounded-2xl border border-emerald-100 bg-white p-4 shadow-soft ${selectMode ? "cursor-pointer " + (selSet.has(i.id) ? "border-emerald-400 bg-mint/20 ring-2 ring-emerald-300" : "") : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    {selectMode && <span className={`mt-0.5 ${boxCls(selSet.has(i.id))}`}><Check style={{ width: 12, height: 12 }} /></span>}
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">{nameCell(i)}{i.category && <span className="shrink-0 rounded-full bg-mint/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">{i.category}</span>}</div>
                      <div className="mt-0.5 font-mono text-[11px] tracking-wide text-emerald-600/70">{i.serial}</div>
                      <ByLine u={i.user} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right"><div className="font-display text-lg font-black leading-none text-emerald-deep">{i.sellingPrice != null ? etb(i.sellingPrice) : "-"}</div><div className="text-[9px] uppercase tracking-[0.14em] text-emerald-600/60">sell</div></div>
                </div>
                {i.notes && <p className="mt-2 line-clamp-2 text-xs text-emerald-900/55">{i.notes}</p>}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <CellStat label="Cost" value={i.costUnknown ? "unknown" : i.purchaseValue != null ? etb(i.purchaseValue) : "-"} danger={i.costUnknown} />
                  <CellStat label="Qty" value={String(i.quantity)} />
                  <CellStat label="Location" value={i.location || "-"} />
                </div>
                {!selectMode && <div className="mt-3 flex items-center justify-end border-t border-emerald-50 pt-2">{actions(i)}</div>}
              </motion.div>
            ))}
          </div>
          <div className="hidden md:block overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-soft">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-emerald-100 bg-mint/20 text-[11px] uppercase tracking-wider text-emerald-700">
                {selectMode && <th className="px-3 py-3"><button onClick={toggleAll} aria-label="Select all" className={boxCls(allSel)}><Check style={{ width: 12, height: 12 }} /></button></th>}
                <th className="px-5 py-3 font-semibold">Item</th><th className="px-5 py-3 font-semibold">Serial</th><th className="hidden px-5 py-3 font-semibold sm:table-cell">Category</th><th className="px-5 py-3 text-right font-semibold">Sell</th><th className="hidden px-5 py-3 text-right font-semibold lg:table-cell">Cost</th><th className="px-5 py-3 text-right font-semibold">Qty</th><th className="hidden px-5 py-3 font-semibold md:table-cell">Location</th><th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-emerald-50">
                {filtered.length === 0 && <tr><td colSpan={colSpan} className="px-5 py-16 text-center"><Boxes className="mx-auto mb-3 text-emerald-300" style={{ width: 32, height: 32 }} /><p className="text-sm font-medium text-emerald-900/60">{items.length === 0 ? "No items yet - add one or import Excel." : "No matches."}</p></td></tr>}
                {filtered.map((i) => (
                  <tr key={i.id} className={`transition-colors hover:bg-cream/60 ${selSet.has(i.id) ? "bg-mint/20" : ""}`}>
                    {selectMode && <td className="px-3 py-3.5"><button onClick={() => toggle(i.id)} aria-label="Select" className={boxCls(selSet.has(i.id))}><Check style={{ width: 12, height: 12 }} /></button></td>}
                    <td className="px-5 py-3.5">{nameCell(i)}<ByLine u={i.user} />{i.notes && <div className="mt-0.5 max-w-[200px] truncate text-xs text-emerald-900/50">{i.notes}</div>}</td>
                    <td className="px-5 py-3.5 font-mono text-xs tracking-wide text-emerald-700">{i.serial}</td>
                    <td className="hidden px-5 py-3.5 sm:table-cell">{i.category ? <span className="rounded-full bg-mint/50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">{i.category}</span> : <span className="text-emerald-300">-</span>}</td>
                    <td className="px-5 py-3.5 text-right">{i.sellingPrice != null ? <span className="font-display text-base font-black text-emerald-deep">{etb(i.sellingPrice)}</span> : <span className="text-emerald-300">-</span>}</td>
                    <td className="hidden px-5 py-3.5 text-right lg:table-cell">{i.costUnknown ? <span className="text-[11px] font-medium uppercase tracking-wide text-amber-600">unknown</span> : i.purchaseValue != null ? <span className="font-mono text-xs text-emerald-700">{etb(i.purchaseValue)}</span> : <span className="text-emerald-300">-</span>}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-deep">{i.quantity}</td>
                    <td className="hidden px-5 py-3.5 text-emerald-900/70 md:table-cell">{i.location || <span className="text-emerald-300">-</span>}</td>
                    <td className="px-5 py-3.5"><div className="flex items-center justify-end gap-1">
                      <button onClick={() => setLabel(i)} title="QR label" className="rounded-lg p-2 text-emerald-600 transition hover:bg-mint/40 hover:text-emerald-deep hover:scale-110"><QrCode style={{ width: 16, height: 16 }} /></button>
                      <button onClick={() => openEdit(i)} title="Edit" className="rounded-lg p-2 text-emerald-600 transition hover:bg-mint/40 hover:text-emerald-deep hover:scale-110"><Pencil style={{ width: 16, height: 16 }} /></button>
                      <button onClick={() => openDelete(i)} title="Delete" className="rounded-lg p-2 text-emerald-600/70 transition hover:bg-red-50 hover:text-red-600 hover:scale-110"><Trash2 style={{ width: 16, height: 16 }} /></button>
                    </div></td>
                  </tr>))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 px-1 text-center text-[11px] text-emerald-900/45 sm:text-left">Tip: hit <b className="font-semibold text-emerald-700">Select</b>, tick items, then print a label sheet in any grid. Or type a category and export <b className="font-semibold text-emerald-700">PDF</b> / <b className="font-semibold text-emerald-700">Excel</b>.</p>
        </>)}
      </>)}

      <AnimatePresence>
        {selected.length > 0 && (
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-6">
            <motion.div initial={{ opacity: 0, y: 22, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 22, scale: 0.96 }} transition={{ type: "spring", stiffness: 320, damping: 30 }} className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-emerald-100 bg-white/95 p-3 shadow-2xl backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-deep px-3 py-1.5 text-xs font-black text-mint"><Check style={{ width: 13, height: 13 }} /> {selected.length} selected</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600/60">Grid</span>
                  {GRIDS.map((gg) => (
                    <button key={gg} onClick={() => setGrid(gg)} className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition active:scale-95 ${grid === gg ? "bg-emerald-deep text-mint shadow-soft" : "border border-emerald-100 bg-white text-emerald-700 hover:bg-mint/30"}`}>{gg.replace("x", "×")}</button>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => setSelected([])} className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-deep transition hover:bg-mint/30 active:scale-95">Clear</button>
                  <button onClick={downloadSheet} disabled={sheetBusy} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-deep px-4 py-2 text-sm font-bold text-mint shadow-soft transition hover:-translate-y-0.5 hover:bg-emerald-800 active:scale-95 disabled:opacity-50"><LayoutGrid style={{ width: 16, height: 16 }} /><Download style={{ width: 15, height: 15 }} /> {sheetBusy ? <span className="inline-flex items-center gap-2"><Spinner className="h-4 w-4 border-mint/30 border-t-mint" />Building…</span> : `PDF · ${grid.replace("x", "×")}`}</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>{open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-emerald-900/40 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 14 }} onClick={(e) => e.stopPropagation()} className="relative max-h-[92vh] w-full max-w-md overflow-auto rounded-2xl border border-emerald-100 bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-center justify-between"><h2 className="font-display text-lg font-black text-emerald-deep">{edit ? "Edit item" : "Add item"}</h2><button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-emerald-500 hover:bg-mint/40"><X style={{ width: 18, height: 18 }} /></button></div>
            <form onSubmit={save} className="space-y-4">
              <Field label="Item name" required><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} placeholder="e.g. Cordless Drill" autoFocus /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Category"><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inp} placeholder="Tools" /></Field><Field label="Quantity"><input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={inp} /></Field></div>
              <Field label="Location"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inp} placeholder="Shelf A-3" /></Field>
              <div className="rounded-xl border border-emerald-100 bg-cream/50 p-3.5">
                <div className="mb-2 flex items-center justify-between gap-2"><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">Pricing · ETB</span>{margin != null && marginPct != null && <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${margin >= 0 ? "bg-mint/70 text-emerald-800" : "bg-red-50 text-red-600"}`}>{margin >= 0 ? <TrendingUp style={{ width: 12, height: 12 }} /> : <TrendingDown style={{ width: 12, height: 12 }} />} {etb(margin)} · {marginPct.toFixed(0)}%</span>}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><input type="number" min={0} step="0.01" required value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} className={inp} placeholder="0.00" /><span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-600/70">Selling price *</span></div>
                  <div><input type="number" min={0} step="0.01" disabled={form.costUnknown} value={form.purchaseValue} onChange={(e) => setForm({ ...form, purchaseValue: e.target.value })} className={inp + " disabled:bg-emerald-50/50"} placeholder="0.00" /><span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-600/70">Purchase cost</span></div>
                </div>
                <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-xs font-medium text-emerald-800"><input type="checkbox" checked={form.costUnknown} onChange={(e) => setForm({ ...form, costUnknown: e.target.checked })} className="h-4 w-4 rounded border-emerald-300 text-emerald-deep focus:ring-emerald-400" /> Cost unknown</label>
              </div>
              <Field label="Notes"><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inp + " resize-none"} placeholder="Optional" /></Field>
              <p className="text-xs text-emerald-900/50">A unique serial and QR label are generated automatically. Selling price auto-fills new sales.</p>
              <div className="flex gap-3 pt-1"><button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-emerald-200 py-2.5 text-sm font-semibold text-emerald-deep hover:bg-mint/30">Cancel</button><button type="submit" disabled={busy} className="flex-1 rounded-xl bg-emerald-deep py-2.5 text-sm font-semibold text-mint hover:bg-emerald-800 disabled:opacity-50">{busy ? "Saving..." : edit ? "Save" : "Create item"}</button></div>
            </form>
          </motion.div>
        </div>)}
      </AnimatePresence>
      <AnimatePresence>{label && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setLabel(null)}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-emerald-900/40 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 14 }} onClick={(e) => e.stopPropagation()} className="relative flex max-h-[92vh] w-full max-w-[min(92vw,900px)] flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white p-4 text-center shadow-2xl">
            <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-sm font-black text-emerald-deep">QR Label</h2><button onClick={() => setLabel(null)} className="rounded-lg p-1.5 text-emerald-500 hover:bg-mint/40"><X style={{ width: 16, height: 16 }} /></button></div>
            <div className="group/qr relative mx-auto flex min-h-0 w-full flex-1 items-center justify-center">
              <div aria-hidden className="pointer-events-none absolute -inset-2 rounded-2xl bg-mint/30 opacity-0 blur-xl transition-opacity duration-500 group-hover/qr:opacity-100" />
              <div className="relative overflow-hidden rounded-xl bg-white shadow-soft ring-1 ring-emerald-100">
                <span aria-hidden className="pointer-events-none absolute left-2 top-2 z-10 h-4 w-4 border-l-2 border-t-2 border-emerald-300/70" />
                <span aria-hidden className="pointer-events-none absolute right-2 top-2 z-10 h-4 w-4 border-r-2 border-t-2 border-emerald-300/70" />
                <span aria-hidden className="pointer-events-none absolute bottom-2 left-2 z-10 h-4 w-4 border-b-2 border-l-2 border-emerald-300/70" />
                <span aria-hidden className="pointer-events-none absolute bottom-2 right-2 z-10 h-4 w-4 border-b-2 border-r-2 border-emerald-300/70" />
                {labelUrl ? <div className="flex h-full w-full items-center justify-center [&>svg]:mx-auto [&>svg]:h-auto [&>svg]:w-auto [&>svg]:max-h-[70vh] [&>svg]:max-w-[86vw] transition-transform duration-500 group-hover/qr:scale-[1.03]" dangerouslySetInnerHTML={{ __html: labelUrl }} /> : <div className="flex h-56 w-full flex-col items-center justify-center gap-2 rounded-xl bg-cream/60 text-xs font-semibold text-emerald-900/50"><Spinner className="h-5 w-5" />Generating label…</div>}
              </div>
            </div>
            <div className="mx-auto mt-3 flex w-full max-w-[340px] shrink-0 gap-2">
              <button type="button" onClick={() => { try { navigator.clipboard?.writeText(label.serial); } catch {} }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white py-2.5 text-sm font-semibold text-emerald-deep transition hover:bg-mint/30 active:scale-[0.98]">Copy serial</button>
              <button type="button" onClick={() => { if (!labelUrl || !label) return; const b = new Blob([labelUrl], { type: "image/svg+xml" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `${label.serial}.svg`; a.click(); setTimeout(() => URL.revokeObjectURL(u), 500); }} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-deep py-2.5 text-sm font-semibold text-mint transition hover:bg-emerald-800 active:scale-[0.98] ${labelUrl ? "" : "pointer-events-none opacity-50"}`}><Download style={{ width: 16, height: 16 }} /> Download</button>
            </div>
          </motion.div>
        </div>)}
      </AnimatePresence>
      <MasterModal open={delTarget !== null} mode={masterSet ? "verify" : "set"} onClose={() => setDelTarget(null)} onVerified={doDelete} onMasterSet={onMasterSet} verifyTitle="Confirm deletion" verifySubtitle={`Enter the master password to permanently delete "${delTarget?.name ?? "this item"}" from the shared catalog.`} setTitle="Set master password" setSubtitle="Create a master password to protect deletions and new sign-ups - then confirm this deletion with it." confirmLabel="Delete item" />
      <ImportGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}

function Seg({ active, onClick, label, count, pulse }: { active: boolean; onClick: () => void; label: string; count: number; pulse?: boolean }) {
  return (
    <button onClick={onClick} className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${active ? "text-mint" : "text-emerald-900/70 hover:text-emerald-deep"}`}>
      {active && <motion.span layoutId="invseg" className="absolute inset-0 rounded-xl bg-emerald-deep shadow-soft" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
      <span className="relative">{label}</span>
      <span className={`relative inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black ${active ? "bg-mint/25 text-mint" : "bg-emerald-100 text-emerald-700"}`}>{count}</span>
      {pulse && !active && <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" /></span>}
    </button>
  );
}
function RibbonTile({ label, value, Icon, tint, money, delay = 0 }: { label: string; value: number; Icon: any; tint: string; money?: boolean; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(6,95,70,0.12)]">
      <div className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-mint/25 blur-2xl transition group-hover:bg-mint/50" />
      <div className="relative flex items-center justify-between">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${tint}`}><Icon style={{ width: 18, height: 18 }} /></div>
      </div>
      <div className="relative mt-3 font-display text-2xl font-black leading-none tracking-tight text-emerald-deep sm:text-3xl">{money ? <Counter value={value} format={(n) => etb(n)} /> : <Counter value={value} />}</div>
      <div className="relative mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-900/55">{label}</div>
    </motion.div>
  );
}
function AlertDot(props: any) { return <span {...props} className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />; }
function ItemFlags({ i, dup }: { i: Item; dup: boolean }) {
  if (i.dupKeptAt) return <span title={i.dupKeptBy ? `Reviewed by ${i.dupKeptBy}` : "Reviewed"} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-mint/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-800"><Check style={{ width: 9, height: 9 }} /> kept</span>;
  if (dup) return <span title="Possible duplicate name" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700"><Layers style={{ width: 9, height: 9 }} /> dup</span>;
  return null;
}
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <div><label className="mb-1.5 block text-xs font-semibold text-emerald-800">{label}{required && <span className="text-emerald-500"> *</span>}</label>{children}</div>; }
function CellStat({ label, value, danger }: { label: string; value: string; danger?: boolean }) { return <div className="rounded-lg bg-cream/60 px-2 py-1.5 text-center"><div className={`truncate text-xs font-bold ${danger ? "text-[10px] uppercase tracking-wide text-amber-600" : "text-emerald-deep"}`}>{value}</div><div className="text-[9px] uppercase tracking-[0.12em] text-emerald-600/60">{label}</div></div>; }
function ByLine({ u }: { u?: U }) {
  const label = u?.name || (u?.email ? u.email.split("@")[0] : null);
  if (!label) return null;
  const initial = label.trim().charAt(0).toUpperCase();
  return <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-900/45"><span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-100 text-[8px] font-black text-emerald-700">{initial}</span><span className="truncate">by {label}</span></div>;
}
function byLabel(u?: U) { return u?.name || (u?.email ? u.email.split("@")[0] : null); }