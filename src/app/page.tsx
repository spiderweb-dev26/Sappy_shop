import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/core";
export const dynamic = "force-dynamic";
export default async function Home() { const s = await getServerSession(authOptions); redirect(s?.user ? "/dashboard" : "/login"); }