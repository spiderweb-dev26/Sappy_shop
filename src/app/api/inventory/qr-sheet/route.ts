import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import QRCode from "qrcode";
import { authOptions, prisma, ensureSchema, withRetry } from "@/lib/core";
export const dynamic = "force-dynamic";

async function qrDataUrl(text: string): Promise<string | null> {
  try {
    const url = await QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 1, width: 220, color: { dark: "#065F46", light: "#ffffff" } });
    return typeof url === "string" ? url : null;
  } catch { return null; }
}

export async function POST(req: Request) {
  try {
    const s = await getServerSession(authOptions);
    if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x: any) => typeof x === "string").slice(0, 200) : [];
    if (!ids.length) return NextResponse.json({ error: "No items selected" }, { status: 400 });
    await ensureSchema();
    const rows = await withRetry(() => prisma.inventoryItem.findMany({ where: { id: { in: ids } } }));
    const map = new Map(rows.map((r: any) => [r.id, r]));
    const labels: any[] = [];
    for (const id of ids) {
      const it: any = map.get(id); if (!it) continue;
      const qr = await qrDataUrl(it.serial);
      labels.push({ id: it.id, name: it.name, serial: it.serial, qr });
    }
    return NextResponse.json({ labels });
  } catch (e: any) {
    return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 });
  }
}