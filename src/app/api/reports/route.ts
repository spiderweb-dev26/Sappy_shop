import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, prisma, reportSchema } from "@/lib/core";
export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reports = await prisma.report.findMany({ where: { userId: (s.user as any).id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ reports });
}
export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const v = reportSchema.parse(await req.json());
    const report = await prisma.report.create({ data: { title: v.title, description: v.description ?? null, status: v.status, data: v.data ?? undefined, userId: (s.user as any).id } });
    return NextResponse.json({ report }, { status: 201 });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}