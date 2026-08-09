import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, ensureSchema, tableStatus, withRetry } from "@/lib/core";

export const dynamic = "force-dynamic";
const TABLES = ["users", "reports", "inventory_items", "sales", "purchase_orders"];

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let err: string | undefined;
  try { await ensureSchema(); } catch (e: any) { err = e?.message || String(e); }
  let tables: Record<string, boolean> = {};
  try { tables = await withRetry(() => tableStatus()); }
  catch (e: any) { err = (err ? err + " | " : "") + "status-check: " + (e?.message || String(e)); }
  const ok = TABLES.every((t) => tables[t]);
  return NextResponse.json({ ok, tables, error: err, at: new Date().toISOString() }, { status: ok ? 200 : 500 });
}