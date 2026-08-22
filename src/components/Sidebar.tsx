"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Boxes, Receipt, ClipboardList, BarChart3, History, KeyRound, Trash2, LogOut, Wallet, Users, Monitor } from "lucide-react";
import DevicesModal from "@/components/DevicesModal";
import UsersModal from "@/components/UsersModal";
import { useResource } from "@/components/useResource";
import MasterModal from "@/components/MasterModal";

const links = [
  { href: "/inventory", label: "Inventory", Icon: Boxes },
  { href: "/sales", label: "Sales", Icon: Receipt },
  { href: "/purchase-orders", label: "Orders", Icon: ClipboardList },
  { href: "/reports", label: "Reports", Icon: BarChart3 },
  { href: "/expenses", label: "Expenses", Icon: Wallet },
  { href: "/activity", label: "Activity", Icon: History },
];

export default function Sidebar() {
  const pathname = usePathname();
  const status = useResource<{ set: boolean }>("/api/master/status");
  const [masterSet, setMasterSet] = useState<boolean | null>(null);
  const [secOpen, setSecOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);

  useEffect(() => { if (status.data) setMasterSet(!!status.data.set); }, [status.data]);
  useEffect(() => {
    const hSec = () => setSecOpen(true);
    const hReset = () => setResetOpen(true);
    const hUsers = () => setUsersOpen(true);
    const hDevices = () => setDevicesOpen(true);
    const hChanged = () => status.reload();
    window.addEventListener("sl:open-security", hSec);
    window.addEventListener("sl:open-reset", hReset);
    window.addEventListener("sl:open-users", hUsers);
    window.addEventListener("sl:open-devices", hDevices);
    window.addEventListener("sl:master-changed", hChanged);
    return () => { window.removeEventListener("sl:open-security", hSec); window.removeEventListener("sl:open-reset", hReset); window.removeEventListener("sl:open-users", hUsers); window.removeEventListener("sl:open-devices", hDevices); window.removeEventListener("sl:master-changed", hChanged); };
  }, []);

  const markSet = () => { setMasterSet(true); window.dispatchEvent(new CustomEvent("sl:master-changed")); };
  async function doReset(pw: string) {
    const r = await fetch("/api/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ masterPassword: pw }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j?.error || "Reset failed");
    window.location.href = "/dashboard";
  }

  return (
    <>
      <nav aria-label="Primary" className="fixed left-1/2 top-4 z-40 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-emerald-700/40 bg-emerald-deep/95 px-2 py-2 shadow-lift backdrop-blur md:flex">
        <Link href="/dashboard" title="Dashboard" className="mr-1 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-soft ring-1 ring-emerald-100 transition hover:scale-105 active:scale-95">
          <img src="/img/logo.png" alt="Sappy Legacy" className="h-9 w-9" draggable={false} />
        </Link>
        {links.map(({ href, label, Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link key={href} href={href} title={label}
              className={`group flex h-11 shrink-0 items-center overflow-hidden rounded-full transition-all duration-300 ease-out ${active ? "w-[136px] bg-white/15 shadow-[0_0_18px_rgba(167,243,208,0.25)]" : "w-[52px] hover:w-[136px] hover:bg-white/10"}`}>
              <span className="pl-[14px] text-mint"><Icon style={{ width: 20, height: 20 }} /></span>
              <span className={`ml-2 whitespace-nowrap text-sm font-semibold text-mint transition-all duration-300 ${active ? "max-w-[100px] opacity-100" : "max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100"}`}>{label}</span>
            </Link>
          );
        })}
        <span aria-hidden className="mx-1 h-6 w-px bg-mint/20" />
        <button onClick={() => setDevicesOpen(true)} title="Your devices" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-mint transition hover:bg-white/10 active:scale-90"><Monitor style={{ width: 18, height: 18 }} /></button>
        <button onClick={() => setUsersOpen(true)} title="Manage users" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-mint transition hover:bg-white/10 active:scale-90"><Users style={{ width: 18, height: 18 }} /></button>
        <button onClick={() => setSecOpen(true)} title="Security" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-mint transition hover:bg-white/10 active:scale-90"><KeyRound style={{ width: 18, height: 18 }} /></button>
        <button onClick={() => setResetOpen(true)} title="Reset data" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-red-300 transition hover:bg-red-500/20 active:scale-90"><Trash2 style={{ width: 18, height: 18 }} /></button>
        <button onClick={() => signOut({ callbackUrl: "/login" })} title="Sign out" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-mint transition hover:bg-white/10 active:scale-90"><LogOut style={{ width: 18, height: 18 }} /></button>
      </nav>

      <MasterModal open={secOpen} mode={masterSet ? "change" : "set"} onClose={() => setSecOpen(false)} onMasterSet={markSet} />
      <MasterModal open={resetOpen} mode={masterSet ? "verify" : "set"} onClose={() => setResetOpen(false)} onVerified={doReset} onMasterSet={markSet} verifyTitle="Confirm reset" verifySubtitle="Enter the master password to permanently erase all your reports, inventory, sales and orders." setTitle="Set master password" setSubtitle="Create a master password first - it protects resets, deletions and new sign-ups." confirmLabel="Reset all data" />
      <UsersModal open={usersOpen} onClose={() => setUsersOpen(false)} />
      <DevicesModal open={devicesOpen} onClose={() => setDevicesOpen(false)} />
    </>
  );
}