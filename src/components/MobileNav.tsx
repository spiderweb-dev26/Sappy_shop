"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Boxes, Receipt, ClipboardList, BarChart3, Wallet, History, Users, Monitor, KeyRound, Trash2, LogOut } from "lucide-react";

const TABS = [
  { href: "/dashboard", label: "Home", Icon: LayoutDashboard },
  { href: "/inventory", label: "Stock", Icon: Boxes },
  { href: "/sales", label: "Sales", Icon: Receipt },
  { href: "/purchase-orders", label: "Orders", Icon: ClipboardList },
  { href: "/reports", label: "Reports", Icon: BarChart3 },
  { href: "/expenses", label: "Expenses", Icon: Wallet },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sheet, setSheet] = useState(false);
  useEffect(() => { document.body.style.overflow = sheet ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [sheet]);
  if (!session?.user) return null;
  if (pathname?.startsWith("/login") || pathname?.startsWith("/register")) return null;
  const initial = (session.user.name || session.user.email || "?").trim().charAt(0).toUpperCase();
  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-emerald-100 bg-cream/85 px-4 backdrop-blur-md md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white shadow-soft ring-1 ring-emerald-100"><img src="/logo.svg?v=2" alt="Sappy Legacy" className="h-7 w-7" /></span>
          <span className="font-display text-[15px] font-black tracking-tight text-emerald-deep">Sappy Legacy</span>
        </Link>
        <button onClick={() => setSheet(true)} className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-deep text-sm font-black text-mint shadow-soft transition active:scale-90">{initial}</button>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-100 bg-white/95 backdrop-blur-md md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto flex max-w-md items-stretch px-1 pt-1">
          {TABS.map(({ href, label, Icon }) => {
            const active = href === "/dashboard" ? pathname === "/dashboard" : !!pathname?.startsWith(href);
            return (
              <Link key={href} href={href} className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5 active:scale-90 transition-transform">
                <span className="relative flex h-8 w-10 items-center justify-center">
                  {active && <motion.span layoutId="mobtab" className="absolute inset-0 rounded-xl bg-emerald-deep shadow-soft" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                  <Icon className="relative" style={{ width: 18, height: 18, color: active ? "#A7F3D0" : "rgba(6,78,59,0.42)" }} />
                </span>
                <span className="relative text-[9px] font-semibold" style={{ color: active ? "#065F46" : "rgba(6,78,59,0.42)" }}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <AnimatePresence>
        {sheet && (
          <div className="fixed inset-0 z-[70] md:hidden" onClick={() => setSheet(false)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-emerald-900/50 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }} onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-emerald-100 bg-white p-4 shadow-2xl" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-emerald-200" />
              <div className="mb-3 flex items-center gap-3 rounded-2xl bg-cream/70 p-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-deep text-base font-black text-mint">{initial}</span>
                <div className="min-w-0"><div className="truncate text-sm font-bold text-emerald-deep">{session.user.name || "Signed in"}</div><div className="truncate text-xs text-emerald-900/55">{session.user.email}</div></div>
              </div>
              <div className="space-y-1">
                <Link href="/activity" onClick={() => setSheet(false)} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold text-emerald-900 transition hover:bg-mint/40 active:scale-[0.98]"><History style={{ width: 18, height: 18 }} /> Activity log</Link>
                <button onClick={() => { setSheet(false); window.dispatchEvent(new CustomEvent("sl:open-devices")); }} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold text-emerald-900 transition hover:bg-mint/40 active:scale-[0.98]"><Monitor style={{ width: 18, height: 18 }} /> Your devices</button>
                <button onClick={() => { setSheet(false); window.dispatchEvent(new CustomEvent("sl:open-users")); }} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold text-emerald-900 transition hover:bg-mint/40 active:scale-[0.98]"><Users style={{ width: 18, height: 18 }} /> Manage users</button>
                <button onClick={() => { setSheet(false); window.dispatchEvent(new CustomEvent("sl:open-security")); }} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold text-emerald-900 transition hover:bg-mint/40 active:scale-[0.98]"><KeyRound style={{ width: 18, height: 18 }} /> Security · master password</button>
                <button onClick={() => { setSheet(false); window.dispatchEvent(new CustomEvent("sl:open-reset")); }} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 active:scale-[0.98]"><Trash2 style={{ width: 18, height: 18 }} /> Reset all data</button>
                <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold text-emerald-900 transition hover:bg-red-50 hover:text-red-600 active:scale-[0.98]"><LogOut style={{ width: 18, height: 18 }} /> Sign out</button>
              </div>
              <button onClick={() => setSheet(false)} className="mt-3 w-full rounded-xl border border-emerald-200 py-2.5 text-sm font-semibold text-emerald-deep transition active:scale-[0.98]">Cancel</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}