"use client";
import { useCallback, useEffect, useRef, useState } from "react";
export function useResource<T = any>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const id = useRef(0);
  const load = useCallback(async () => {
    if (!url) return;
    const me = ++id.current; setLoading(true); setError(null);
    try {
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (me !== id.current) return;
      if (!r.ok) throw new Error(j?.error || ("HTTP " + r.status));
      setData(j as T);
    } catch (e: any) { if (me === id.current) setError(e?.message || String(e)); }
    finally { if (me === id.current) setLoading(false); }
  }, [url]);
  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}