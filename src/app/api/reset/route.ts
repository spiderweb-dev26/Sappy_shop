import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, prisma, ensureSchema, withRetry, masterGate, logActivity } from "@/lib/core";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  try {
    const s = await getServerSession(authOptions);
    if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const gate = await masterGate(body?.masterPassword);
    if (!gate.ok) return NextResponse.json({ error: gate.error || "Master password required" }, { status: gate.status });
    await ensureSchema();
    const sales = await withRetry(() => prisma.sale.deleteMany({}));
    const pos = await withRetry(() => prisma.purchaseOrder.deleteMany({}));
    const reports = await withRetry(() => prisma.report.deleteMany({}));
    const items = await withRetry(() => prisma.inventoryItem.deleteMany({}));
    const u: any = s.user;
    logActivity({ actor: { id: u.id, name: u.name, email: u.email }, kind: "reset", label: "Reset workspace", detail: `${items.count} items, ${sales.count} sales, ${pos.count} orders`, meta: { deleted: { items: items.count, sales: sales.count, orders: pos.count, reports: reports.count } } });
    return NextResponse.json({ ok: true, deleted: { sales: sales.count, purchaseOrders: pos.count, reports: reports.count, items: items.count } });
  } catch (e: any) {
    return NextResponse.json({ error: (e?.message || "Reset failed").slice(0, 300) }, { status: 500 });
  }
}