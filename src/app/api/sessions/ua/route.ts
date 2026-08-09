import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, prisma, ensureSchema, withRetry } from "@/lib/core";
export const dynamic = "force-dynamic";
const T = [
  `CREATE TABLE IF NOT EXISTS "device_sessions" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "sid" TEXT NOT NULL, "device" TEXT, "revoked" BOOLEAN NOT NULL DEFAULT false, "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "device_sessions_sid_key" ON "device_sessions"("sid")`,
  `CREATE INDEX IF NOT EXISTS "device_sessions_userId_idx" ON "device_sessions"("userId")`
];
async function ensureTable() { for (const s of T) { try { await prisma.$executeRawUnsafe(s); } catch {} } }
function parseUA(ua: string) {
  const b = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Browser";
  const o = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Unknown";
  return `${b} on ${o}`;
}
export async function POST(req: Request) {
  try {
    const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ ok: true });
    const sid = (s as any).sid; if (!sid) return NextResponse.json({ ok: true });
    await ensureSchema(); await ensureTable();
    const uid = (s.user as any).id; const ua = req.headers.get("user-agent") || "";
    const rec = await withRetry(() => (prisma as any).deviceSession.findUnique({ where: { sid } })).catch(() => null);
    if (rec) await withRetry(() => (prisma as any).deviceSession.update({ where: { sid }, data: { device: parseUA(ua), lastSeenAt: new Date() } }));
    else { try { await withRetry(() => (prisma as any).deviceSession.create({ data: { userId: uid, sid, device: parseUA(ua), lastSeenAt: new Date() } })); } catch {} }
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ ok: true }); }
}