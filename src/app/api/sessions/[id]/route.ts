import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, prisma, ensureSchema, withRetry } from "@/lib/core";
export const dynamic = "force-dynamic";
export async function DELETE(_req: Request, ctx: any) {
  try {
    const params = await ctx.params;
    const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema();
    const uid = (s.user as any).id;
    const rec = await withRetry(() => (prisma as any).deviceSession.findUnique({ where: { id: params.id } }));
    if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (rec.userId !== uid) return NextResponse.json({ error: "Not your session." }, { status: 403 });
    await withRetry(() => (prisma as any).deviceSession.update({ where: { id: params.id }, data: { revoked: true } }));
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 }); }
}