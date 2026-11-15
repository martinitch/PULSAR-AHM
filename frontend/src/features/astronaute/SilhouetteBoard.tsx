/* Silhouette: touching a zone zooms in, an arrow states the need, the table gives the position. */
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Icon, Demo, Lamp, PageHead as Head, WorkflowBadge } from "@/components/ui";
import { notifyOk } from "@/components/ui/noticeStore";
import { pushBoard } from "@/features/board/localLog";
import { BodyFigure, ZoneLegend, ZONES3D, statesFor, type ZoneState } from "@/components/body3d";
import { useLang, useRegions } from "@/i18n";
import { useMe } from "@/features/auth/useMe";
import { applyExerciseStates, exerciseFocus, exercisePart, startExercise, stopExercise, useExerciseSession } from "@/features/gamification/exercise";
import type { Go } from "@/app/types";

const SYMPTOM_PRESETS = ["Douleur", "Gêne", "Vertige", "Nausée", "Essoufflement", "Autre"];

function hudText(state: ZoneState, need: string) {
  if (state === "high") return `Alerte · ${need}`;
  if (state === "medium") return `Attention · ${need}`;
  if (state === "active") return `Sollicité · ${need}`;
  if (state === "none") return "Pas de mesure directe";
  return "Nominal";
}

export function AstroBody({ go }: { go: Go }) {
  const { tr } = useLang();
  const REGIONS = useRegions();
  const ME = useMe();
  const reduce = useReducedMotion();
  const [told, setTold] = useState(false);
  const [sel, setSel] = useState("");
  const [symptom, setSymptom] = useState(SYMPTOM_PRESETS[0]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const session = useExerciseSession();
  const live = exerciseFocus(session);
  const livePart = exercisePart(session);
  const states = applyExerciseStates(statesFor(ME.light), session);
  const shown = sel || live;
  const reg = REGIONS.find((r) => r.id === shown);
  const st: ZoneState = shown ? (states[shown] ?? "none") : "none";
  const brief = reg ? hudText(st, reg.need) : "";
  const fixing = st === "medium" || st === "high";
  const pick = (id: string) => {
    setSel((cur) => (cur === id ? "" : id));
    setNote("");
    setSymptom(SYMPTOM_PRESETS[0]);
    window.requestAnimationFrame(() => {
      document.querySelector(".sil-stage")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    });
  };
  const saveSymptom = () => {
    if (!reg) return;
    const line = `${reg.label} · ${symptom}${note.trim() ? ` — ${note.trim()}` : ""}`;
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
      <aside className="resp-block" aria-label="Responsabilité">
        <div className="resp-block-top">
          <h3>Responsabilité</h3>
          <WorkflowBadge status={told ? "vu" : "nouveau"} assignee="CMO-001" />
        </div>
        <dl className="resp-grid">
          <div><dt>Saisie</dt><dd>{ME.name}</dd></div>
          <div><dt>Médecin de bord</dt><dd>{told ? "Prévenu" : "À prévenir"}</dd></div>
          <div><dt>Suivi</dt><dd>Peut ouvrir un examen / écho</dd></div>
        </dl>
      </aside>
      <div className="sil-board">
        <div className="sil-stage r-card">
          {livePart
            ? <p className="r-note">Séance en cours · {livePart.label} sollicitée (vert). La carte suit cette partie.</p>
            : <p className="r-note">Lancez <button type="button" className="linkish" onClick={startExercise}>Exercice</button> pour voir les zones s’allumer en direct, ou touchez une zone.</p>}
          <BodyFigure
            states={states}
            sel={shown || undefined}
            onPick={pick}
            zoom={!!shown}
            need={livePart && !sel ? `Sollicité · ${livePart.label}` : shown ? brief : undefined}
          />
          <div className="btn-row sil-ex-actions">
            <button type="button" className="btn btn-primary sm" onClick={() => (session.running ? stopExercise() : startExercise())}>
              <Icon name={session.running ? "stop" : "fitness_center"} size={16} /> {session.running ? "Terminer l’exercice" : "Exercice"}
            </button>
            <button type="button" className="btn btn-ghost sm" onClick={() => go("/astronaute/objectifs")}>Objectifs</button>
          </div>
          <ZoneLegend exercise={session.running} />
        </div>
        <aside className="sil-fix r-card">
          {!reg ? (
            <>
              <p className="eyebrow">Zones</p>
              <h2>Touchez le corps</h2>
              <p>Rien n’est ouvert. Choisissez une zone : le corps se rapproche, une flèche nomme le besoin.</p>
            </>
          ) : (
            <motion.div key={shown} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              <div className="sil-fix-top">
                <div>
                  <p className="eyebrow">{fixing ? "Correction" : st === "none" ? "À signaler" : "Maintien"}</p>
                  <h2>{reg.label}</h2>
                </div>
                {fixing && <Lamp l={st === "high" ? "warning" : "caution"} compact />}
                <Demo />
              </div>
              <p className="sil-need" aria-live="polite">{brief}</p>
              <p>{reg.fn}</p>
              <table className="sil-table">
                <caption className="visually-hidden">Positions pour {fixing ? "corriger" : "tenir"} {reg.label}</caption>
                <thead><tr><th scope="col">N°</th><th scope="col">Position</th><th scope="col">Geste</th></tr></thead>
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
              <p className="eyebrow">Noter un symptôme</p>
              <div className="seg2 symptom-presets" role="radiogroup" aria-label="Type de symptôme">
                {SYMPTOM_PRESETS.map((s) => <button key={s} type="button" aria-pressed={symptom === s} onClick={() => setSymptom(s)}>{s}</button>)}
              </div>
              <label className="field"><span>Précision (facultatif)</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Depuis quand, intensité…" /></label>
              <div className="btn-row">
                <button type="button" className="btn btn-primary" onClick={saveSymptom}><Icon name="edit" size={18} /> Enregistrer</button>
                <button type="button" className="btn btn-secondary" onClick={() => go("/astronaute/kits")}>Mesure guidée</button>
                <button type="button" className="btn btn-ghost" aria-pressed={told} disabled={told} onClick={() => { setTold(true); pushBoard({ who: ME.id, light: "caution", text: `Symptôme signalé · ${reg.label} · ${symptom}${note.trim() ? ` — ${note.trim()}` : ""}` }); notifyOk("Médecin de bord prévenu", "Noté dans le journal de cet appareil. L’appel radio partira quand le backend sera branché."); }}>{told ? <><Icon name="check_circle" size={18} /> Médecin prévenu</> : "Prévenir le médecin"}</button>
              </div>
              {!!saved.length && <ul className="symptom-log" aria-label="Symptômes notés">{saved.map((s) => <li key={s}><Icon name="edit_note" size={14} />{s}</li>)}</ul>}
              {reg.note && <p className="r-note">{reg.note}</p>}
              <button type="button" className="btn btn-ghost sm" onClick={() => setSel("")}>Vue d’ensemble</button>
            </motion.div>
          )}
          <ul className="zone-chips" aria-label="Zones">{ZONES3D.map((z) => <li key={z.id}><button type="button" aria-pressed={z.id === sel} onClick={() => pick(z.id)}>{z.label}</button></li>)}</ul>
        </aside>
      </div>
    </>
  );
}
