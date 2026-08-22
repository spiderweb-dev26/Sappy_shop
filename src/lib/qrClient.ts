"use client";
import QRCode from "qrcode";

const C39: Record<string, string> = {
  "0":"nnnwwnwnn","1":"wnnwnnnnw","2":"nnwwnnnnw","3":"wnwwnnnnn","4":"nnnwwnnnw","5":"wnnwwnnnn","6":"nnwwwnnnn","7":"nnnwnnwnw","8":"wnnwnnwnn","9":"nnwwnnwnn",
  "A":"wnnnnwnnw","B":"nnwnnwnnw","C":"wnwnnwnnn","D":"nnnnwwnnw","E":"wnnnwwnnn","F":"nnwnwwnnn","G":"nnnnnwwnw","H":"wnnnnwwnn","I":"nnwnnwwnn","J":"nnnnwwwnn",
  "K":"wnnnnnnww","L":"nnwnnnnww","M":"wnwnnnnwn","N":"nnnnwnnww","O":"wnnnwnnwn","P":"nnwnwnnwn","Q":"nnnnnnwww","R":"wnnnnnwwn","S":"nnwnnnwwn","T":"nnnnwnwwn",
  "U":"wwnnnnnnw","V":"nwwnnnnnw","W":"wwwnnnnnn","X":"nwnnwnnnw","Y":"wwnnwnnnn","Z":"nwwnwnnnn",
  "-":"nwnnnnwnw",".":"wwnnnnwnn"," ":"nwwnnnwnn","*":"nwnnwnwnn",
  "$":"nwnwnwnnn","/":"nwnwnnnwn","+":"nwnnnwnwn","%":"nnnwnwnwn"
};
function code39Svg(text: string): string {
  const s = ("*" + (text || "").toUpperCase() + "*");
  let x = 8; const narrow = 2, wide = 5, h = 70; const bars: string[] = [];
  for (const ch of s) {
    const p = C39[ch] || C39["-"];
    for (let i = 0; i < 9; i++) {
      const w = p[i] === "w" ? wide : narrow;
      if (i % 2 === 0) bars.push(`<rect x="${x}" y="8" width="${w}" height="${h}" fill="#000"/>`);
      x += w + 1;
    }
    x += 2;
  }
  const W = x + 8;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h + 30}" width="${W}" height="${h + 30}"><rect width="${W}" height="${h + 30}" fill="#fff"/>${bars.join("")}<text x="${W / 2}" y="${h + 24}" font-family="monospace" font-size="12" text-anchor="middle" fill="#000">${text}</text></svg>`;
}
export async function makeQrBlock(text: string): Promise<string> {
  try { return "data:image/svg+xml;utf8," + encodeURIComponent(code39Svg(text)); } catch { return ""; }
}
export function buildLabelSvg(name: string, serial: string, qrBlock: string | null): string {
  const n = esc(trim(name || "Item", 26));
  const s = esc(serial || "");
  const qr = qrBlock
    ? '<image x="50" y="80" width="200" height="80" href="' + qrBlock + '"/>'
    : '<rect x="75" y="84" width="150" height="150" rx="10" fill="none" stroke="#065F46" stroke-opacity="0.35" stroke-dasharray="5 5"/>' +
      '<text x="150" y="158" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#065F46" fill-opacity="0.6">Barcode unavailable</text>' +
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
export async function makeQrDataUrl(text: string): Promise<string> {
  return makeQrBlock(text);
}
export function barcodeDataUrl(text: string): string { try { return "data:image/svg+xml;utf8," + encodeURIComponent(code39Svg(text)); } catch { return ""; } }
