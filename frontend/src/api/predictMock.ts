/* Simulator (DÉMO) for forecasts, anomalies, and proposed solutions.
   Deterministic: same results for a given astronaut and hour. No real medical data.
   The real backend (Isolation Forest / LSTM autoencoder + forecast model) must return the same shapes
   (docs/API-CONTRACT.md). */
import type { AlertLevel, Anomaly, ForecastPoint, Horizon, MetricForecast, Prediction, PredictionMetric, Recommendation, RecommendationUpdate } from "./types";
import { applyHeartModels } from "./heartModels";
import { THRESHOLDS as TH } from "@/data/thresholds";
import { readLang } from "@/i18n";

const tx = (fr: string, en: string) => (readLang() === "en" ? en : fr);

const HOUR = 3_600_000, DAY = 24 * HOUR;
const noise = (seed: number) => { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x) - 0.5; };
const hash = (s: string) => [...s].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 9973;
const r1 = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

type Spec = {
  label: string; unit: string; dec: number; base: number; slopeH: number; slopeD: number; amp: number; sd: number;
  thr: MetricForecast["thresholds"]; every?: number; daily?: boolean; event?: { atH: number; add: number; width: number };
};
const DEF: Record<PredictionMetric, Omit<Spec, "base" | "slopeH" | "slopeD">> = {
  heart_rate: { label: "FC de repos", unit: "bpm", dec: 0, amp: 2.5, sd: 1.2, thr: { orange: TH.heart_rate.orange, rouge: TH.heart_rate.rouge, direction: "above" } },
  spo2: { label: "SpO₂", unit: "%", dec: 1, amp: 0.3, sd: 0.3, thr: { orange: TH.spo2.orange, rouge: TH.spo2.rouge, direction: "below" } },
  bp_systolic: { label: "Tension systolique", unit: "mmHg", dec: 0, amp: 3, sd: 2, every: 12, thr: { orange: TH.bp_systolic.orange, rouge: TH.bp_systolic.rouge, direction: "above" } },
  skin_temp: { label: "Température", unit: "°C", dec: 1, amp: 0.15, sd: 0.06, thr: { orange: TH.temperature.orangeHigh, rouge: TH.temperature.rougeHigh, direction: "above" } },
  glucose: { label: "Glycémie", unit: "mg/dL", dec: 0, amp: 6, sd: 3, every: 8, thr: { orange: TH.glucose_forecast.orange, rouge: TH.glucose_forecast.rouge, direction: "above" } },
  sleep: { label: "Sommeil", unit: "h", dec: 1, amp: 0, sd: 0.25, daily: true, thr: { orange: TH.sleep.orange, rouge: TH.sleep.rouge, direction: "below" } },
  radiation: { label: "Débit de dose", unit: "µSv/h", dec: 1, amp: 1.5, sd: 0.8, thr: { orange: TH.radiation.orange, rouge: TH.radiation.rouge, direction: "above" } },
};
const METRIC_EN: Record<PredictionMetric, string> = {
  heart_rate: "Resting HR", spo2: "SpO₂", bp_systolic: "Systolic pressure", skin_temp: "Temperature",
  glucose: "Glucose", sleep: "Sleep", radiation: "Dose rate",
};
// base, hourly slope (24 h horizon), daily slope (7 d horizon) — demo scenarios per astronaut
type P = [number, number, number];
const CREW_SPEC: Record<string, Partial<Record<PredictionMetric, P>> & { event?: Spec["event"] }> = {
  LK: { heart_rate: [94, 0.6, 1.6], spo2: [97, -0.01, -0.1], bp_systolic: [128, 0.22, 1.2], skin_temp: [37.1, 0.008, 0.04], glucose: [98, 0.1, 0.6], sleep: [5.3, 0, -0.08], radiation: [19.2, 0, 0.1] },
  AM: { heart_rate: [68, 0.02, 0.2], spo2: [98, 0, 0], bp_systolic: [118, 0.02, 0.2], skin_temp: [36.7, 0, 0], glucose: [94, 0, 0.2], sleep: [7.6, 0, 0.02], radiation: [18.5, 0, 0.1], event: { atH: 16, add: 26, width: 3 } },
  NO: { heart_rate: [62, 0, 0.05], spo2: [99, 0, 0], bp_systolic: [116, 0, 0.1], skin_temp: [36.6, 0, 0], glucose: [90, 0, 0], sleep: [7.1, 0, 0], radiation: [18.1, 0, 0.1] },
  SR: { heart_rate: [71, 0.03, 0.1], spo2: [97.6, -0.03, -0.25], bp_systolic: [121, 0.02, 0.2], skin_temp: [36.8, 0, 0], glucose: [92, 0.02, 0.2], sleep: [6.8, 0, -0.05], radiation: [18.8, 0, 0.1] },
};
const DRIFT: Record<string, number> = { LK: 0.58, AM: 0.12, NO: 0.09, SR: 0.27 };
const SEV: Record<AlertLevel, number> = { vert: 0, orange: 1, rouge: 2 };
const crosses = (v: number, t: MetricForecast["thresholds"], lvl: "orange" | "rouge") => { const x = t[lvl]; return x !== undefined && (t.direction === "above" ? v >= x : v <= x); };
const levelOf = (v: number, t: MetricForecast["thresholds"]): AlertLevel => (crosses(v, t, "rouge") ? "rouge" : crosses(v, t, "orange") ? "orange" : "vert");

function forecast(id: string, metric: PredictionMetric, horizon: Horizon, now: number): MetricForecast {
  const d = DEF[metric], [base, slopeH, slopeD] = CREW_SPEC[id]?.[metric] ?? [DEF[metric].thr.orange ?? 0, 0, 0];
  const ev = metric === "radiation" ? CREW_SPEC[id]?.event : undefined;
  const daily = d.daily || horizon === "7d";
  const step = daily ? DAY : HOUR, past = daily ? 7 : 24, fut = daily ? (horizon === "7d" ? 7 : 3) : 24;
  const t0 = Math.floor(now / step) * step, k = hash(id + metric);
  const val = (i: number) => { // i = step relative to now (negative = past)
    const h = (i * step) / HOUR;
    const trend = daily ? slopeD * i : slopeH * i;
    const circ = daily ? 0 : d.amp * Math.sin(((new Date(t0 + i * step).getUTCHours() - 4) / 24) * 2 * Math.PI);
    const bump = ev && !daily ? ev.add * Math.exp(-(((h - ev.atH) / ev.width) ** 2)) : ev && daily && i === 1 ? ev.add * 0.4 : 0;
    return base + trend + circ + bump;
  };
  const points: ForecastPoint[] = [];
  for (let i = -past; i <= fut; i++) {
    const p: ForecastPoint = { timestamp: new Date(t0 + i * step).toISOString() };
    const measured = !d.every || daily || ((t0 + i * step) / HOUR) % d.every === 0;
    if (i <= 0 && measured) p.observed = r1(val(i) + d.sd * 2 * noise(k + i), d.dec);
    if (i >= 0) { const w = d.sd * (1.2 + 0.18 * i * (daily ? 4 : 1)); p.predicted = r1(val(i), d.dec + 1); p.lower = r1(val(i) - w, d.dec + 1); p.upper = r1(val(i) + w, d.dec + 1); }
    points.push(p);
  }
  const futs = points.filter((p) => p.predicted !== undefined);
  let tth: number | null = null, tl: AlertLevel | undefined;
  for (const lvl of ["orange", "rouge"] as const) {
    if (crosses(futs[0].predicted!, d.thr, lvl)) continue; // already crossed
    const hit = futs.findIndex((p) => crosses(p.predicted!, d.thr, lvl));
    if (hit > 0) { tth = Math.round(((Date.parse(futs[hit].timestamp) - now) / HOUR) * 10) / 10; tl = lvl; break; }
  }
  const first = futs[0].predicted!, last = futs[futs.length - 1].predicted!;
  const delta = last - first, tol = d.sd * 1.5;
  const trend = Math.abs(delta) < tol ? "stable" : delta > 0 ? "hausse" : "baisse";
  const trendEn = trend === "hausse" ? "rising" : trend === "baisse" ? "falling" : "stable";
  const level = futs.reduce<AlertLevel>((a, p) => (SEV[levelOf(p.predicted!, d.thr)] > SEV[a] ? levelOf(p.predicted!, d.thr) : a), "vert");
  const label = tx(d.label, METRIC_EN[metric]);
  const span = tx(daily ? `${fut} prochains jours` : "24 prochaines heures", daily ? `next ${fut} days` : "next 24 hours");
  const summary = tx(
    `${label} : ${r1(first, d.dec)} ${d.unit} maintenant, prévision ${trend} sur les ${daily ? `${fut} prochains jours` : "24 prochaines heures"} (${r1(last, d.dec)} ${d.unit}). `
      + (tth != null ? `Seuil ${tl} (${d.thr[tl as "orange" | "rouge"]} ${d.unit}) probable dans environ ${fmtH(tth)}.` : "Aucun seuil franchi dans l’horizon."),
    `${label}: ${r1(first, d.dec)} ${d.unit} now, forecast ${trendEn} over the ${span} (${r1(last, d.dec)} ${d.unit}). `
      + (tth != null ? `${tl} threshold (${d.thr[tl as "orange" | "rouge"]} ${d.unit}) likely in about ${fmtH(tth)}.` : "No threshold crossed in the horizon."),
  );
  return { metric, label, unit: d.unit, resolution: daily ? "day" : "hour", points, thresholds: d.thr, level, trend, timeToThresholdHours: tth, thresholdLevel: tl, summary };
}
export const fmtH = (h: number) => (h < 48 ? `${Math.max(1, Math.round(h))} h` : `${Math.round(h / 24)} ${readLang() === "en" ? "d" : "j"}`);

const ANOMALIES: Record<string, Omit<Anomaly, "detectedAt">[]> = {
  LK: [
    { id: "AN-LK-01", astronautId: "LK", metric: "heart_rate", label: "FC de repos en hausse sur 3 jours", value: 94, unit: "bpm", level: "orange", model: "lstm_autoencoder", driftScore: 0.58,
      contributors: [{ signal: "FC de repos", weight: 0.46 }, { signal: "Durée de sommeil", weight: 0.31 }, { signal: "VFC (RMSSD)", weight: 0.15 }, { signal: "Température", weight: 0.08 }],
      explanation: "Erreur de reconstruction de l’autoencodeur LSTM au 97e centile de la ligne de base personnelle (J100–J123). FC de repos +20 bpm en 3 j, VFC en baisse, sommeil < 6 h deux nuits de suite.",
      plainExplanation: "Votre pouls au repos monte depuis 3 jours et vos nuits sont plus courtes que d’habitude." },
    { id: "AN-LK-02", astronautId: "LK", metric: "sleep", label: "Dette de sommeil", value: 5.2, unit: "h", level: "orange", model: "isolation_forest", driftScore: 0.49,
      contributors: [{ signal: "Durée de sommeil", weight: 0.58 }, { signal: "Humeur (questionnaire)", weight: 0.24 }, { signal: "Activité de la veille", weight: 0.18 }],
      explanation: "Isolation Forest : point isolé (score 0,49) sur le couple durée de sommeil / humeur ; 4 nuits consécutives sous la moyenne personnelle (7,1 h).",
      plainExplanation: "Vous dormez moins que d’habitude depuis 4 nuits." },
  ],
  SR: [
    { id: "AN-SR-01", astronautId: "SR", metric: "spo2", label: "SpO₂ basse transitoire (J126)", value: 91, unit: "%", level: "orange", model: "rule", driftScore: 0.27,
      contributors: [{ signal: "SpO₂", weight: 0.7 }, { signal: "Qualité du signal capteur", weight: 0.3 }],
      explanation: "Règle seuil : SpO₂ 91 % pendant 4 min (seuil 92 %), qualité de signal faible ; remesure à 98 %. Tendance prévue légèrement à la baisse sur 7 j : à surveiller.",
      plainExplanation: "Une mesure d’oxygène était basse hier soir, sans doute à cause du capteur. La remesure était normale." },
  ],
  AM: [], NO: [],
};

const RECS: Record<string, Omit<Recommendation, "status" | "updatedAt" | "updatedBy" | "note" | "replacementTitle">[]> = {
  LK: [
    { id: "RC-LK-01", astronautId: "LK", anomalyId: "AN-LK-02", source: "anomalie", category: "repos_sommeil", priority: "haute", title: "Avancer le coucher de 45 min ce soir (créneau protégé)", rationale: "Dette de sommeil sur 4 nuits, corrélée à la hausse de FC de repos (contribution 31 %).", plainText: "Couchez-vous 45 minutes plus tôt ce soir. Le créneau sommeil est protégé : aucun rappel ne vous dérangera." },
    { id: "RC-LK-02", astronautId: "LK", anomalyId: "AN-LK-01", source: "anomalie", category: "hydratation", priority: "moyenne", title: "Boire 500 mL d’eau d’ici 12:00", rationale: "La déshydratation relative en microgravité peut augmenter la FC de repos ; bilan hydrique de la veille bas.", plainText: "Buvez une poche d’eau de 500 mL avant midi." },
    { id: "RC-LK-03", astronautId: "LK", anomalyId: "AN-LK-01", source: "anomalie", category: "ajustement_exercice", priority: "moyenne", title: "Remplacer la séance ARED intense par 30 min de vélo modéré", rationale: "Limiter la charge cardiovasculaire tant que la FC de repos dépasse la ligne de base de +15 bpm.", plainText: "Aujourd’hui, faites 30 minutes de vélo tranquille au lieu de la séance de musculation intense." },
    { id: "RC-LK-04", astronautId: "LK", anomalyId: "AN-LK-01", source: "prevision", category: "remesure", priority: "moyenne", title: "Remesurer la FC au repos demain 07:30, allongée 5 min", rationale: "Seuil orange (100 bpm) prévu dans les prochaines heures : confirmer la tendance dans des conditions standardisées.", plainText: "Demain à 07:30, restez allongée 5 minutes puis lancez la mesure du pouls." },
    { id: "RC-LK-05", astronautId: "LK", anomalyId: "AN-LK-01", source: "anomalie", category: "echographie", priority: "haute", title: "Échographie cardiaque guidée (vue 4 cavités)", rationale: "Écarter une cause structurelle ; à réaliser par le médecin de bord avec le guidage pas à pas.", plainText: "Le médecin de bord vous proposera une échographie du cœur, guidée par la tablette." },
    { id: "RC-LK-06", astronautId: "LK", anomalyId: null, source: "prevision", category: "contact_flight_surgeon", priority: "basse", title: "Joindre l’avis du flight surgeon au prochain rapport (13:50 UTC)", rationale: "Tendance sur 3 jours ; l’avis de Houston est utile si la prévision se confirme.", plainText: "Vos données seront jointes au prochain rapport envoyé aux médecins de la NASA." },
  ],
  SR: [
    { id: "RC-SR-01", astronautId: "SR", anomalyId: "AN-SR-01", source: "anomalie", category: "remesure", priority: "moyenne", title: "Remesurer la SpO₂ ce soir, capteur repositionné (doigt réchauffé)", rationale: "Événement probablement artefactuel (qualité de signal faible) ; la tendance prévue reste à confirmer.", plainText: "Ce soir, réchauffez votre doigt puis refaites la mesure d’oxygène en plaçant bien le capteur." },
    { id: "RC-SR-02", astronautId: "SR", anomalyId: "AN-SR-01", source: "anomalie", category: "contact_medecin_bord", priority: "basse", title: "Prévenir le médecin de bord si essoufflement ou SpO₂ < 94 %", rationale: "Critère de sécurité : symptôme ou nouvelle valeur basse confirmée.", plainText: "Si vous êtes essoufflée ou si l’oxygène descend sous 94 %, prévenez le médecin de bord." },
  ],
  AM: [
    { id: "RC-AM-01", astronautId: "AM", anomalyId: null, source: "prevision", category: "abri_radiations", priority: "moyenne", title: "Préparer le repli vers l’abri anti-radiations pendant la sortie de J128", rationale: "Débit de dose prévu > 40 µSv/h pendant la sortie extravéhiculaire (passage SAA + activité solaire modérée).", plainText: "Pendant la sortie de demain, si le dosimètre passe à l’orange, rejoignez l’abri anti-radiations." },
  ],
  NO: [],
};

/* recommendation state (mock): kept in the browser so actions survive reload */
const STORE = "pulsar.mock.recommendations";
type St = Pick<Recommendation, "status" | "updatedAt" | "updatedBy" | "note" | "replacementTitle">;
const load = (): Record<string, St> => { try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch { return {}; } };
const INITIAL: Record<string, Partial<St>> = { "RC-LK-05": { status: "validee", updatedBy: "CMO-001", note: "Prévue à 14:00 à l’infirmerie." }, "RC-SR-01": { status: "faite", updatedBy: "AST-004" } };
const NOTE_EN: Record<string, string> = { "RC-LK-05": "Scheduled at 14:00 in the sickbay." };

const AN_EN: Record<string, Partial<Anomaly>> = {
  "AN-LK-01": {
    label: "Resting HR rising over 3 days",
    contributors: [{ signal: "Resting HR", weight: 0.46 }, { signal: "Sleep duration", weight: 0.31 }, { signal: "HRV (RMSSD)", weight: 0.15 }, { signal: "Temperature", weight: 0.08 }],
    explanation: "LSTM autoencoder reconstruction error at the 97th percentile of the personal baseline (D100–D123). Resting HR +20 bpm in 3 days, HRV down, sleep under 6 h two nights in a row.",
    plainExplanation: "Your resting pulse has been rising for 3 days and your nights are shorter than usual.",
  },
  "AN-LK-02": {
    label: "Sleep debt",
    contributors: [{ signal: "Sleep duration", weight: 0.58 }, { signal: "Mood (questionnaire)", weight: 0.24 }, { signal: "Previous-day activity", weight: 0.18 }],
    explanation: "Isolation Forest: isolated point (score 0.49) on sleep duration / mood; 4 nights in a row below the personal mean (7.1 h).",
    plainExplanation: "You have slept less than usual for 4 nights.",
  },
  "AN-SR-01": {
    label: "Transient low SpO₂ (D126)",
    contributors: [{ signal: "SpO₂", weight: 0.7 }, { signal: "Sensor signal quality", weight: 0.3 }],
    explanation: "Threshold rule: SpO₂ 91% for 4 min (threshold 92%), weak signal quality; remeasure at 98%. Forecast trend slightly down over 7 days: keep watching.",
    plainExplanation: "One oxygen reading was low last night, likely because of the sensor. The remeasure was normal.",
  },
};
const REC_EN: Record<string, Partial<Pick<Recommendation, "title" | "rationale" | "plainText">>> = {
  "RC-LK-01": { title: "Move bedtime 45 min earlier tonight (protected slot)", rationale: "Sleep debt over 4 nights, correlated with the resting-HR rise (31% contribution).", plainText: "Go to bed 45 minutes earlier tonight. The sleep slot is protected: no reminder will disturb you." },
  "RC-LK-02": { title: "Drink 500 mL of water by 12:00", rationale: "Relative dehydration in microgravity can raise resting HR; yesterday’s fluid balance was low.", plainText: "Drink a 500 mL water pouch before noon." },
  "RC-LK-03": { title: "Replace the intense ARED session with 30 min of moderate cycling", rationale: "Limit cardiovascular load while resting HR stays more than 15 bpm above baseline.", plainText: "Today, do 30 minutes of easy cycling instead of the intense strength session." },
  "RC-LK-04": { title: "Remeasure resting HR tomorrow at 07:30, lying down for 5 min", rationale: "Orange threshold (100 bpm) expected in the next hours: confirm the trend under standard conditions.", plainText: "Tomorrow at 07:30, lie still for 5 minutes, then start the pulse measurement." },
  "RC-LK-05": { title: "Guided cardiac ultrasound (4-chamber view)", rationale: "Rule out a structural cause; to be done by the crew surgeon with step-by-step guidance.", plainText: "The crew surgeon will offer a heart ultrasound, guided by the tablet." },
  "RC-LK-06": { title: "Attach the flight surgeon’s opinion to the next report (13:50 UTC)", rationale: "Three-day trend; Houston’s opinion helps if the forecast is confirmed.", plainText: "Your data will be attached to the next report sent to the NASA physicians." },
  "RC-SR-01": { title: "Remeasure SpO₂ tonight, sensor repositioned (warmed finger)", rationale: "Event likely an artifact (weak signal quality); the forecast trend still needs confirmation.", plainText: "Tonight, warm your finger, then repeat the oxygen measurement with the sensor seated well." },
  "RC-SR-02": { title: "Tell the crew surgeon if short of breath or SpO₂ < 94%", rationale: "Safety criterion: a symptom or a new confirmed low value.", plainText: "If you are short of breath or oxygen drops below 94%, tell the crew surgeon." },
  "RC-AM-01": { title: "Prepare a retreat to the radiation shelter during the D128 EVA", rationale: "Dose rate forecast above 40 µSv/h during the spacewalk (SAA pass + moderate solar activity).", plainText: "During tomorrow’s spacewalk, if the dosimeter goes orange, go to the radiation shelter." },
};

export function mockPredictions(id: string, horizon: Horizon = "24h"): Prediction {
  const now = Date.now(), hourT = Math.floor(now / HOUR) * HOUR;
  const forecasts = (Object.keys(DEF) as PredictionMetric[]).map((m) => {
    const f = forecast(id, m, horizon, now);
    if (m !== "heart_rate") return f;
    const points = applyHeartModels(f.points, f.resolution === "day" ? 7 : 24);
    const summary = tx(
      `${f.label} : médiane XGBoost, LSTM et Prophet. ${f.summary} Aide à la décision, pas un diagnostic.`,
      `${f.label}: XGBoost, LSTM and Prophet median. ${f.summary} Decision support, not a diagnosis.`,
    );
    return { ...f, points, summary };
  });
  const en = readLang() === "en";
  const anomalies = (ANOMALIES[id] ?? []).map((a, i) => ({ ...a, ...(en ? AN_EN[a.id] : {}), detectedAt: new Date(hourT - (i * 5 + 1) * HOUR).toISOString() }));
  const soon = forecasts.filter((f) => f.timeToThresholdHours != null).sort((a, b) => a.timeToThresholdHours! - b.timeToThresholdHours!)[0];
  const risk = [...forecasts.map((f) => f.level), ...anomalies.map((a) => a.level)].reduce<AlertLevel>((a, l) => (SEV[l] > SEV[a] ? l : a), "vert");
  return {
    astronautId: id, generatedAt: new Date(hourT).toISOString(), horizon, model: "xgboost + lstm + prophet", riskLevel: risk, driftScore: DRIFT[id] ?? 0.1,
    nextThreshold: soon ? { metric: soon.metric, label: soon.label, level: soon.thresholdLevel!, hours: soon.timeToThresholdHours! } : null,
    forecasts, anomalies,
  };
}
export function mockRecommendations(id: string): Recommendation[] {
  const st = load();
  const en = readLang() === "en";
  return (RECS[id] ?? []).map((r) => {
    const base = en ? { ...r, ...REC_EN[r.id] } : r;
    const seed = INITIAL[r.id];
    const seeded = seed?.note && en ? { ...seed, note: NOTE_EN[r.id] ?? seed.note } : seed;
    const merged = { status: "proposee" as const, updatedAt: null, updatedBy: null, note: null, replacementTitle: null, assignee: "CMO-001", ...base, ...seeded, ...(st[r.id] as Partial<St> | undefined) };
    const assignee = merged.updatedBy ?? (merged.status === "proposee" ? (id === "LK" ? "AST-001" : "CMO-001") : merged.assignee);
    return { ...merged, assignee };
  });
}
export function mockUpdateRecommendation(id: string, recId: string, u: RecommendationUpdate): Recommendation {
  const st = load();
  st[recId] = { status: u.status, updatedBy: u.by, updatedAt: new Date().toISOString(), note: u.note ?? null, replacementTitle: u.replacementTitle ?? null };
  localStorage.setItem(STORE, JSON.stringify(st));
  const r = mockRecommendations(id).find((x) => x.id === recId);
  if (!r) throw new Error(`Recommandation inconnue : ${recId}`);
  return r;
}
