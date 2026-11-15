/* DEV — « Silhouette 3D » board (front, ¾, back) used for the Astronaut Figma page (A14). URL: /?stillset */
import { BodyStill, ZoneLegend, ZONES3D, statesFor, type View, type ZoneState } from "@/components/body3d";
const ZSTATE_WORD: Record<ZoneState, string> = { nominal: "Dans la plage", medium: "Attention", high: "Alerte", active: "Sollicité", none: "Pas de mesure directe" };
const ZONE_WHY: Record<string, string> = { brain: "Sommeil 5h10, fatigue modérée", eyes: "SANS — examen écho si signes", heart: "FC de repos 94 bpm, ↑ 3 j", lungs: "SpO₂ 97 %", immune: "Pas de capteur direct", skin: "Pas de capteur direct", spine: "Exercice ARED suivi", kidneys: "Hydratation dans la plage", muscles: "Exercice ARED suivi" };
export function StillSet() {
  const st = statesFor("caution");
  return (
    <div className="still-set">
      <header><img src="/brand/pulsar-emblem-192.png" alt="" width={56} height={56} /><div><h1>Silhouette 3D — rendus face, ¾ et dos</h1><p className="sub">Corps mat gris, contour fin, aucune lueur · teinte discrète par zone selon l’état · repères cliquables (mot + couleur)</p></div></header>
      <div className="ss-body">
        {(["front", "34", "back"] as View[]).map((v) => <figure key={v}><BodyStill states={st} sel={v === "front" ? "heart" : undefined} view={v} /><figcaption>{({ front: "Face", "34": "Trois-quarts", back: "Dos", side: "Profil" } as Record<View, string>)[v]}</figcaption></figure>)}
        <aside>
          <h2>Légende</h2><ZoneLegend />
          <h2>Zones</h2>
          <ul className="ss-zones">{ZONES3D.map((z) => <li key={z.id} className={`st-${st[z.id] ?? "none"}`}><i /><b>{z.label}</b><span>{ZSTATE_WORD[st[z.id] ?? "none"]}</span><small>{ZONE_WHY[z.id]}</small></li>)}</ul>
          <p className="ss-credit">Maillage « base.obj » MakeHuman — CC0 1.0 (domaine public) · rendu three.js / react-three-fiber</p>
        </aside>
      </div>
    </div>
  );
}
