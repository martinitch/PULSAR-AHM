/* An astronaut's "Predictions" block: overall risk, time to threshold, forecast/observed curves,
   detected anomalies (contributing signals) and proposed solutions.
   mode "simple" = astronaut (plain language); "detail" = crew surgeon (models, scores, contributions). */
import { useState } from "react";
import { motion } from "motion/react";
import { fmtH, LEVEL_TO_LIGHT, usePredictions, type Anomaly, type Horizon, type Prediction } from "@/api";
import { Card, Icon, Lamp } from "@/components/ui";
import { DataTag } from "@/app/DataSource";
import type { Role } from "@/data/types";
import { ForecastChart, ForecastLegend } from "./ForecastChart";
import { AstronautLad } from "./AstronautLad";
import { Disclaimer, Solutions } from "./Solutions";
import { readLang, useLang, type Lang } from "@/i18n";

export const MODEL_LABEL = { isolation_forest: "Isolation Forest · SIMULÉ", lstm_autoencoder: "Autoencodeur LSTM · SIMULÉ", rule: "Règle seuil · SIMULÉ" } as const;
const MODEL_EN = { isolation_forest: "Isolation Forest · SIMULATED", lstm_autoencoder: "LSTM autoencoder · SIMULATED", rule: "Threshold rule · SIMULATED" } as const;
const LEVEL_WORD = { vert: "faible", orange: "modéré", rouge: "élevé" } as const;
const LEVEL_EN = { vert: "low", orange: "moderate", rouge: "high" } as const;
export function modelWord(key: keyof typeof MODEL_LABEL, lang: Lang = readLang()) {
  return lang === "en" ? MODEL_EN[key] : MODEL_LABEL[key];
}

export function HorizonToggle({ value, onChange }: { value: Horizon; onChange: (h: Horizon) => void }) {
  const { tr } = useLang();
  return (
    <div className="seg2" role="group" aria-label={tr("Horizon de prévision", "Forecast horizon")}>
      <button aria-pressed={value === "24h"} onClick={() => onChange("24h")}>{tr("24 heures", "24 hours")}</button>
      <button aria-pressed={value === "7d"} onClick={() => onChange("7d")}>{tr("7 jours", "7 days")}</button>
    </div>
  );
}

export function nextThresholdText(p: Prediction, simple?: boolean) {
  const n = p.nextThreshold;
  const en = readLang() === "en";
  if (!n) return simple
    ? (en ? "No threshold should be crossed in this period." : "Aucun seuil ne devrait être franchi sur cette période.")
    : (en ? "No threshold crossing expected in the horizon." : "Aucun franchissement de seuil prévu dans l’horizon.");
  return simple
    ? (en ? `${n.label}: could reach ${n.level} in ~${fmtH(n.hours)}.` : `${n.label} : pourrait passer à l’${n.level} dans ~${fmtH(n.hours)}.`)
    : (en ? `${n.level} threshold likely in ~${fmtH(n.hours)} (${n.label}).` : `Seuil ${n.level} probable dans ~${fmtH(n.hours)} (${n.label}).`);
}

export function DriftMeter({ v }: { v: number }) {
  const { tr } = useLang();
  const l = v >= 0.7 ? "high" : v >= 0.4 ? "medium" : "ok";
  return (
    <div className="drift" role="meter" aria-valuemin={0} aria-valuemax={1} aria-valuenow={v} aria-label={tr("Score de dérive", "Drift score")}>
      <span className="drift-bar"><motion.i className={`d-${l}`} initial={{ width: 0 }} animate={{ width: `${Math.round(v * 100)}%` }} transition={{ duration: 0.4, ease: "easeOut" }} /></span>
      <span className="mono">{v.toFixed(2)}</span>
    </div>
  );
}

function RiskSummary({ p, simple }: { p: Prediction; simple: boolean }) {
  const { tr, lang } = useLang();
  const word = lang === "en" ? LEVEL_EN[p.riskLevel] : LEVEL_WORD[p.riskLevel];
  return (
    <div className="risk">
      <div><p className="eyebrow">{simple ? tr("Risque prévu", "Forecast risk") : tr("Niveau de risque prévu", "Forecast risk level")}</p><div className="risk-lamp"><Lamp l={LEVEL_TO_LIGHT[p.riskLevel]} /><span className="muted">{p.riskLevel} · {word}</span></div></div>
      <div><p className="eyebrow">{tr("Score de dérive", "Drift score")}</p><DriftMeter v={p.driftScore} /></div>
      <div className="risk-next"><p className="eyebrow">{tr("Prochain seuil", "Next threshold")}</p><p className="risk-tth"><Icon name="hourglass" size={16} /> {nextThresholdText(p, simple)}</p></div>
      {!simple && <p className="muted small risk-model"><Icon name="memory" size={14} /> {p.model} · {tr("série de démonstration", "demo series")} · {tr("généré", "generated")} {p.generatedAt.slice(11, 16)} UTC</p>}
    </div>
  );
}

export function AnomalyList({ items, simple, selected, onSelect }: { items: Anomaly[]; simple?: boolean; selected?: string; onSelect?: (id: string) => void }) {
  const { tr, lang } = useLang();
  if (!items.length) return <p className="r-note"><Icon name="check_circle" size={16} /> {simple ? tr("Rien d’inhabituel n’a été remarqué.", "Nothing unusual was noticed.") : tr("Aucune anomalie détectée.", "No anomaly detected.")}</p>;
  return (
    <ul className="anom-list">
      {items.map((a) => (
        <li key={a.id} data-id={a.id} className={selected === a.id ? "is-selected" : ""}>
          <div className="anom-head"><Lamp l={LEVEL_TO_LIGHT[a.level]} compact /><b>{a.label}</b>{a.value != null && <span className="mono">{a.value} {a.unit}</span>}{onSelect && <button className="forecast-inspect" aria-pressed={selected === a.id} onClick={() => onSelect(a.id)} aria-label={tr(`Inspecter ${a.label}`, `Inspect ${a.label}`)}><Icon name="info" size={14} /></button>}</div>
          <p>{simple ? a.plainExplanation : a.explanation}</p>
          {!simple && (
            <>
              <p className="anom-meta mono">{modelWord(a.model, lang)} · {tr("dérive", "drift")} {a.driftScore.toFixed(2)} · {tr("détectée", "detected")} {a.detectedAt.slice(11, 16)} UTC · {a.id}</p>
              <div className="contrib" aria-label={tr("Signaux ayant contribué", "Contributing signals")}>
                <p className="eyebrow">{tr("Signaux contributeurs", "Contributing signals")}</p>
                {a.contributors.map((c) => (
                  <div key={c.signal} className="contrib-row"><span>{c.signal}</span><span className="contrib-bar"><motion.i initial={{ width: 0 }} whileInView={{ width: `${Math.round(c.weight * 100)}%` }} viewport={{ once: true }} transition={{ duration: 0.4 }} /></span><span className="mono">{Math.round(c.weight * 100)} %</span></div>
                ))}
              </div>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

type Sel = { kind: "forecast"; id: string } | { kind: "anomaly"; id: string } | null;

/** "Inspector" panel (crew surgeon): properties of the selected item (forecast or anomaly). */
function Inspector({ p, sel }: { p: Prediction; sel: Sel }) {
  const { tr, lang } = useLang();
  const f = sel?.kind === "forecast" ? p.forecasts.find((x) => x.metric === sel.id) : undefined;
  const a = sel?.kind === "anomaly" ? p.anomalies.find((x) => x.id === sel.id) : undefined;
  const rows: [string, string][] = f ? [
    [tr("Indicateur", "Metric"), f.label], [tr("Unité", "Unit"), f.unit], [tr("Résolution", "Resolution"), f.resolution === "day" ? tr("journalière", "daily") : tr("horaire", "hourly")], [tr("Horizon", "Horizon"), p.horizon === "7d" ? tr("7 jours", "7 days") : tr("24 heures", "24 hours")],
    [tr("Seuil orange", "Orange threshold"), f.thresholds.orange != null ? `${f.thresholds.direction === "below" ? "≤" : "≥"} ${f.thresholds.orange} ${f.unit}` : "—"],
    [tr("Seuil rouge", "Red threshold"), f.thresholds.rouge != null ? `${f.thresholds.direction === "below" ? "≤" : "≥"} ${f.thresholds.rouge} ${f.unit}` : "—"],
    [tr("Tendance", "Trend"), f.trend === "hausse" ? tr("hausse", "rising") : f.trend === "baisse" ? tr("baisse", "falling") : tr("stable", "stable")], [tr("Niveau prévu", "Forecast level"), f.level], [tr("Délai avant seuil", "Time to threshold"), f.timeToThresholdHours != null ? `~${fmtH(f.timeToThresholdHours).replace(/ j$/, lang === "en" ? " d" : " j")} (${f.thresholdLevel})` : tr("aucun", "none")], [tr("Points", "Points"), String(f.points.length)], [tr("Modèle", "Model"), p.model],
  ] : a ? [
    [tr("Identifiant", "Identifier"), a.id], [tr("Indicateur", "Metric"), a.metric], [tr("Valeur", "Value"), a.value != null ? `${a.value} ${a.unit ?? ""}` : "—"], [tr("Niveau", "Level"), a.level], [tr("Modèle", "Model"), modelWord(a.model, lang)],
    [tr("Score de dérive", "Drift score"), a.driftScore.toFixed(2)], [tr("Détectée", "Detected"), `${a.detectedAt.slice(0, 16).replace("T", " ")} UTC`], ...a.contributors.map((c) => [`${tr("Contribution", "Contribution")} · ${c.signal}`, `${Math.round(c.weight * 100)} %`] as [string, string]),
  ] : [];
  return (
    <aside className="inspector" aria-label={tr("Inspecteur", "Inspector")}>
      <header><Icon name="info" size={16} /><h3>{tr("Inspecteur", "Inspector")}</h3></header>
      {rows.length ? (
        <>
          <p className="insp-title">{f ? f.label : a?.label}</p>
          <dl className="insp-props">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="mono">{v}</dd></div>)}</dl>
          {f && <p className="insp-sum">{f.summary}</p>}
          {a && <p className="insp-sum">{a.explanation}</p>}
        </>
      ) : <p className="muted small">{tr("Sélectionnez une courbe ou une anomalie (bouton « i ») pour voir ses propriétés.", "Select a curve or an anomaly (the “i” button) to see its properties.")}</p>}
    </aside>
  );
}

export function PredictionPanel({ astronautId, role }: { astronautId: string; role: Role }) {
  const { tr } = useLang();
  const simple = role === "astronaute";
  const [h, setH] = useState<Horizon>("24h");
  const [sel, setSel] = useState<Sel>(null);
  const { data: p, isLoading, isError } = usePredictions(astronautId, h);
  if (isError) return <p className="chart-empty">{tr("Prévisions indisponibles.", "Forecasts unavailable.")}</p>;
  if (isLoading || !p) return <p className="chart-empty">{tr("Calcul des prévisions…", "Computing forecasts…")}</p>;
  const pick = (s: Sel) => setSel((cur) => (cur && s && cur.kind === s.kind && cur.id === s.id ? null : s));
  const main = (
    <div className="pred" data-astronaut={astronautId}>
      <Disclaimer simple={simple} />
      <Card title={simple ? tr("Votre tendance", "Your trend") : tr("Synthèse du modèle", "Model summary")} icon="insights" aside={<DataTag />}><RiskSummary p={p} simple={simple} /></Card>
      <Card title={simple ? tr("Ce qui est prévu", "What is forecast") : tr("Prévisions · observé vs prévu", "Forecasts · observed vs predicted")} icon="timeline" aside={<HorizonToggle value={h} onChange={setH} />} className={simple ? "" : "dense"}>
        <div className="forecast-grid">{p.forecasts.map((f) => <ForecastChart key={f.metric + h} f={f} simple={simple} height={f.metric === "heart_rate" ? 220 : simple ? 120 : 130} selected={sel?.kind === "forecast" && sel.id === f.metric} onSelect={simple ? undefined : () => pick({ kind: "forecast", id: f.metric })} />)}</div>
        <ForecastLegend models={p.forecasts.some((f) => f.points.some((pt) => pt.xgboost != null))} />
      </Card>
      {!simple && <Card title={tr("Dernières valeurs disponibles", "Latest available values")} icon="monitoring" className="dense"><AstronautLad astronautId={astronautId} /></Card>}
      <div className="two-col">
        <Card title={simple ? tr("Ce que PULSAR a remarqué", "What PULSAR noticed") : tr("Anomalies détectées", "Detected anomalies")} icon="notification_important"><AnomalyList items={p.anomalies} simple={simple} selected={sel?.kind === "anomaly" ? sel.id : undefined} onSelect={simple ? undefined : (id) => pick({ kind: "anomaly", id })} /></Card>
        <Card title={simple ? tr("Ce que vous pouvez faire", "What you can do") : tr("Solutions proposées", "Proposed solutions")} icon="healing"><Solutions astronautId={astronautId} role={role} anomalies={p.anomalies} /></Card>
      </div>
    </div>
  );
  if (simple || role === "nasa") return main;
  return <div className="pred-layout">{main}<Inspector p={p} sel={sel} /></div>;
}
