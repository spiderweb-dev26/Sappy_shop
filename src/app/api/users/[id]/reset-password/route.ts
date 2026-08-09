import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions, prisma, ensureSchema, withRetry, masterGate } from "@/lib/core";
export const dynamic = "force-dynamic";
export async function POST(req: Request, ctx: any) {
  try {
    const params = await ctx.params;
    const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const b = await req.json().catch(() => ({}));
    const gate = await masterGate(b?.masterPassword);
    if (!gate.ok) return NextResponse.json({ error: gate.error || "Master password required" }, { status: gate.status });
    const newPassword = String(b?.newPassword || "");
    if (newPassword.length < 8) return NextResponse.json({ error: "Password needs 8+ characters." }, { status: 400 });
    await ensureSchema();
    const hash = await bcrypt.hash(newPassword, 12);
    await withRetry(() => prisma.user.update({ where: { id: params.id }, data: { password: hash } }));
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 }); }
}