import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, prisma, withRetry, ensureSchema, logActivity } from "@/lib/core";
export async function GET(_req: Request, ctx: any) {
  try {
    const params = await ctx.params;
    const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema();
    const r = await withRetry(() => prisma.purchaseOrder.findUnique({ where: { id: params.id } }));
    if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ order: r });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 }); }
}
export async function DELETE(_req: Request, ctx: any) {
  try {
    const params = await ctx.params;
    const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema();
    const r = await withRetry(() => prisma.purchaseOrder.findUnique({ where: { id: params.id } }));
    if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await withRetry(() => prisma.purchaseOrder.delete({ where: { id: params.id } }));
    const u: any = s.user;
    logActivity({ actor: { id: u.id, name: u.name, email: u.email }, kind: "po.delete", entityType: "order", entityId: r.id, label: "Deleted purchase order", detail: `${r.supplier} · ${r.poNo}` });
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 }); }
}