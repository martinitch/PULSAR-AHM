/* Alerts produced by the backend (Isolation Forest / LSTM autoencoder / rules), green/orange/red level + workflow. */
import { useAlerts, LEVEL_TO_LIGHT } from "@/api";
import { Lamp, WorkflowBadge, workflowFromAlert } from "@/components/ui";
import { useLang } from "@/i18n";
import { modelWord } from "@/features/predictions/PredictionPanel";

const time = (iso: string) => new Date(iso).toISOString().slice(11, 16) + " UTC";

export function AiAlerts({ astronautId }: { astronautId?: string }) {
  const { tr, lang } = useLang();
  const { data, isLoading, isError } = useAlerts({ astronautId });
  if (isLoading) return <p className="chart-empty">{tr("Chargement des alertes…", "Loading alerts…")}</p>;
  if (isError) return <p className="chart-empty">{tr("Alertes indisponibles.", "Alerts unavailable.")}</p>;
  if (!data?.length) return <p className="r-note">{tr("Aucune alerte pour cet astronaute.", "No alert for this astronaut.")}</p>;
  return (
    <ul className="alert-list">
      {data.map((a) => (
        <li key={a.id}>
          <Lamp l={LEVEL_TO_LIGHT[a.level]} compact />
          <div>
            <p>{a.message}</p>
            <small>{modelWord(a.model, lang)} · {tr("dérive", "drift")} {a.driftScore.toFixed(2)} · {time(a.createdAt)}</small>
            <WorkflowBadge status={workflowFromAlert(a)} assignee={a.assignee ?? a.ackBy} />
          </div>
        </li>
      ))}
    </ul>
  );
}
