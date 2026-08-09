import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, prisma, itemSchema, uniqueSerial, ensureSchema, withRetry, logActivity } from "@/lib/core";
import { parseInventoryWorkbook } from "@/lib/excel";
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
  await ensureSchema(); const uid = (s.user as any).id; const u: any = s.user; const actor = { id: u.id, name: u.name, email: u.email }; const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData(); const file = form.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      const rows = parseInventoryWorkbook(Buffer.from(await file.arrayBuffer()));
      if (!rows.length) return NextResponse.json({ error: "No valid rows. Use columns: Name, Category, Quantity, Selling Price, Cost, Location, Notes" }, { status: 400 });
      const created: any[] = [];
      for (const r of rows) { const serial = await uniqueSerial(); created.push(await withRetry(() => prisma.inventoryItem.create({ data: { serial, name: r.name, category: r.category || null, quantity: r.quantity, location: r.location || null, notes: r.notes || null, purchaseValue: r.purchaseValue, sellingPrice: r.sellingPrice, costUnknown: r.costUnknown, userId: uid }, include: { user: { select: { name: true, email: true } } } }))); }
      logActivity({ actor, kind: "item.import", entityType: "item", label: "Imported items", detail: `${created.length} item(s) via Excel`, meta: { count: created.length } });
      return NextResponse.json({ items: created, imported: created.length }, { status: 201 });
    }
    const v = itemSchema.parse(await req.json()); const serial = await uniqueSerial();
    const item = await withRetry(() => prisma.inventoryItem.create({ data: { serial, name: v.name, category: v.category ?? null, quantity: v.quantity ?? 1, location: v.location ?? null, notes: v.notes ?? null, purchaseValue: v.costUnknown ? null : (v.purchaseValue ?? null), sellingPrice: v.sellingPrice ?? null, costUnknown: !!v.costUnknown, userId: uid }, include: { user: { select: { name: true, email: true } } } }));
    logActivity({ actor, kind: "item.create", entityType: "item", entityId: item.id, label: "Added item", detail: `${item.name} · ${item.serial}` });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 }); }
}