import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import XLSX from "xlsx";
import { authOptions, prisma, ensureSchema, withRetry } from "@/lib/core";
import { fmtDate, ymd } from "@/lib/format";
export const dynamic = "force-dynamic";
const byLabel = (u: any) => u?.name || (u?.email ? String(u.email).split("@")[0] : "");
export async function GET(req: Request) {
  try {
    const s = await getServerSession(authOptions);
    if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema();
    const q = (new URL(req.url).searchParams.get("q") || "").trim().toLowerCase();
    const all = await withRetry(() => prisma.inventoryItem.findMany({ orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, email: true } } } }));
    const items = q ? all.filter((i: any) => ((i.name || "") + " " + (i.serial || "") + " " + (i.category || "") + " " + (i.location || "")).toLowerCase().includes(q)) : all;
    const qty = items.reduce((a: number, i: any) => a + (i.quantity || 0), 0);
    const sell = items.reduce((a: number, i: any) => a + (i.sellingPrice != null ? i.sellingPrice * i.quantity : 0), 0);
    const cost = items.reduce((a: number, i: any) => a + (!i.costUnknown && i.purchaseValue != null ? i.purchaseValue * i.quantity : 0), 0);
    const unknown = items.filter((i: any) => i.costUnknown).length;
    const header = ["Serial", "Name", "Category", "Selling Price (ETB)", "Cost (ETB)", "Qty", "Stock Value (ETB)", "Location", "Notes", "Added", "Added By"];
    const body = items.map((i: any) => [i.serial, i.name, i.category || "", i.sellingPrice ?? "", i.costUnknown ? "UNKNOWN" : (i.purchaseValue ?? ""), i.quantity, i.sellingPrice != null ? Math.round(i.sellingPrice * i.quantity * 100) / 100 : "", i.location || "", i.notes || "", fmtDate(i.createdAt), byLabel(i.user)]);
    const aoa = [header, ...body, [], ["TOTALS", "", "", "", "", qty, Math.round(sell * 100) / 100, "", "", "", ""]];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 14 }, { wch: 26 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 7 }, { wch: 16 }, { wch: 14 }, { wch: 30 }, { wch: 13 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    const sum = [["SAPPY LEGACY  -  INVENTORY EXPORT"], [""], ["Exported", new Date().toLocaleString("en-GB")], ["Items in view", items.length], ["Total units", qty], ["Stock value (at sell price)", "ETB " + sell.toFixed(2)], ["Stock value (at known cost)", "ETB " + cost.toFixed(2)], ["Items with unknown cost", unknown], [""], ["Note", "Cost reads UNKNOWN where no purchase value was recorded."]];
    const ws2 = XLSX.utils.aoa_to_sheet(sum);
    ws2["!cols"] = [{ wch: 28 }, { wch: 34 }];
    ws2["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    XLSX.utils.book_append_sheet(wb, ws2, "Summary");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
    const now = new Date();
    return new NextResponse(out as any, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="sappy-legacy-inventory-${ymd(now)}.xlsx"`, "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 });
  }
}