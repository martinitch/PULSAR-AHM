/* Alerts produced by the backend (Isolation Forest / LSTM autoencoder / rules), green/orange/red level + workflow. */
import { useAlerts, LEVEL_TO_LIGHT } from "@/api";
import { Lamp, WorkflowBadge, workflowFromAlert } from "@/components/ui";

const MODEL = { isolation_forest: "Isolation Forest · SIMULÉ", lstm_autoencoder: "Autoencodeur LSTM · SIMULÉ", rule: "Règle seuil · SIMULÉ" } as const;
const time = (iso: string) => new Date(iso).toISOString().slice(11, 16) + " UTC";

export function AiAlerts({ astronautId }: { astronautId?: string }) {
  const { data, isLoading, isError } = useAlerts({ astronautId });
  if (isLoading) return <p className="chart-empty">Chargement des alertes…</p>;
  if (isError) return <p className="chart-empty">Alertes indisponibles.</p>;
  if (!data?.length) return <p className="r-note">Aucune alerte pour cet astronaute.</p>;
  return (
    <ul className="alert-list">
      {data.map((a) => (
        <li key={a.id}>
          <Lamp l={LEVEL_TO_LIGHT[a.level]} compact />
          <div>
            <p>{a.message}</p>
            <small>{MODEL[a.model]} · dérive {a.driftScore.toFixed(2)} · {time(a.createdAt)}</small>
            <WorkflowBadge status={workflowFromAlert(a)} assignee={a.assignee ?? a.ackBy} />
          </div>
        </li>
      ))}
    </ul>
  );
}
