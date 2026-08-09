"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
export default function TopProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setState("loading");
    const a = setTimeout(() => setState("done"), 450);
    const b = setTimeout(() => setState("idle"), 950);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [pathname]);
  if (state === "idle") return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5">
      <div className={`h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-mint shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all ${state === "loading" ? "w-2/3 duration-700 ease-out" : "w-full duration-300"}`} />
    </div>
  );
}