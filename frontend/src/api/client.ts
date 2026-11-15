/* Typed HTTP client for the PULSAR API (FastAPI). Base: VITE_API_URL (default http://localhost:8000).
   - VITE_USE_MOCK=true → local simulator (mock.ts) only.
   - Otherwise: real API; if it is unreachable, automatic failover to the simulator for 30 s, then retry.
   JSON contract: docs/API-CONTRACT.md. */
import type { Alert, AlertLevel, Astronaut, DataSource, HeartLiveForecast, Horizon, Prediction, Recommendation, RecommendationUpdate, TelemetrySample } from "./types";
import { camelize, snakeize, toAlert, toAstronaut, toSample } from "./mapping";

export type TelemetryQuery = { astronautId: string; limit?: number; stepSec?: number; since?: string; until?: string };
export type AlertsQuery = { astronautId?: string; level?: AlertLevel };
export interface PulsarApi {
  source: DataSource;
  astronauts(): Promise<Astronaut[]>;
  telemetry(q: TelemetryQuery): Promise<TelemetrySample[]>;
  alerts(q?: AlertsQuery): Promise<Alert[]>;
  /** GET /predictions/{astronaut_id}?horizon=24h|7d */
  predictions(astronautId: string, horizon?: Horizon): Promise<Prediction>;
  /** GET /heart-rate/live — short XGBoost, LSTM, and Prophet forecast. */
  heartForecast(q: { astronautId: string; until?: string }): Promise<HeartLiveForecast>;
  /** GET /recommendations/{astronaut_id} */
  recommendations(astronautId: string): Promise<Recommendation[]>;
  /** PATCH /recommendations/{astronaut_id}/{recommendation_id} */
  updateRecommendation(astronautId: string, id: string, u: RecommendationUpdate): Promise<Recommendation>;
}

/** API on the same host as the page: localhost stays localhost; an IP (Wi-Fi) talks to the server on that IP. */
function apiBase(): string {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1") return `http://${host}:8000`;
  }
  return "http://localhost:8000";
}

export const API_URL = apiBase();
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); this.name = "ApiError"; } }
export class NetworkError extends Error { constructor(message: string) { super(message); this.name = "NetworkError"; } }

/** Id already in the session (not an API key). The server filters by role. */
function sessionUserHeader(): Record<string, string> {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem("pulsar.session");
    const id = raw ? (JSON.parse(raw) as { user?: { id?: string } }).user?.id : undefined;
    if (typeof id === "string" && id) return { "X-User-Id": id };
  } catch { /* unreadable session: the server responds as a demo read without an identity */ }
  return {};
}

async function get<T>(path: string, params: Record<string, string | number | undefined> = {}, timeoutMs = 4000, init?: RequestInit): Promise<T> {
  const url = new URL(API_URL + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try { res = await fetch(url, { ...init, headers: { Accept: "application/json", ...sessionUserHeader(), ...(init?.headers ?? {}), ...(init?.body ? { "Content-Type": "application/json" } : {}) }, signal: ctrl.signal }); }
  catch (e) { throw new NetworkError(`API injoignable (${API_URL}) : ${(e as Error).message}`); }
  finally { clearTimeout(t); }
  if (!res.ok) throw new ApiError(res.status, `${path} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

type J = Record<string, unknown>;
export const httpApi: PulsarApi = {
  source: "api",
  astronauts: async () => (await get<J[]>("/astronauts")).map(toAstronaut),
  telemetry: async ({ astronautId, limit = 60, since, until }) => (await get<J[]>("/telemetry", { astronaut_id: astronautId, limit, since, until })).map(toSample),
  alerts: async (q = {}) => (await get<J[]>("/alerts", { astronaut_id: q.astronautId, level: q.level })).map(toAlert),
  predictions: async (id, horizon = "24h") => camelize<Prediction>(await get<J>(`/predictions/${encodeURIComponent(id)}`, { horizon })),
  heartForecast: async ({ astronautId, until }) => camelize<HeartLiveForecast>(await get<J>("/heart-rate/live", { astronaut_id: astronautId, until })),
  recommendations: async (id) => camelize<Recommendation[]>(await get<J[]>(`/recommendations/${encodeURIComponent(id)}`)),
  updateRecommendation: async (id, recId, u) => camelize<Recommendation>(await get<J>(`/recommendations/${encodeURIComponent(id)}/${encodeURIComponent(recId)}`, {}, 4000, { method: "PATCH", body: JSON.stringify(snakeize(u)) })),
};
