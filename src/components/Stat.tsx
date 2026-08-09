"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export function Counter({ value, format, duration = 1000 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) { setN(value); return; }
    if (typeof IntersectionObserver === "undefined") { setN(value); return; }
    done.current = false; // re-arm whenever the value changes (data arriving, filters, etc.)
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        const start = performance.now();
        const step = (t: number) => {
          const p = Math.min(1, (t - start) / duration);
          setN(value * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        io.disconnect();
      }
    }), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);
  return <span ref={ref}>{format ? format(n) : Math.round(n).toLocaleString()}</span>;
}

export function StatTile({ label, value, Icon, tint, format, delay = 0 }: { label: string; value: number; Icon: any; tint: string; format?: (n: number) => string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(6,95,70,0.12)]">
      <div className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-mint/25 blur-2xl transition group-hover:bg-mint/50" />
      <div className="relative flex items-center justify-between">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${tint}`}><Icon style={{ width: 18, height: 18 }} /></div>
      </div>
      <div className="relative mt-3 font-display text-2xl font-black leading-none tracking-tight text-emerald-deep sm:text-3xl"><Counter value={value} format={format} /></div>
      <div className="relative mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-900/55">{label}</div>
    </motion.div>
  );
}