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
export async function GET(req: Request) {
  try {
    const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema(); await ensureTable();
    const uid = (s.user as any).id; const sid = (s as any).sid || null;
    if (sid) {
      const rec = await withRetry(() => (prisma as any).deviceSession.findUnique({ where: { sid } })).catch(() => null);
      if (!rec) { try { await withRetry(() => (prisma as any).deviceSession.create({ data: { userId: uid, sid, device: parseUA(req.headers.get("user-agent") || ""), lastSeenAt: new Date() } })); } catch {} }
    }
    const sessions = await withRetry(() => (prisma as any).deviceSession.findMany({ where: { userId: uid, revoked: false }, orderBy: { lastSeenAt: "desc" } }));
    return NextResponse.json({ sessions, currentSid: sid });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 }); }
}