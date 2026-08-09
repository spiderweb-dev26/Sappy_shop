import { NextResponse } from "next/server";
import { ensureSchema, masterIsSet, withRetry } from "@/lib/core";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    try { await ensureSchema(); } catch {}
    const set = await withRetry(() => masterIsSet());
    return NextResponse.json({ set });
  } catch (e: any) {
    return NextResponse.json({ set: false, error: (e?.message || "status check failed").slice(0, 200) }, { status: 200 });
  }
}