/* JSON conversions (snake_case, Python backend) ↔ TS types (camelCase) + level ↔ UI status lamp. */
import type { Light } from "@/data/types";
import type { Alert, AlertLevel, Astronaut, TelemetrySample } from "./types";

type J = Record<string, unknown>;
const s = (v: unknown) => String(v ?? "");
const n = (v: unknown) => Number(v ?? 0);
const opt = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));

export const toAstronaut = (j: J): Astronaut => ({ id: s(j.id), name: s(j.name), role: s(j.role), cabin: s(j.cabin), status: s(j.status) as AlertLevel, driftScore: n(j.drift_score), lastSync: s(j.last_sync) });
export const toSample = (j: J): TelemetrySample => ({
  astronautId: s(j.astronaut_id), timestamp: s(j.timestamp), heartRate: n(j.heart_rate), spo2: n(j.spo2),
  radiationDoseRate: n(j.radiation_dose_rate), radiationCumulative: n(j.radiation_cumulative), skinTemp: opt(j.skin_temp), hrv: opt(j.hrv),
  driftScore: n(j.drift_score), sensorId: j.sensor_id ? s(j.sensor_id) : undefined,
});
export const toAlert = (j: J): Alert => ({
  id: s(j.id), astronautId: s(j.astronaut_id), level: s(j.level) as AlertLevel, metric: s(j.metric) as Alert["metric"], message: s(j.message),
  value: opt(j.value), threshold: opt(j.threshold), driftScore: n(j.drift_score), model: s(j.model) as Alert["model"], createdAt: s(j.created_at), acknowledged: Boolean(j.acknowledged),
  assignee: j.assignee != null ? s(j.assignee) : null,
  seenAt: j.seen_at != null ? s(j.seen_at) : null,
  ackBy: j.ack_by != null ? s(j.ack_by) : null,
  workflowStatus: j.workflow_status != null ? (s(j.workflow_status) as Alert["workflowStatus"]) : null,
});

export const LEVEL_TO_LIGHT: Record<AlertLevel, Light> = { vert: "ok", orange: "caution", rouge: "warning" };
export const LIGHT_TO_LEVEL: Record<Light, AlertLevel> = { ok: "vert", caution: "orange", warning: "rouge" };

/* Generic key conversion (predictions, recommendations): snake_case ↔ camelCase, recursively. */
const toCamel = (k: string) => k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
function deepKeys(v: unknown, f: (k: string) => string): unknown {
  if (Array.isArray(v)) return v.map((x) => deepKeys(x, f));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as J).map(([k, x]) => [f(k), deepKeys(x, f)]));
  return v;
}
export const camelize = <T,>(v: unknown) => deepKeys(v, toCamel) as T;
export const snakeize = (v: unknown) => deepKeys(v, toSnake);
