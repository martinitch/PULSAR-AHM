/* Real-time charts (Recharts): heart rate + SpO₂, and radiation (dose rate + cumulative).
   Data: useTelemetry (FastAPI API or DÉMO simulator), refreshed every 2 s. Plain: no animation, no gradient. */
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useHeartForecast, useTelemetry, type TelemetrySample } from "@/api";
import { Icon } from "@/components/ui";
import { useConductorQuery } from "@/components/telemetry";
import { THRESHOLDS as TH } from "@/data/thresholds";
import { useLang } from "@/i18n";

const AXIS = { stroke: "var(--line-strong)", tick: { fill: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)" }, tickLine: false } as const;
const hhmmss = (iso: string) => iso.slice(11, 19);
const tip = { contentStyle: { background: "var(--surface-2)", border: "1px solid var(--line-strong)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)" }, labelStyle: { color: "var(--text-3)" }, labelFormatter: (l: unknown) => hhmmss(String(l)) } as const;

function Empty({ text }: { text: string }) { return <p className="chart-empty"><Icon name="sync" size={16} className="spin" /> {text}</p>; }

export function LiveVitalsChart({ astronautId, height = 200 }: { astronautId: string; height?: number }) {
  const cq = useConductorQuery();
  const { tr } = useLang();
  const { data, isError } = useTelemetry(astronautId, { limit: cq.limit, until: cq.until });
  const heart = useHeartForecast(astronautId, cq.until);
  if (isError) return <Empty text={tr("Télémétrie indisponible", "Telemetry unavailable")} />;
  if (!data) return <Empty text={tr("Connexion aux capteurs…", "Connecting to sensors…")} />;
  const last = data[data.length - 1];
  const future = (heart.data?.points ?? []).filter((p) => p.heartRate == null && p.xgboost != null);
  const chart = data.map((s) => ({ timestamp: s.timestamp, heartRate: s.heartRate as number | undefined, spo2: s.spo2 as number | undefined, xgboost: undefined as number | undefined, lstm: undefined as number | undefined, prophet: undefined as number | undefined }));
  if (chart.length && future.length) {
    const bridge = chart[chart.length - 1];
    bridge.xgboost = bridge.heartRate;
    bridge.lstm = bridge.heartRate;
    bridge.prophet = bridge.heartRate;
    future.forEach((p) => chart.push({ timestamp: p.timestamp, heartRate: undefined, spo2: undefined, xgboost: p.xgboost, lstm: p.lstm, prophet: p.prophet }));
  }
  return (
    <div className="live-chart">
      <dl className="live-now">
        <div><dt>{tr("FC", "HR")}</dt><dd className="mono">{last.heartRate}<small> bpm</small></dd></div>
        <div><dt>SpO₂</dt><dd className="mono">{last.spo2}<small> %</small></dd></div>
        <div><dt>{tr("Dérive", "Drift")}</dt><dd className="mono">{last.driftScore.toFixed(2)}</dd></div>
      </dl>
      <div style={{ height }} role="img" aria-label={tr(`Fréquence cardiaque ${last.heartRate} bpm et SpO₂ ${last.spo2} % (${cq.mode === "fixed" ? "fenêtre fixe" : "temps réel"})`, `Heart rate ${last.heartRate} bpm and SpO₂ ${last.spo2}% (${cq.mode === "fixed" ? "fixed window" : "realtime"})`)}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="timestamp" tickFormatter={hhmmss} minTickGap={48} {...AXIS} />
            <YAxis yAxisId="hr" domain={[40, 130]} width={40} {...AXIS} />
            <YAxis yAxisId="spo2" orientation="right" domain={[85, 100]} width={36} {...AXIS} />
            <ReferenceLine yAxisId="spo2" y={TH.spo2.rouge} stroke="var(--high)" strokeDasharray="4 4" label={{ value: `SpO₂ ${TH.spo2.rouge} %`, fill: "var(--text-3)", fontSize: 10, position: "insideBottomRight" }} />
            <Tooltip {...tip} />
            <Line yAxisId="hr" type="monotone" dataKey="heartRate" name={tr("FC (bpm)", "HR (bpm)")} stroke="var(--accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line yAxisId="hr" type="monotone" dataKey="xgboost" name="XGBoost" stroke="var(--text)" strokeWidth={1.75} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
            <Line yAxisId="hr" type="monotone" dataKey="lstm" name="LSTM" stroke="var(--text-2)" strokeWidth={1.5} strokeDasharray="2 3" dot={false} isAnimationActive={false} />
            <Line yAxisId="hr" type="monotone" dataKey="prophet" name="Prophet" stroke="var(--low)" strokeWidth={1.5} strokeDasharray="8 3" dot={false} isAnimationActive={false} />
            <Line yAxisId="spo2" type="monotone" dataKey="spo2" name="SpO₂ (%)" stroke="var(--text-2)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="chart-legend"><li><i style={{ background: "var(--accent)" }} /> {tr("FC (bpm)", "HR (bpm)")}</li><li><i className="dash xgb" /> XGBoost</li><li><i className="dash lstm" /> LSTM</li><li><i className="dash prophet" /> Prophet</li><li><i style={{ background: "var(--text-2)" }} /> SpO₂ (%)</li><li><i className="dash" /> {tr("seuil SpO₂", "SpO₂ threshold")}</li></ul>
    </div>
  );
}

export function RadiationChart({ astronautId, height = 160 }: { astronautId: string; height?: number }) {
  const cq = useConductorQuery();
  const { tr } = useLang();
  const { data, isError } = useTelemetry(astronautId, { limit: cq.limit, until: cq.until });
  if (isError) return <Empty text={tr("Dosimètre indisponible", "Dosimeter unavailable")} />;
  if (!data) return <Empty text={tr("Connexion au dosimètre…", "Connecting to the dosimeter…")} />;
  const last: TelemetrySample = data[data.length - 1];
  return (
    <div className="live-chart">
      <dl className="live-now">
        <div><dt>{tr("Débit de dose", "Dose rate")}</dt><dd className="mono">{last.radiationDoseRate.toFixed(1)}<small> µSv/h</small></dd></div>
        <div><dt>{tr("Cumul mission", "Mission total")}</dt><dd className="mono">{last.radiationCumulative.toFixed(1)}<small> mSv</small></dd></div>
      </dl>
      <div style={{ height }} role="img" aria-label={tr(`Débit de dose ${last.radiationDoseRate.toFixed(1)} microsieverts par heure`, `Dose rate ${last.radiationDoseRate.toFixed(1)} microsieverts per hour`)}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="timestamp" tickFormatter={hhmmss} minTickGap={48} {...AXIS} />
            <YAxis domain={[0, 40]} width={40} {...AXIS} />
            <Tooltip {...tip} />
            <Line type="stepAfter" dataKey="radiationDoseRate" name="µSv/h" stroke="var(--accent)" strokeWidth={1.75} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
