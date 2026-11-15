/* Forecast curve (Recharts): observed (solid stroke) + forecast (dashes) + confidence interval (pale band),
   orange/red threshold lines, "now" marker. Text summary + table for screen readers (CDC EF-47). */
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtH, LEVEL_TO_LIGHT, type MetricForecast } from "@/api";
import { Icon, Lamp } from "@/components/ui";
import { useLang } from "@/i18n";

const AXIS = { stroke: "var(--line-strong)", tick: { fill: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)" }, tickLine: false } as const;
const TIP = { contentStyle: { background: "var(--surface-2)", border: "1px solid var(--line-strong)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)" }, labelStyle: { color: "var(--text-3)" } };

export function tickLabel(f: Pick<MetricForecast, "resolution">, now: number) {
  return (t: number) => {
    if (f.resolution === "day") { const d = Math.round((t - now) / 86_400_000); const today = typeof document !== "undefined" && document.documentElement.lang === "en" ? "today" : "auj."; return d === 0 ? today : d > 0 ? `J+${d}` : `J${d}`; }
    return new Date(t).toISOString().slice(11, 13) + "h";
  };
}

export function ForecastChart({ f, height = 150, simple = false, selected, onSelect }: { f: MetricForecast; height?: number; simple?: boolean; selected?: boolean; onSelect?: () => void }) {
  const { tr } = useLang();
  const data = f.points.map((p) => ({ t: Date.parse(p.timestamp), observed: p.observed, predicted: p.predicted, xgboost: p.xgboost, lstm: p.lstm, prophet: p.prophet, band: p.lower != null && p.upper != null ? [p.lower, p.upper] : undefined }));
  const multi = f.points.some((p) => p.xgboost != null);
  const nowPt = f.points.find((p) => p.predicted !== undefined)!;
  const now = Date.parse(nowPt.timestamp);
  const last = [...f.points].reverse().find((p) => p.observed !== undefined)?.observed;
  const end = f.points[f.points.length - 1].predicted;
  const vals = f.points.flatMap((p) => [p.observed, p.lower, p.upper, p.xgboost, p.lstm, p.prophet]).filter((v): v is number => v != null);
  if (f.thresholds.orange != null) vals.push(f.thresholds.orange);
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.12 || 1;
  const fmt = tickLabel(f, now);
  const warn = f.level !== "vert";
  return (
    <figure className={`forecast ${warn ? "is-" + f.level : ""} ${selected ? "is-selected" : ""}`} data-metric={f.metric}>
      <figcaption className="forecast-head">
        <span className="forecast-label">{f.label}{multi && <small className="forecast-models mono">XGBoost · LSTM · Prophet</small>}</span>
        <span className="forecast-vals mono">{last ?? "—"} <small>{f.unit}</small> <span aria-hidden="true">→</span> {end != null ? Math.round(end * 10) / 10 : "—"} <small>{f.unit} {tr("prévu", "forecast")}</small></span>
        {warn && <Lamp l={LEVEL_TO_LIGHT[f.level]} compact />}
        {onSelect && <button className="forecast-inspect" aria-pressed={!!selected} onClick={onSelect} aria-label={tr(`Inspecter ${f.label}`, `Inspect ${f.label}`)}><Icon name="info" size={14} /></button>}
      </figcaption>
      <div style={{ height }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={fmt} minTickGap={28} {...AXIS} />
            <YAxis domain={[Math.floor(lo - pad), Math.ceil(hi + pad)]} width={48} tickFormatter={(v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))} {...AXIS} />
            {!simple && <Tooltip {...TIP} labelFormatter={(l) => fmt(Number(l))} formatter={(v, n) => [Array.isArray(v) ? `${v[0]}–${v[1]}` : String(v), n === "band" ? tr("intervalle 80 %", "80% interval") : n === "observed" ? tr("observé", "observed") : n === "xgboost" ? "XGBoost" : n === "lstm" ? "LSTM" : n === "prophet" ? "Prophet" : tr("médiane", "median")]} />}
            <Area dataKey="band" stroke="none" fill="var(--accent)" fillOpacity={0.12} isAnimationActive={false} connectNulls />
            {f.thresholds.orange != null && <ReferenceLine y={f.thresholds.orange} stroke="var(--medium)" strokeDasharray="4 4" />}
            {f.thresholds.rouge != null && <ReferenceLine y={f.thresholds.rouge} stroke="var(--high)" strokeDasharray="4 4" />}
            <ReferenceLine x={now} stroke="var(--text-3)" label={{ value: tr("maintenant", "now"), position: "insideTopLeft", fill: "var(--text-3)", fontSize: 10, fontFamily: "var(--font-mono)" }} />
            <Line dataKey="observed" stroke="var(--text)" strokeWidth={1.75} dot={f.resolution === "day" || f.points.filter((p) => p.observed != null).length < 10 ? { r: 2.5, fill: "var(--text)", stroke: "none" } : false} connectNulls isAnimationActive={false} />
            {multi ? (
              <>
                <Line dataKey="xgboost" name="XGBoost" stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                <Line dataKey="lstm" name="LSTM" stroke="var(--text-2)" strokeWidth={1.75} strokeDasharray="2 3" dot={false} isAnimationActive={false} />
                <Line dataKey="prophet" name="Prophet" stroke="var(--low)" strokeWidth={1.75} strokeDasharray="8 3" dot={false} isAnimationActive={false} />
              </>
            ) : <Line dataKey="predicted" stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {f.timeToThresholdHours != null && f.thresholdLevel && (
        <p className={`forecast-tth t-${f.thresholdLevel}`}>{tr(`Seuil ${f.thresholdLevel} probable dans ~${fmtH(f.timeToThresholdHours)}`, `${f.thresholdLevel} threshold likely in ~${fmtH(f.timeToThresholdHours)}`)}</p>
      )}
      <p className="visually-hidden">{f.summary}</p>
      {!simple && (
        <details className="forecast-table">
          <summary>{tr("Tableau des valeurs", "Value table")}</summary>
          <table><thead><tr><th>{tr("Moment", "Time")}</th><th>{tr("Observé", "Observed")}</th>{multi ? <><th>XGBoost</th><th>LSTM</th><th>Prophet</th></> : <th>{tr("Prévu", "Forecast")}</th>}<th>{tr("Intervalle", "Interval")}</th></tr></thead>
            <tbody>{f.points.map((p) => <tr key={p.timestamp}><td>{fmt(Date.parse(p.timestamp))}</td><td>{p.observed ?? "—"}</td>{multi ? <><td>{p.xgboost ?? "—"}</td><td>{p.lstm ?? "—"}</td><td>{p.prophet ?? "—"}</td></> : <td>{p.predicted ?? "—"}</td>}<td>{p.lower != null ? `${p.lower}–${p.upper}` : "—"}</td></tr>)}</tbody></table>
        </details>
      )}
    </figure>
  );
}

export function ForecastLegend({ models = false }: { models?: boolean }) {
  const { tr } = useLang();
  return (
    <ul className="chart-legend">
      <li><i style={{ background: "var(--text)" }} /> {tr("observé", "observed")}</li>
      {models ? (
        <>
          <li><i className="dash acc" /> XGBoost</li>
          <li><i className="dash lstm" /> LSTM</li>
          <li><i className="dash prophet" /> Prophet</li>
        </>
      ) : <li><i className="dash acc" /> {tr("prévu", "forecast")}</li>}
      <li><i className="band" /> {models ? tr("intervalle des modèles", "model interval") : tr("intervalle de confiance 80 %", "80% confidence interval")}</li>
      <li><i className="dash" /> {tr("seuils orange / rouge", "orange / red thresholds")}</li>
    </ul>
  );
}
