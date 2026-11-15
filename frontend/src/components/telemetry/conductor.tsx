/* Time conductor (inspired by NASA Open MCT’s « Time Conductor », no code reused):
   - Real time: sliding window ending at “now” (1, 2, or 5 min), refreshed continuously.
   - Fixed: frozen window [start, end] that can be shifted; no further refresh.
   A single conductor drives every real-time curve on a screen (React context). */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui";
import { useLang } from "@/i18n";

export type ConductorMode = "realtime" | "fixed";
export type Conductor = { mode: ConductorMode; spanSec: number; end: number | null; setMode: (m: ConductorMode) => void; setSpan: (s: number) => void; shift: (sec: number) => void };
const STEP = 2; // telemetry sampling step (s)
const Ctx = createContext<Conductor | null>(null);

export function ConductorProvider({ children, span = 120 }: { children: ReactNode; span?: number }) {
  const [mode, setModeS] = useState<ConductorMode>("realtime");
  const [spanSec, setSpan] = useState(span);
  const [end, setEnd] = useState<number | null>(null);
  const value = useMemo<Conductor>(() => ({
    mode, spanSec, end,
    setMode: (m) => { setModeS(m); setEnd(m === "fixed" ? Math.floor(Date.now() / 1000 / STEP) * STEP * 1000 : null); },
    setSpan,
    shift: (sec) => setEnd((e) => (e == null ? e : Math.min(Date.now(), e + sec * 1000))),
  }), [mode, spanSec, end]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Query parameters for useTelemetry from the conductor (or 2 min real time by default). */
export function useConductorQuery() {
  const c = useContext(Ctx);
  const spanSec = c?.spanSec ?? 120;
  return { limit: Math.round(spanSec / STEP), until: c?.mode === "fixed" && c.end ? new Date(c.end).toISOString() : undefined, mode: c?.mode ?? "realtime" };
}

const fmt = (t: number) => new Date(t).toISOString().slice(11, 19);
function Clock() {
  const [t, setT] = useState(Date.now());
  useEffect(() => { const i = window.setInterval(() => setT(Date.now()), 1000); return () => window.clearInterval(i); }, []);
  return <span className="mono">{fmt(t)} UTC</span>;
}

export function TimeConductor() {
  const c = useContext(Ctx);
  const { tr } = useLang();
  if (!c) return null;
  const end = c.end ?? Date.now();
  return (
    <div className={`conductor is-${c.mode}`} role="group" aria-label={tr("Conducteur de temps", "Time conductor")}>
      <div className="seg2" role="group" aria-label={tr("Mode", "Mode")}>
        <button aria-pressed={c.mode === "realtime"} onClick={() => c.setMode("realtime")}><Icon name="play_arrow" size={14} /> {tr("Temps réel", "Realtime")}</button>
        <button aria-pressed={c.mode === "fixed"} onClick={() => c.setMode("fixed")}><Icon name="pause" size={14} /> {tr("Fixe", "Fixed")}</button>
      </div>
      {c.mode === "realtime" ? (
        <>
          <div className="seg2" role="group" aria-label={tr("Fenêtre", "Window")}>
            {[60, 120, 300].map((s) => <button key={s} aria-pressed={c.spanSec === s} onClick={() => c.setSpan(s)}>{s / 60} min</button>)}
          </div>
          <span className="conductor-range"><span className="muted">{tr("fin", "end")}</span> <Clock /> <span className="muted">· {tr("fenêtre glissante", "sliding window")}</span></span>
        </>
      ) : (
        <>
          <span className="conductor-range mono" data-testid="conductor-range">{fmt(end - c.spanSec * 1000)} → {fmt(end)} UTC</span>
          <button className="btn btn-ghost sm" onClick={() => c.shift(-c.spanSec / 2)} aria-label={tr("Reculer d’une demi-fenêtre", "Step back half a window")}><Icon name="arrow_back" size={16} /></button>
          <button className="btn btn-ghost sm" onClick={() => c.shift(c.spanSec / 2)} aria-label={tr("Avancer d’une demi-fenêtre", "Step forward half a window")}><Icon name="arrow_forward" size={16} /></button>
        </>
      )}
    </div>
  );
}
