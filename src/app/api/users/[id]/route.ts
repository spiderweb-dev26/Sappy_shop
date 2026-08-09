import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, prisma, ensureSchema, withRetry, masterGate } from "@/lib/core";
export const dynamic = "force-dynamic";
export async function PATCH(req: Request, ctx: any) {
  try {
    const params = await ctx.params;
    const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const b = await req.json().catch(() => ({}));
    const gate = await masterGate(b?.masterPassword);
    if (!gate.ok) return NextResponse.json({ error: gate.error || "Master password required" }, { status: gate.status });
    await ensureSchema();
    const name = String(b?.name || "").trim(); const email = String(b?.email || "").trim().toLowerCase();
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Provide a valid name and email." }, { status: 400 });
    const dup = await withRetry(() => prisma.user.findFirst({ where: { email, NOT: { id: params.id } } }));
    if (dup) return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    const user = await withRetry(() => prisma.user.update({ where: { id: params.id }, data: { name, email }, select: { id: true, name: true, email: true, createdAt: true } }));
    return NextResponse.json({ user });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 }); }
}
export async function DELETE(req: Request, ctx: any) {
  try {
    const params = await ctx.params;
    const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const b = await req.json().catch(() => ({}));
    const gate = await masterGate(b?.masterPassword);
    if (!gate.ok) return NextResponse.json({ error: gate.error || "Master password required" }, { status: gate.status });
    await ensureSchema();
    const me = (s.user as any).id;
    if (params.id === me) return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
    const count = await withRetry(() => prisma.user.count());
    if (count <= 1) return NextResponse.json({ error: "Can't delete the last account." }, { status: 400 });
    await withRetry(() => prisma.user.delete({ where: { id: params.id } }));
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 }); }
}