"use client";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Receipt, Boxes, TrendingUp, AlertTriangle, ClipboardList, Download, Wallet, PackageX, PackageCheck, Truck } from "lucide-react";
import { etb, fmtDate, fmtDateTime, ymd, mondayOf, sundayOf } from "@/lib/format";
import { useResource } from "@/components/useResource";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FileDown } from "lucide-react";
import { PageSkeleton, ErrorBanner } from "@/components/LoadState";
import { StatTile } from "@/components/Stat";

const card = "rounded-2xl border border-emerald-100 bg-white shadow-soft";
const thCls = "px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-emerald-700";
const tdCls = "px-4 py-3 text-sm text-emerald-900/80";
const numCls = "px-4 py-3 text-right text-sm font-semibold text-emerald-deep tabular-nums";

function downloadPdf(name: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function CsvBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-deep shadow-soft transition hover:-translate-y-0.5 hover:bg-mint/30 active:scale-95">
      <FileDown style={{ width: 14, height: 14 }} /> PDF
    </button>
  );
}

function Section({ Icon, title, desc, right, children }: { Icon: any; title: string; desc: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className={card + " p-5"}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-deep text-mint shadow-soft"><Icon style={{ width: 18, height: 18 }} /></span>
          <div>
            <h2 className="font-display text-xl font-black text-emerald-deep">{title}</h2>
            <p className="text-xs text-emerald-900/55">{desc}</p>
          </div>
        </div>
        {right}
      </div>
      {children}
    </motion.section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-emerald-200 bg-cream/40 px-6 py-10 text-center text-sm text-emerald-900/55">{text}</div>;
}

export default function ReportsClient() {
  const salesRes = useResource<{ sales: any[] }>("/api/sales");
  const invRes = useResource<{ items: any[] }>("/api/inventory");
  const poRes = useResource<{ orders: any[] }>("/api/purchase-orders");
  const sales = salesRes.data?.sales || [];
  const items = invRes.data?.items || [];
  const orders = poRes.data?.orders || [];
  const loading = (salesRes.loading && !salesRes.data) || (invRes.loading && !invRes.data) || (poRes.loading && !poRes.data);
  const error = salesRes.error || invRes.error || poRes.error;
  const [tab, setTab] = useState("sales");
  const [period, setPeriod] = useState<"day" | "week" | "year">("day");
  const [anchor, setAnchor] = useState(() => ymd(new Date()));
  const [sort, setSort] = useState("newest");
  const [threshold, setThreshold] = useState(5);

  const TABS = [
    { id: "sales", label: "Sales", Icon: Receipt },
    { id: "inventory", label: "Inventory Value", Icon: Boxes },
    { id: "profit", label: "Profit & Margin", Icon: TrendingUp },
    { id: "stock", label: "Stock Alerts", Icon: AlertTriangle },
    { id: "purchasing", label: "Purchasing", Icon: ClipboardList },
  ];

  // ----- sales period -----
  const periodSales = useMemo(() => sales.filter((s) => {
    const d = new Date(s.createdAt);
    if (period === "day") return ymd(d) === anchor;
    if (period === "year") return String(d.getFullYear()) === String(new Date(anchor + "T00:00:00").getFullYear());
    const m = mondayOf(new Date(anchor + "T00:00:00")); const su = sundayOf(new Date(anchor + "T00:00:00"));
    return d >= m && d <= su;
  }), [sales, period, anchor]);
  const sortedSales = useMemo(() => {
    const arr = [...periodSales];
    if (sort === "oldest") arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (sort === "high") arr.sort((a, b) => (b.total || 0) - (a.total || 0));
    else if (sort === "low") arr.sort((a, b) => (a.total || 0) - (b.total || 0));
    else if (sort === "item") arr.sort((a, b) => (a.itemName || "").localeCompare(b.itemName || ""));
    else arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return arr;
  }, [periodSales, sort]);
  const salesKpi = useMemo(() => {
    const revenue = periodSales.reduce((a, s) => a + (s.total || 0), 0);
    const units = periodSales.reduce((a, s) => a + (s.quantity || 0), 0);
    const discounts = periodSales.reduce((a, s) => a + ((s.unitPrice || 0) * (s.quantity || 0) - (s.total || 0)), 0);
    return { revenue, count: periodSales.length, units, discounts };
  }, [periodSales]);
  const payMethods = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of periodSales) { const k = s.paymentMethod || "Unspecified"; m.set(k, (m.get(k) || 0) + (s.total || 0)); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [periodSales]);

  // ----- inventory valuation -----
  const inv = useMemo(() => {
    let units = 0, costVal = 0, sellVal = 0, unknown = 0;
    const byCat = new Map<string, { items: number; units: number; cost: number; sell: number }>();
    for (const i of items) {
      units += i.quantity || 0;
      const cv = (!i.costUnknown && i.purchaseValue != null) ? i.purchaseValue * i.quantity : 0;
      const sv = i.sellingPrice != null ? i.sellingPrice * i.quantity : 0;
      costVal += cv; sellVal += sv;
      if (i.costUnknown || i.purchaseValue == null) unknown++;
      const key = i.category || "Uncategorized";
      if (!byCat.has(key)) byCat.set(key, { items: 0, units: 0, cost: 0, sell: 0 });
      const c = byCat.get(key)!; c.items++; c.units += i.quantity || 0; c.cost += cv; c.sell += sv;
    }
    const cats = [...byCat.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.sell - a.sell);
    return { skus: items.length, units, costVal, sellVal, potential: sellVal - costVal, unknown, cats };
  }, [items]);

  // ----- profit & margin (match sales to cost by serial / itemId) -----
  const profit = useMemo(() => {
    const bySerial = new Map<string, any>(); const byId = new Map<string, any>();
    for (const i of items) { if (i.serial) bySerial.set(i.serial, i); byId.set(i.id, i); }
    let revenue = 0, cogs = 0, discounts = 0, matched = 0, unmatched = 0;
    const byProduct = new Map<string, { qty: number; revenue: number; cost: number; known: boolean }>();
    for (const s of sales) {
      const grossSale = (s.unitPrice || 0) * (s.quantity || 0);
      revenue += s.total || 0;
      discounts += grossSale - (s.total || 0);
      const item = bySerial.get(s.serial) || byId.get(s.itemId) || null;
      const unitCost = item && !item.costUnknown && item.purchaseValue != null ? item.purchaseValue : null;
      const key = s.itemName || "Unknown item";
      if (!byProduct.has(key)) byProduct.set(key, { qty: 0, revenue: 0, cost: 0, known: false });
      const p = byProduct.get(key)!; p.qty += s.quantity || 0; p.revenue += s.total || 0;
      if (unitCost != null) { const c = unitCost * (s.quantity || 0); cogs += c; p.cost += c; p.known = true; matched++; }
      else unmatched++;
    }
    const gp = revenue - cogs;
    const products = [...byProduct.entries()].map(([name, v]) => ({
      name, qty: v.qty, revenue: v.revenue, cost: v.cost, profit: v.revenue - v.cost,
      margin: v.revenue > 0 && v.known ? ((v.revenue - v.cost) / v.revenue) * 100 : null, known: v.known,
    })).sort((a, b) => b.revenue - a.revenue);
    return { revenue, cogs, gp, margin: revenue > 0 ? (gp / revenue) * 100 : 0, discounts, matched, unmatched, products };
  }, [sales, items]);

  // ----- stock alerts -----
  const stock = useMemo(() => {
    const out = items.filter((i) => (i.quantity || 0) === 0);
    const low = items.filter((i) => (i.quantity || 0) > 0 && (i.quantity || 0) <= threshold);
    return { out, low, healthy: items.length - out.length - low.length };
  }, [items, threshold]);

  // ----- purchasing -----
  const po = useMemo(() => {
    let committed = 0, open = 0, received = 0;
    const bySupplier = new Map<string, { count: number; cost: number; last: string | null }>();
    for (const o of orders) {
      const c = o.totalCost || 0; committed += c;
      if (o.status === "received") received++; else open++;
      const key = o.supplier || "Unknown supplier";
      if (!bySupplier.has(key)) bySupplier.set(key, { count: 0, cost: 0, last: null });
      const s = bySupplier.get(key)!; s.count++; s.cost += c;
      if (!s.last || new Date(o.createdAt) > new Date(s.last)) s.last = o.createdAt;
    }
    const suppliers = [...bySupplier.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.cost - a.cost);
    return { total: orders.length, open, received, committed, suppliers };
  }, [orders]);

  const retry = () => { salesRes.reload(); invRes.reload(); poRes.reload(); };

  return (
    <div>
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600/80">Analytics</p>
        <h1 className="mt-1 font-display text-3xl font-black tracking-tight text-emerald-deep md:text-4xl">Reports</h1>
        <p className="mt-1 text-sm text-emerald-900/60">Sales, inventory value, profit, stock health and purchasing — all in one place.</p>
      </header>

      {error && <div className="mb-4"><ErrorBanner error={error} onRetry={retry} /></div>}

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`relative rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${tab === t.id ? "text-mint" : "border border-emerald-100 bg-white/70 text-emerald-900/70 hover:bg-mint/30 hover:text-emerald-deep"}`}>
            {tab === t.id && <motion.span layoutId="repTab" className="absolute inset-0 rounded-xl bg-emerald-deep shadow-soft" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
            <span className="relative flex items-center gap-2"><t.Icon style={{ width: 15, height: 15 }} />{t.label}</span>
          </button>
        ))}
      </div>

      {loading ? <PageSkeleton /> : (
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>

            {tab === "sales" && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex rounded-xl border border-emerald-100 bg-white p-1 shadow-sm">
                    {(["day", "week", "year"] as const).map((p) => (
                      <button key={p} onClick={() => setPeriod(p)} className={`relative rounded-lg px-3.5 py-1.5 text-xs font-bold capitalize transition-colors ${period === p ? "text-mint" : "text-emerald-900/60 hover:text-emerald-deep"}`}>
                        {period === p && <motion.span layoutId="salesPeriod" className="absolute inset-0 rounded-lg bg-emerald-deep" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                        <span className="relative">{p}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2"><input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value || ymd(new Date()))} className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-sm text-emerald-900 focus:border-emerald-500 focus:outline-none" /><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort sales" className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-sm text-emerald-900 focus:border-emerald-500 focus:outline-none"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="high">Highest amount</option><option value="low">Lowest amount</option><option value="item">Item A-Z</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatTile label="Revenue" value={salesKpi.revenue} Icon={Wallet} tint="bg-emerald-deep text-mint" format={etb} />
                  <StatTile label="Transactions" value={salesKpi.count} Icon={Receipt} tint="bg-mint text-emerald-deep" delay={0.05} />
                  <StatTile label="Units sold" value={salesKpi.units} Icon={Boxes} tint="bg-emerald-600 text-white" delay={0.1} />
                  <StatTile label="Discounts given" value={salesKpi.discounts} Icon={TrendingUp} tint="bg-cream-deep text-emerald-deep" format={etb} delay={0.15} />
                </div>
                {payMethods.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {payMethods.map(([k, v]) => (
                      <span key={k} className="rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm">{k} · <span className="font-black text-emerald-deep">{etb(v)}</span></span>
                    ))}
                  </div>
                )}
                <Section Icon={Receipt} title="Sales ledger" desc={`${periodSales.length} sale(s) in this ${period}`} right={<CsvBtn onClick={() => downloadPdf(`sales-${period}-${anchor}.pdf`, ["Date", "Sale #", "Item", "Qty", "Unit", "Discount", "Total"], sortedSales.map((s) => [fmtDateTime(s.createdAt), s.saleNo, s.itemName, s.quantity, s.unitPrice, (s.unitPrice || 0) * (s.quantity || 0) - (s.total || 0), s.total]))} />}>
                  {periodSales.length === 0 ? <Empty text={`No sales recorded for this ${period}.`} /> : (
                    <div className="max-w-full overflow-x-auto">
                      <table className="w-full min-w-[560px]">
                        <thead><tr className="border-b border-emerald-100 bg-mint/20"><th className={thCls}>Date</th><th className={thCls}>Sale #</th><th className={thCls}>Item</th><th className={thCls + " text-right"}>Qty</th><th className={thCls + " text-right"}>Discount</th><th className={thCls + " text-right"}>Total</th></tr></thead>
                        <tbody className="divide-y divide-emerald-50">
                          {sortedSales.map((s) => (
                            <tr key={s.id} className="transition-colors hover:bg-cream/50">
                              <td className={tdCls + " whitespace-nowrap text-xs text-emerald-900/60"}>{fmtDateTime(s.createdAt)}</td>
                              <td className={tdCls + " font-mono text-xs text-emerald-700"}>{s.saleNo}</td>
                              <td className={tdCls + " font-semibold text-emerald-deep"}>{s.itemName}</td>
                              <td className={numCls}>{s.quantity}</td>
                              <td className={numCls + " text-emerald-900/60"}>{(s.unitPrice || 0) * (s.quantity || 0) - (s.total || 0) > 0 ? etb((s.unitPrice || 0) * (s.quantity || 0) - (s.total || 0)) : "-"}</td>
                              <td className={numCls}>{etb(s.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Section>
              </div>
            )}

            {tab === "inventory" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatTile label="SKUs" value={inv.skus} Icon={Boxes} tint="bg-emerald-deep text-mint" />
                  <StatTile label="Total units" value={inv.units} Icon={PackageCheck} tint="bg-mint text-emerald-deep" delay={0.05} />
                  <StatTile label="Value at cost" value={inv.costVal} Icon={Wallet} tint="bg-emerald-600 text-white" format={etb} delay={0.1} />
                  <StatTile label="Value at sell" value={inv.sellVal} Icon={TrendingUp} tint="bg-cream-deep text-emerald-deep" format={etb} delay={0.15} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={card + " p-4"}><p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Est. potential profit</p><p className="mt-1 font-display text-2xl font-black text-emerald-deep">{etb(inv.potential)}</p><p className="text-[11px] text-emerald-900/50">Sell value minus known cost</p></div>
                  <div className={card + " p-4"}><p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Unknown cost</p><p className="mt-1 font-display text-2xl font-black text-amber-600">{inv.unknown} item(s)</p><p className="text-[11px] text-emerald-900/50">Add costs to sharpen profit reports</p></div>
                </div>
                <Section Icon={Boxes} title="Value by category" desc="Where your stock value sits">
                  {inv.cats.length === 0 ? <Empty text="No inventory yet." /> : (
                    <div className="max-w-full overflow-x-auto">
                      <table className="w-full min-w-[560px]">
                        <thead><tr className="border-b border-emerald-100 bg-mint/20"><th className={thCls}>Category</th><th className={thCls + " text-right"}>Items</th><th className={thCls + " text-right"}>Units</th><th className={thCls + " text-right"}>Cost value</th><th className={thCls + " text-right"}>Sell value</th></tr></thead>
                        <tbody className="divide-y divide-emerald-50">
                          {inv.cats.map((c) => (
                            <tr key={c.name} className="transition-colors hover:bg-cream/50">
                              <td className={tdCls + " font-semibold text-emerald-deep"}>{c.name}</td>
                              <td className={numCls}>{c.items}</td>
                              <td className={numCls}>{c.units}</td>
                              <td className={numCls}>{etb(c.cost)}</td>
                              <td className={numCls}>{etb(c.sell)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Section>
                <Section Icon={Receipt} title="Valuation ledger" desc="Every item, valued" right={<CsvBtn onClick={() => downloadPdf("inventory-valuation.pdf", ["Serial", "Name", "Category", "Qty", "Unit Cost", "Unit Sell", "Cost Value", "Sell Value"], items.map((i) => [i.serial, i.name, i.category || "", i.quantity, i.costUnknown ? "" : (i.purchaseValue ?? ""), i.sellingPrice ?? "", (!i.costUnknown && i.purchaseValue != null) ? i.purchaseValue * i.quantity : 0, i.sellingPrice != null ? i.sellingPrice * i.quantity : 0]))} />}>
                  {items.length === 0 ? <Empty text="No inventory yet." /> : (
                    <div className="max-w-full overflow-x-auto">
                      <table className="w-full min-w-[640px]">
                        <thead><tr className="border-b border-emerald-100 bg-mint/20"><th className={thCls}>Item</th><th className={thCls}>Category</th><th className={thCls + " text-right"}>Qty</th><th className={thCls + " text-right"}>Unit cost</th><th className={thCls + " text-right"}>Unit sell</th><th className={thCls + " text-right"}>Sell value</th></tr></thead>
                        <tbody className="divide-y divide-emerald-50">
                          {items.map((i) => (
                            <tr key={i.id} className="transition-colors hover:bg-cream/50">
                              <td className={tdCls}><span className="font-semibold text-emerald-deep">{i.name}</span><span className="ml-2 font-mono text-[11px] text-emerald-600/70">{i.serial}</span></td>
                              <td className={tdCls}>{i.category || <span className="text-emerald-300">-</span>}</td>
                              <td className={numCls}>{i.quantity}</td>
                              <td className={numCls + " text-emerald-900/60"}>{i.costUnknown ? <span className="text-[10px] font-bold uppercase text-amber-600">unknown</span> : i.purchaseValue != null ? etb(i.purchaseValue) : "-"}</td>
                              <td className={numCls}>{i.sellingPrice != null ? etb(i.sellingPrice) : "-"}</td>
                              <td className={numCls}>{i.sellingPrice != null ? etb(i.sellingPrice * i.quantity) : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Section>
              </div>
            )}

            {tab === "profit" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatTile label="Revenue" value={profit.revenue} Icon={Wallet} tint="bg-emerald-deep text-mint" format={etb} />
                  <StatTile label="Cost of goods" value={profit.cogs} Icon={Boxes} tint="bg-cream-deep text-emerald-deep" format={etb} delay={0.05} />
                  <StatTile label="Gross profit" value={profit.gp} Icon={TrendingUp} tint="bg-emerald-600 text-white" format={etb} delay={0.1} />
                  <StatTile label="Discounts given" value={profit.discounts} Icon={Receipt} tint="bg-mint text-emerald-deep" format={etb} delay={0.15} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={card + " p-4"}><p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Average gross margin</p><p className="mt-1 font-display text-2xl font-black text-emerald-deep">{profit.margin.toFixed(1)}%</p><p className="text-[11px] text-emerald-900/50">On sales with a known cost</p></div>
                  <div className={card + " p-4"}><p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Cost coverage</p><p className="mt-1 font-display text-2xl font-black text-amber-600">{profit.matched} / {profit.matched + profit.unmatched}</p><p className="text-[11px] text-emerald-900/50">Sales matched to a known cost</p></div>
                </div>
                <Section Icon={TrendingUp} title="Profit by product" desc="Highest revenue first" right={<CsvBtn onClick={() => downloadPdf("profit-by-product.pdf", ["Item", "Qty Sold", "Revenue", "Cost", "Profit", "Margin %"], profit.products.map((p) => [p.name, p.qty, p.revenue, p.cost, p.profit, p.margin != null ? p.margin.toFixed(1) : ""]))} />}>
                  {profit.products.length === 0 ? <Empty text="No sales yet - profit appears once you record sales." /> : (
                    <div className="max-w-full overflow-x-auto">
                      <table className="w-full min-w-[640px]">
                        <thead><tr className="border-b border-emerald-100 bg-mint/20"><th className={thCls}>Item</th><th className={thCls + " text-right"}>Qty</th><th className={thCls + " text-right"}>Revenue</th><th className={thCls + " text-right"}>Cost</th><th className={thCls + " text-right"}>Profit</th><th className={thCls + " text-right"}>Margin</th></tr></thead>
                        <tbody className="divide-y divide-emerald-50">
                          {profit.products.map((p) => (
                            <tr key={p.name} className="transition-colors hover:bg-cream/50">
                              <td className={tdCls + " font-semibold text-emerald-deep"}>{p.name}</td>
                              <td className={numCls}>{p.qty}</td>
                              <td className={numCls}>{etb(p.revenue)}</td>
                              <td className={numCls + " text-emerald-900/60"}>{p.known ? etb(p.cost) : <span className="text-[10px] font-bold uppercase text-amber-600">n/a</span>}</td>
                              <td className={numCls + (p.profit >= 0 ? " text-emerald-700" : " text-red-600")}>{p.known ? etb(p.profit) : "-"}</td>
                              <td className={numCls}>{p.margin != null ? p.margin.toFixed(1) + "%" : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Section>
              </div>
            )}

            {tab === "stock" && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="grid flex-1 grid-cols-3 gap-3">
                    <StatTile label="Out of stock" value={stock.out.length} Icon={PackageX} tint="bg-red-100 text-red-600" />
                    <StatTile label="Low stock" value={stock.low.length} Icon={AlertTriangle} tint="bg-amber-100 text-amber-700" delay={0.05} />
                    <StatTile label="Healthy" value={stock.healthy} Icon={PackageCheck} tint="bg-emerald-deep text-mint" delay={0.1} />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-emerald-800">Low-stock at ≤</label>
                    <input type="number" min={0} value={threshold} onChange={(e) => setThreshold(Math.max(0, Number(e.target.value) || 0))} className="w-20 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-sm text-emerald-900 focus:border-emerald-500 focus:outline-none" />
                  </div>
                </div>
                <Section Icon={AlertTriangle} title="Reorder list" desc="Out-of-stock and low-stock items" right={<CsvBtn onClick={() => downloadPdf("stock-alerts.pdf", ["Serial", "Name", "Category", "Qty", "Location", "Status"], [...stock.out, ...stock.low].map((i) => [i.serial, i.name, i.category || "", i.quantity, i.location || "", (i.quantity || 0) === 0 ? "OUT OF STOCK" : "LOW"]))} />}>
                  {stock.out.length === 0 && stock.low.length === 0 ? <Empty text={`Nothing at or below ${threshold} units - stock looks healthy.`} /> : (
                    <div className="max-w-full overflow-x-auto">
                      <table className="w-full min-w-[560px]">
                        <thead><tr className="border-b border-emerald-100 bg-mint/20"><th className={thCls}>Item</th><th className={thCls}>Category</th><th className={thCls}>Location</th><th className={thCls + " text-right"}>Qty</th><th className={thCls + " text-right"}>Status</th></tr></thead>
                        <tbody className="divide-y divide-emerald-50">
                          {[...stock.out, ...stock.low].map((i) => (
                            <tr key={i.id} className="transition-colors hover:bg-cream/50">
                              <td className={tdCls}><span className="font-semibold text-emerald-deep">{i.name}</span><span className="ml-2 font-mono text-[11px] text-emerald-600/70">{i.serial}</span></td>
                              <td className={tdCls}>{i.category || <span className="text-emerald-300">-</span>}</td>
                              <td className={tdCls}>{i.location || <span className="text-emerald-300">-</span>}</td>
                              <td className={numCls}>{i.quantity}</td>
                              <td className={tdCls + " text-right"}>{(i.quantity || 0) === 0 ? <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-red-600">Out</span> : <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">Low</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Section>
              </div>
            )}

            {tab === "purchasing" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatTile label="Total POs" value={po.total} Icon={ClipboardList} tint="bg-emerald-deep text-mint" />
                  <StatTile label="Open" value={po.open} Icon={Truck} tint="bg-amber-100 text-amber-700" delay={0.05} />
                  <StatTile label="Received" value={po.received} Icon={PackageCheck} tint="bg-mint text-emerald-deep" delay={0.1} />
                  <StatTile label="Committed spend" value={po.committed} Icon={Wallet} tint="bg-emerald-600 text-white" format={etb} delay={0.15} />
                </div>
                <Section Icon={Truck} title="Spend by supplier" desc="Where your purchasing money goes">
                  {po.suppliers.length === 0 ? <Empty text="No purchase orders yet." /> : (
                    <div className="max-w-full overflow-x-auto">
                      <table className="w-full min-w-[520px]">
                        <thead><tr className="border-b border-emerald-100 bg-mint/20"><th className={thCls}>Supplier</th><th className={thCls + " text-right"}>Orders</th><th className={thCls + " text-right"}>Total cost</th><th className={thCls + " text-right"}>Last order</th></tr></thead>
                        <tbody className="divide-y divide-emerald-50">
                          {po.suppliers.map((s) => (
                            <tr key={s.name} className="transition-colors hover:bg-cream/50">
                              <td className={tdCls + " font-semibold text-emerald-deep"}>{s.name}</td>
                              <td className={numCls}>{s.count}</td>
                              <td className={numCls}>{etb(s.cost)}</td>
                              <td className={tdCls + " text-right text-xs text-emerald-900/60"}>{s.last ? fmtDate(s.last) : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Section>
                <Section Icon={ClipboardList} title="Purchase orders" desc="All POs" right={<CsvBtn onClick={() => downloadPdf("purchase-orders.pdf", ["PO #", "Supplier", "Status", "Lines", "Total Cost", "Created"], orders.map((o) => [o.poNo, o.supplier, o.status, (o.lines || []).length, o.totalCost, fmtDate(o.createdAt)]))} />}>
                  {orders.length === 0 ? <Empty text="No purchase orders yet." /> : (
                    <div className="max-w-full overflow-x-auto">
                      <table className="w-full min-w-[560px]">
                        <thead><tr className="border-b border-emerald-100 bg-mint/20"><th className={thCls}>PO #</th><th className={thCls}>Supplier</th><th className={thCls}>Status</th><th className={thCls + " text-right"}>Total</th><th className={thCls + " text-right"}>Created</th></tr></thead>
                        <tbody className="divide-y divide-emerald-50">
                          {orders.map((o) => (
                            <tr key={o.id} className="transition-colors hover:bg-cream/50">
                              <td className={tdCls + " font-mono text-xs text-emerald-700"}>{o.poNo}</td>
                              <td className={tdCls + " font-semibold text-emerald-deep"}>{o.supplier}</td>
                              <td className={tdCls}><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${o.status === "received" ? "bg-emerald-100 text-emerald-800" : o.status === "ordered" ? "bg-mint/60 text-emerald-800" : "bg-amber-50 text-amber-700"}`}>{o.status}</span></td>
                              <td className={numCls}>{etb(o.totalCost)}</td>
                              <td className={tdCls + " text-right text-xs text-emerald-900/60"}>{fmtDate(o.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Section>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}