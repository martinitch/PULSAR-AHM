/* NASA report section: summary of each astronaut's predictions, anomalies and solutions (read-only). */
import { LEVEL_TO_LIGHT, fmtH, useCrewPredictions, useRecommendations } from "@/api";
import { Avatar, Icon, Lamp } from "@/components/ui";
import { Disclaimer, modelWord, statusLabel } from "@/features/predictions";
import { useCrew, useLang } from "@/i18n";

function Recs({ id }: { id: string }) {
  const { data } = useRecommendations(id);
  if (!data) return <>…</>;
  if (!data.length) return <span className="muted">—</span>;
  return <ul className="nasa-recs">{data.map((r) => <li key={r.id}>{r.status === "remplacee" && r.replacementTitle ? r.replacementTitle : r.title} <span className="muted">· {statusLabel(r)}</span></li>)}</ul>;
}

export function PredictionsSummary() {
  const { tr, lang } = useLang();
  const CREW = useCrew();
  const q = useCrewPredictions(CREW.map((c) => c.id));
  return (
    <section className="rep-sec pred-summary">
      <h2><Icon name="insights" size={18} /> {tr("Prédictions et anomalies (modèles de bord)", "Predictions and anomalies (on-board models)")}</h2>
      <Disclaimer />
      <table className="crew-table pred-table">
        <thead><tr><th>{tr("Astronaute", "Astronaut")}</th><th>{tr("Risque prévu", "Forecast risk")}</th><th>{tr("Dérive", "Drift")}</th><th>{tr("Prochain seuil", "Next threshold")}</th><th>{tr("Anomalies", "Anomalies")}</th><th>{tr("Solutions (statut à bord)", "Solutions (on-board status)")}</th></tr></thead>
        <tbody>{CREW.map((m, i) => {
          const p = q[i]?.data;
          return (
            <tr key={m.id} data-id={m.id}>
              <td><span className="who"><Avatar id={m.id} l={p ? LEVEL_TO_LIGHT[p.riskLevel] : undefined} /> {m.name}</span></td>
              <td>{p ? <Lamp l={LEVEL_TO_LIGHT[p.riskLevel]} /> : "…"}</td>
              <td className="mono">{p ? p.driftScore.toFixed(2) : "…"}</td>
              <td>{p?.nextThreshold ? `${p.nextThreshold.label} · ${p.nextThreshold.level} ~${fmtH(p.nextThreshold.hours).replace(" j", lang === "en" ? " d" : " j")}` : "—"}</td>
              <td>{p?.anomalies.length ? <ul className="nasa-recs">{p.anomalies.map((a) => <li key={a.id}>{a.label} <span className="muted mono">· {modelWord(a.model, lang)} · {a.driftScore.toFixed(2)}</span></li>)}</ul> : "—"}</td>
              <td><Recs id={m.id} /></td>
            </tr>
          );
        })}</tbody>
      </table>
    </section>
  );
}
