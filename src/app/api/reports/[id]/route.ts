import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, prisma, reportUpdateSchema } from "@/lib/core";
async function owner(id: string) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return null;
  return prisma.report.findFirst({ where: { id, userId: (s.user as any).id } });
}
export async function PATCH(req: Request, ctx: any) {
  const params = await ctx.params;
  const r = await owner(params.id);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const v = reportUpdateSchema.parse(await req.json());
    const report = await prisma.report.update({ where: { id: params.id }, data: v });
    return NextResponse.json({ report });
  } catch { return NextResponse.json({ error: "Validation failed" }, { status: 400 }); }
}
export async function DELETE(_req: Request, ctx: any) {
  const params = await ctx.params;
  const r = await owner(params.id);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.report.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}