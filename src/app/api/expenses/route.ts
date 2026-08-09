import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, prisma, ensureSchema, withRetry } from "@/lib/core";
export const dynamic = "force-dynamic";
const T = [
  `CREATE TABLE IF NOT EXISTS "expenses" ("id" TEXT NOT NULL, "category" TEXT NOT NULL, "description" TEXT, "amount" DOUBLE PRECISION NOT NULL DEFAULT 0, "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "paid" BOOLEAN NOT NULL DEFAULT false, "paidAt" TIMESTAMP(3), "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "expenses_pkey" PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "expenses_userId_idx" ON "expenses"("userId")`
];
async function ensureTable() { for (const s of T) { try { await prisma.$executeRawUnsafe(s); } catch {} } }
async function ensureCols() { try { await prisma.$executeRawUnsafe(`ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "backdated" BOOLEAN NOT NULL DEFAULT false`); } catch {} }
export async function GET() {
  try {
    const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema(); await ensureTable(); await ensureCols();
    const uid = (s.user as any).id;
    const expenses = await withRetry(() => (prisma as any).expense.findMany({ where: { userId: uid }, orderBy: { date: "desc" } }));
    return NextResponse.json({ expenses });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 }); }
}
export async function POST(req: Request) {
  const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema(); await ensureTable(); await ensureCols(); const uid = (s.user as any).id;
  try {
    const b = await req.json().catch(() => ({}));
    const category = String(b?.category || "").trim();
    if (!category) return NextResponse.json({ error: "Category is required." }, { status: 400 });
    const amount = Number(b?.amount);
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Enter an amount greater than 0." }, { status: 400 });
    const date = b?.date ? new Date(b.date + "T00:00:00") : new Date();
    const expense = await withRetry(() => (prisma as any).expense.create({ data: { category, description: String(b?.detail || b?.description || "").trim() || null, amount, date: Number.isNaN(date.getTime()) ? new Date() : date, backdated: !!b.backdated, userId: uid } }));
    return NextResponse.json({ expense }, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 }); }
}