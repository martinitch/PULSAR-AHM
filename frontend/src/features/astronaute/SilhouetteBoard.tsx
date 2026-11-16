/* Silhouette: touching a zone zooms in, an arrow states the need, the table gives the position. */
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Icon, Demo, Lamp, PageHead as Head, WorkflowBadge } from "@/components/ui";
import { notifyOk } from "@/components/ui/noticeStore";
import { pushBoard } from "@/features/board/localLog";
import { BodyFigure, ZoneLegend, ZONES3D, statesFor, type ZoneState } from "@/components/body3d";
import { useLang, useRegions, ZONE_NAME_EN, type Lang } from "@/i18n";
import { useMe } from "@/features/auth/useMe";
import { applyExerciseStates, exerciseFocus, exercisePart, partLabel, startExercise, stopExercise, useExerciseSession } from "@/features/gamification/exercise";
import type { Go } from "@/app/types";

const SYMPTOMS: { id: string; fr: string; en: string }[] = [
  { id: "pain", fr: "Douleur", en: "Pain" },
  { id: "discomfort", fr: "Gêne", en: "Discomfort" },
  { id: "dizzy", fr: "Vertige", en: "Dizziness" },
  { id: "nausea", fr: "Nausée", en: "Nausea" },
  { id: "breath", fr: "Essoufflement", en: "Shortness of breath" },
  { id: "other", fr: "Autre", en: "Other" },
];

function hudText(state: ZoneState, need: string, lang: Lang) {
  if (lang === "en") {
    if (state === "high") return `Alert · ${need}`;
    if (state === "medium") return `Caution · ${need}`;
    if (state === "active") return `Worked · ${need}`;
    if (state === "none") return "No direct measurement";
    return "Nominal";
  }
  if (state === "high") return `Alerte · ${need}`;
  if (state === "medium") return `Attention · ${need}`;
  if (state === "active") return `Sollicité · ${need}`;
  if (state === "none") return "Pas de mesure directe";
  return "Nominal";
}

export function AstroBody({ go }: { go: Go }) {
  const { tr, lang } = useLang();
  const REGIONS = useRegions();
  const ME = useMe();
  const reduce = useReducedMotion();
  const [told, setTold] = useState(false);
  const [sel, setSel] = useState("");
  const [symptom, setSymptom] = useState(SYMPTOMS[0].id);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const session = useExerciseSession();
  const live = exerciseFocus(session);
  const livePart = exercisePart(session);
  const states = applyExerciseStates(statesFor(ME.light), session);
  const shown = sel || live;
  const reg = REGIONS.find((r) => r.id === shown);
  const st: ZoneState = shown ? (states[shown] ?? "none") : "none";
  const brief = reg ? hudText(st, reg.need, lang) : "";
  const symptomWord = (id: string) => {
    const s = SYMPTOMS.find((x) => x.id === id) ?? SYMPTOMS[0];
    return lang === "en" ? s.en : s.fr;
  };
  const partName = livePart ? partLabel(livePart.id, livePart.label, lang) : "";
  const fixing = st === "medium" || st === "high";
  const pick = (id: string) => {
    setSel((cur) => (cur === id ? "" : id));
    setNote("");
    setSymptom(SYMPTOMS[0].id);
    window.requestAnimationFrame(() => {
      document.querySelector(".sil-stage")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    });
  };
  const saveSymptom = () => {
    if (!reg) return;
    const line = `${reg.label} · ${symptomWord(symptom)}${note.trim() ? ` — ${note.trim()}` : ""}`;
    setSaved((s) => [line, ...s].slice(0, 8));
    setNote("");
    try {
      const k = `pulsar.symptoms.${ME.id}`;
      const prev = JSON.parse(localStorage.getItem(k) || "[]") as string[];
      localStorage.setItem(k, JSON.stringify([line, ...prev].slice(0, 20)));
    } catch { /* ignore */ }
  };
  return (
    <>
      <Head title={tr("Carte du corps", "Body map")} sub={tr("Touchez une zone. La vue se rapproche, la flèche indique le besoin, le tableau donne la position pour corriger.", "Tap a zone. The view moves in, the arrow names the need, and the table gives the position to correct.")} />
      <aside className="resp-block" aria-label={tr("Responsabilité", "Responsibility")}>
        <div className="resp-block-top">
          <h3>{tr("Responsabilité", "Responsibility")}</h3>
          <WorkflowBadge status={told ? "vu" : "nouveau"} assignee="CMO-001" />
        </div>
        <dl className="resp-grid">
          <div><dt>{tr("Saisie", "Entry")}</dt><dd>{ME.name}</dd></div>
          <div><dt>{tr("Médecin de bord", "Crew surgeon")}</dt><dd>{told ? tr("Prévenu", "Notified") : tr("À prévenir", "To notify")}</dd></div>
          <div><dt>{tr("Suivi", "Follow-up")}</dt><dd>{tr("Peut ouvrir un examen / écho", "Can open an exam / ultrasound")}</dd></div>
        </dl>
      </aside>
      <div className="sil-board">
        <div className="sil-stage r-card">
          {livePart
            ? <p className="r-note">{tr(`Séance en cours · ${partName} sollicitée (vert). La carte suit cette partie.`, `Session in progress · ${partName} worked (green). The map follows this part.`)}</p>
            : <p className="r-note">{tr("Lancez", "Start")} <button type="button" className="linkish" onClick={startExercise}>{tr("Exercice", "Exercise")}</button> {tr("pour voir les zones s’allumer en direct, ou touchez une zone.", "to see the zones light up live, or tap a zone.")}</p>}
          <BodyFigure
            states={states}
            sel={shown || undefined}
            onPick={pick}
            zoom={!!shown}
            need={livePart && !sel ? tr(`Sollicité · ${partName}`, `Worked · ${partName}`) : shown ? brief : undefined}
          />
          <div className="btn-row sil-ex-actions">
            <button type="button" className="btn btn-primary sm" onClick={() => (session.running ? stopExercise() : startExercise())}>
              <Icon name={session.running ? "stop" : "fitness_center"} size={16} /> {session.running ? tr("Terminer l’exercice", "Finish the exercise") : tr("Exercice", "Exercise")}
            </button>
            <button type="button" className="btn btn-ghost sm" onClick={() => go("/astronaute/objectifs")}>{tr("Objectifs", "Goals")}</button>
          </div>
          <ZoneLegend exercise={session.running} />
        </div>
        <aside className="sil-fix r-card">
          {!reg ? (
            <>
              <p className="eyebrow">{tr("Zones", "Zones")}</p>
              <h2>{tr("Touchez le corps", "Tap the body")}</h2>
              <p>{tr("Rien n’est ouvert. Choisissez une zone : le corps se rapproche, une flèche nomme le besoin.", "Nothing is open. Choose a zone: the body moves in, and an arrow names the need.")}</p>
            </>
          ) : (
            <motion.div key={shown} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              <div className="sil-fix-top">
                <div>
                  <p className="eyebrow">{fixing ? tr("Correction", "Correction") : st === "none" ? tr("À signaler", "To report") : tr("Maintien", "Keep")}</p>
                  <h2>{reg.label}</h2>
                </div>
                {fixing && <Lamp l={st === "high" ? "warning" : "caution"} compact />}
                <Demo />
              </div>
              <p className="sil-need" aria-live="polite">{brief}</p>
              <p>{reg.fn}</p>
              <table className="sil-table">
                <caption className="visually-hidden">{tr(`Positions pour ${fixing ? "corriger" : "tenir"} ${reg.label}`, `Positions to ${fixing ? "correct" : "hold"} ${reg.label}`)}</caption>
                <thead><tr><th scope="col">{tr("N°", "No.")}</th><th scope="col">{tr("Position", "Position")}</th><th scope="col">{tr("Geste", "Move")}</th></tr></thead>
                <tbody>
                  {reg.fixes.map((f, i) => (
                    <motion.tr key={f.pos} initial={reduce ? false : { opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.28, delay: reduce ? 0 : 0.05 + i * 0.06 }}>
                      <td className="mono">{i + 1}</td>
                      <td>{f.pos}</td>
                      <td>{f.action}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              <p className="eyebrow">{tr("Noter un symptôme", "Note a symptom")}</p>
              <div className="seg2 symptom-presets" role="radiogroup" aria-label={tr("Type de symptôme", "Symptom type")}>
                {SYMPTOMS.map((s) => <button key={s.id} type="button" aria-pressed={symptom === s.id} onClick={() => setSymptom(s.id)}>{lang === "en" ? s.en : s.fr}</button>)}
              </div>
              <label className="field"><span>{tr("Précision (facultatif)", "Detail (optional)")}</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("Depuis quand, intensité…", "Since when, intensity…")} /></label>
              <div className="btn-row">
                <button type="button" className="btn btn-primary" onClick={saveSymptom}><Icon name="edit" size={18} /> {tr("Enregistrer", "Save")}</button>
                <button type="button" className="btn btn-secondary" onClick={() => go("/astronaute/kits")}>{tr("Mesure guidée", "Guided measurement")}</button>
                <button type="button" className="btn btn-ghost" aria-pressed={told} disabled={told} onClick={() => { setTold(true); pushBoard({ who: ME.id, light: "caution", text: tr(`Symptôme signalé · ${reg.label} · ${symptomWord(symptom)}${note.trim() ? ` — ${note.trim()}` : ""}`, `Symptom reported · ${reg.label} · ${symptomWord(symptom)}${note.trim() ? ` — ${note.trim()}` : ""}`) }); notifyOk(tr("Médecin de bord prévenu", "Crew surgeon notified"), tr("Noté dans le journal de cet appareil. L’appel radio partira quand le backend sera branché.", "Noted in this device’s log. The radio call will go out once the backend is connected.")); }}>{told ? <><Icon name="check_circle" size={18} /> {tr("Médecin prévenu", "Surgeon notified")}</> : tr("Prévenir le médecin", "Notify the surgeon")}</button>
              </div>
              {!!saved.length && <ul className="symptom-log" aria-label={tr("Symptômes notés", "Noted symptoms")}>{saved.map((s) => <li key={s}><Icon name="edit_note" size={14} />{s}</li>)}</ul>}
              {reg.note && <p className="r-note">{reg.note}</p>}
              <button type="button" className="btn btn-ghost sm" onClick={() => setSel("")}>{tr("Vue d’ensemble", "Overview")}</button>
            </motion.div>
          )}
          <ul className="zone-chips" aria-label={tr("Zones", "Zones")}>{ZONES3D.map((z) => <li key={z.id}><button type="button" aria-pressed={z.id === sel} onClick={() => pick(z.id)}>{lang === "en" ? ZONE_NAME_EN[z.id] ?? z.label : z.label}</button></li>)}</ul>
        </aside>
      </div>
    </>
  );
}
