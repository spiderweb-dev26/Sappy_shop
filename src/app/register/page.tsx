"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import BrandMark from "@/components/BrandMark";
const inp = "w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-sm text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";
export default function Register() {
  const router = useRouter();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [code, setCode] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [masterSet, setMasterSet] = useState<boolean | null>(null);
  useEffect(() => { fetch("/api/master/status", { cache: "no-store" }).then((r) => r.json()).then((j) => setMasterSet(!!j?.set)).catch(() => setMasterSet(false)); }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const res = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, masterPassword: masterSet ? code : undefined }) });
      const data = await res.json();
      if (res.status === 401) { setErr("Invalid access code."); return; }
      if (!res.ok) { setErr(data.error || "Registration failed"); return; }
      router.push("/login");
    } finally { setBusy(false); }
  }
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm rounded-2xl border border-emerald-100 bg-white/90 p-7 shadow-soft backdrop-blur">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3"><BrandMark size={64} tile /></div>
          <h1 className="font-display text-3xl font-black tracking-tight text-emerald-deep">Create account</h1>
          <p className="mt-1 text-sm text-emerald-900/55">Get started with Sappy Legacy</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input type="text" required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className={inp} />
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inp} />
          <input type="password" required minLength={8} placeholder="Password (min 8)" value={password} onChange={(e) => setPassword(e.target.value)} className={inp} />
          {masterSet === true && <div><label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-800"><ShieldCheck style={{ width: 13, height: 13 }} /> Access code</label><input type="password" required value={code} onChange={(e) => setCode(e.target.value)} className={inp} placeholder="Master password" /></div>}
          {masterSet === false && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">No access code is set yet - sign-ups are open until an administrator creates one in Security.</p>}
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-emerald-deep py-2.5 text-sm font-semibold text-mint hover:bg-emerald-800 disabled:opacity-50">{busy ? "Creating..." : "Create account"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-emerald-900/55">Have an account? <Link href="/login" className="font-semibold text-emerald-deep hover:underline">Sign in</Link></p>
      </motion.div>
    </div>
  );
}