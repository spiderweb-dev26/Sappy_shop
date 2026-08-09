import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import XLSX from "xlsx";
import { authOptions } from "@/lib/core";
export const dynamic = "force-dynamic";
const SAMPLE = [
  ["Name", "Category", "Quantity", "Selling Price", "Cost", "Location", "Notes"],
  ["Cordless Drill", "Tools", 4, 2500, 1800, "Shelf A-3", "18V brushless"],
  ["Safety Goggles", "PPE", 25, 120, "", "Bin 12", "anti-fog"],
  ["USB-C Cable", "Electronics", 60, 150, 90, "Drawer 2", "1m braided"],
];
const G = [
  ["SAPPY LEGACY  -  EXCEL IMPORT GUIDE"], [""],
  ["COLUMN", "DETAILS  /  ALSO ACCEPTED AS A HEADER"],
  ["Name  *", "Required. The only mandatory column.  aliases: name, item, item name, product, title"],
  ["Category", "Optional.  aliases: category, type, group"],
  ["Quantity", "Optional (defaults to 1).  aliases: quantity, qty, count, amount, stock"],
  ["Selling Price", "Recommended. Your sell price in ETB.  aliases: selling price, sell price, price, mrp, retail price, retail, unit price, sell"],
  ["Cost", "Optional. Leave blank to mark as UNKNOWN.  aliases: cost, purchase value, unit cost, value, buy price, purchase price"],
  ["Location", "Optional.  aliases: location, loc, bin, shelf, where"],
  ["Notes", "Optional.  aliases: notes, note, description, desc, remarks"],
  [""], ["RULES", ""],
  ["1", "Row 1 is the header row. Data starts on row 2."],
  ["2", "Only the FIRST sheet is read."],
  ["3", "Column order does not matter - columns are matched by header text."],
  ["4", "A header must EQUAL an accepted name (case ignored). 'Cost (ETB)' will NOT match - keep currency out of headers."],
  ["5", "Numbers only in Quantity / Selling Price / Cost (no ETB, no commas, no 'pcs')."],
  ["6", "Rows with an empty Name are skipped. Extra columns are ignored."],
  ["7", "'Price' means SELL price. For buy price use a Cost alias (Cost / Value / Purchase Price)."],
  ["8", "A unique serial code and QR label are generated for every imported row."],
];
export async function GET() {
  try {
    const s = await getServerSession(authOptions);
    if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(SAMPLE);
    ws["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 9 }, { wch: 13 }, { wch: 9 }, { wch: 12 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    const ws2 = XLSX.utils.aoa_to_sheet(G);
    ws2["!cols"] = [{ wch: 16 }, { wch: 92 }];
    ws2["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    XLSX.utils.book_append_sheet(wb, ws2, "Guidelines");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
    return new NextResponse(out as any, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="sappy-legacy-import-template.xlsx"`, "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: (e?.message || "Server error").slice(0, 300) }, { status: 500 });
  }
}