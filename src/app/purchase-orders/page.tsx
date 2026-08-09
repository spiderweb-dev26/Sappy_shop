import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/core";
import Sidebar from "@/components/Sidebar";
import PoClient from "./PoClient";
export const dynamic = "force-dynamic";
export default async function Page() {
  const s = await getServerSession(authOptions); if (!s?.user) redirect("/login");
  return (<div className="flex min-h-screen"><Sidebar /><main className="flex-1 px-6 py-8 md:px-10"><div className="mx-auto max-w-6xl"><PoClient /></div></main></div>);
}