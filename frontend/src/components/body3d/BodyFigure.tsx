/* 3D health silhouette (MakeHuman CC0). Interactive WebGL render (Body3D, loaded on demand);
   in capture mode (Figma / screenshots, ?capture=1 in dev): prerendered still + HTML zones. */
import { lazy, Suspense, useEffect, useState } from "react";
import { devFlags } from "@/app/dev/flags";
import { ZONES3D, VIEW_LABEL, type View, type ZoneState, type Proj } from "./zones";
import { useLang, VIEW_NAME_EN, ZONE_NAME_EN } from "@/i18n";
import { ZoneHud } from "./ZoneHud";
import STILLS from "./stills.json";
const Body3D = lazy(() => import("./Body3D").then((m) => ({ default: m.Body3D })));
const STILL_MODE = devFlags.capture;
export function curTheme(): "dark" | "light" { return document.documentElement.dataset.theme === "light" ? "light" : "dark"; }
function zoneName(id: string, label: string, lang: "fr" | "en") {
  return lang === "en" ? ZONE_NAME_EN[id] ?? label : label;
}
function viewName(v: View, lang: "fr" | "en") {
  return lang === "en" ? VIEW_NAME_EN[v] : VIEW_LABEL[v];
}
export function BodyStill({ states, sel, onPick, view, onView, probe, zoom, need }: { states: Record<string, ZoneState>; sel?: string; onPick?: (id: string) => void; view: View; onView?: (v: View) => void; probe?: boolean; zoom?: boolean; need?: string }) {
  const { lang, tr } = useLang();
  const P = (STILLS as unknown as Record<string, Proj>)[view] ?? {};
  const hit = sel ? P[sel] : undefined;
  const focused = !!(zoom && sel && hit);
  return (
    <div className={`body3d still${focused ? " is-zoom" : ""}`}>
      <div className="still-stage" style={focused ? { transform: "scale(2.6)", transformOrigin: `${hit![0]}% ${hit![1]}%` } : undefined}>
        <img src={`/body3d/body-${view}-${curTheme()}.png`} alt={tr(`Silhouette 3D, vue ${viewName(view, lang)}`, `3D silhouette, ${viewName(view, lang)} view`)} draggable={false} />
        {ZONES3D.map((z) => { const p = P[z.id]; if (!p || !p[2]) return null; const name = zoneName(z.id, z.label, lang); return (
          <button key={z.id} style={{ left: `${p[0]}%`, top: `${p[1]}%` }} className={`hot3d abs st-${states[z.id] ?? "none"} ${z.id === sel ? "on" : ""} ${["brain", "lungs", "skin"].includes(z.id) ? "lft" : ""}`} aria-pressed={z.id === sel} aria-label={name} onClick={() => onPick?.(z.id)}><i /><span>{name}</span></button>); })}
        {probe && sel && P[sel] && <span className="probe-pin" style={{ left: `${P[sel][0]}%`, top: `${P[sel][1]}%` }} aria-hidden="true" />}
      </div>
      {focused && need && hit![2] && <ZoneHud key={sel} x={hit![0]} y={hit![1]} label={need} tone={states[sel!] ?? "none"} />}
      {onView && <div className="view-seg" role="radiogroup" aria-label={tr("Vue du corps", "Body view")}>{(Object.keys(VIEW_LABEL) as View[]).map((v) => <button key={v} role="radio" aria-checked={view === v} onClick={() => onView(v)}>{viewName(v, lang)}</button>)}</div>}
    </div>
  );
}
export function BodyFigure({ states, sel, onPick, views = true, probe, initial = "front", zoom, need }: { states: Record<string, ZoneState>; sel?: string; onPick?: (id: string) => void; views?: boolean; probe?: boolean; initial?: View; zoom?: boolean; need?: string }) {
  const [view, setView] = useState<View>(initial);
  useEffect(() => {
    if (!zoom || !sel) return;
    const z = ZONES3D.find((x) => x.id === sel);
    if (z) setView(z.dir === 1 ? "front" : "back");
  }, [zoom, sel]);
  const onView = views ? setView : undefined;
  return (
    <div className={`body-fig${zoom && sel ? " is-focus" : ""}`}>
      {STILL_MODE || probe ? <BodyStill states={states} sel={sel} onPick={onPick} view={view} onView={onView} probe={probe} zoom={zoom} need={need} />
        : <Suspense fallback={<BodyStill states={states} sel={sel} view={view} zoom={zoom} need={need} />}><Body3D states={states} sel={sel} onPick={onPick} view={view} onView={onView} theme={curTheme()} zoom={zoom} need={need} /></Suspense>}
    </div>
  );
}
export function ZoneLegend({ exercise = false }: { exercise?: boolean }) {
  const { tr } = useLang();
  return (
    <ul className="zone-legend" aria-label={tr("Légende des couleurs", "Color legend")}>
      <li><i className="st-nominal" /> {tr("Dans la plage", "In range")}</li>
      {exercise && <li><i className="st-active" /> {tr("Sollicité · séance", "Worked · session")}</li>}
      <li><i className="st-medium" /> {tr("Attention", "Caution")}</li>
      <li><i className="st-high" /> {tr("Alerte", "Alert")}</li>
      <li><i className="st-none" /> {tr("Pas de mesure directe", "No direct measurement")}</li>
    </ul>
  );
}
