import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, prisma, ensureSchema, withRetry } from "@/lib/core";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema();
    const items = await withRetry(() => prisma.inventoryItem.findMany({ orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, email: true } } } }));
    return NextResponse.json({ items });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 }); }
}
export async function POST(req: Request) {
  const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema(); const uid = (s.user as any).id;
  try {
    const b = await req.json().catch(() => ({}));
    const name = String(b?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Item name is required." }, { status: 400 });
    const dupes = await withRetry(() => prisma.inventoryItem.findMany({ where: { name: { equals: name, mode: "insensitive" } } }));
    if (dupes.length && !b.allowDuplicate) {
      const list = dupes.map((d: any) => `${d.name} - ${d.serial} (qty ${d.quantity})`).join("; ");
      return NextResponse.json({ error: `"${name}" is already recorded: ${list}. Edit the existing item instead of adding a duplicate.`, existing: dupes }, { status: 409 });
    }
    const serial = String(b?.serial || "").trim() || ("SL-26-" + Math.random().toString(36).toUpperCase().slice(2, 7));
    const item = await withRetry(() => prisma.inventoryItem.create({ data: { serial, name, category: b?.category || null, quantity: Number(b?.quantity) || 0, location: b?.location || null, notes: b?.notes || null, purchaseValue: b?.purchaseValue != null && b?.purchaseValue !== "" ? Number(b.purchaseValue) : null, sellingPrice: b?.sellingPrice != null && b?.sellingPrice !== "" ? Number(b.sellingPrice) : null, costUnknown: !!b?.costUnknown, userId: uid }, include: { user: { select: { name: true, email: true } } } }));
    return NextResponse.json({ item }, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 }); }
}