"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Plus, Trash2, Download, Fuel, Truck, Coffee, MoreHorizontal } from "lucide-react";
import { etb, fmtDate, ymd, mondayOf, sundayOf } from "@/lib/format";
import { useResource } from "@/components/useResource";
import { PageSkeleton, ErrorBanner, Spinner } from "@/components/LoadState";
type U = { name?: string | null; email?: string } | null;
type Expense = { id: string; category: string; description: string | null; amount: number; date: string; createdAt: string; user?: U };
const CATEGORIES = ["Fuel", "Motor (Freight Transport)", "Food & Drinks", "Other"];
const inp = "w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-sm text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";
const catIcon = (c: string) => (c === "Fuel" ? Fuel : c.startsWith("Motor") ? Truck : c === "Food & Drinks" ? Coffee : MoreHorizontal);
const byLabel = (u?: U) => u?.name || (u?.email ? u.email.split("@")[0] : null);

export default function ExpensesClient() {
  const res = useResource<{ expenses: Expense[] }>("/api/expenses");
  const expenses = res.data?.expenses || [];
  const loading = res.loading && !res.data; const error = res.error;
  const [category, setCategory] = useState("Fuel");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => ymd(new Date()));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(""); const [msgKind, setMsgKind] = useState<"ok" | "err">("ok");
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("month");
  const [anchor, setAnchor] = useState(() => ymd(new Date()));
  const flash = (m: string, k: "ok" | "err") => { setMsg(m); setMsgKind(k); };

  const periodExpenses = useMemo(() => expenses.filter((e) => {
    const d = new Date(e.date);
    if (period === "day") return ymd(d) === anchor;
    if (period === "month") return d.getMonth() === new Date(anchor + "T00:00:00").getMonth() && d.getFullYear() === new Date(anchor + "T00:00:00").getFullYear();
    if (period === "year") return d.getFullYear() === new Date(anchor + "T00:00:00").getFullYear();
    const m = mondayOf(new Date(anchor + "T00:00:00")); const su = sundayOf(new Date(anchor + "T00:00:00"));
    return d >= m && d <= su;
  }), [expenses, period, anchor]);

  const total = periodExpenses.reduce((a, e) => a + (e.amount || 0), 0);
  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of periodExpenses) m.set(e.category, (m.get(e.category) || 0) + (e.amount || 0));
    return [...m.entries()].map(([c, v]) => ({ c, v })).sort((a, b) => b.v - a.v);
  }, [periodExpenses]);
  const topCat = byCat[0];

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); flash("", "ok");
    if (category === "Other" && !description.trim()) { flash("Describe the 'Other' expense.", "err"); setBusy(false); return; }
    try {
      const r = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, description, amount, date, backdated: date < ymd(new Date()) }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j?.error || "Failed");
      res.reload(); setAmount(""); setDescription(""); flash("Expense recorded.", "ok");
    } catch (e: any) { flash(e?.message || "Failed", "err"); } finally { setBusy(false); }
  }
  async function del(id: string) { if (!confirm("Delete this expense?")) return; await fetch(`/api/expenses/${id}`, { method: "DELETE" }); res.reload(); }
  function csv() {
    const esc = (v: any) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const rows = [["Date", "Category", "Description", "Amount", "By"], ...periodExpenses.map((e) => [fmtDate(e.date), e.category, e.description || "", e.amount, byLabel(e.user) || ""])];
    const csvText = rows.map((r) => r.map(esc).join(",")).join("\n");
    const b = new Blob(["\ufeff" + csvText], { type: "text/csv;charset=utf-8" });
    const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `expenses-${period}-${anchor}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(u), 500);
  }

  return (
    <div>
      <header className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600/80">Reporting</p><h1 className="mt-1 font-display text-3xl font-black tracking-tight text-emerald-deep md:text-4xl">Miscellaneous Expenses</h1><p className="mt-1 text-sm text-emerald-900/60">Fuel, motor, food & drinks and other running costs.</p></header>
      {error && <div className="mb-4"><ErrorBanner error={error} onRetry={res.reload} /></div>}
      {msg && !error && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={`mb-4 rounded-xl border px-4 py-2.5 text-sm font-medium ${msgKind === "err" ? "border-red-200 bg-red-50 text-red-600" : "border-emerald-200 bg-mint/30 text-emerald-800"}`}>{msg}</motion.div>}
      {loading ? <PageSkeleton /> : (<>
        <motion.form onSubmit={add} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-2xl border border-emerald-100 bg-white p-4 shadow-soft sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div><label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Category</label><select value={category} onChange={(e) => setCategory(e.target.value)} className={inp}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="lg:col-span-2"><label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Description {category === "Other" ? "(required)" : "(optional)"}</label><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={category === "Other" ? "Describe the expense" : "Optional note"} className={inp} /></div>
            <div><label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Amount (ETB)</label><input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inp} /></div>
            <div><label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value || ymd(new Date()))} className={inp} /></div>
          </div>
          <button type="submit" disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-deep px-5 py-2.5 text-sm font-black text-mint shadow-soft transition hover:-translate-y-0.5 hover:bg-emerald-800 active:scale-95 disabled:opacity-50">{busy ? <Spinner className="h-4 w-4 border-mint/30 border-t-mint" /> : <Plus style={{ width: 16, height: 16 }} />} Add expense</button>
        </motion.form>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-emerald-100 bg-white p-1 shadow-sm">
            {(["day", "week", "month", "year"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`relative rounded-lg px-3.5 py-1.5 text-xs font-bold capitalize transition-colors ${period === p ? "text-mint" : "text-emerald-900/60 hover:text-emerald-deep"}`}>
                {period === p && <motion.span layoutId="expPeriod" className="absolute inset-0 rounded-lg bg-emerald-deep" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                <span className="relative">{p}</span>
              </button>
            ))}
          </div>
          <input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value || ymd(new Date()))} className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-sm text-emerald-900 focus:border-emerald-500 focus:outline-none" />
          <button onClick={csv} className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-deep shadow-soft transition hover:-translate-y-0.5 hover:bg-mint/30 active:scale-95"><Download style={{ width: 14, height: 14 }} /> CSV</button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Total spent" value={etb(total)} Icon={Wallet} tint="bg-emerald-deep text-mint" />
          <Stat label="Entries" value={String(periodExpenses.length)} Icon={Plus} tint="bg-mint text-emerald-deep" />
          <Stat label="Top category" value={topCat ? topCat.c : "-"} Icon={topCat ? catIcon(topCat.c) : Wallet} tint="bg-emerald-600 text-white" small />
          <Stat label="Avg / entry" value={periodExpenses.length ? etb(total / periodExpenses.length) : etb(0)} Icon={Coffee} tint="bg-cream-deep text-emerald-deep" />
        </div>

        <div className="mb-6 rounded-2xl border border-emerald-100 bg-white p-5 shadow-soft">
          <h2 className="mb-4 font-display text-xl font-black text-emerald-deep">By category</h2>
          {byCat.length === 0 ? <p className="py-6 text-center text-sm text-emerald-900/55">No expenses in this period.</p> : (
            <div className="space-y-3">
              {byCat.map((b) => {
                const Ic = catIcon(b.c);
                const pct = total > 0 ? Math.round((b.v / total) * 100) : 0;
                return (
                  <div key={b.c}>
                    <div className="mb-1 flex items-center justify-between text-sm"><span className="flex items-center gap-2 font-semibold text-emerald-deep"><Ic style={{ width: 15, height: 15 }} />{b.c}</span><span className="font-display font-black text-emerald-deep">{etb(b.v)} <span className="text-xs font-semibold text-emerald-900/50">({pct}%)</span></span></div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-emerald-50"><motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-mint" /></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3 md:hidden">
          {periodExpenses.length === 0 && <div className="rounded-2xl border border-emerald-100 bg-white py-12 text-center text-sm text-emerald-900/55">No expenses in this period.</div>}
          {periodExpenses.map((x) => {
            const Ic = catIcon(x.category);
            return (
              <div key={x.id} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-deep"><Ic style={{ width: 14, height: 14 }} />{x.category}</div>
                    <div className="mt-0.5 text-xs text-emerald-900/60">{x.description || "-"}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-emerald-900/55">{fmtDate(x.date)} · {byLabel(x.user) || "-"}{x.backdated && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-700">Backdated</span>}</div>
                  </div>
                  <div className="shrink-0 text-right"><div className="font-display text-base font-black text-emerald-deep">{etb(x.amount)}</div></div>
                </div>
                <div className="mt-3 flex items-center justify-end border-t border-emerald-50 pt-2">
                  <button onClick={() => askDelete(x.id)} title="Delete" className="rounded-lg p-2 text-emerald-600/70 transition hover:bg-red-50 hover:text-red-600 active:scale-90"><Trash2 style={{ width: 15, height: 15 }} /></button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="hidden md:block overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-soft">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead><tr className="border-b border-emerald-100 bg-mint/20 text-[11px] uppercase tracking-wider text-emerald-700"><th className="px-5 py-3 font-semibold">Date</th><th className="px-5 py-3 font-semibold">Category</th><th className="px-5 py-3 font-semibold">Description</th><th className="px-5 py-3 text-right font-semibold">Amount</th><th className="px-5 py-3 font-semibold">By</th><th className="px-5 py-3 text-right font-semibold">Actions</th></tr></thead>
            <tbody className="divide-y divide-emerald-50">
              {periodExpenses.length === 0 && <tr><td colSpan={6} className="px-5 py-14 text-center text-sm text-emerald-900/55">No expenses in this period.</td></tr>}
              {periodExpenses.map((e) => {
                const Ic = catIcon(e.category);
                return (
                  <tr key={e.id} className="transition-colors hover:bg-cream/60">
                    <td className="px-5 py-3 text-xs text-emerald-900/60">{fmtDate(e.date)}</td>
                    <td className="px-5 py-3"><span className="inline-flex items-center gap-1.5 font-semibold text-emerald-deep"><Ic style={{ width: 14, height: 14 }} />{e.category}</span></td>
                    <td className="px-5 py-3 text-emerald-900/70">{e.description || <span className="text-emerald-300">-</span>}</td>
                    <td className="px-5 py-3 text-right font-display font-black text-emerald-deep">{etb(e.amount)}</td>
                    <td className="px-5 py-3 text-xs text-emerald-900/60">{byLabel(e.user) || "-"}</td>
                    <td className="px-5 py-3 text-right"><button onClick={() => del(e.id)} title="Delete" className="rounded-lg p-2 text-emerald-600/70 transition hover:bg-red-50 hover:text-red-600 active:scale-90"><Trash2 style={{ width: 15, height: 15 }} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>)}
    </div>
  );
}

function Stat({ label, value, Icon, tint, small }: { label: string; value: string; Icon: any; tint: string; small?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(6,95,70,0.12)]">
      <div className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-mint/25 blur-2xl transition group-hover:bg-mint/50" />
      <div className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl ${tint}`}><Icon style={{ width: 18, height: 18 }} /></div>
      <div className={`relative mt-3 font-display font-black leading-none tracking-tight text-emerald-deep ${small ? "truncate text-lg" : "text-2xl sm:text-3xl"}`}>{value}</div>
      <div className="relative mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-900/55">{label}</div>
    </motion.div>
  );
}