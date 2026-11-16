/* NASA physicians (flight surgeons) — Mission Control Center, Houston. Reports received over the satellite link.
   Figma mockups: "NASA Houston" page (1:5), screens N01–N06. */
import { useState } from "react";
import { Icon, Demo, Card, Lamp, Avatar, Spark, PageHead as Head, WorkflowBadge } from "@/components/ui";
import { notifyBackend, notifyOk } from "@/components/ui/noticeStore";
import type { WorkflowStatus } from "@/components/ui";
import { BodyFigure, statesFor, useZoneZoom } from "@/components/body3d";
import { REPORTS, CREW, WINDOWS } from "@/data/demo/crew";
import type { Go } from "@/app/types";
import type { Light } from "@/data/types";
import { Probe } from "@/features/medecin-bord/Probe";
import { EchoConfirm, EchoReview, retainFor, studyLine } from "./EchoReview";
import { PredictionsSummary } from "./PredictionsSummary";
import { SoundButton } from "@/features/sound";
import { downloadPdf } from "./reportFile";
import { useCrew, useLang, useReports, useTrends } from "@/i18n";

function dashTitle(title: string, lang: "fr" | "en") {
  if (lang === "fr") return title;
  return title
    .replace("Bilan programmé", "Scheduled report")
    .replace("Alerte rouge", "Red alert")
    .replace("SpO₂ basse", "low SpO₂");
}
function Latency({ r }: { r: (typeof REPORTS)[number] }) {
  const { tr } = useLang();
  return <p className="latency"><Icon name="schedule" size={14} /> {tr(`Données reçues ${r.age}, générées à ${r.generated.split("· ")[1]} à bord`, `Data received ${r.age}, generated at ${r.generated.split("· ")[1]} on board`)}</p>;
}
function ReportList({ cur, go }: { cur: string; go: Go }) {
  const { lang, tr } = useLang();
  const REPORTS = useReports();
  const [filter, setFilter] = useState<"tous" | "red" | "prog">("tous");
  const redN = REPORTS.filter((r) => r.kind === "red").length;
  const progN = REPORTS.filter((r) => r.kind !== "red").length;
  const unreadN = REPORTS.filter((r) => r.unread).length;
  const rows = REPORTS.filter((r) => filter === "tous" || (filter === "red" ? r.kind === "red" : r.kind !== "red"));
  return (
    <aside className="rep-list n01-list" aria-label={tr("Rapports reçus", "Received reports")}>
      <header className="n01-list-h">
        <h2>{tr("Rapports", "Reports")}</h2>
        <p className="r-note mono">{tr(`${REPORTS.length} reçus · ${unreadN} non lus · ${redN} alerte`, `${REPORTS.length} received · ${unreadN} unread · ${redN} alert`)}</p>
      </header>
      <div className="rep-filter" role="tablist" aria-label={tr("Filtrer", "Filter")}>
        <button type="button" aria-pressed={filter === "tous"} onClick={() => setFilter("tous")}>{tr("Tous", "All")} · {REPORTS.length}</button>
        <button type="button" aria-pressed={filter === "red"} onClick={() => setFilter("red")}>{tr("Alerte rouge", "Red alert")} · {redN}</button>
        <button type="button" aria-pressed={filter === "prog"} onClick={() => setFilter("prog")}>{tr("Programmés", "Scheduled")} · {progN}</button>
      </div>
      <ul>
        {rows.map((r) => (
          <li key={r.id}>
            <button type="button" aria-current={r.id === cur ? "true" : undefined} className={`rep ${r.kind}`} onClick={() => go(`/nasa/rapport/${r.id}`)}>
              <span className="rep-kind">{r.kind === "red" ? <><Icon name="error" size={14} /> {tr("Alerte rouge", "Red alert")}</> : <><Icon name="schedule" size={14} /> {tr("Programmé", "Scheduled")}</>}</span>
              {r.unread && <i className="dot" aria-label={tr("Non lu", "Unread")} />}
              <strong>{dashTitle(r.title, lang)}</strong>
              <span className="rep-meta">{tr("Généré", "Generated")} {r.generated} · {tr("reçu", "received")} {r.age}</span>
              <span className="rep-lights">
                {Object.entries(r.lights).filter(([, l]) => l !== "ok").map(([k, l]) => (
                  <span key={k} className="rep-lamp"><span className="mono">{k}</span> <Lamp l={l} compact /></span>
                ))}
                {Object.values(r.lights).every((l) => l === "ok") && <Lamp l="ok" compact />}
                <span className="rep-att">{r.images > 0 && <><Icon name="image" size={14} /> {r.images}</>}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!rows.length && <p className="r-note">{tr("Aucun rapport dans ce filtre.", "No report in this filter.")}</p>}
    </aside>
  );
}
function savePdf(r: (typeof REPORTS)[number], en: boolean) {
  const word = (l: string) => (en
    ? (l === "warning" ? "alert" : l === "caution" ? "caution" : "nominal")
    : (l === "warning" ? "alerte" : l === "caution" ? "attention" : "nominal"));
  downloadPdf(`${r.id}.pdf`, [
    en ? "PULSAR AHM — medical report" : "PULSAR AHM — rapport médical",
    `${r.id} · ${r.title}`,
    en ? `Generated ${r.generated}` : `Généré ${r.generated}`,
    en ? `Received ${r.received}` : `Reçu ${r.received}`,
    "",
    en ? "Crew surgeon notes" : "Notes du médecin de bord",
    r.notes,
    "",
    en ? "Attached ultrasounds" : "Échographies jointes",
    ...(r.studies?.length ? r.studies.map((s, i) => `${i + 1}. ${studyLine(s)}`) : [en ? "No image. Do not interpret an ultrasound for this send." : "Aucune image. Ne pas interpréter d’échographie pour cet envoi."]),
    "",
    en ? "Crew" : "Équipage",
    ...CREW.map((m) => `${m.id}  ${m.name}  ${word(r.lights[m.id])}  ${en ? "HR" : "FC"} ${m.hr}  ${en ? "BP" : "TA"} ${m.bp}  SpO2 ${m.spo2} %`),
    "",
    en ? "Copy generated in the browser." : "Copie générée dans le navigateur.",
  ]);
  notifyOk(en ? "PDF downloaded" : "PDF téléchargé", en ? `${r.id}.pdf saved on this device.` : `${r.id}.pdf enregistré sur cet appareil.`);
}
function ReportSilhouette({ light }: { light: Light }) {
  const states = statesFor(light);
  const body = useZoneZoom(states, light === "ok" ? "" : "heart");
  return (
    <div className="rep-body">
      <BodyFigure states={states} sel={body.sel} onPick={body.pick} zoom={body.zoom} need={body.need} views={false} />
    </div>
  );
}
function ReportDetail({ r, go, studyId, onStudy }: { r: (typeof REPORTS)[number]; go: Go; studyId?: string; onStudy: (id: string) => void }) {
  const { lang, tr } = useLang();
  const CREW = useCrew();
  const TRENDS = useTrends();
  const wf = (r.workflowStatus ?? (r.unread ? "nouveau" : "vu")) as WorkflowStatus;
  const focus = CREW.find((m) => r.lights[m.id] !== "ok") ?? CREW[0];
  return (
    <article className="rep-detail">
      <header className="rep-head"><div><h1>{dashTitle(r.title, lang)}</h1><Latency r={r} /><WorkflowBadge status={wf} assignee={r.assignee ?? "NASA-FS-001"} /></div><div className="btn-row"><button type="button" className="btn btn-secondary" onClick={() => savePdf(r, lang === "en")}><Icon name="download" size={18} /> PDF</button><button className="btn btn-primary" onClick={() => go("/nasa/reponse")}><Icon name="reply" size={18} /> {tr("Recommandation", "Recommendation")}</button></div></header>
      <section className="rep-sec synth">
        <div>
          <h2><Icon name="warning" size={18} /> {tr("À retenir", "To note")}</h2>
          <ul className="synth-list">{CREW.filter((m) => r.lights[m.id] !== "ok").map((m) => <li key={m.id}><Lamp l={r.lights[m.id]} /><span><b>{m.name}</b> · {retainFor(m.id, m.reason, r)}</span></li>)}<li className="muted"><Lamp l="ok" compact /><span>{tr(`${CREW.filter((m) => r.lights[m.id] === "ok").length} autres astronautes nominaux.`, `${CREW.filter((m) => r.lights[m.id] === "ok").length} other astronauts nominal.`)}</span></li></ul>
        </div>
        <ReportSilhouette key={r.id} light={r.lights[focus.id]} />
      </section>
      <section className="rep-sec"><h2><Icon name="groups" size={18} /> {tr("Résumé équipage", "Crew summary")}</h2><table className="crew-table"><thead><tr><th>{tr("Astronaute", "Astronaut")}</th><th>{tr("État", "Status")}</th><th>{tr("FC", "HR")}</th><th>{tr("TA", "BP")}</th><th>SpO₂</th><th>{tr("Sommeil", "Sleep")}</th><th>{tr("Motif", "Reason")}</th></tr></thead><tbody>{CREW.map((m) => { const l = r.lights[m.id]; return <tr key={m.id} className={l === "ok" ? "muted" : ""}><td><span className="who"><Avatar id={m.id} l={l} /> {m.name}</span></td><td><Lamp l={l} /></td><td className="mono">{m.hr}</td><td className="mono">{m.bp}</td><td className="mono">{m.spo2}%</td><td className="mono">{m.sleep}</td><td>{l === "ok" ? "—" : m.id === "SR" ? (lang === "en" ? "SpO₂ 91% · 4 min" : "SpO₂ 91 % · 4 min") : m.reason}</td></tr>; })}</tbody></table><Demo /></section>
      <PredictionsSummary />
      <section className="rep-sec"><h2><Icon name="monitoring" size={18} /> {tr("Tendances depuis le dernier rapport", "Trends since the last report")}</h2><div className="trend-grid">{TRENDS.map((t) => <div key={t.id} className="r-card"><p className="eyebrow">{t.label} · {t.unit}</p>{Object.entries(t.series).map(([k, v]) => <div key={k} className="trend-row"><span className="mono">{k}</span><Spark v={v} l={k === "LK" ? "caution" : "ok"} w={150} h={26} /><span className="mono">{lang === "en" ? String(v[v.length - 1]) : String(v[v.length - 1]).replace(".", ",")}</span></div>)}</div>)}</div></section>
      <section className="rep-sec">
        <h2><Icon name="image" size={18} /> {tr("Images échographiques jointes", "Attached ultrasound images")} · {r.studies?.length ?? 0}</h2>
        <EchoReview studies={r.studies ?? []} selectedId={studyId} onSelect={onStudy} />
      </section>
      <section className="rep-sec"><h2><Icon name="ink_pen" size={18} /> {tr("Notes du médecin de bord", "Crew surgeon notes")}</h2><blockquote className="cmo-note"><Icon name="ink_pen" size={18} /><p>{r.notes}</p><cite>Nolan Okafor · {tr("médecin de bord", "crew surgeon")}</cite></blockquote></section>
    </article>
  );
}
export function NasaReply({ go }: { go: Go }) {
  const { tr, lang } = useLang();
  const [prio, setPrio] = useState("routine");
  const dest = [
    ["Médecin de bord", tr("Médecin de bord", "Crew surgeon")],
    ["Lina Kovacs", "Lina Kovacs"],
    ["Tout l’équipage", tr("Tout l’équipage", "Whole crew")],
  ] as const;
  const [to, setTo] = useState<string[]>(["Médecin de bord", "Lina Kovacs"]);
  const [fileOn, setFileOn] = useState(true);
  const [queued, setQueued] = useState(false);
  const [verified, setVerified] = useState(false);
  const toggleTo = (name: string) => setTo((cur) => (cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name]));
  return (
    <article className="rep-detail">
      <header className="rep-head"><div><h1>{lang === "en" ? "Recommendation to the crew" : "Recommandation à l’équipage"}</h1><p className="latency"><Icon name="schedule_send" size={14} /> {queued ? tr("En attente du backend — liaison montante non envoyée", "Waiting on the backend — uplink not sent") : tr(`Brouillon · prochaine fenêtre ${WINDOWS.nextUp}`, `Draft · next window ${WINDOWS.nextUp}`)}</p></div></header>
      <div className="reply-grid">
        <div className="r-card form">
          <label>{tr("Destinataires", "Recipients")}<div className="seg2">{dest.map(([id, name]) => <button type="button" key={id} aria-pressed={to.includes(id)} onClick={() => toggleTo(id)}>{name}</button>)}</div></label>
          <label>{tr("Priorité", "Priority")}<div className="seg2">{([["routine", tr("Routine", "Routine")], ["prio", tr("Prioritaire", "Priority")], ["urgent", tr("Urgent (alerte rouge)", "Urgent (red alert)")]] as const).map(([k, l]) => <button type="button" key={k} aria-pressed={prio === k} onClick={() => setPrio(k)}>{l}</button>)}</div></label>
          <EchoConfirm checked={verified} onChange={setVerified} />
          <label>{tr("Recommandation", "Recommendation")}<textarea className="r-text tall" key={lang} defaultValue={tr("Écho cardiaque de Lina Kovacs, coupe 4 cavités : VG 4,1 cm, dans les limites. Pas d’épanchement. L’attention reste la FC de repos.\nMaintenir repos 20 min ×2/j et hydratation.\nDécaler les tâches EVA de Lina Kovacs de 24 h.\nRemesurer FC de repos et scan fatigue demain 08:00, rapport attendu à la fenêtre de 13:50.", "Lina Kovacs cardiac ultrasound, 4-chamber view: LV 4.1 cm, within limits. No effusion. The concern remains resting HR.\nKeep rest 20 min ×2/day and hydration.\nDelay Lina Kovacs’s EVA tasks by 24 h.\nRemeasure resting HR and the fatigue scan tomorrow at 08:00; report expected on the 13:50 window.")} /></label>
          <label>{tr("Protocole joint", "Attached protocol")}{fileOn
            ? <div className="attach-row"><Icon name="attach_file" size={18} /> {tr("Protocole sommeil — fiche 3", "Sleep protocol — sheet 3")} <button type="button" className="icon-btn" aria-label={tr("Retirer", "Remove")} onClick={() => setFileOn(false)}><Icon name="close" size={18} /></button></div>
            : <button type="button" className="btn btn-ghost sm" onClick={() => setFileOn(true)}><Icon name="attach_file" size={16} /> {tr("Joindre le protocole sommeil", "Attach the sleep protocol")}</button>}
          </label>
          <div className="btn-row"><SoundButton sound="reportOut" className="btn btn-primary lg" disabled={!verified || !to.length} title={verified ? undefined : tr("Cochez la vérification de l’examen avant l’envoi.", "Tick the exam check before sending.")} onClick={() => { setQueued(true); notifyBackend(tr("Mise en file de la liaison montante vers le véhicule", "Queueing the uplink to the vehicle")); }}><Icon name="schedule_send" size={20} /> {queued ? tr("Toujours en attente du backend", "Still waiting on the backend") : tr("Mettre en file d’envoi", "Queue for send")}</SoundButton><button className="btn btn-secondary" onClick={() => go("/nasa/rapport/R-127-03")}>{tr("Retour au rapport", "Back to the report")}</button></div>
        </div>
        <div className="r-card">
          <h3><Icon name="outbox" size={18} /> {tr("File de liaison montante", "Uplink queue")}</h3>
          <ul className="log"><li><span className="mono">13:50</span><span><b>{tr("Cette réponse", "This reply")}</b> · {queued ? tr("bloquée, backend requis", "blocked, backend required") : prio === "urgent" ? tr("brouillon prioritaire", "priority draft") : tr("brouillon", "draft")} · {to.length ? to.map((id) => dest.find((d) => d[0] === id)?.[1] ?? id).join(", ") : tr("aucun destinataire", "no recipient")}</span></li><li><span className="mono">13:50</span><span>{tr("Mise à jour planning (Ops)", "Schedule update (Ops)")}</span></li></ul>
          <p className="r-note">{tr("Délai radio Terre–véhicule selon l’environnement : quasi nul en orbite basse, ~1,3 s pour la Lune, 4 à 24 min pour Mars. Une réponse peut arriver après la décision prise à bord.", "Earth–vehicle radio delay depends on the environment: near zero in low orbit, ~1.3 s for the Moon, 4 to 24 min for Mars. A reply can arrive after the decision made on board.")}</p>
        </div>
      </div>
    </article>
  );
}
export function NasaLink() {
  const { tr } = useLang();
  const now = tr("En cours", "In progress");
  const planned = tr("Programmée", "Scheduled");
  const w: [string, string, string][] = [["09:26", "10:05", now], ["13:50", "14:35", planned], ["19:10", "19:40", planned], [tr("J128 01:55", "D128 01:55"), "02:30", planned]];
  return (<><Head title={tr("Fenêtres de communication", "Communication windows")} sub={tr("Les rapports arrivent automatiquement à chaque fenêtre, ou immédiatement sur alerte rouge.", "Reports arrive automatically at each window, or immediately on a red alert.")} aside={<Demo />} />
    <div className="win-track">{w.map(([a, b, s]) => <div key={a} className={`win ${s === now ? "now" : ""}`}><span className="mono">{a} → {b}</span><strong>{s}</strong></div>)}</div>
    <div className="two-col"><Card title={tr("Liaison actuelle", "Current link")} icon="cell_tower"><dl className="facts"><div><dt>{tr("État", "Status")}</dt><dd><Lamp l="ok" compact /> {tr("Active", "Active")}</dd></div><div><dt>{tr("Fin", "End")}</dt><dd>{WINDOWS.linkUntil}</dd></div><div><dt>{tr("Dernier paquet", "Last packet")}</dt><dd>{tr("il y a 40 s", "40 s ago")}</dd></div></dl></Card><Card title={tr("Règles d’envoi à bord", "On-board send rules")} icon="rule"><ul className="bullets"><li>{tr("Rapport résumé à chaque liaison (4×/jour)", "Summary report on every link (4×/day)")}</li><li>{tr("Alerte rouge : envoi immédiat, prioritaire", "Red alert: immediate, priority send")}</li><li>{tr("Images écho jointes si le médecin de bord les attache", "Ultrasound images attached if the crew surgeon includes them")}</li></ul></Card></div></>);
}
export function NasaInbox({ id, go, view }: { id?: string; go: Go; view: string }) {
  const { tr } = useLang();
  const REPORTS = useReports();
  const CREW = useCrew();
  const r = REPORTS.find((x) => x.id === id) ?? REPORTS[0];
  const studies = r.studies ?? [];
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const study = studies.find((s) => s.id === picked) ?? studies[0];
  const seen = CREW.find((m) => m.id === study?.astronautId);
  return (
    <div className={`nasa-layout n01 n01--clinic${view === "reply" || view === "link" ? " is-wide" : ""}`}>
      {(view === "inbox" || view === "report") && <ReportList cur={r.id} go={go} />}
      <div className="nasa-main">
        {view === "reply" ? <NasaReply go={go} /> : view === "link" ? <NasaLink /> : <ReportDetail r={r} go={go} studyId={study?.id} onStudy={setPicked} />}
      </div>
      {view !== "reply" && view !== "link" && (
        <aside className="nasa-extra" aria-label={tr("Contexte sol", "Ground context")}>
          <Card title={tr("Liaison", "Link")} icon="satellite_alt">
            <p className="mono big">{WINDOWS.linkUntil}</p>
            <p className="r-note">{tr("Fin de fenêtre", "Window end")} · {tr("suivante", "next")} {WINDOWS.nextUp}</p>
            <button type="button" className="btn btn-ghost sm" onClick={() => go("/nasa/liaison")}>{tr("Détail liaison", "Link detail")}</button>
          </Card>
          <Card title={tr("File montante", "Uplink queue")} icon="outbox">
            <p>{tr("1 recommandation", "1 recommendation")} · {tr("départ", "departure")} {WINDOWS.nextUp}</p>
            <button type="button" className="btn btn-secondary sm" onClick={() => go("/nasa/reponse")}>{tr("Préparer réponse", "Prepare reply")}</button>
          </Card>
          <Card title={tr("Archive", "Archive")} icon="history">
            <p className="mono">{tr("127 j · 498 rapports", "127 d · 498 reports")}</p>
          </Card>
          <Card title={tr("Visionneuse", "Viewer")} icon="open_in_full" className="dual-only" aside={<Demo />}>
            {study && seen ? (
              <>
                <Probe live={false} variant={study.zone === "eye" ? "eye" : "heart"} marks={study.annotated} markLabel={study.mark} callout={false} depthCm={study.depthCm} depthLabel={`${tr("PROFONDEUR", "DEPTH")} ${study.depthCm} cm · ${tr("GAIN", "GAIN")} ${study.gain}`} label={`${seen.name}, ${study.view}`} />
                <p><b>{seen.name}</b> · {seen.id}</p>
                <p className="r-note">{study.view} · {study.captured}</p>
                <p className="mono">{study.measures[0] ? `${study.measures[0].value} ${study.measures[0].unit} · ${study.measures[0].verdict}` : tr(`Clip ${study.duration} · sans mesure`, `Clip ${study.duration} · no measurement`)}</p>
              </>
            ) : <p className="r-note">{tr("Aucune image dans ce rapport.", "No image in this report.")}</p>}
          </Card>
        </aside>
      )}
    </div>
  );
}
