import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, prisma, itemUpdateSchema, withRetry, ensureSchema, logActivity } from "@/lib/core";
export async function PATCH(req: Request, ctx: any) {
  try {
    const params = await ctx.params;
    const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema();
    const r = await withRetry(() => prisma.inventoryItem.findUnique({ where: { id: params.id } }));
    if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const v = itemUpdateSchema.parse(await req.json());
    const data: any = { ...v }; if (v.costUnknown) data.purchaseValue = null;
    if (typeof data.name === "string" && data.name !== r.name) { data.dupKeptAt = null; data.dupKeptBy = null; }
    const item = await withRetry(() => prisma.inventoryItem.update({ where: { id: params.id }, data }));
    const u: any = s.user;
    logActivity({ actor: { id: u.id, name: u.name, email: u.email }, kind: "item.edit", entityType: "item", entityId: item.id, label: "Edited item", detail: item.name });
    return NextResponse.json({ item });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 400 }); }
}