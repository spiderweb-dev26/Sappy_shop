import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, prisma, ensureSchema, withRetry } from "@/lib/core";
export const dynamic = "force-dynamic";
async function ensureCols() { try { await prisma.$executeRawUnsafe(`ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "backdated" BOOLEAN NOT NULL DEFAULT false`); } catch {} }
export async function GET() {
  try {
    const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema(); await ensureCols();
    const sales = await withRetry(() => prisma.sale.findMany({ orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, email: true } } } }));
    return NextResponse.json({ sales });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 }); }
}
export async function POST(req: Request) {
  const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema(); await ensureCols(); const uid = (s.user as any).id;
  try {
    const b = await req.json().catch(() => ({}));
    const quantity = Math.max(1, Number(b.quantity) || 1);
    const unitPrice = Number(b.unitPrice) || 0;
    const discount = Number(b.discount) || 0;
    const total = Math.max(0, unitPrice * quantity - discount);
    const backdated = !!b.backdated;
    let createdAt: Date | undefined;
    if (b.date) { const d = new Date(b.date + "T00:00:00"); if (!isNaN(d.getTime())) { const now = new Date(); d.setHours(now.getHours(), now.getMinutes(), now.getSeconds()); createdAt = d; } }
    const saleNo = "S-" + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).toUpperCase().slice(2, 4);
    const sale = await withRetry(() => prisma.sale.create({ data: { saleNo, itemId: b.itemId || null, itemName: String(b.name || b.itemName || "Item"), serial: String(b.serial || ""), quantity, unitPrice, discount, total, paymentMethod: b.paymentMethod || null, note: b.note || null, backdated, userId: uid, ...(createdAt ? { createdAt } : {}) }, include: { user: { select: { name: true, email: true } } } }));
    return NextResponse.json({ sale }, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 }); }
}