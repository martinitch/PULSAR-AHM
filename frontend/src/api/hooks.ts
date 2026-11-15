/* Data hooks (TanStack React Query). The QueryClient is provided in app/App.tsx. */
import { useEffect, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, currentSource, onSourceChange } from "./service";
import type { AlertLevel, DataSource, Horizon, RecommendationUpdate } from "./types";
import { useLang } from "@/i18n";

/** Telemetry for one astronaut: real time (refreshed every `intervalMs`) or a fixed window ending at `until`. */
export function useTelemetry(astronautId: string | undefined, { limit = 60, intervalMs = 2000, until }: { limit?: number; intervalMs?: number; until?: string } = {}) {
  return useQuery({
    queryKey: ["telemetry", astronautId, limit, until ?? "live"],
    queryFn: () => api.telemetry({ astronautId: astronautId!, limit, until }),
    enabled: !!astronautId,
    refetchInterval: until ? false : intervalMs, // fixed window = no refresh
    placeholderData: (prev) => prev,
  });
}

/** Alerts (filterable by astronaut and vert/orange/rouge level), refreshed every 15 s. */
export function useAlerts(q: { astronautId?: string; level?: AlertLevel } = {}) {
  const { lang } = useLang();
  return useQuery({ queryKey: ["alerts", q.astronautId, q.level, lang], queryFn: () => api.alerts(q), refetchInterval: 15_000 });
}

/** Crew with overall status and drift score, refreshed every 30 s. */
export function useAstronauts() {
  return useQuery({ queryKey: ["astronauts"], queryFn: () => api.astronauts(), refetchInterval: 30_000 });
}

/** Source of displayed data: "api" or "mock" (DÉMO simulator). */
export function useDataSource(): DataSource {
  const [s, set] = useState<DataSource>(currentSource());
  useEffect(() => onSourceChange(set), []);
  return s;
}

/** Real-time HR: observed + short XGBoost, LSTM, and Prophet forecast. */
export function useHeartForecast(astronautId: string | undefined, until?: string) {
  return useQuery({
    queryKey: ["heart-forecast", astronautId, until ?? "live"],
    queryFn: () => api.heartForecast({ astronautId: astronautId!, until }),
    enabled: !!astronautId,
    refetchInterval: until ? false : 2000,
    placeholderData: (prev) => (prev?.astronautId === astronautId ? prev : undefined),
  });
}

/** Forecasts + anomalies for one astronaut (24 h or 7 d horizon), refreshed every minute. */
export function usePredictions(astronautId: string | undefined, horizon: Horizon = "24h") {
  const { lang } = useLang();
  return useQuery({ queryKey: ["predictions", astronautId, horizon, lang], queryFn: () => api.predictions(astronautId!, horizon), enabled: !!astronautId, refetchInterval: 60_000, placeholderData: (p) => (p?.astronautId === astronautId ? p : undefined) });
}
/** Forecasts for several astronauts (NASA / crew medical officer table). */
export function useCrewPredictions(ids: string[], horizon: Horizon = "24h") {
  const { lang } = useLang();
  return useQueries({ queries: ids.map((id) => ({ queryKey: ["predictions", id, horizon, lang], queryFn: () => api.predictions(id, horizon), refetchInterval: 60_000 })) });
}
/** Proposed solutions (non-diagnostic recommendations) for one astronaut. */
export function useRecommendations(astronautId: string | undefined) {
  const { lang } = useLang();
  return useQuery({ queryKey: ["recommendations", astronautId, lang], queryFn: () => api.recommendations(astronautId!), enabled: !!astronautId, refetchInterval: 15_000 });
}
/** Changes a solution’s status (apply, done, escalate, validate, replace). */
export function useUpdateRecommendation(astronautId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: RecommendationUpdate }) => api.updateRecommendation(astronautId, id, update),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recommendations", astronautId] }),
  });
}
