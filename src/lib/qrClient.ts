"use client";

const C39: Record<string, string> = {
  "0":"nnnwwnwnn","1":"wnnwnnnnw","2":"nnwwnnnnw","3":"wnwwnnnnn","4":"nnnwwnnnw","5":"wnnwwnnnn","6":"nnwwwnnnn","7":"nnnwnnwnw","8":"wnnwnnwnn","9":"nnwwnnwnn",
  "A":"wnnnnwnnw","B":"nnwnnwnnw","C":"wnwnnwnnn","D":"nnnnwwnnw","E":"wnnnwwnnn","F":"nnwnwwnnn","G":"nnnnnwwnw","H":"wnnnnwwnn","I":"nnwnnwwnn","J":"nnnnwwwnn",
  "K":"wnnnnnnww","L":"nnwnnnnww","M":"wnwnnnnwn","N":"nnnnwnnww","O":"wnnnwnnwn","P":"nnwnwnnwn","Q":"nnnnnnwww","R":"wnnnnnwwn","S":"nnwnnnwwn","T":"nnnnwnwwn",
  "U":"wwnnnnnnw","V":"nwwnnnnnw","W":"wwwnnnnnn","X":"nwnnwnnnw","Y":"wwnnwnnnn","Z":"nwwnwnnnn",
  "-":"nwnnnnwnw",".":"wwnnnnwnn"," ":"nwwnnnwnn","*":"nwnnwnwnn",
  "$":"nwnwnnnnwn".slice(0,9),"/":"nwnwnnnwn","+":"nwnnnwnwn","%":"nnnwnwnwn"
};
function esc(s: string): string { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function trim(s: string, n: number): string { const v = String(s || ""); return v.length > n ? v.slice(0, n - 1) + "…" : v; }

function bars39(text: string, x0: number, y0: number, h: number, targetW: number): string {
  const r = 2.5; let x = 0; const rects: string[] = [];
  const s = "*" + (text || "").toUpperCase() + "*";
  for (const ch of s) {
    const p = C39[ch] || C39["-"];
    for (let i = 0; i < 9; i++) {
      const w = p[i] === "w" ? r : 1;
      if (i % 2 === 0) rects.push(`<rect x="${x}" y="0" width="${w}" height="${h}" fill="#111"/>`);
      x += w;
    }
    x += 1;
  }
  const sx = targetW / x;
  return `<g transform="translate(${x0},${y0}) scale(${sx.toFixed(4)},1)">${rects.join("")}</g>`;
}

export function barcodeDataUrl(text: string): string {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100" width="400" height="100"><rect width="400" height="100" fill="#fff"/>' + bars39(text || "", 10, 8, 66, 380) + '<text x="200" y="92" text-anchor="middle" font-family="monospace" font-size="12" fill="#111">' + esc(text || "") + '</text></svg>';
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
export async function makeQrBlock(text: string): Promise<string> { return barcodeDataUrl(text); }
export async function makeQrDataUrl(text: string): Promise<string> { return svgToPng(barcodeSvg(text)); }

export function buildLabelSvg(name: string, serial: string, _qr?: string | null): string {
  const n = esc(trim(name || "Item", 26));
  const s = esc(serial || "");
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 180" width="420" height="180">' +
    '<defs><clipPath id="lc"><rect width="420" height="180" rx="16"/></clipPath></defs>' +
    '<g clip-path="url(#lc)">' +
    '<rect width="420" height="180" fill="#ffffff"/>' +
    '<rect width="56" height="180" fill="#065F46"/>' +
    '<image x="8" y="10" width="40" height="40" href="/img/logo.png" preserveAspectRatio="xMidYMid meet"/>' + '<text x="28" y="120" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="12" letter-spacing="3" fill="#A7F3D0" transform="rotate(-90 28 120)">SAPPY LEGACY</text>' +
    '<text x="76" y="42" font-family="sans-serif" font-weight="700" font-size="17" fill="#065F46">' + n + '</text>' +
    '<text x="76" y="64" font-family="monospace" font-size="12" letter-spacing="1" fill="#047857">' + s + '</text>' +
    bars39(serial || "", 76, 82, 58, 300) +
    '<text x="226" y="160" text-anchor="middle" font-family="monospace" font-size="11" fill="#111">' + s + '</text>' +
    '<text x="404" y="160" text-anchor="end" font-family="sans-serif" font-size="9" fill="#065F46" fill-opacity="0.5">scan to add to a sale</text>' +
    '</g>' +
    '<rect x="1" y="1" width="418" height="178" rx="15" fill="none" stroke="#065F46" stroke-width="2"/>' +
    '</svg>';
}
export function barcodeSvg(text: string): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100" width="400" height="100"><rect width="400" height="100" fill="#fff"/>' + bars39(text || "", 10, 8, 66, 380) + '<text x="200" y="92" text-anchor="middle" font-family="monospace" font-size="12" fill="#111">' + esc(text || "") + '</text></svg>';
}
function svgToPng(svg: string): Promise<string> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => { const c = document.createElement("canvas"); c.width = 800; c.height = 200; const x = c.getContext("2d")!; x.fillStyle = "#fff"; x.fillRect(0, 0, 800, 200); x.drawImage(img, 0, 0, 800, 200); res(c.toDataURL("image/png")); };
    img.onerror = () => res("");
    img.src = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  });
}
let _logo: string | null = null;
export async function logoDataUrl(): Promise<string> {
  if (_logo !== null) return _logo;
  try {
    const r = await fetch("/img/logo.png");
    if (!r.ok) throw 0;
    const b = await r.blob();
    _logo = await new Promise((res) => { const f = new FileReader(); f.onload = () => res(String(f.result)); f.readAsDataURL(b); });
  } catch { _logo = ""; }
  return _logo;
}