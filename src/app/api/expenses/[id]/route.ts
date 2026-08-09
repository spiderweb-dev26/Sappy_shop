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
export async function DELETE(_req: Request, ctx: any) {
  try {
    const params = await ctx.params;
    const s = await getServerSession(authOptions); if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema(); await ensureTable(); await ensureCols();
    await withRetry(() => (prisma as any).expense.delete({ where: { id: params.id } }));
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 }); }
}