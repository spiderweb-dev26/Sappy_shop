"use client";
export default function BrandMark({ size = 40, tile = false, className = "" }: { size?: number; tile?: boolean; className?: string }) {
  const dim = tile ? Math.round(size * 0.74) : size;
  const img = (
    <img src="/img/logo.png" alt="Sappy Legacy" width={dim} height={dim} draggable={false}
      className="relative select-none transition-transform duration-500 ease-out group-hover/bm:scale-110 group-hover/bm:-rotate-6" />
  );
  if (!tile) {
    return <span className={`group/bm inline-flex ${className}`} style={{ width: size, height: size }}>{img}</span>;
  }
  const r = size >= 56 ? 18 : size >= 44 ? 14 : 11;
  return (
    <span
      className={`group/bm relative inline-grid shrink-0 place-items-center overflow-hidden bg-white shadow-soft ring-1 ring-emerald-100 transition-transform duration-300 hover:-translate-y-0.5 ${className}`}
      style={{ width: size, height: size, borderRadius: r }}
    >
      <span aria-hidden className="pointer-events-none absolute -right-2 -top-2 h-2/3 w-2/3 animate-floaty rounded-full bg-mint/40 opacity-60 blur-md transition-opacity duration-500 group-hover/bm:opacity-90" />
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-emerald-deep/5" />
      {img}
    </span>
  );
}