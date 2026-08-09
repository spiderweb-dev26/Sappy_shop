import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, prisma, withRetry, ensureSchema, logActivity } from "@/lib/core";
export const dynamic = "force-dynamic";
export async function POST(_req: Request, ctx: any) {
  try {
    const params = await ctx.params;
    const s = await getServerSession(authOptions);
    if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema();
    const r = await withRetry(() => prisma.inventoryItem.findUnique({ where: { id: params.id } }));
    if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const u: any = s.user;
    const by = u?.name || (u?.email ? String(u.email).split("@")[0] : "member");
    const item = await withRetry(() => prisma.inventoryItem.update({ where: { id: params.id }, data: { dupKeptAt: new Date(), dupKeptBy: by } }));
    logActivity({ actor: { id: u.id, name: u.name, email: u.email }, kind: "item.keep", entityType: "item", entityId: item.id, label: "Kept duplicate", detail: item.name });
    return NextResponse.json({ item });
  } catch (e: any) {
    return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 });
  }
}