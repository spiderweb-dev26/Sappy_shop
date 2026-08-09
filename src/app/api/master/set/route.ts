import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions, prisma, ensureSchema, withRetry } from "@/lib/core";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  try {
    const s = await getServerSession(authOptions);
    if (!s?.user) return NextResponse.json({ error: "Sign in to manage the master password" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const next = typeof body?.password === "string" ? body.password : "";
    const current = typeof body?.current === "string" ? body.current : undefined;
    if (next.length < 6) return NextResponse.json({ error: "Master password must be at least 6 characters" }, { status: 400 });
    await ensureSchema();
    const row = await withRetry(() => (prisma as any).appSettings.findUnique({ where: { id: "singleton" } }));
    const hash = await bcrypt.hash(next, 12);
    if (!row || !row.masterHash) {
      await withRetry(() => (prisma as any).appSettings.upsert({ where: { id: "singleton" }, create: { id: "singleton", masterHash: hash }, update: { masterHash: hash } }));
      return NextResponse.json({ ok: true, created: true });
    }
    if (!current) return NextResponse.json({ error: "Enter the current master password to change it" }, { status: 401 });
    const ok = await bcrypt.compare(current, row.masterHash);
    if (!ok) return NextResponse.json({ error: "Current master password is incorrect" }, { status: 401 });
    await withRetry(() => (prisma as any).appSettings.update({ where: { id: "singleton" }, data: { masterHash: hash } }));
    return NextResponse.json({ ok: true, changed: true });
  } catch (e: any) {
    return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 });
  }
}