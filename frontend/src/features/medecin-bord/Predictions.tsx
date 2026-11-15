/* M12 · Crew predictions (crew surgeon): overview + per-astronaut detail
   (models, scores, contributing signals), validation or replacement of proposed solutions. */
import { LEVEL_TO_LIGHT, fmtH, useCrewPredictions } from "@/api";
import { Avatar, Lamp, PageHead as Head } from "@/components/ui";
import { PredictionPanel, DriftMeter } from "@/features/predictions";
import { useCrew, useLang } from "@/i18n";
import type { Go } from "@/app/types";

export function CmoPredictions({ id, go }: { id?: string; go: Go }) {
  const { tr } = useLang();
  const CREW = useCrew();
  const m = CREW.find((c) => c.id === id) ?? CREW.find((c) => c.id === "LK")!;
  const q = useCrewPredictions(CREW.map((c) => c.id));
  return (
    <>
      <Head title={tr(`Prédictions · ${m.name}`, `Predictions · ${m.name}`)} sub={tr("Prévisions 24 h / 7 j, anomalies détectées et solutions à valider.", "24 h / 7 d forecasts, detected anomalies and solutions to validate.")} />
      <nav className="pred-crew" aria-label={tr("Astronautes", "Astronauts")}>
        {CREW.map((c, i) => {
          const p = q[i]?.data;
          return (
            <button key={c.id} aria-current={c.id === m.id ? "page" : undefined} onClick={() => go(`/medecin-bord/predictions/${c.id}`)}>
              <span className="pc-top"><Avatar id={c.id} l={p ? LEVEL_TO_LIGHT[p.riskLevel] : undefined} /><b>{c.name}</b>{p && p.riskLevel !== "vert" && <Lamp l={LEVEL_TO_LIGHT[p.riskLevel]} compact />}</span>
              {p ? <><DriftMeter v={p.driftScore} /><span className="pc-next">{p.nextThreshold ? tr(`Seuil ${p.nextThreshold.level} ~${fmtH(p.nextThreshold.hours)} · ${p.nextThreshold.label}`, `${p.nextThreshold.level} threshold ~${fmtH(p.nextThreshold.hours).replace(" j", " d")} · ${p.nextThreshold.label}`) : tr("Aucun seuil prévu", "No threshold expected")}</span><span className="pc-next">{tr(`${p.anomalies.length} anomalie${p.anomalies.length > 1 ? "s" : ""}`, `${p.anomalies.length} anomal${p.anomalies.length === 1 ? "y" : "ies"}`)}</span></> : <span className="pc-next">…</span>}
            </button>
          );
        })}
      </nav>
      <PredictionPanel key={m.id} astronautId={m.id} role="medecin-bord" />
    </>
  );
}
