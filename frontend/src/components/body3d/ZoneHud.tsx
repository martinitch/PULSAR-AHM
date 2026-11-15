/* Need arrow: brackets + line + chevron. Clinical marker, no halo. */
import type { ZoneState } from "./zones";

export type HudHandles = {
  line: SVGPolylineElement | null;
  lock: HTMLSpanElement | null;
  tag: HTMLParagraphElement | null;
};

export function hudGeom(x: number, y: number) {
  const goLeft = x > 62;
  const x2 = goLeft ? Math.max(6, x - 18) : Math.min(68, x + 14);
  const y2 = Math.max(16, Math.min(y - 9, 72));
  const elbowX = x + (goLeft ? -4 : 4);
  const elbowY = (y + y2) / 2;
  const approach = goLeft ? x2 + 2 : x2 - 2;
  return { goLeft, x2, y2, points: `${x},${y} ${elbowX},${elbowY} ${approach},${y2} ${x2},${y2}` };
}

export function moveHud(h: HudHandles, x: number, y: number, vis: boolean) {
  const g = hudGeom(x, y);
  const op = vis ? "1" : "0";
  if (h.line) {
    h.line.setAttribute("points", g.points);
    h.line.style.opacity = op;
  }
  if (h.lock) {
    h.lock.style.left = `${x}%`;
    h.lock.style.top = `${y}%`;
    h.lock.style.opacity = op;
  }
  if (h.tag) {
    h.tag.style.left = `${g.x2}%`;
    h.tag.style.top = `${g.y2}%`;
    h.tag.style.opacity = op;
    h.tag.classList.toggle("is-left", g.goLeft);
  }
}

export function ZoneHud({ x, y, label, tone, live, handles }: { x: number; y: number; label: string; tone: ZoneState; live?: boolean; handles?: HudHandles }) {
  const g = hudGeom(x, y);
  const hide = live ? 0 : 1;
  return (
    <div className={`zone-hud tone-${tone}${live ? " is-live" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          ref={(el) => { if (handles) handles.line = el; }}
          points={g.points}
          pathLength={1}
          style={{ opacity: hide }}
        />
      </svg>
      <span
        ref={(el) => { if (handles) handles.lock = el; }}
        className="zone-hud-lock"
        style={{ left: `${x}%`, top: `${y}%`, opacity: hide }}
      >
        <i className="zone-hud-frame" />
        <i className="zone-hud-dot" />
      </span>
      <p
        ref={(el) => { if (handles) handles.tag = el; }}
        className={`zone-hud-need${g.goLeft ? " is-left" : ""}`}
        style={{ left: `${g.x2}%`, top: `${g.y2}%`, opacity: hide }}
      >
        <i className="zone-hud-chev" />
        {label}
      </p>
    </div>
  );
}
