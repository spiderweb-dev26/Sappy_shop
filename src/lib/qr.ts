import QRCode from "qrcode";

export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 1, width: 320, color: { dark: "#065F46", light: "#FFFFFF" } });
}

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function labelSvg(opts: { name: string; serial: string; qr: string }): string {
  const name = esc(opts.name);
  const serial = esc(opts.serial);
  const qr = opts.qr.replace(/&/g, "&amp;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="500" viewBox="0 0 380 500">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#065F46"/><stop offset="1" stop-color="#047857"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="380" height="500" rx="26" fill="#FFF8E7"/>
  <rect x="14" y="14" width="352" height="472" rx="18" fill="none" stroke="#A7F3D0" stroke-width="2"/>
  <path d="M14 32 a18 18 0 0 1 18 -18 h316 a18 18 0 0 1 18 18 v40 h-352 z" fill="url(#g)"/>
  <text x="190" y="52" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="3" fill="#A7F3D0">SAPPY LEGACY</text>
  <rect x="120" y="66" width="140" height="18" rx="9" fill="#A7F3D0" opacity="0.9"/>
  <text x="190" y="79" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="10" font-weight="700" letter-spacing="2" fill="#065F46">INVENTORY TAG</text>
  <rect x="60" y="100" width="260" height="260" rx="16" fill="#FFFFFF" stroke="#A7F3D0" stroke-width="2"/>
  <image x="74" y="114" width="232" height="232" href="${qr}"/>
  <text x="190" y="402" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="800" fill="#065F46">${name}</text>
  <text x="190" y="432" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="15" font-weight="600" letter-spacing="1.5" fill="#047857">${serial}</text>
  <line x1="120" y1="452" x2="260" y2="452" stroke="#A7F3D0" stroke-width="2"/>
  <text x="190" y="472" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="9" letter-spacing="1" fill="#065F46" opacity="0.55">SCAN TO VERIFY &#8226; SAPPY LEGACY</text>
</svg>`;
}