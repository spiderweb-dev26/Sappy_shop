import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma, registerSchema, ensureSchema, masterGate, withRetry, logActivity } from "@/lib/core";
export async function POST(req: Request) {
  try {
    const v = registerSchema.parse(await req.json());
    const gate = await masterGate(v.masterPassword);
    if (!gate.ok) return NextResponse.json({ error: gate.error || "Invalid access code" }, { status: gate.status });
    await ensureSchema();
    const exists = await withRetry(() => prisma.user.findUnique({ where: { email: v.email } }));
    if (exists) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    const password = await bcrypt.hash(v.password, 12);
    const user = await withRetry(() => prisma.user.create({ data: { email: v.email, name: v.name, password }, select: { id: true, email: true, name: true } }));
    logActivity({ actor: { id: user.id, name: user.name, email: user.email }, kind: "account.create", entityType: "user", entityId: user.id, label: "New account", detail: user.email });
    return NextResponse.json({ user }, { status: 201 });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: "Check the fields (password needs 8+ chars)." }, { status: 400 });
    return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 });
  }
}