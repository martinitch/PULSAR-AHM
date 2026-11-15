/* PULSAR API types (planned Python FastAPI backend — see docs/API-CONTRACT.md).
   The server JSON is snake_case; the client converts it to camelCase (these types). */

/** Backend alert level: vert = nominal, orange = caution, rouge = alert. */
export type AlertLevel = "vert" | "orange" | "rouge";

/** GET /astronauts */
export type Astronaut = {
  id: string;            // "LK" (crew id, = users' crewId)
  name: string;          // "Lina Kovacs"
  role: string;          // role on board: "Ingénieure de vol"
  cabin: string;         // "Cabine 2"
  status: AlertLevel;    // overall status computed by the backend
  driftScore: number;    // 0–1, model drift score (Isolation Forest / LSTM autoencoder)
  lastSync: string;      // ISO 8601 UTC of the last sensor sync
};

/** GET /telemetry — one sensor sample (ESP-32: watch / belt / dosimeter). */
export type TelemetrySample = {
  astronautId: string;
  timestamp: string;              // ISO 8601 UTC
  heartRate: number;              // bpm
  spo2: number;                   // %
  radiationDoseRate: number;      // µSv/h (instantaneous rate)
  radiationCumulative: number;    // mSv cumulative over the mission
  skinTemp?: number;              // °C
  hrv?: number;                   // ms (RMSSD)
  driftScore: number;             // 0–1 for this sample
  sensorId?: string;              // "esp32-lk-wrist"
};

export type AlertMetric = "heart_rate" | "spo2" | "radiation" | "skin_temp" | "hrv" | "drift";
export type AlertModel = "isolation_forest" | "lstm_autoencoder" | "rule";

/** Shared lifecycle (alert, solution, exam, report, watch). */
export type WorkflowStatus = "nouveau" | "vu" | "pris_en_charge" | "resolu" | "escalade";

/** GET /alerts */
export type Alert = {
  id: string;
  astronautId: string;
  level: AlertLevel;
  metric: AlertMetric;
  message: string;        // French text ready to display
  value?: number;
  threshold?: number;
  driftScore: number;     // 0–1
  model: AlertModel;
  createdAt: string;      // ISO 8601 UTC
  acknowledged: boolean;
  /** Current owner (AST-/CMO-/NASA-FS- id or short role). */
  assignee?: string | null;
  /** Acknowledged / seen (watch or tablet) — ISO 8601 UTC. */
  seenAt?: string | null;
  /** Who acknowledged / confirmed receipt. */
  ackBy?: string | null;
  /** Workflow state; derived if absent. */
  workflowStatus?: WorkflowStatus | null;
};

/** Origin of displayed data: real API or local simulator (DÉMO). */
export type DataSource = "api" | "mock";

/* ───────── Predictions and proposed solutions (decision support, NOT a diagnosis) ───────── */

/** Metrics forecast by the prediction model. */
export type PredictionMetric = "heart_rate" | "spo2" | "bp_systolic" | "skin_temp" | "glucose" | "sleep" | "radiation";
/** Requested horizon: 24 h (hourly step) or 7 days (daily step). */
export type Horizon = "24h" | "7d";

/** A curve point: observed (past) and/or predicted (future) with confidence interval [lower, upper]. */
export type ForecastPoint = {
  timestamp: string;     // ISO 8601 UTC
  observed?: number;     // real measurement (absent in the future or between two kit readings)
  predicted?: number;    // predicted value (present from the last observed point)
  lower?: number;        // lower bound of the confidence interval (80%)
  upper?: number;        // upper bound
  xgboost?: number;      // HR: XGBoost forecast
  lstm?: number;         // HR: LSTM forecast
  prophet?: number;      // HR: Prophet forecast
};

/** GET /heart-rate/live — observed HR and short forecasts from the three models. */
export type HeartLivePoint = {
  timestamp: string;
  heartRate?: number;
  predicted?: number;
  lower?: number;
  upper?: number;
  xgboost?: number;
  lstm?: number;
  prophet?: number;
};
export type HeartLiveForecast = {
  astronautId: string;
  generatedAt: string;
  stepSec: number;
  models: Array<"xgboost" | "lstm" | "prophet">;
  note: string;
  points: HeartLivePoint[];
};

export type MetricForecast = {
  metric: PredictionMetric;
  label: string;                    // "FC de repos"
  unit: string;                     // "bpm"
  resolution: "hour" | "day";       // sleep is always daily
  points: ForecastPoint[];          // chronological order
  thresholds: { orange?: number; rouge?: number; direction: "above" | "below" };
  level: AlertLevel;                // level predicted at the end of the horizon
  trend: "hausse" | "baisse" | "stable";
  timeToThresholdHours?: number | null; // estimated delay before crossing `thresholdLevel` (null = not within the horizon)
  thresholdLevel?: AlertLevel;      // threshold involved (orange or red)
  summary: string;                  // French sentence for screen readers (EF-47)
};

/** Signal that contributed to an anomaly (weight 0–1, sum ≈ 1). */
export type Contributor = { signal: string; weight: number };

/** Anomaly detected by a model. */
export type Anomaly = {
  id: string;
  astronautId: string;
  metric: PredictionMetric | "drift";
  label: string;                    // "FC de repos en hausse"
  value?: number;
  unit?: string;
  level: AlertLevel;
  model: AlertModel;
  driftScore: number;               // 0–1
  detectedAt: string;               // ISO 8601 UTC
  contributors: Contributor[];
  explanation: string;              // detailed text (physician)
  plainExplanation: string;         // plain text (astronaut)
};

/** GET /predictions/{astronaut_id}?horizon=24h|7d */
export type Prediction = {
  astronautId: string;
  generatedAt: string;
  horizon: Horizon;
  model: string;                    // "lstm_forecaster v0.3"
  riskLevel: AlertLevel;            // predicted overall risk level
  driftScore: number;               // 0–1
  nextThreshold?: { metric: PredictionMetric; label: string; level: AlertLevel; hours: number } | null;
  forecasts: MetricForecast[];
  anomalies: Anomaly[];
};

export type RecommendationCategory =
  | "hydratation" | "repos_sommeil" | "ajustement_exercice" | "abri_radiations"
  | "remesure" | "echographie" | "contact_medecin_bord" | "contact_flight_surgeon";
export type Priority = "haute" | "moyenne" | "basse";
/** Lifecycle: proposed → applied / done / escalated; the crew medical officer can validate or replace. */
export type RecommendationStatus = "proposee" | "appliquee" | "faite" | "escaladee" | "validee" | "remplacee";

/** GET /recommendations/{astronaut_id} — proposed solution, non-diagnostic. */
export type Recommendation = {
  id: string;
  astronautId: string;
  anomalyId?: string | null;        // linked anomaly (or null if it comes from a forecast)
  source: "anomalie" | "prevision";
  category: RecommendationCategory;
  priority: Priority;
  title: string;                    // "Boire 500 mL d’eau d’ici 12:00"
  rationale: string;                // why (physician text)
  plainText: string;                // instruction in plain language (astronaut)
  status: RecommendationStatus;
  updatedAt?: string | null;
  updatedBy?: string | null;        // user id ("AST-001", "CMO-001")
  /** Current owner of the solution. */
  assignee?: string | null;
  note?: string | null;             // crew medical officer note
  replacementTitle?: string | null; // new instruction if "remplacee"
};

/** PATCH /recommendations/{astronaut_id}/{recommendation_id} */
export type RecommendationUpdate = { status: RecommendationStatus; by: string; note?: string; replacementTitle?: string };
