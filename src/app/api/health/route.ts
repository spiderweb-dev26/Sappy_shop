import { NextResponse } from "next/server";
import { prisma } from "@/lib/core";
export const dynamic = "force-dynamic";
export async function GET() {
  const c: { name: string; ok: boolean; detail: string }[] = [];
  const u = process.env.DATABASE_URL ?? "";
  c.push({ name: "DATABASE_URL set", ok: u.length > 10, detail: u ? `present (${u.length} chars)` : "MISSING at runtime" });
  try { await prisma.$queryRaw`SELECT 1`; c.push({ name: "DB connection", ok: true, detail: "ok" }); }
  catch (e: any) { c.push({ name: "DB connection", ok: false, detail: e?.message ?? String(e) }); }
  try {
    const r: any = await prisma.$queryRaw`SELECT to_regclass('public.users') AS u, to_regclass('public.reports') AS x`;
    c.push({ name: "tables exist", ok: !!r?.[0]?.u && !!r?.[0]?.x, detail: `users=${r?.[0]?.u ?? "MISSING"} reports=${r?.[0]?.x ?? "MISSING"}` });
  } catch (e: any) { c.push({ name: "tables exist", ok: false, detail: e?.message ?? String(e) }); }
  try { const n = await prisma.user.count(); c.push({ name: "users readable", ok: true, detail: `${n} account(s)` }); }
  catch (e: any) { c.push({ name: "users readable", ok: false, detail: e?.message ?? String(e) }); }
  const ok = c.every((x) => x.ok);
  return NextResponse.json({ status: ok ? "healthy" : "degraded", checks: c }, { status: ok ? 200 : 503 });
}