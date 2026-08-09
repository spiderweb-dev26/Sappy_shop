import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import QRCode from "qrcode";
import { authOptions, prisma, ensureSchema, withRetry } from "@/lib/core";

export const dynamic = "force-dynamic";

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const trim = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

async function qrDataUrl(text: string): Promise<string | null> {
  try {
    const url = await QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 1, width: 300, color: { dark: "#065F46", light: "#ffffff" } });
    return typeof url === "string" ? url : null;
  } catch {
    return null;
  }
}

function labelSvg(name: string, serial: string, qr: string | null) {
  const n = esc(trim(name || "Item", 26));
  const s = esc(serial || "");
  const qrBlock = qr
    ? '<image x="75" y="84" width="150" height="150" href="' + qr + '" xlink:href="' + qr + '" preserveAspectRatio="xMidYMid meet"/>'
    : '<rect x="75" y="84" width="150" height="150" rx="10" fill="none" stroke="#065F46" stroke-opacity="0.35" stroke-dasharray="5 5"/><text x="150" y="158" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#065F46" fill-opacity="0.6">QR unavailable</text><text x="150" y="176" text-anchor="middle" font-family="monospace" font-size="10" fill="#047857">' + s + '</text>';
  return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 300 360" width="300" height="360">' +
    '<defs><clipPath id="lc"><rect width="300" height="360" rx="18"/></clipPath></defs>' +
    '<g clip-path="url(#lc)">' +
    '<rect width="300" height="360" fill="#ffffff"/>' +
    '<rect width="300" height="64" fill="#065F46"/>' +
    '<text x="150" y="30" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="15" letter-spacing="2" fill="#A7F3D0">SAPPY LEGACY</text>' +
    '<text x="150" y="48" text-anchor="middle" font-family="sans-serif" font-size="9" letter-spacing="3" fill="#D1FAE5" fill-opacity="0.85">INVENTORY LABEL</text>' +
    qrBlock +
    '<line x1="40" y1="250" x2="260" y2="250" stroke="#A7F3D0" stroke-width="2"/>' +
    '<text x="150" y="284" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="15" fill="#065F46">' + n + '</text>' +
    '<text x="150" y="308" text-anchor="middle" font-family="monospace" font-size="12" letter-spacing="1" fill="#047857">' + s + '</text>' +
    '<text x="150" y="334" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#065F46" fill-opacity="0.5">scan to add to a sale</text>' +
    '</g>' +
    '<rect width="300" height="360" rx="18" fill="none" stroke="#065F46" stroke-width="2"/>' +
    '</svg>';
}

export async function GET(req: Request) {
  try {
    const sess = await getServerSession(authOptions);
    if (!sess?.user) return new NextResponse("Unauthorized", { status: 401 });
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return new NextResponse("Missing id", { status: 400 });
    await ensureSchema();
    const item = await withRetry(() => prisma.inventoryItem.findUnique({ where: { id } }));
    if (!item) return new NextResponse("Not found", { status: 404 });
    const qr = await qrDataUrl(item.serial);
    const svg = labelSvg(item.name, item.serial, qr);
    return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (e: any) {
    return new NextResponse("Label error", { status: 500 });
  }
}