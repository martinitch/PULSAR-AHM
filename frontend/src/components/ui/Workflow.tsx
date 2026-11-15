/* Shared lifecycle: New → Seen → In progress → Resolved / Escalated + visible owner. */
import { Icon, type IconName } from "./Icon";
import { useLang } from "@/i18n";

export type WorkflowStatus = "nouveau" | "vu" | "pris_en_charge" | "resolu" | "escalade";

export const WORKFLOW_LABEL: Record<WorkflowStatus, string> = {
  nouveau: "Nouveau",
  vu: "Vu",
  pris_en_charge: "Pris en charge",
  resolu: "Résolu",
  escalade: "Escaladé",
};

const WORKFLOW_EN: Record<WorkflowStatus, string> = {
  nouveau: "New",
  vu: "Seen",
  pris_en_charge: "In progress",
  resolu: "Resolved",
  escalade: "Escalated",
};

const WORKFLOW_ICON: Record<WorkflowStatus, IconName> = {
  nouveau: "schedule",
  vu: "visibility",
  pris_en_charge: "play_arrow",
  resolu: "check_circle",
  escalade: "arrow_upward",
};

/** Shows the state + the owner (id or label). */
export function WorkflowBadge({ status, assignee }: { status: WorkflowStatus; assignee?: string | null }) {
  const { lang } = useLang();
  const word = lang === "en" ? WORKFLOW_EN[status] : WORKFLOW_LABEL[status];
  const none = lang === "en" ? "Unassigned" : "Non assigné";
  return (
    <span className={`wf-badge wf-${status}`} data-status={status}>
      <Icon name={WORKFLOW_ICON[status]} size={14} />
      <b>{word}</b>
      {assignee ? <span className="mono wf-who">{assignee}</span> : <span className="wf-who muted">{none}</span>}
    </span>
  );
}

/** Maps solution API status onto the unified UI lifecycle. */
export function workflowFromRecommendationStatus(status: string): WorkflowStatus {
  switch (status) {
    case "appliquee":
    case "validee":
      return "pris_en_charge";
    case "faite":
    case "remplacee":
      return "resolu";
    case "escaladee":
      return "escalade";
    case "vu":
      return "vu";
    default:
      return "nouveau";
  }
}

/** Alert: ack → resolved; otherwise seen if seenAt; otherwise new. Escalation via explicit workflowStatus. */
export function workflowFromAlert(a: { acknowledged: boolean; seenAt?: string | null; workflowStatus?: WorkflowStatus | null }): WorkflowStatus {
  if (a.workflowStatus === "escalade") return "escalade";
  if (a.acknowledged || a.workflowStatus === "resolu") return "resolu";
  if (a.workflowStatus === "pris_en_charge") return "pris_en_charge";
  if (a.seenAt || a.workflowStatus === "vu") return "vu";
  return "nouveau";
}
