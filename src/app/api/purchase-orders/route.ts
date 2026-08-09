import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, prisma, poSchema, uniquePoNo, ensureSchema, withRetry, logActivity } from "@/lib/core";
export async function GET() {
  try {
    const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema();
    const orders = await withRetry(() => prisma.purchaseOrder.findMany({ orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, email: true } } } }));
    return NextResponse.json({ orders });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 }); }
}
export async function POST(req: Request) {
  const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema(); const uid = (s.user as any).id; const u: any = s.user; const actor = { id: u.id, name: u.name, email: u.email };
  try {
    const v = poSchema.parse(await req.json());
    const totalCost = v.lines.reduce((a, l) => a + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0);
    const poNo = await uniquePoNo();
    const order = await withRetry(() => prisma.purchaseOrder.create({ data: { poNo, supplier: v.supplier, status: v.status, note: v.note ?? null, lines: v.lines as any, totalCost, userId: uid }, include: { user: { select: { name: true, email: true } } } }));
    logActivity({ actor, kind: "po.create", entityType: "order", entityId: order.id, label: "Created purchase order", detail: `${order.supplier} · ${order.poNo}`, meta: { total: order.totalCost, poNo: order.poNo } });
    return NextResponse.json({ order }, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 }); }
}