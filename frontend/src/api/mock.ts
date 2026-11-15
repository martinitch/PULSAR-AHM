/* SIMULATED adapter (DÉMO): same signatures as the HTTP client, data generated from the demo crew.
   Used if VITE_USE_MOCK=true or if the API is unreachable. Fictitious values, deterministic per second. */
import { CREW } from "@/data/demo/crew";
import { phrase, readLang } from "@/i18n";
import type { Alert, Astronaut, TelemetrySample } from "./types";
import { LIGHT_TO_LEVEL } from "./mapping";
import type { PulsarApi, TelemetryQuery, AlertsQuery } from "./client";
import { mockHeartLive } from "./heartModels";
import { mockPredictions, mockRecommendations, mockUpdateRecommendation } from "./predictMock";

const MISSION_START = Date.UTC(2026, 6, 10); // mission day 1 (demo)
const BASE: Record<string, { hr: number; spo2: number; rate: number; drift: number }> = {
  AM: { hr: 68, spo2: 98, rate: 18.5, drift: 0.12 }, LK: { hr: 94, spo2: 97, rate: 19.2, drift: 0.58 },
  NO: { hr: 62, spo2: 99, rate: 18.1, drift: 0.09 }, SR: { hr: 71, spo2: 98, rate: 18.8, drift: 0.21 },
};
// stable pseudo-random noise (no Math.random: reproducible render)
const noise = (seed: number) => { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x) - 0.5; };
const hash = (id: string) => [...id].reduce((a, c) => a + c.charCodeAt(0), 0);

function sampleAt(id: string, t: number): TelemetrySample {
  const b = BASE[id] ?? BASE.AM, k = hash(id), sec = Math.floor(t / 1000);
  const hr = Math.round(b.hr + 3 * Math.sin(sec / 9 + k) + 2 * noise(sec + k));
  const spo2 = Math.round((b.spo2 + 0.6 * noise(sec * 3 + k)) * 10) / 10;
  const rate = Math.round((b.rate + 1.2 * noise(sec * 7 + k) + (sec % 300 < 20 ? 6 : 0)) * 10) / 10; // simulated SAA peak
  const days = (t - MISSION_START) / 86_400_000;
  return {
    astronautId: id, timestamp: new Date(sec * 1000).toISOString(), heartRate: hr, spo2: Math.min(100, spo2),
    radiationDoseRate: rate, radiationCumulative: Math.round(days * 0.33 * 100) / 100, skinTemp: 36.6 + 0.2 * noise(sec + 1),
    hrv: Math.round(48 - (b.hr - 60) * 0.6 + 4 * noise(sec + 2)), driftScore: Math.max(0, Math.min(1, b.drift + 0.05 * noise(sec + 3))), sensorId: `esp32-${id.toLowerCase()}-wrist`,
  };
}

export const mockApi: PulsarApi = {
  source: "mock",
  async astronauts(): Promise<Astronaut[]> {
    const now = Date.now();
    return CREW.map((m) => ({ id: m.id, name: m.name, role: m.role, cabin: m.cabin, status: LIGHT_TO_LEVEL[m.light], driftScore: (BASE[m.id] ?? BASE.AM).drift, lastSync: new Date(now - 120_000).toISOString() }));
  },
  async telemetry({ astronautId, limit = 60, stepSec = 2, until }: TelemetryQuery): Promise<TelemetrySample[]> {
    const now = Math.floor((until ? Date.parse(until) : Date.now()) / 1000 / stepSec) * stepSec * 1000;
    return Array.from({ length: limit }, (_, i) => sampleAt(astronautId, now - (limit - 1 - i) * stepSec * 1000));
  },
  async alerts({ astronautId, level }: AlertsQuery = {}): Promise<Alert[]> {
    const d = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
    const all: Alert[] = [
      { id: "AL-127-004", astronautId: "LK", level: "orange", metric: "heart_rate", message: "FC de repos en hausse sur 3 jours (94 bpm, plage 60–100).", value: 94, threshold: 90, driftScore: 0.58, model: "lstm_autoencoder", createdAt: d(3), acknowledged: false, assignee: "CMO-001", workflowStatus: "nouveau", seenAt: null, ackBy: null },
      { id: "AL-127-003", astronautId: "LK", level: "orange", metric: "drift", message: "Dérive multivariée (sommeil court + FC) détectée par l’autoencodeur.", driftScore: 0.61, model: "lstm_autoencoder", createdAt: d(31), acknowledged: false, assignee: "CMO-001", workflowStatus: "vu", seenAt: d(20), ackBy: null },
      { id: "AL-126-012", astronautId: "SR", level: "rouge", metric: "spo2", message: "SpO₂ 91 % pendant 4 min (seuil 92 %).", value: 91, threshold: 92, driftScore: 0.74, model: "rule", createdAt: d(651), acknowledged: true, assignee: "CMO-001", workflowStatus: "resolu", seenAt: d(650), ackBy: "CMO-001" },
      { id: "AL-126-009", astronautId: "AM", level: "vert", metric: "radiation", message: "Passage anomalie de l’Atlantique Sud : débit de dose transitoire, cumul dans la plage.", value: 24.6, threshold: 40, driftScore: 0.14, model: "isolation_forest", createdAt: d(820), acknowledged: true, assignee: "NASA-FS-001", workflowStatus: "resolu", seenAt: d(810), ackBy: "NASA-FS-001" },
    ];
    const lang = readLang();
    return all
      .filter((a) => (!astronautId || a.astronautId === astronautId) && (!level || a.level === level))
      .map((a) => ({ ...a, message: phrase(lang, a.message) }));
  },
  async predictions(id, horizon) { return mockPredictions(id, horizon); },
  async heartForecast({ astronautId, until }) { return mockHeartLive(astronautId, until); },
  async recommendations(id) { return mockRecommendations(id); },
  async updateRecommendation(id, recId, u) { return mockUpdateRecommendation(id, recId, u); },
};
