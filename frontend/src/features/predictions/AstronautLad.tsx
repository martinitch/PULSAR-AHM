/* Latest available values for an astronaut (LAD table): realtime sensors + latest kit measurements. */
import { usePredictions, useTelemetry } from "@/api";
import { LadTable, type LadRow } from "@/components/telemetry";
import { THRESHOLDS as TH } from "@/data/thresholds";
import { useLang } from "@/i18n";

const hm = (iso: string) => iso.slice(11, 19);
export function AstronautLad({ astronautId }: { astronautId: string }) {
  const { tr } = useLang();
  const { data: tel } = useTelemetry(astronautId, { limit: 2 });
  const { data: p } = usePredictions(astronautId, "24h");
  const live = tel?.[tel.length - 1];
  const fc = (m: string) => p?.forecasts.find((f) => f.metric === m);
  const lastObs = (m: string) => { const f = fc(m); const pt = f && [...f.points].reverse().find((x) => x.observed != null); return { f, pt }; };
  const rows: LadRow[] = [];
  if (live) {
    rows.push({ key: "hr", name: tr("Fréquence cardiaque", "Heart rate"), time: hm(live.timestamp), value: live.heartRate, unit: "bpm", orange: TH.heart_rate.orange, rouge: TH.heart_rate.rouge, direction: "above", staleSec: (Date.now() - Date.parse(live.timestamp)) / 1000 });
    rows.push({ key: "spo2", name: "SpO₂", time: hm(live.timestamp), value: live.spo2, unit: "%", orange: TH.spo2.orange, rouge: TH.spo2.rouge, direction: "below" });
    rows.push({ key: "dose", name: tr("Débit de dose", "Dose rate"), time: hm(live.timestamp), value: live.radiationDoseRate, unit: "µSv/h", orange: TH.radiation.orange, rouge: TH.radiation.rouge, direction: "above" });
  }
  for (const m of ["bp_systolic", "skin_temp", "glucose", "sleep"]) {
    const { f, pt } = lastObs(m);
    if (f && pt) rows.push({ key: m, name: f.label, time: f.resolution === "day" ? pt.timestamp.slice(5, 10) : hm(pt.timestamp), value: pt.observed!, unit: f.unit, orange: f.thresholds.orange, rouge: f.thresholds.rouge, direction: f.thresholds.direction, staleSec: (Date.now() - Date.parse(pt.timestamp)) / 1000 });
  }
  if (!rows.length) return <p className="chart-empty">{tr("Chargement…", "Loading…")}</p>;
  return <LadTable rows={rows} caption={tr("Dernières valeurs disponibles", "Latest available values")} staleAfterSec={36 * 3600} />;
}
