import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, prisma, ensureSchema, withRetry, masterGate } from "@/lib/core";
export const dynamic = "force-dynamic";
export async function DELETE(req: Request, ctx: any) {
  try {
    const params = await ctx.params;
    const s = await getServerSession(authOptions);
    if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const gate = await masterGate(body?.masterPassword);
    if (!gate.ok) return NextResponse.json({ error: gate.error || "Master password required" }, { status: gate.status });
    await ensureSchema();
    const r = await withRetry(() => prisma.sale.findUnique({ where: { id: params.id } }));
    if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
    try {
      const itemId = (r as any).itemId; const qty = Number((r as any).quantity) || 0;
      if (!(r as any).refunded && itemId && qty > 0) {
        await withRetry(() => prisma.$transaction(async (tx: any) => {
          const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
          if (item) await tx.inventoryItem.update({ where: { id: itemId }, data: { quantity: Math.max(0, item.quantity + qty) } });
        }));
      }
    } catch {} // stock restore on delete
    await withRetry(() => prisma.sale.delete({ where: { id: params.id } }));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 });
  }
}