"use client";
import { useState } from "react";

const CSS = `
@keyframes slFloat{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-26px)}}
@keyframes slScan{0%{top:6%;opacity:0}12%{opacity:.9}88%{opacity:.9}100%{top:94%;opacity:0}}
@keyframes slPulse{0%,100%{opacity:.45}50%{opacity:1}}
@keyframes slSpin{to{transform:rotate(360deg)}}
.sl-wrap{position:fixed;inset:0;overflow:hidden;background:#FFF8E7;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Inter,system-ui,sans-serif;color:#0f172a}
.sl-blob{position:absolute;border-radius:9999px;filter:blur(62px);animation:slFloat 16s ease-in-out infinite}
.sl-dots{position:absolute;inset:0;background-image:radial-gradient(rgba(6,95,70,.06) 1px,transparent 1px);background-size:22px 22px}
.sl-card{position:relative;width:100%;max-width:540px;background:#fff;border:1px solid #D1FAE5;border-radius:26px;padding:34px 30px;box-shadow:0 1px 2px rgba(6,95,70,.06),0 24px 60px rgba(6,95,70,.14);overflow:hidden}
.sl-scan{position:absolute;left:24px;right:24px;height:2px;background:#A7F3D0;box-shadow:0 0 14px 3px rgba(167,243,208,.8);animation:slScan 2.6s ease-in-out infinite;pointer-events:none}
.sl-chip{display:inline-flex;align-items:center;gap:7px;background:#A7F3D0;color:#065F46;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;padding:5px 12px;border-radius:999px}
.sl-dot{width:7px;height:7px;border-radius:999px;background:#065F46;animation:slPulse 1.6s ease-in-out infinite}
.sl-h1{font-family:Fraunces,Georgia,serif;font-weight:900;font-size:40px;line-height:1.02;letter-spacing:-.02em;color:#065F46;margin:16px 0 8px}
.sl-sub{font-size:14px;color:rgba(6,78,59,.6);margin:0 0 18px;line-height:1.55}
.sl-term{background:#06281f;color:#A7F3D0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;line-height:1.55;border-radius:14px;padding:14px 16px;max-height:170px;overflow:auto;white-space:pre-wrap;word-break:break-word;border:1px solid rgba(167,243,208,.18)}
.sl-row{display:flex;gap:12px;margin-top:20px;flex-wrap:wrap}
.sl-btn{flex:1;min-width:140px;border:0;cursor:pointer;border-radius:14px;padding:13px 16px;font-size:14px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:transform .15s ease,background .2s ease,box-shadow .2s ease}
.sl-btn:active{transform:scale(.97)}
.sl-primary{background:#065F46;color:#A7F3D0;box-shadow:0 8px 20px rgba(6,95,70,.25)}
.sl-primary:hover{background:#047857;transform:translateY(-1px)}
.sl-primary:disabled{opacity:.55;cursor:default;transform:none}
.sl-ghost{background:#fff;color:#065F46;border:1px solid #A7F3D0}
.sl-ghost:hover{background:#ECFDF5;transform:translateY(-1px)}
.sl-spin{width:15px;height:15px;border-radius:999px;border:2px solid rgba(167,243,208,.35);border-top-color:#A7F3D0;animation:slSpin .7s linear infinite;display:inline-block}
.sl-pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.sl-pill{font-family:ui-monospace,Menlo,monospace;font-size:11px;font-weight:600;padding:5px 10px;border-radius:999px;border:1px solid}
.sl-ok{background:#ECFDF5;color:#047857;border-color:#A7F3D0}
.sl-no{background:#FEF2F2;color:#B91C1C;border-color:#FECACA}
.sl-status{margin-top:16px;font-size:13px;font-weight:600}
.sl-foot{margin-top:22px;font-size:11px;letter-spacing:.04em;color:rgba(6,78,59,.45);text-align:center}
`;

export default function RecoveryPanel({ message, detail }: { message?: string; detail?: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "fail">("idle");
  const [report, setReport] = useState<any>(null);

  async function repair() {
    setState("loading");
    try {
      const r = await fetch("/api/bootstrap", { cache: "no-store" });
      const j = await r.json();
      setReport(j);
      setState(j && j.ok ? "done" : "fail");
    } catch (e: any) {
      setReport({ error: String(e) });
      setState("fail");
    }
  }

  const tables = report?.tables || {};

  return (
    <>
      <style>{CSS}</style>
      <div className="sl-wrap">
        <div className="sl-blob" style={{ left: "-10rem", top: "-10rem", width: "32rem", height: "32rem", background: "radial-gradient(circle at center, rgba(6,95,70,0.16), transparent 62%)" }} />
        <div className="sl-blob" style={{ right: "-12rem", bottom: "-8rem", width: "36rem", height: "36rem", animationDelay: "-7s", background: "radial-gradient(circle at center, rgba(16,185,129,0.16), transparent 62%)" }} />
        <div className="sl-dots" />
        <div className="sl-card">
          <div className="sl-scan" />
          <span className="sl-chip"><span className="sl-dot" /> Recovery mode</span>
          <h1 className="sl-h1">The lights flickered.</h1>
          <p className="sl-sub">A page asked the database for something that wasn't ready yet. The connection is warm now - one tap rebuilds whatever is missing, then reload cleanly.</p>
          <div className="sl-term">{message || "An unhandled error stopped this page from rendering."}{detail ? "\n\ndigest: " + detail : ""}{report?.error ? "\n\nrepair: " + report.error : ""}</div>
          {report?.tables && (
            <div className="sl-pills">
              {Object.keys(tables).map((t) => (
                <span key={t} className={"sl-pill " + (tables[t] ? "sl-ok" : "sl-no")}>{(tables[t] ? "ok  " : "missing  ") + t}</span>
              ))}
            </div>
          )}
          {state === "done" && <div className="sl-status" style={{ color: "#047857" }}>All tables present - hit Reload to enter.</div>}
          {state === "fail" && <div className="sl-status" style={{ color: "#B91C1C" }}>Repair couldn't finish - the terminal box above now holds the exact reason.</div>}
          <div className="sl-row">
            <button className="sl-btn sl-primary" onClick={repair} disabled={state === "loading"}>
              {state === "loading" ? <span className="sl-spin" /> : null}
              {state === "loading" ? "Repairing..." : "Repair database"}
            </button>
            <button className="sl-btn sl-ghost" onClick={() => window.location.reload()}>Reload page</button>
          </div>
          <div className="sl-foot">Sappy Legacy - self-healing inventory</div>
        </div>
      </div>
    </>
  );
}