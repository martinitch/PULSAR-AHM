/* Telemetry dial — value arc and inner tick marks. */
import type { Light } from "@/data/types";

const R = 44;
const C = 2 * Math.PI * R;
const ARC = C * 0.72; // ~260°
const SWEEP = Math.PI * 2 * 0.72;
const TICKS = 11;

/** Radial ticks, every other one longer, limit zone at the end of the scale. */
const TICK_LINES = Array.from({ length: TICKS }, (_, i) => {
  const ang = (i / (TICKS - 1)) * SWEEP;
  const major = i % 2 === 0;
  const warn = i / (TICKS - 1) >= 0.88;
  const outer = R - 5.5;
  const inner = major ? R - 16 : R - 11;
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  return {
    i,
    major,
    warn,
    x1: 50 + outer * cos,
    y1: 50 + outer * sin,
    x2: 50 + inner * cos,
    y2: 50 + inner * sin,
  };
});

type Props = {
  label: string;
  value: string | number;
  unit?: string;
  pct?: number;
  light?: Light;
  delta?: string;
  active?: boolean;
  onSelect?: () => void;
};

export function HudDial({ label, value, unit, pct = 0.65, light = "ok", delta, active, onSelect }: Props) {
  const fill = Math.max(0.04, Math.min(1, pct));
  const body = (
    <>
      <svg viewBox="0 0 100 100" className="hud-dial-svg" aria-hidden="true">
        <circle className="hud-dial-track" cx="50" cy="50" r={R} strokeDasharray={`${ARC} ${C}`} />
        <circle className="hud-dial-warn" cx="50" cy="50" r={R} strokeDasharray={`${ARC * 0.12} ${C}`} strokeDashoffset={-ARC * 0.88} />
        {TICK_LINES.map((t) => (
          <line
            key={t.i}
            className={`hud-dial-tick${t.major ? " is-major" : ""}${t.warn ? " is-warn" : ""}`}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
          />
        ))}
        <circle className="hud-dial-arc" cx="50" cy="50" r={R} strokeDasharray={`${fill * ARC} ${C}`} />
      </svg>
      <div className="hud-dial-read">
        <strong className={`mono${String(value).length > 5 ? " is-long" : ""}`}>{value}</strong>
        {unit && <small>{unit}</small>}
      </div>
      <span className="hud-dial-lab">{label}</span>
      {delta && <span className={`hud-dial-delta${light !== "ok" ? " is-bad" : " is-good"}`}>{delta}</span>}
    </>
  );
  const cls = `hud-dial is-${light}${active ? " is-active" : ""}${onSelect ? " is-interactive" : ""}`;
  const aria = `${label} ${value}${unit ? ` ${unit}` : ""}${delta ? `, ${delta}` : ""}`;
  if (onSelect) {
    return <button type="button" className={cls} aria-pressed={!!active} aria-label={aria} onClick={onSelect}>{body}</button>;
  }
  return <div className={cls} role="group" aria-label={aria}>{body}</div>;
}
