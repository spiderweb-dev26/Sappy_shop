import { PrismaClient } from "@prisma/client";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

neonConfig.fetchConnectionCache = true;
const g = globalThis as unknown as { prisma: PrismaClient | undefined; ready: Promise<void> | undefined };
function makePrisma(): PrismaClient {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
  return new PrismaClient({ adapter: new PrismaNeon(new Pool({ connectionString: url })) } as any);
}
export const prisma = g.prisma ?? makePrisma();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;

// Only the tables the app cannot run without gate the boot check.
// Telemetry (activities) and settings are OPTIONAL and never block login.
const CORE_TABLES = ["users", "reports", "inventory_items", "sales", "purchase_orders"];
const TRANSIENT = /not available|authentication|connectionerror|connectorerror|connect|timeout|terminated|reset|econn|\beof\b|57p03|53300|server closed|refused|socket|reach|p1001|p1000|canceling|connection/i;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  const delays = [400, 900, 1600, 2400]; let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (e: any) {
      last = e;
      const msg = (String(e?.message ?? "") + " " + String(e?.cause?.message ?? "")).toLowerCase();
      const stop = /unique constraint|already exists|does not exist|syntax|permission denied|invalid input|zod|required|purchase value|selling price/i.test(msg);
      const go = TRANSIENT.test(msg);
      if (stop) throw e; if (i === attempts - 1) throw e; if (!go && i > 0) throw e;
      await sleep(delays[i] ?? 2400);
    }
  }
  throw last;
}

const STATUS_SQL = `SELECT ` +
  `(SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='users')::text AS users, ` +
  `(SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='reports')::text AS reports, ` +
  `(SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='inventory_items')::text AS inventory_items, ` +
  `(SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='sales')::text AS sales, ` +
  `(SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='purchase_orders')::text AS purchase_orders`;

export async function tableStatus(): Promise<Record<string, boolean>> {
  const rows = (await prisma.$queryRawUnsafe(STATUS_SQL)) as any[];
  const r = rows?.[0] || {};
  const out: Record<string, boolean> = {};
  for (const t of CORE_TABLES) out[t] = String(r[t] ?? "0") !== "0";
  return out;
}
async function allPresent(): Promise<boolean> { const s = await tableStatus(); return CORE_TABLES.every((t) => s[t]); }

// Required: the five core tables + indexes + foreign keys.
const TABLE_STMTS = [
  `CREATE TABLE IF NOT EXISTS "users" ("id" TEXT NOT NULL, "email" TEXT NOT NULL, "name" TEXT, "password" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "users_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email")`,
  `CREATE TABLE IF NOT EXISTS "reports" ("id" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "status" TEXT NOT NULL DEFAULT 'draft', "data" JSONB, "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "reports_pkey" PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "reports_userId_idx" ON "reports"("userId")`,
  `CREATE INDEX IF NOT EXISTS "reports_status_idx" ON "reports"("status")`,
  `DO $$ BEGIN ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `CREATE TABLE IF NOT EXISTS "inventory_items" ("id" TEXT NOT NULL, "serial" TEXT NOT NULL, "name" TEXT NOT NULL, "category" TEXT, "quantity" INTEGER NOT NULL DEFAULT 1, "location" TEXT, "notes" TEXT, "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_serial_key" ON "inventory_items"("serial")`,
  `CREATE INDEX IF NOT EXISTS "inventory_items_userId_idx" ON "inventory_items"("userId")`,
  `DO $$ BEGIN ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `CREATE TABLE IF NOT EXISTS "sales" ("id" TEXT NOT NULL, "saleNo" TEXT NOT NULL, "itemId" TEXT, "itemName" TEXT NOT NULL, "serial" TEXT NOT NULL, "quantity" INTEGER NOT NULL DEFAULT 1, "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0, "discount" DOUBLE PRECISION NOT NULL DEFAULT 0, "total" DOUBLE PRECISION NOT NULL DEFAULT 0, "paymentMethod" TEXT, "note" TEXT, "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "sales_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "sales_saleNo_key" ON "sales"("saleNo")`,
  `CREATE INDEX IF NOT EXISTS "sales_userId_idx" ON "sales"("userId")`,
  `CREATE INDEX IF NOT EXISTS "sales_createdAt_idx" ON "sales"("createdAt")`,
  `DO $$ BEGIN ALTER TABLE "sales" ADD CONSTRAINT "sales_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `DO $$ BEGIN ALTER TABLE "sales" ADD CONSTRAINT "sales_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `CREATE TABLE IF NOT EXISTS "purchase_orders" ("id" TEXT NOT NULL, "poNo" TEXT NOT NULL, "supplier" TEXT NOT NULL, "lines" JSONB NOT NULL, "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'draft', "note" TEXT, "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "purchase_orders_poNo_key" ON "purchase_orders"("poNo")`,
  `CREATE INDEX IF NOT EXISTS "purchase_orders_userId_idx" ON "purchase_orders"("userId")`,
  `DO $$ BEGIN ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
];

// Idempotent column evolution - safe on old and new databases alike.
const COLUMN_STMTS = [
  `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "purchaseValue" DOUBLE PRECISION`,
  `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "sellingPrice" DOUBLE PRECISION`,
  `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "costUnknown" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "refunded" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3)`,
  `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "dupKeptAt" TIMESTAMP(3)`,
  `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "dupKeptBy" TEXT`
];

// Optional telemetry + settings - built best-effort, NEVER on the login path.
const OPTIONAL_STMTS = [
  `CREATE TABLE IF NOT EXISTS "app_settings" ("id" TEXT NOT NULL DEFAULT 'singleton', "masterHash" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "activities" ("id" TEXT NOT NULL, "kind" TEXT NOT NULL, "entityType" TEXT, "entityId" TEXT, "label" TEXT NOT NULL, "detail" TEXT, "meta" JSONB, "actorId" TEXT, "actorName" TEXT, "actorEmail" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "activities_pkey" PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "activities_actorId_idx" ON "activities"("actorId")`,
  `CREATE INDEX IF NOT EXISTS "activities_createdAt_idx" ON "activities"("createdAt")`,
  `CREATE INDEX IF NOT EXISTS "activities_kind_idx" ON "activities"("kind")`
];

async function stmtRetry(sql: string, attempts = 5) {
  const delays = [300, 600, 1100, 1800, 2600];
  for (let i = 0; i < attempts; i++) {
    try { await prisma.$executeRawUnsafe(sql); return; }
    catch (e: any) { const m = String(e?.message ?? "") + " " + String(e?.cause?.message ?? ""); if (i === attempts - 1) throw e; if (!TRANSIENT.test(m)) throw e; await sleep(delays[i] ?? 2600); }
  }
}

export function ensureSchema(): Promise<void> {
  if (g.ready) return g.ready;
  const p = (async () => {
    let present = false;
    for (let i = 0; i < 4 && !present; i++) { try { present = await allPresent(); } catch {} if (!present) await sleep(500 * (i + 1)); }
    if (!present) {
      for (let pass = 0; pass < 3; pass++) {
        let ok = true; for (const s of TABLE_STMTS) { try { await stmtRetry(s); } catch { ok = false; } }
        if (ok) break; await sleep(700 * (pass + 1));
      }
    }
    for (const s of COLUMN_STMTS) { try { await stmtRetry(s); } catch {} }
    for (const s of OPTIONAL_STMTS) { try { await stmtRetry(s); } catch {} }
    if (!(await allPresent())) throw new Error("schema incomplete");
  })();
  g.ready = p;
  p.catch(() => { if (g.ready === p) g.ready = undefined; });
  return p;
}

// Telemetry: record an action. Wrapped so it can NEVER break the action it logs.
export async function logActivity(a: { actor?: { id?: string; name?: string | null; email?: string } | null; kind: string; entityType?: string; entityId?: string; label: string; detail?: string; meta?: any }) {
  try {
    await ensureSchema();
    const actor = a.actor || {};
    await withRetry(() => (prisma as any).activity.create({ data: { kind: a.kind, entityType: a.entityType ?? null, entityId: a.entityId ?? null, label: a.label, detail: a.detail ?? null, meta: a.meta ?? undefined, actorId: (actor as any).id ?? null, actorName: (actor as any).name ?? null, actorEmail: (actor as any).email ?? null } }));
  } catch (e) {
    // an audit log that takes down a sale would be worse than useless
  }
}

export async function masterGate(provided: string | undefined | null): Promise<{ ok: boolean; status: number; error?: string }> {
  await ensureSchema();
  const row = await withRetry(() => (prisma as any).appSettings.findUnique({ where: { id: "singleton" } }));
  if (!row || !row.masterHash) return { ok: true, status: 200 };
  if (!provided) return { ok: false, status: 401, error: "Master password required" };
  const match = await bcrypt.compare(provided, row.masterHash);
  return match ? { ok: true, status: 200 } : { ok: false, status: 401, error: "Incorrect master password" };
}

export async function masterIsSet(): Promise<boolean> {
  const row = await withRetry(() => (prisma as any).appSettings.findUnique({ where: { id: "singleton" } }));
  return !!(row && row.masterHash);
}

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const rnd = (n: number) => { let s = ""; for (let i = 0; i < n; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; return s; };
export function makeSerial() { return `SL-${String(new Date().getFullYear()).slice(-2)}-${rnd(6)}`; }
export async function uniqueSerial() { for (let i = 0; i < 25; i++) { const s = makeSerial(); if (!(await prisma.inventoryItem.findUnique({ where: { serial: s }, select: { id: true } }))) return s; } return makeSerial() + "-" + rnd(3); }
export async function uniqueSaleNo() { const yy = String(new Date().getFullYear()).slice(-2); for (let i = 0; i < 25; i++) { const n = `INV-${yy}-${rnd(4)}`; if (!(await prisma.sale.findUnique({ where: { saleNo: n }, select: { id: true } }))) return n; } return `INV-${yy}-${rnd(6)}`; }
export async function uniquePoNo() { const yy = String(new Date().getFullYear()).slice(-2); for (let i = 0; i < 25; i++) { const n = `PO-${yy}-${rnd(4)}`; if (!(await prisma.purchaseOrder.findUnique({ where: { poNo: n }, select: { id: true } }))) return n; } return `PO-${yy}-${rnd(6)}`; }

const itemBase = z.object({ name: z.string().min(1).max(200), category: z.string().max(100).optional().nullable(), quantity: z.coerce.number().int().min(0).default(1), location: z.string().max(200).optional().nullable(), notes: z.string().max(1000).optional().nullable(), purchaseValue: z.coerce.number().min(0).optional().nullable(), sellingPrice: z.coerce.number().min(0).optional().nullable(), costUnknown: z.boolean().optional() });
export const itemSchema = itemBase.refine((d) => d.costUnknown || typeof d.purchaseValue === "number", { message: "Purchase value is required unless marked unknown", path: ["purchaseValue"] });
export const itemUpdateSchema = itemBase.partial();
export const saleSchema = z.object({ serial: z.string().optional(), name: z.string().optional(), itemId: z.string().optional(), itemName: z.string().optional(), quantity: z.coerce.number().int().min(1).default(1), unitPrice: z.coerce.number().min(0), discount: z.coerce.number().min(0).default(0), paymentMethod: z.string().max(40).optional().nullable(), note: z.string().max(500).optional().nullable() });
export const poLineSchema = z.object({ description: z.string().min(1).max(200), quantity: z.coerce.number().min(0).default(0), unitCost: z.coerce.number().min(0).default(0) });
export const poSchema = z.object({ supplier: z.string().min(1).max(200), status: z.enum(["draft", "ordered", "received"]).default("draft"), note: z.string().max(1000).optional().nullable(), lines: z.array(poLineSchema).min(1) });
export const registerSchema = z.object({ name: z.string().min(2).max(100), email: z.string().email(), password: z.string().min(8).max(100), masterPassword: z.string().optional() });
export const reportSchema = z.object({ title: z.string().min(1).max(200), description: z.string().max(2000).optional().nullable(), status: z.enum(["draft", "published", "archived"]), data: z.record(z.unknown()).optional().nullable() });
export const reportUpdateSchema = reportSchema.partial();

export const authOptions: NextAuthOptions = {
  providers: [CredentialsProvider({
    name: "credentials",
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) throw new Error("Email and password are required");
      await ensureSchema();
      const user = await withRetry(() => prisma.user.findUnique({ where: { email: credentials.email } }));
      if (!user) throw new Error("Invalid email or password");
      if (!(await bcrypt.compare(credentials.password, user.password))) throw new Error("Invalid email or password");
      return { id: user.id, email: user.email, name: user.name };
    },
  })],
  session: { strategy: "jwt" },
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
          const rec = await withRetry(() => (prisma as any).deviceSession.findUnique({ where: { sid } }));
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
  secret: process.env.NEXTAUTH_SECRET,
};