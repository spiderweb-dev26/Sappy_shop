"use client";
import QRCode from "qrcode";

export async function makeQrBlock(text: string): Promise<string | null> {
  // 1) pure SVG, no canvas
  try {
    const svg = await QRCode.toString(text, { type: "svg", margin: 1 });
    const m = /<svg[^>]*viewBox="0 0 (\d+) (\d+)"[^>]*>([\s\S]*)<\/svg>/.exec(svg);
    if (m) {
      const size = parseInt(m[1], 10) || 0;
      if (size > 0) {
        const inner = m[3].replace(/#000000/g, "#065F46").replace(/#000/g, "#065F46");
        const s = (150 / size).toFixed(4);
        return '<rect x="75" y="84" width="150" height="150" fill="#ffffff"/><g transform="translate(75,84) scale(' + s + ')">' + inner + "</g>";
      }
    }
  } catch {}
  // 2) PNG data URL
  try {
    const url = await QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 1, width: 300, color: { dark: "#065F46", light: "#ffffff" } });
    if (typeof url === "string") return '<image x="75" y="84" width="150" height="150" href="' + url + '" xlink:href="' + url + '" preserveAspectRatio="xMidYMid meet"/>';
  } catch {}
  // 3) last resort: remote QR image (renders because the SVG is inlined in the DOM)
  return '<image x="75" y="84" width="150" height="150" href="https://api.qrserver.com/create-qr-code/?size=300x300&margin=0&color=065F46&bgcolor=ffffff&data=' + encodeURIComponent(text) + '" preserveAspectRatio="xMidYMid meet"/>';
}

export async function makeQrDataUrl(text: string): Promise<string | null> {
  try {
    const url = await QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 1, width: 300, color: { dark: "#065F46", light: "#ffffff" } });
    return typeof url === "string" ? url : null;
  } catch { return null; }
}

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const trim = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export function buildLabelSvg(name: string, serial: string, qrBlock: string | null): string {
  const n = esc(trim(name || "Item", 26));
  const s = esc(serial || "");
  const qr = qrBlock ||
    '<rect x="75" y="84" width="150" height="150" rx="10" fill="none" stroke="#065F46" stroke-opacity="0.35" stroke-dasharray="5 5"/>' +
    '<text x="150" y="158" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#065F46" fill-opacity="0.6">QR unavailable</text>' +
    '<text x="150" y="176" text-anchor="middle" font-family="monospace" font-size="10" fill="#047857">' + s + "</text>";
  return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 300 360" width="300" height="360">' +
    '<defs><clipPath id="lc"><rect width="300" height="360" rx="18"/></clipPath></defs>' +
    '<g clip-path="url(#lc)">' +
    '<rect width="300" height="360" fill="#ffffff"/>' +
    '<rect width="300" height="64" fill="#065F46"/>' +
    '<text x="150" y="30" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="15" letter-spacing="2" fill="#A7F3D0">SAPPY LEGACY</text>' +
    '<text x="150" y="48" text-anchor="middle" font-family="sans-serif" font-size="9" letter-spacing="3" fill="#D1FAE5" fill-opacity="0.85">INVENTORY LABEL</text>' +
    qr +
    '<line x1="40" y1="250" x2="260" y2="250" stroke="#A7F3D0" stroke-width="2"/>' +
    '<text x="150" y="284" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="15" fill="#065F46">' + n + "</text>" +
    '<text x="150" y="308" text-anchor="middle" font-family="monospace" font-size="12" letter-spacing="1" fill="#047857">' + s + "</text>" +
    '<text x="150" y="334" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#065F46" fill-opacity="0.5">scan to add to a sale</text>' +
    "</g>" +
    '<rect width="300" height="360" rx="18" fill="none" stroke="#065F46" stroke-width="2"/>' +
    "</svg>";
}