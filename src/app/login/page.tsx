"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, getSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Spinner, ProgressLoader } from "@/components/LoadState";
const inp = "w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-sm text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [welcome, setWelcome] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const res = await signIn("credentials", { redirect: false, email, password });
    if (res?.ok) {
      const sess = await getSession();
      const name = sess?.user?.name || (email.split("@")[0] || "there");
      setWelcome(name);
      setTimeout(() => router.push("/dashboard"), 1500);
    } else {
      setErr("Invalid email or password.");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex min-h-screen items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm rounded-2xl border border-emerald-100 bg-white/90 p-7 shadow-soft backdrop-blur">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-emerald-100"><img src="/img/logo.png" alt="Sappy Legacy" className="h-12 w-12" /></div>
            <h1 className="font-display text-3xl font-black tracking-tight text-emerald-deep">Welcome back</h1>
            <p className="mt-1 text-sm text-emerald-900/55">Sign in to Sappy Legacy</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inp} />
            <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={inp} />
            {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-deep py-2.5 text-sm font-semibold text-mint transition hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-50">
              {busy ? <Spinner className="h-4 w-4 border-mint/30 border-t-mint" /> : null}{busy ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-emerald-900/55">No account? <Link href="/register" className="font-semibold text-emerald-deep hover:underline">Create one</Link></p>
        </motion.div>
      </div>

      <AnimatePresence>
        {welcome && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-emerald-deep">
            <motion.div aria-hidden className="pointer-events-none absolute inset-0"
              style={{ background: "linear-gradient(115deg, transparent 35%, rgba(167,243,208,0.28) 50%, transparent 65%)", backgroundSize: "250% 100%", backgroundRepeat: "no-repeat" }}
              initial={{ backgroundPosition: "120% 0" }} animate={{ backgroundPosition: "-20% 0" }} transition={{ duration: 1.3, ease: "easeInOut" }} />
            <div className="relative px-6 text-center">
              <motion.div initial={{ scale: 0.5, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 220, damping: 18 }} className="mx-auto mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-lift">
                <img src="/img/logo.png" alt="" className="h-16 w-16" />
              </motion.div>
              <motion.p initial={{ opacity: 0, x: -48 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }} className="text-xs font-bold uppercase tracking-[0.4em] text-mint/80">Welcome</motion.p>
              <motion.h1 initial={{ opacity: 0, y: 26, clipPath: "inset(0 100% 0 0)" }} animate={{ opacity: 1, y: 0, clipPath: "inset(0 0% 0 0)" }} transition={{ delay: 0.28, duration: 0.65, ease: [0.22, 1, 0.36, 1] }} className="mt-2 font-display text-4xl font-black tracking-tight text-mint md:text-6xl">{welcome}</motion.h1>
              <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.55, duration: 0.5, ease: "easeOut" }} className="mx-auto mt-5 h-1 w-44 origin-left rounded-full bg-mint/60" />
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mx-auto mt-6 w-64">
                <ProgressLoader tone="light" label="Setting up" />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}