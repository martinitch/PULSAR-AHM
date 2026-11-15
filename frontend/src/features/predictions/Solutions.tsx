/* Proposed solutions for each anomaly: concrete actions, NOT diagnostic.
   Astronaut: Apply / Mark done / Escalate to the crew surgeon.
   Crew surgeon: Validate / Replace (new instruction + note) / Mark done / Escalate to the flight surgeon.
   NASA: read-only. */
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRecommendations, useUpdateRecommendation, type Recommendation, type RecommendationCategory, type RecommendationStatus, type Priority, type Anomaly } from "@/api";
import { Icon, WorkflowBadge, workflowFromRecommendationStatus, type IconName } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSound } from "@/features/sound";
import type { Role } from "@/data/types";
import { readLang, useLang } from "@/i18n";

export const CATEGORY: Record<RecommendationCategory, { label: string; icon: IconName }> = {
  hydratation: { label: "Hydratation", icon: "water_drop" },
  repos_sommeil: { label: "Repos · sommeil", icon: "bedtime" },
  ajustement_exercice: { label: "Exercice adapté", icon: "fitness_center" },
  abri_radiations: { label: "Abri anti-radiations", icon: "shield" },
  remesure: { label: "Refaire la mesure", icon: "event_repeat" },
  echographie: { label: "Échographie", icon: "monitor_heart" },
  contact_medecin_bord: { label: "Médecin de bord", icon: "stethoscope" },
  contact_flight_surgeon: { label: "Flight surgeon (NASA)", icon: "satellite_alt" },
};
const PRIO: Record<Priority, string> = { haute: "Priorité haute", moyenne: "Priorité moyenne", basse: "Priorité basse" };
const PRIO_RANK: Record<Priority, number> = { haute: 0, moyenne: 1, basse: 2 };

export function statusLabel(r: Recommendation): string {
  const byCmo = r.updatedBy?.startsWith("CMO");
  const en = readLang() === "en";
  const m: Record<RecommendationStatus, string> = en ? {
    proposee: "New", appliquee: "In progress", faite: "Resolved",
    escaladee: byCmo ? "Escalated · flight surgeon" : "Escalated · crew surgeon",
    validee: "In progress · validated", remplacee: "Resolved · replaced",
  } : {
    proposee: "Nouveau", appliquee: "Pris en charge", faite: "Résolu",
    escaladee: byCmo ? "Escaladé · flight surgeon" : "Escaladé · médecin de bord",
    validee: "Pris en charge · validée", remplacee: "Résolu · remplacée",
  };
  return m[r.status];
}

export function Disclaimer({ simple }: { simple?: boolean }) {
  const { tr } = useLang();
  return (
    <p className="disclaimer" role="note">
      <Icon name="info" size={16} />
      {simple
        ? <span>{tr("Pouls prévu par XGBoost, LSTM et Prophet, sur une série de démonstration. Ce n’est pas un diagnostic. En cas de symptôme, prévenez le médecin de bord.", "Pulse forecast by XGBoost, LSTM and Prophet, on a demo series. This is not a diagnosis. If you have a symptom, tell the crew surgeon.")}</span>
        : <span>{tr("Fréquence cardiaque : XGBoost, LSTM et Prophet. Les autres indicateurs restent un scénario de démonstration. Aide à la décision, pas un diagnostic.", "Heart rate: XGBoost, LSTM and Prophet. The other metrics stay a demo scenario. Decision support, not a diagnosis.")}</span>}
    </p>
  );
}

export function Solutions({ astronautId, role, anomalies = [] }: { astronautId: string; role: Role; anomalies?: Anomaly[] }) {
  const { tr } = useLang();
  const { data, isLoading, isError } = useRecommendations(astronautId);
  if (isLoading) return <p className="chart-empty">{tr("Chargement des solutions…", "Loading solutions…")}</p>;
  if (isError) return <p className="chart-empty">{tr("Solutions indisponibles.", "Solutions unavailable.")}</p>;
  if (!data?.length) return <p className="r-note"><Icon name="check_circle" size={16} /> {role === "astronaute" ? tr("Rien à faire de particulier. Continuez votre routine.", "Nothing particular to do. Continue your routine.") : tr("Aucune solution proposée pour cet astronaute.", "No solution proposed for this astronaut.")}</p>;
  const list = [...data].sort((a, b) => PRIO_RANK[a.priority] - PRIO_RANK[b.priority]);
  return <ul className="sol-list">{list.map((r) => <SolutionItem key={r.id} r={r} role={role} anomaly={anomalies.find((a) => a.id === r.anomalyId)} />)}</ul>;
}

function SolutionItem({ r, role, anomaly }: { r: Recommendation; role: Role; anomaly?: Anomaly }) {
  const { tr, lang } = useLang();
  const { user } = useAuth();
  const mut = useUpdateRecommendation(r.astronautId);
  const { play } = useSound();
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState(r.note ?? "");
  const set = (status: RecommendationStatus, extra: { note?: string; replacementTitle?: string } = {}) => mut.mutate({ id: r.id, update: { status, by: user?.id ?? "?", ...extra } }, { onSuccess: () => { if (status === "escaladee") play("escalation"); else if (status === "validee" || status === "faite") play("ack"); } });
  const simple = role === "astronaute";
  const closed = r.status === "faite" || r.status === "escaladee";
  const decided = r.status === "validee" || r.status === "remplacee";
  const c = CATEGORY[r.category];
  const cat = lang === "en" ? {
    hydratation: "Hydration", repos_sommeil: "Rest · sleep", ajustement_exercice: "Adapted exercise",
    abri_radiations: "Radiation shelter", remesure: "Repeat the measurement", echographie: "Ultrasound",
    contact_medecin_bord: "Crew surgeon", contact_flight_surgeon: "Flight surgeon (NASA)",
  }[r.category] : c.label;
  const prio = lang === "en" ? { haute: "High priority", moyenne: "Medium priority", basse: "Low priority" }[r.priority] : PRIO[r.priority];
  return (
    <motion.li layout className={`sol sol-${r.priority} st-${r.status}`} data-status={r.status} data-id={r.id}>
      <span className="sol-ico"><Icon name={c.icon} size={20} /></span>
      <div className="sol-body">
        <p className="sol-meta"><span className={`prio prio-${r.priority}`}>{r.priority === "haute" && <Icon name="arrow_upward" size={12} />}{prio}</span><span>{cat}</span>{!simple && <span className="mono">{r.source === "prevision" ? tr("issue d’une prévision", "from a forecast") : anomaly ? `${tr("anomalie", "anomaly")} ${anomaly.id}` : ""}</span>}</p>
        {r.status === "remplacee" && r.replacementTitle
          ? <><p className="sol-title">{r.replacementTitle}</p><p className="sol-old"><s>{r.title}</s></p></>
          : <p className="sol-title">{simple ? r.plainText : r.title}</p>}
        {!simple && <p className="sol-why"><b>{tr("Pourquoi :", "Why:")}</b> {r.rationale}</p>}
        {r.note && <p className="sol-note"><Icon name="ink_pen" size={14} /> {r.note}</p>}
        <p className="sol-status" aria-live="polite">
          <WorkflowBadge status={workflowFromRecommendationStatus(r.status)} assignee={r.assignee ?? r.updatedBy ?? (r.status === "proposee" ? (simple ? tr("Vous", "You") : "CMO-001") : null)} />
          <span className="visually-hidden">{statusLabel(r)}</span>
        </p>
        <AnimatePresence initial={false}>
          {edit && (
            <motion.form className="sol-edit" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return; set("remplacee", { replacementTitle: title.trim(), note: note.trim() || undefined }); setEdit(false); }}>
              <label className="field"><span>{tr("Nouvelle consigne", "New instruction")}</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tr("Ex. Repos complet jusqu’à 18:00", "E.g. Full rest until 18:00")} required /></label>
              <label className="field"><span>{tr("Note du médecin de bord (facultatif)", "Crew surgeon note (optional)")}</span><input value={note} onChange={(e) => setNote(e.target.value)} /></label>
              <div className="btn-row"><button className="btn btn-primary sm" type="submit">{tr("Enregistrer", "Save")}</button><button className="btn btn-ghost sm" type="button" onClick={() => setEdit(false)}>{tr("Annuler", "Cancel")}</button></div>
            </motion.form>
          )}
        </AnimatePresence>
        {role === "astronaute" && !closed && (
          <div className="btn-row sol-actions">
            {r.status !== "appliquee" && <button className="btn btn-secondary sm" disabled={mut.isPending} onClick={() => set("appliquee")}><Icon name="play_arrow" size={16} /> {tr("Appliquer", "Apply")}</button>}
            <button className="btn btn-secondary sm" disabled={mut.isPending} onClick={() => set("faite")}><Icon name="check" size={16} /> {tr("Marquer fait", "Mark done")}</button>
            <button className="btn btn-ghost sm" disabled={mut.isPending} onClick={() => set("escaladee")}><Icon name="stethoscope" size={16} /> {tr("Escalader au médecin de bord", "Escalate to the crew surgeon")}</button>
          </div>
        )}
        {role === "medecin-bord" && !edit && (
          <div className="btn-row sol-actions">
            {!decided && <button className="btn btn-secondary sm" disabled={mut.isPending} onClick={() => set("validee", { note: note.trim() || undefined })}><Icon name="thumb_up" size={16} /> {tr("Valider", "Validate")}</button>}
            <button className="btn btn-secondary sm" onClick={() => { setTitle(r.replacementTitle ?? ""); setEdit(true); }}><Icon name="edit" size={16} /> {tr("Remplacer…", "Replace…")}</button>
            {r.status !== "faite" && <button className="btn btn-ghost sm" disabled={mut.isPending} onClick={() => set("faite")}><Icon name="check" size={16} /> {tr("Marquer fait", "Mark done")}</button>}
            {r.status !== "escaladee" && <button className="btn btn-ghost sm" disabled={mut.isPending} onClick={() => set("escaladee")}><Icon name="satellite_alt" size={16} /> {tr("Escalader au flight surgeon", "Escalate to the flight surgeon")}</button>}
          </div>
        )}
      </div>
    </motion.li>
  );
}
