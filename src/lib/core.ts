import { PrismaClient } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

declare global { var __prisma: PrismaClient | undefined; }
export const prisma = global.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") global.__prisma = prisma;

const TABLE_STMTS = [
  `CREATE TABLE IF NOT EXISTS "users" ("id" TEXT NOT NULL, "email" TEXT NOT NULL, "name" TEXT, "password" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "users_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email")`,
  `CREATE TABLE IF NOT EXISTS "reports" ("id" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "status" TEXT NOT NULL DEFAULT 'draft', "data" JSONB, "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "reports_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "inventory_items" ("id" TEXT NOT NULL, "serial" TEXT NOT NULL, "name" TEXT NOT NULL, "category" TEXT, "quantity" INTEGER NOT NULL DEFAULT 1, "location" TEXT, "notes" TEXT, "purchaseValue" DOUBLE PRECISION, "sellingPrice" DOUBLE PRECISION, "costUnknown" BOOLEAN NOT NULL DEFAULT false, "dupKeptAt" TIMESTAMP(3), "dupKeptBy" TEXT, "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_serial_key" ON "inventory_items"("serial")`,
  `CREATE TABLE IF NOT EXISTS "sales" ("id" TEXT NOT NULL, "saleNo" TEXT NOT NULL, "itemId" TEXT, "itemName" TEXT NOT NULL, "serial" TEXT NOT NULL, "quantity" INTEGER NOT NULL DEFAULT 1, "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0, "discount" DOUBLE PRECISION NOT NULL DEFAULT 0, "total" DOUBLE PRECISION NOT NULL DEFAULT 0, "paymentMethod" TEXT, "refunded" BOOLEAN NOT NULL DEFAULT false, "refundedAt" TIMESTAMP(3), "backdated" BOOLEAN NOT NULL DEFAULT false, "note" TEXT, "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "sales_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "purchase_orders" ("id" TEXT NOT NULL, "poNo" TEXT NOT NULL, "supplier" TEXT NOT NULL, "lines" JSONB NOT NULL, "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'draft', "note" TEXT, "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id"))`
];

const COLUMN_STMTS = [
  `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "purchaseValue" DOUBLE PRECISION`,
  `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "sellingPrice" DOUBLE PRECISION`,
  `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "costUnknown" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "dupKeptAt" TIMESTAMP(3)`,
  `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "dupKeptBy" TEXT`,
  `ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT`,
  `ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "refunded" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3)`,
  `ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "backdated" BOOLEAN NOT NULL DEFAULT false`
];

const OPTIONAL_STMTS = [
  `CREATE TABLE IF NOT EXISTS "app_settings" ("id" TEXT NOT NULL DEFAULT 'singleton', "masterHash" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "activities" ("id" TEXT NOT NULL, "kind" TEXT NOT NULL, "entityType" TEXT, "entityId" TEXT, "label" TEXT NOT NULL, "detail" TEXT, "meta" JSONB, "actorId" TEXT, "actorName" TEXT, "actorEmail" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "activities_pkey" PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "activities_actorId_idx" ON "activities"("actorId")`,
  `CREATE INDEX IF NOT EXISTS "activities_createdAt_idx" ON "activities"("createdAt")`,
  `CREATE INDEX IF NOT EXISTS "activities_kind_idx" ON "activities"("kind")`,
  `CREATE TABLE IF NOT EXISTS "expenses" ("id" TEXT NOT NULL, "category" TEXT NOT NULL, "description" TEXT, "amount" DOUBLE PRECISION NOT NULL DEFAULT 0, "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "backdated" BOOLEAN NOT NULL DEFAULT false, "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "expenses_pkey" PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "expenses_userId_idx" ON "expenses"("userId")`,
  `CREATE TABLE IF NOT EXISTS "credits" ("id" TEXT NOT NULL, "customer" TEXT NOT NULL, "detail" TEXT, "amount" DOUBLE PRECISION NOT NULL DEFAULT 0, "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "paid" BOOLEAN NOT NULL DEFAULT false, "paidAt" TIMESTAMP(3), "backdated" BOOLEAN NOT NULL DEFAULT false, "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "credits_pkey" PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "credits_userId_idx" ON "credits"("userId")`,
  `CREATE TABLE IF NOT EXISTS "device_sessions" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "sid" TEXT NOT NULL, "device" TEXT, "revoked" BOOLEAN NOT NULL DEFAULT false, "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "device_sessions_sid_key" ON "device_sessions"("sid")`,
  `CREATE INDEX IF NOT EXISTS "device_sessions_userId_idx" ON "device_sessions"("userId")`
];

const CORE_TABLES = ["users", "reports", "inventory_items", "sales", "purchase_orders"];

async function allPresent(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT tablename FROM pg_tables WHERE schemaname='public'`);
    const have = new Set(rows.map((r) => r.tablename));
    return CORE_TABLES.every((t) => have.has(t));
  } catch { return false; }
}

let ready: Promise<void> | null = null;
export function ensureSchema(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    if (!(await allPresent())) { for (const s of TABLE_STMTS) { try { await prisma.$executeRawUnsafe(s); } catch {} } }
    for (const s of COLUMN_STMTS) { try { await prisma.$executeRawUnsafe(s); } catch {} }
    for (const s of OPTIONAL_STMTS) { try { await prisma.$executeRawUnsafe(s); } catch {} }
  })();
  return ready;
}

export async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: any;
  for (let i = 0; i < tries; i++) { try { return await fn(); } catch (e) { last = e; await new Promise((r) => setTimeout(r, 150 * (i + 1))); } }
  throw last;
}

export async function checkMaster(provided?: string): Promise<boolean> {
  await ensureSchema();
  const s = await withRetry(() => (prisma as any).appSettings.findUnique({ where: { id: "singleton" } })).catch(() => null);
  if (!s?.masterHash || !provided) return false;
  return bcrypt.compare(String(provided), s.masterHash);
}

export async function masterGate(provided?: string): Promise<{ ok: boolean; error?: string; status?: number }> {
  await ensureSchema();
  const s = await withRetry(() => (prisma as any).appSettings.findUnique({ where: { id: "singleton" } })).catch(() => null);
  if (!s?.masterHash) return { ok: false, error: "Set a master password first.", status: 403 };
  if (!provided) return { ok: false, error: "Master password required.", status: 401 };
  const ok = await bcrypt.compare(String(provided), s.masterHash);
  if (!ok) return { ok: false, error: "Wrong master password.", status: 401 };
  return { ok: true };
}

export async function activity(kind: string, entityType: string | null, entityId: string | null, label: string, detail?: string | null, actor?: { id?: string; name?: string | null; email?: string | null } | null) {
  try {
    await ensureSchema();
    await withRetry(() => (prisma as any).activity.create({ data: { kind, entityType, entityId, label, detail: detail ?? null, actorId: actor?.id ?? null, actorName: actor?.name ?? null, actorEmail: actor?.email ?? null } }));
  } catch {}
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || "sappy-legacy-secret",
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(credentials) {
        await ensureSchema();
        const email = String(credentials?.email || "").trim().toLowerCase();
        const password = String(credentials?.password || "");
        if (!email || !password) return null;
        const user = await withRetry(() => prisma.user.findUnique({ where: { email } })).catch(() => null);
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = (user as any).id;
        try {
          await ensureSchema();
          const sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
          (token as any).sid = sid;
          await withRetry(() => (prisma as any).deviceSession.create({ data: { userId: (user as any).id, sid, device: "New device", lastSeenAt: new Date() } }));
        } catch {}
      }
      try {
        const sid = (token as any).sid;
        if (sid) {
          const rec = await withRetry(() => (prisma as any).deviceSession.findUnique({ where: { sid } })).catch(() => null);
          if (rec && rec.revoked) (token as any).invalid = true;
        }
      } catch {}
      return token;
    },
    async session({ session, token }) {
      if ((token as any).invalid) return { ...session, user: undefined } as any;
      if (session.user) (session.user as any).id = (token as any).id as string;
      (session as any).sid = (token as any).sid;
      return session;
    },
  },
  pages: { signIn: "/login" },
};