/* Activity rings (Xbox / fitness style) — selection, trend, tokens only. */
import { useState } from "react";
import { Lamp } from "./Status";
import type { Light } from "@/data/types";

export type ActivityMetric = {
  id: string;
  label: string;
  value: string;
  /** 0–1 */
  pct: number;
  tone: "accent" | "ok" | "medium" | "high";
  light: Light;
  detail: string;
  series?: number[];
  href?: string;
};

const CX = 120;
const CY = 120;
const RINGS = [
  { r: 98, w: 14 },
  { r: 76, w: 14 },
  { r: 54, w: 14 },
];

function TrendSpark({ series, tone }: { series: number[]; tone: string }) {
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const span = max - min || 1;
  const pts = series
    .map((v, i) => {
      const x = (i / Math.max(series.length - 1, 1)) * 160;
      const y = 40 - ((v - min) / span) * 34;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className={`act-spark tone-${tone}`} viewBox="0 0 160 44" aria-hidden="true">
      <polyline fill="none" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" points={pts} />
    </svg>
  );
}

export function ActivityRings({
  metrics,
  onOpen,
}: {
  metrics: ActivityMetric[];
  onOpen?: (id: string) => void;
}) {
  const [sel, setSel] = useState(metrics[0]?.id ?? "");
  const current = metrics.find((m) => m.id === sel) ?? metrics[0];
  if (!current) return null;

  return (
    <div className="act-panel">
      <div className="act-rings-wrap">
        <svg className="act-rings" viewBox="0 0 240 240" role="img" aria-label="Anneaux d’activité vitales">
          {metrics.slice(0, 3).map((m, i) => {
            const { r, w } = RINGS[i] ?? RINGS[2];
            const C = 2 * Math.PI * r;
            const fill = Math.max(0.05, Math.min(1, m.pct)) * C;
            const active = m.id === sel;
            return (
              <g key={m.id} className={`act-ring tone-${m.tone}${active ? " is-on" : ""}`}>
                <circle className="act-track" cx={CX} cy={CY} r={r} strokeWidth={w} fill="none" />
                <circle
                  className="act-arc"
                  cx={CX}
                  cy={CY}
                  r={r}
                  strokeWidth={w}
                  fill="none"
                  strokeDasharray={`${fill} ${C}`}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${CX} ${CY})`}
                />
                <circle
                  className="act-hit"
                  cx={CX}
                  cy={CY}
                  r={r}
                  strokeWidth={w + 10}
                  fill="none"
                  role="button"
                  tabIndex={0}
                  aria-label={`${m.label} ${m.value}`}
                  aria-pressed={active}
                  onClick={() => setSel(m.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSel(m.id);
                    }
                  }}
                />
              </g>
            );
          })}
        </svg>
        <button
          type="button"
          className="act-center"
          onClick={() => onOpen?.(current.id)}
          aria-label={`Détail ${current.label}`}
        >
          <strong className="mono">{current.value}</strong>
          <span>{current.label}</span>
          <small className="mono">{Math.round(current.pct * 100)} %</small>
        </button>
      </div>

      <ul className="act-legend" aria-label="Indicateurs">
        {metrics.slice(0, 3).map((m) => {
          const r = 14;
          const C = 2 * Math.PI * r;
          const fill = Math.max(0.05, Math.min(1, m.pct)) * C;
          return (
            <li key={m.id}>
              <button
                type="button"
                className={`act-leg tone-${m.tone}${m.id === sel ? " is-on" : ""}`}
                aria-pressed={m.id === sel}
                onClick={() => setSel(m.id)}
              >
                <svg className="act-leg-ring" viewBox="0 0 36 36" aria-hidden="true">
                  <circle className="act-track" cx="18" cy="18" r={r} strokeWidth="4" fill="none" />
                  <circle
                    className="act-arc"
                    cx="18" cy="18" r={r} strokeWidth="4" fill="none"
                    strokeDasharray={`${fill} ${C}`}
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <span className="act-leg-txt">
                  <span>{m.label}</span>
                  <b className="mono">{m.value}</b>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="act-detail r-card">
        <div className="act-detail-top">
          <Lamp l={current.light} compact />
        </div>
        <h3>{current.label}</h3>
        <p className="r-note">{current.detail}</p>
        {current.series && current.series.length > 1 && (
          <div className="act-trend">
            <span>Tendance 7 j</span>
            <TrendSpark series={current.series} tone={current.tone} />
          </div>
        )}
        {onOpen && (
          <button type="button" className="btn btn-primary sm" onClick={() => onOpen(current.id)}>
            Voir le détail
          </button>
        )}
      </div>
    </div>
  );
}
