import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions, prisma, ensureSchema, withRetry, masterGate } from "@/lib/core";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema();
    const users = await withRetry(() => prisma.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, createdAt: true } }));
    return NextResponse.json({ users });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 }); }
}
export async function POST(req: Request) {
  try {
    const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const b = await req.json().catch(() => ({}));
    const gate = await masterGate(b?.masterPassword);
    if (!gate.ok) return NextResponse.json({ error: gate.error || "Master password required" }, { status: gate.status });
    await ensureSchema();
    const name = String(b?.name || "").trim(); const email = String(b?.email || "").trim().toLowerCase(); const password = String(b?.password || "");
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password needs 8+ characters." }, { status: 400 });
    const exists = await withRetry(() => prisma.user.findUnique({ where: { email } }));
    if (exists) return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    const hash = await bcrypt.hash(password, 12);
    const user = await withRetry(() => prisma.user.create({ data: { name, email, password: hash }, select: { id: true, name: true, email: true, createdAt: true } }));
    return NextResponse.json({ user }, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 }); }
}