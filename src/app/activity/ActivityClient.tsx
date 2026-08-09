"use client";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Search, FileDown, Download, RefreshCw, Plus, Pencil, Trash2, Check, Upload, Receipt, ClipboardList, RotateCcw, UserPlus, Users, Zap, Clock, Activity as Pulse } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { etb, fmtDateTime, ymd } from "@/lib/format";
import { useResource } from "@/components/useResource";
import { PageSkeleton, ErrorBanner } from "@/components/LoadState";
import { Counter } from "@/components/Stat";

type Act = { id: string; kind: string; entityType: string | null; entityId: string | null; label: string; detail: string | null; meta: any; actorId: string | null; actorName: string | null; actorEmail: string | null; createdAt: string };

const EM = [6, 95, 70] as [number, number, number];
const MINT = [167, 243, 208] as [number, number, number];
const CREAM = [255, 248, 231] as [number, number, number];

type KindDef = { cat: "Items" | "Sales" | "Orders" | "System"; dot: string; chip: string; Icon: any };
const KINDS: Record<string, KindDef> = {
  "item.create":   { cat: "Items",  dot: "bg-emerald-500",  chip: "bg-emerald-deep text-mint",     Icon: Plus },
  "item.edit":     { cat: "Items",  dot: "bg-amber-500",    chip: "bg-amber-100 text-amber-700",   Icon: Pencil },
  "item.delete":   { cat: "Items",  dot: "bg-red-500",      chip: "bg-red-100 text-red-600",       Icon: Trash2 },
  "item.keep":     { cat: "Items",  dot: "bg-emerald-400",  chip: "bg-mint text-emerald-800",      Icon: Check },
  "item.import":   { cat: "Items",  dot: "bg-emerald-600",  chip: "bg-emerald-600 text-white",     Icon: Upload },
  "sale.create":   { cat: "Sales",  dot: "bg-emerald-600",  chip: "bg-emerald-600 text-white",     Icon: Receipt },
  "sale.delete":   { cat: "Sales",  dot: "bg-red-400",      chip: "bg-red-100 text-red-600",       Icon: Trash2 },
  "po.create":     { cat: "Orders", dot: "bg-emerald-700",  chip: "bg-emerald-700 text-white",     Icon: ClipboardList },
  "po.delete":     { cat: "Orders", dot: "bg-red-400",      chip: "bg-red-100 text-red-600",       Icon: Trash2 },
  "reset":         { cat: "System", dot: "bg-red-600",      chip: "bg-red-600 text-white",         Icon: RotateCcw },
  "account.create":{ cat: "System", dot: "bg-emerald-500",  chip: "bg-emerald-deep text-mint",     Icon: UserPlus },
};
const kindDef = (k: string): KindDef => KINDS[k] || { cat: "System", dot: "bg-emerald-400", chip: "bg-emerald-100 text-emerald-700", Icon: Pulse };
const CATS = ["All", "Items", "Sales", "Orders", "System"] as const;

function ago(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  if (s < 90) return "1m ago";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return fmtDateTime(iso);
}
function dayLabel(key: string) {
  const t = ymd(new Date()); const y = ymd(new Date(Date.now() - 86400000));
  if (key === t) return "Today"; if (key === y) return "Yesterday";
  return new Date(key + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}
function metaPills(kind: string, meta: any) {
  const out: string[] = [];
  if (kind === "sale.create" && meta?.total != null) out.push(etb(meta.total));
  if (kind === "item.import" && meta?.count != null) out.push(`${meta.count} items`);
  if (kind === "po.create" && meta?.total != null) out.push(etb(meta.total));
  if (kind === "reset" && meta?.deleted) out.push(`${meta.deleted.items} items · ${meta.deleted.sales} sales`);
  return out;
}
function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function csvEsc(s: any) { const v = String(s ?? ""); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

export default function ActivityClient() {
  const res = useResource<{ activities: Act[] }>("/api/activities");
  const all = res.data?.activities || []; const loading = res.loading && !res.data; const error = res.error;
  const [q, setQ] = useState(""); const [cat, setCat] = useState<(typeof CATS)[number]>("All"); const [view, setView] = useState<"person" | "timeline">("person");

  const filtered = useMemo(() => all.filter((a) => {
    if (cat !== "All" && kindDef(a.kind).cat !== cat) return false;
    if (q) { const t = q.toLowerCase(); const hay = ((a.actorName || "") + " " + (a.actorEmail || "") + " " + a.label + " " + (a.detail || "") + " " + (a.entityId || "")).toLowerCase(); if (!hay.includes(t)) return false; }
    return true;
  }), [all, q, cat]);

  const stats = useMemo(() => {
    const people = new Set(all.map((a) => a.actorEmail || a.actorId || "?"));
    const now = Date.now(); const today = ymd(new Date());
    const todayN = all.filter((a) => ymd(new Date(a.createdAt)) === today).length;
    const hourN = all.filter((a) => now - new Date(a.createdAt).getTime() < 3600000).length;
    return { total: all.length, people: people.size, today: todayN, hour: hourN };
  }, [all]);

  const groups = useMemo(() => {
    const m = new Map<string, { email: string | null; name: string | null; events: Act[] }>();
    for (const e of filtered) { const k = e.actorEmail || e.actorId || "unknown"; if (!m.has(k)) m.set(k, { email: e.actorEmail, name: e.actorName, events: [] }); m.get(k)!.events.push(e); }
    return [...m.values()].sort((a, b) => new Date(b.events[0].createdAt).getTime() - new Date(a.events[0].createdAt).getTime());
  }, [filtered]);

  const days = useMemo(() => {
    const m = new Map<string, Act[]>();
    for (const e of filtered) { const k = ymd(new Date(e.createdAt)); if (!m.has(k)) m.set(k, []); m.get(k)!.push(e); }
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  function exportCsv() {
    if (!filtered.length) return;
    const rows = [["When", "Who", "Email", "Category", "Action", "Detail"]];
    for (const a of filtered) rows.push([fmtDateTime(a.createdAt), a.actorName || "-", a.actorEmail || "-", kindDef(a.kind).cat, a.label, a.detail || ""]);
    const csv = rows.map((r) => r.map(csvEsc).join(",")).join("\n");
    triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), `sappy-legacy-activity-${ymd(new Date())}.csv`);
  }
  function exportPdf() {
    if (!filtered.length) return;
    const now = new Date();
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    autoTable(doc, {
      margin: { top: 36, bottom: 16, left: 12, right: 12 },
      head: [["When", "Who", "Category", "Action", "Detail"]],
      body: filtered.map((a) => [fmtDateTime(a.createdAt), a.actorName || a.actorEmail || "-", kindDef(a.kind).cat, a.label, a.detail || "-"]),
      styles: { fontSize: 8, cellPadding: 2.2, textColor: [30, 30, 30], overflow: "linebreak" },
      headStyles: { fillColor: EM, textColor: MINT, fontStyle: "bold" },
      alternateRowStyles: { fillColor: CREAM },
      columnStyles: { 0: { cellWidth: 34 }, 1: { cellWidth: 36 }, 2: { cellWidth: 22 }, 3: { cellWidth: 34 }, 4: { cellWidth: "auto" } },
      didDrawPage: (data: any) => {
        const pw = doc.internal.pageSize.getWidth(); const ph = doc.internal.pageSize.getHeight();
        doc.setFillColor(...EM); doc.rect(0, 0, pw, 30, "F");
        doc.setTextColor(...MINT); doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text("SAPPY LEGACY", 12, 12);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("ACTIVITY / AUDIT LOG", 12, 17.5);
        doc.setTextColor(255, 248, 231); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(`${filtered.length} event${filtered.length === 1 ? "" : "s"}`, 12, 25);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(now.toLocaleString("en-GB"), pw - 12, 12, { align: "right" });
        doc.setDrawColor(...MINT); doc.line(12, ph - 10, pw - 12, ph - 10);
        doc.setFontSize(7.5); doc.setTextColor(120, 120, 120); doc.text("Generated by Sappy Legacy  -  shared workspace audit trail", 12, ph - 6);
      },
    });
    const pc = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pc; p++) { doc.setPage(p); const pw = doc.internal.pageSize.getWidth(); doc.setFillColor(...EM); doc.rect(pw - 52, 20.5, 52, 7, "F"); doc.setTextColor(255, 248, 231); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(`Page ${p} of ${pc}`, pw - 12, 25, { align: "right" }); }
    doc.save(`sappy-legacy-activity-${ymd(now)}.pdf`);
  }

  const pill = "inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-deep shadow-soft transition hover:-translate-y-0.5 hover:bg-mint/30 active:scale-95";

  return (
    <div>
      <header className="mb-5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-deep text-mint shadow-soft"><History style={{ width: 18, height: 18 }} /><span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-70" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-mint" /></span></span>
          <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600/80">Audit trail</p><h1 className="font-display text-3xl font-black tracking-tight text-emerald-deep md:text-4xl">Activity</h1></div>
        </div>
        <p className="mt-1.5 text-sm text-emerald-900/60">Every action across the workspace, grouped by the person who made it.</p>
      </header>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Ribbon label="Total events" value={stats.total} Icon={History} tint="bg-emerald-deep text-mint" />
        <Ribbon label="People active" value={stats.people} Icon={Users} tint="bg-mint text-emerald-deep" delay={0.05} />
        <Ribbon label="Today" value={stats.today} Icon={Zap} tint="bg-emerald-600 text-white" delay={0.1} />
        <Ribbon label="Last hour" value={stats.hour} Icon={Clock} tint="bg-cream-deep text-emerald-deep" delay={0.15} />
      </motion.section>

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-white/70 p-3 shadow-soft backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" style={{ width: 15, height: 15 }} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search person or action..." className="w-full rounded-xl border border-emerald-200 bg-white py-2 pl-9 pr-3 text-sm text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200" /></div>
          <div className="inline-flex rounded-xl border border-emerald-100 bg-white p-1 shadow-sm">
            <Seg active={view === "person"} onClick={() => setView("person")} label="By person" id="actseg" />
            <Seg active={view === "timeline"} onClick={() => setView("timeline")} label="Timeline" id="actseg" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {CATS.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${cat === c ? "bg-emerald-deep text-mint shadow-soft" : "border border-emerald-100 bg-white text-emerald-700 hover:bg-mint/30"}`}>{c}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] font-medium text-emerald-900/50 sm:inline"><b className="font-bold text-emerald-deep">{filtered.length}</b> event{filtered.length === 1 ? "" : "s"}</span>
            <button onClick={res.reload} title="Refresh" className={pill + " !px-2.5"}><RefreshCw style={{ width: 15, height: 15 }} /></button>
            <button onClick={exportCsv} disabled={!filtered.length} title="Export filtered log as CSV" className={pill + " disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"}><Download style={{ width: 15, height: 15 }} /> CSV</button>
            <button onClick={exportPdf} disabled={!filtered.length} title="Export filtered log as PDF" className={pill + " disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"}><FileDown style={{ width: 15, height: 15 }} /> PDF</button>
          </div>
        </div>
      </div>

      {error && <div className="mb-4"><ErrorBanner error={error} onRetry={res.reload} /></div>}

      {loading ? <PageSkeleton /> : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center rounded-3xl border border-emerald-100 bg-white py-16 text-center shadow-soft">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-deep text-mint shadow-soft"><History style={{ width: 30, height: 30 }} /></div>
          <h3 className="font-display text-2xl font-black text-emerald-deep">Nothing here yet</h3>
          <p className="mt-1 max-w-xs px-6 text-sm text-emerald-900/60">{all.length === 0 ? "Actions you and your team take will start appearing here, sorted by person." : "No events match this filter."}</p>
        </motion.div>
      ) : view === "person" ? (
        <div className="space-y-4">
          {groups.map((g, gi) => {
            const initial = (g.name || g.email || "?").trim().charAt(0).toUpperCase();
            const share = stats.total ? Math.round((g.events.length / stats.total) * 100) : 0;
            return (
              <motion.section key={g.email || g.name || gi} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(gi * 0.05, 0.3) }} className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-soft transition hover:shadow-[0_14px_34px_rgba(6,95,70,0.12)]">
                <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-emerald-deep to-emerald-500" />
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-cream/50 px-4 py-3.5 pl-5 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-deep to-emerald-600 text-base font-black text-mint shadow-soft ring-2 ring-cream">{initial}</span>
                    <div className="min-w-0">
                      <div className="truncate font-display text-lg font-black leading-tight text-emerald-deep">{g.name || "Unknown member"}</div>
                      <div className="truncate text-xs text-emerald-900/55">{g.email || "no email on record"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-deep px-2.5 py-1 text-[11px] font-black text-mint">{g.events.length} action{g.events.length === 1 ? "" : "s"}</span>
                    <span className="hidden text-[11px] text-emerald-900/50 sm:inline">last {ago(g.events[0].createdAt)}</span>
                  </div>
                </div>
                <div className="h-1 w-full bg-emerald-50"><motion.div initial={{ width: 0 }} animate={{ width: `${share}%` }} transition={{ duration: 0.7, delay: 0.1 }} className="h-full bg-gradient-to-r from-emerald-500 to-mint" /></div>
                <ul className="relative px-4 py-3 pl-5 sm:px-5">
                  <span aria-hidden className="absolute bottom-5 left-[34px] top-5 w-px bg-emerald-100 sm:left-[38px]" />
                  {g.events.map((a, ai) => <EventRow key={a.id} a={a} delay={Math.min(ai * 0.02, 0.2)} />)}
                </ul>
              </motion.section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          {days.map(([key, list], di) => (
            <div key={key}>
              <div className="mb-2 flex items-center gap-2 px-1"><span className="h-px flex-1 bg-emerald-100" /><span className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">{dayLabel(key)}</span><span className="h-px flex-1 bg-emerald-100" /></div>
              <div className="relative rounded-2xl border border-emerald-100 bg-white p-4 shadow-soft sm:p-5">
                <span aria-hidden className="absolute bottom-5 left-[26px] top-5 w-px bg-emerald-100 sm:left-[30px]" />
                <ul className="space-y-0.5">{list.map((a, ai) => <EventRow key={a.id} a={a} showActor delay={Math.min(ai * 0.02, 0.2)} />)}</ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventRow({ a, showActor, delay = 0 }: { a: Act; showActor?: boolean; delay?: number }) {
  const k = kindDef(a.kind); const pills = metaPills(a.kind, a.meta);
  return (
    <motion.li initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }} className="group relative flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-cream/60">
      <span className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${k.chip} shadow-sm ring-2 ring-white transition group-hover:scale-110`}><k.Icon style={{ width: 12, height: 12 }} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-bold text-emerald-deep">{a.label}</span>
          {showActor && <span className="text-xs font-semibold text-emerald-700">· {a.actorName || a.actorEmail || "unknown"}</span>}
          {a.detail && <span className="truncate text-xs text-emerald-900/60">— {a.detail}</span>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${k.chip}`}>{a.kind.replace(".", " ")}</span>
          {pills.map((p, i) => <span key={i} className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700">{p}</span>)}
        </div>
      </div>
      <span className="shrink-0 whitespace-nowrap pt-0.5 text-[11px] tabular-nums text-emerald-900/45">{ago(a.createdAt)}</span>
    </motion.li>
  );
}

function Ribbon({ label, value, Icon, tint, delay = 0 }: { label: string; value: number; Icon: any; tint: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(6,95,70,0.12)]">
      <div className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-mint/25 blur-2xl transition group-hover:bg-mint/50" />
      <div className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl ${tint}`}><Icon style={{ width: 18, height: 18 }} /></div>
      <div className="relative mt-3 font-display text-2xl font-black leading-none tracking-tight text-emerald-deep sm:text-3xl"><Counter value={value} /></div>
      <div className="relative mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-900/55">{label}</div>
    </motion.div>
  );
}

function Seg({ active, onClick, label, id }: { active: boolean; onClick: () => void; label: string; id: string }) {
  return (
    <button onClick={onClick} className={`relative rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${active ? "text-mint" : "text-emerald-900/70 hover:text-emerald-deep"}`}>
      {active && <motion.span layoutId={id} className="absolute inset-0 rounded-lg bg-emerald-deep shadow-soft" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
      <span className="relative">{label}</span>
    </button>
  );
}