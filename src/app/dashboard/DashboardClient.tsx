"use client";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Boxes, Package, Receipt, ClipboardList, ArrowRight, Plus, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { StatTile } from "@/components/Stat";
import { useResource } from "@/components/useResource";
import { PageSkeleton, ErrorBanner } from "@/components/LoadState";
import { etb, ymd } from "@/lib/format";
type U = { name?: string | null; email?: string } | null;
const byLabel = (u?: U) => u?.name || (u?.email ? u.email.split("@")[0] : null);
export default function DashboardClient() {
  const inv = useResource<{ items: any[] }>("/api/inventory");
  const sal = useResource<{ sales: any[] }>("/api/sales");
  const po = useResource<{ orders: any[] }>("/api/purchase-orders");
  const sec = useResource<{ set: boolean }>("/api/master/status");
  useEffect(() => { const h = () => sec.reload(); window.addEventListener("sl:master-changed", h); return () => window.removeEventListener("sl:master-changed", h); }, []);
  const items = inv.data?.items || []; const sales = sal.data?.sales || []; const orders = po.data?.orders || [];
  const loading = (inv.loading || sal.loading || po.loading) && !inv.data && !sal.data && !po.data;
  const error = inv.error || sal.error || po.error;
  const retry = () => { inv.reload(); sal.reload(); po.reload(); };
  const today = ymd(new Date());
  const todayRev = sales.filter((x: any) => ymd(new Date(x.createdAt)) === today).reduce((a: number, x: any) => a + x.total, 0);
  const openPo = orders.filter((o: any) => o.status !== "received").length;
  const recentSales = sales.slice(0, 5); const recentItems = items.slice(0, 5);
  const showNudge = sec.data && sec.data.set === false;
  const contribs = useMemo(() => {
    const map = new Map<string, { name?: string | null; email?: string; initial: string }>();
    const add = (u?: U) => { const key = u?.email; if (!key) return; if (!map.has(key)) map.set(key, { name: u?.name, email: key, initial: (u?.name || key).trim().charAt(0).toUpperCase() }); };
    items.forEach((i: any) => add(i.user)); sales.forEach((x: any) => add(x.user)); orders.forEach((o: any) => add(o.user));
    return [...map.values()];
  }, [items, sales, orders]);
  return (
    <div>
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600/80">Overview</p>
        <h1 className="mt-1 font-display text-3xl font-black tracking-tight text-emerald-deep md:text-5xl">Good to see you.</h1>
        <p className="mt-1 text-sm text-emerald-900/60">Your team's live read on stock, sales and orders.</p>
        {contribs.length > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/70 py-1 pl-1 pr-3 shadow-soft">
            <div className="flex -space-x-2">
              {contribs.slice(0, 4).map((c, i) => <span key={c.email} title={c.name || c.email} className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-deep text-[10px] font-black text-mint ring-2 ring-cream" style={{ zIndex: 10 - i }}>{c.initial}</span>)}
              {contribs.length > 4 && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mint text-[10px] font-black text-emerald-deep ring-2 ring-cream">+{contribs.length - 4}</span>}
            </div>
            <span className="text-[11px] font-semibold text-emerald-800">Shared workspace · {contribs.length} contributor{contribs.length === 1 ? "" : "s"}</span>
          </div>
        )}
      </header>
      {showNudge && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-mint/40 to-cream p-4 shadow-soft">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-deep text-mint"><ShieldAlert style={{ width: 20, height: 20 }} /></div>
            <div><div className="font-display text-base font-black text-emerald-deep">Lock down your workspace</div><div className="text-xs text-emerald-900/60">Set a master password to protect deletions, resets and new sign-ups.</div></div>
          </div>
          <button onClick={() => window.dispatchEvent(new CustomEvent("sl:open-security"))} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-deep px-4 py-2.5 text-sm font-bold text-mint shadow-soft transition hover:bg-emerald-800 hover:-translate-y-0.5 sm:w-auto sm:justify-start">Set master password</button>
        </motion.div>
      )}
      {error && !loading && <div className="mb-6"><ErrorBanner error={error} onRetry={retry} /></div>}
      {loading ? <PageSkeleton /> : (<>
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Unique items" value={items.length} Icon={Boxes} tint="bg-emerald-deep text-mint" />
          <StatTile label="Total units" value={items.reduce((a: number, i: any) => a + i.quantity, 0)} Icon={Package} tint="bg-mint text-emerald-deep" delay={0.05} />
          <StatTile label="Today's revenue" value={todayRev} Icon={Receipt} tint="bg-emerald-600 text-white" format={etb} delay={0.1} />
          <StatTile label="Open POs" value={openPo} Icon={ClipboardList} tint="bg-cream-deep text-emerald-deep" delay={0.15} />
        </section>
        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-white shadow-soft"><div className="flex items-center justify-between border-b border-emerald-100 px-6 py-4"><h2 className="font-display text-lg font-bold text-emerald-deep">Recent sales</h2><Link href="/sales" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800">All <ArrowRight style={{ width: 14, height: 14 }} /></Link></div>{recentSales.length === 0 ? <p className="px-6 py-12 text-center text-sm text-emerald-900/55">No sales yet.</p> : <ul className="divide-y divide-emerald-50">{recentSales.map((x: any) => (<li key={x.id} className="flex items-center justify-between px-6 py-3"><div className="min-w-0"><div className="truncate text-sm font-semibold text-emerald-deep">{x.itemName}</div><div className="font-mono text-[11px] text-emerald-600/70">{x.saleNo}{byLabel(x.user) ? ` · by ${byLabel(x.user)}` : ""}</div></div><div className="font-display text-sm font-bold text-emerald-deep">{etb(x.total)}</div></li>))}</ul>}</div>
          <div className="rounded-2xl border border-emerald-100 bg-white shadow-soft"><div className="flex items-center justify-between border-b border-emerald-100 px-6 py-4"><h2 className="font-display text-lg font-bold text-emerald-deep">Recent stock</h2><Link href="/inventory" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800">Add <Plus style={{ width: 14, height: 14 }} /></Link></div>{recentItems.length === 0 ? <p className="px-6 py-12 text-center text-sm text-emerald-900/55">No items yet.</p> : <ul className="divide-y divide-emerald-50">{recentItems.map((i: any) => (<li key={i.id} className="flex items-center justify-between px-6 py-3"><div className="min-w-0"><div className="truncate text-sm font-semibold text-emerald-deep">{i.name}</div><div className="font-mono text-[11px] text-emerald-600/70">{i.serial}{byLabel(i.user) ? ` · by ${byLabel(i.user)}` : ""}</div></div><div className="text-sm font-bold text-emerald-deep">{i.quantity}<span className="ml-1 text-[11px] font-medium text-emerald-900/45">u</span></div></li>))}</ul>}</div>
        </section>
      </>)}
    </div>
  );
}