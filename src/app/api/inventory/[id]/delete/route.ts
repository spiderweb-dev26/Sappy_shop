import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, prisma, withRetry, ensureSchema, masterGate, logActivity } from "@/lib/core";
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
    const r = await withRetry(() => prisma.inventoryItem.findUnique({ where: { id: params.id } }));
    if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await withRetry(() => prisma.inventoryItem.delete({ where: { id: params.id } }));
    const u: any = s.user;
    logActivity({ actor: { id: u.id, name: u.name, email: u.email }, kind: "item.delete", entityType: "item", entityId: r.id, label: "Deleted item", detail: `${r.name} · ${r.serial}` });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: (e?.message || "Delete failed").slice(0, 300) }, { status: 500 });
  }
}