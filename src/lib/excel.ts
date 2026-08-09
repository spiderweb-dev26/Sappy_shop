import XLSX from "xlsx";
type Row = { name: string; category: string; quantity: number; location: string; notes: string; purchaseValue: number | null; sellingPrice: number | null; costUnknown: boolean };
export function parseInventoryWorkbook(buf: Buffer): Row[] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
  const out: Row[] = [];
  for (const r of rows) {
    const get = (keys: string[]) => { for (const k of Object.keys(r)) { if (keys.includes(k.trim().toLowerCase())) return String(r[k]).trim(); } return ""; };
    const name = get(["name", "item", "item name", "product", "title"]);
    if (!name) continue;
    const q = parseInt(get(["quantity", "qty", "count", "amount", "stock"]), 10);
    const cRaw = get(["cost", "purchase value", "purchasevalue", "unit cost", "value", "buy price", "purchase price"]);
    const c = parseFloat(cRaw); const hasCost = cRaw !== "" && Number.isFinite(c);
    const sRaw = get(["selling price", "sell price", "sellingprice", "price", "mrp", "retail price", "retail", "unit price", "sell"]);
    const s = parseFloat(sRaw); const hasSell = sRaw !== "" && Number.isFinite(s);
    out.push({ name, category: get(["category", "type", "group"]) || "", quantity: Number.isFinite(q) && q >= 0 ? q : 1, location: get(["location", "loc", "bin", "shelf", "where"]) || "", notes: get(["notes", "note", "description", "desc", "remarks"]) || "", purchaseValue: hasCost ? c : null, sellingPrice: hasSell ? s : null, costUnknown: !hasCost });
  }
  return out;
}