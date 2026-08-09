import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, prisma, ensureSchema, withRetry, masterGate } from "@/lib/core";
export const dynamic = "force-dynamic";
export async function POST(req: Request, ctx: any) {
  try {
    const params = await ctx.params;
    const s = await getServerSession(authOptions);
    if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const gate = await masterGate(body?.masterPassword);
    if (!gate.ok) return NextResponse.json({ error: gate.error || "Master password required" }, { status: gate.status });
    await ensureSchema();
    const cur = await withRetry(() => prisma.sale.findUnique({ where: { id: params.id } }));
    if (!cur) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const refunded = !(cur as any).refunded;
    const sale = await withRetry(() => prisma.sale.update({ where: { id: params.id }, data: { refunded, refundedAt: refunded ? new Date() : null } }));
    return NextResponse.json({ sale, refunded });
  } catch (e: any) {
    return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 });
  }
}