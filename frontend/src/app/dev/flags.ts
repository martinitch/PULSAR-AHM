/* Development flags. Active only in `npm run dev` (or a build with VITE_DEV_TOOLS=true).
   - ?capture=1: silhouette as a still image (Figma captures / visual tests, no WebGL)
   - ?stillset  : Silhouette 3D board (front, ¾, back) — Figma mockup A14
   - ?wtgrid    : gallery of every watch screen; ?wt=square|round&v=home… : a single watch screen
   - ?still=front|34|side|back&theme=dark|light: full-screen render to regenerate public/body3d/*.png */
const q = new URLSearchParams(window.location.search);
const enabled = import.meta.env.DEV || import.meta.env.VITE_DEV_TOOLS === "true";
export const devFlags = {
  enabled,
  capture: enabled && (q.has("capture") || q.has("still2d")),
  stillset: enabled && q.has("stillset"),
  wtgrid: enabled && q.has("wtgrid"),
  wt: enabled ? q.get("wt") : null,
  wtView: q.get("v"),
  wtLive: q.has("live"),
  still: enabled ? q.get("still") : null,
  scan: enabled ? q.get("scan") : null,
};
/** Is a dev page requested? (avoids loading its code otherwise) */
export const hasDevPage = devFlags.enabled && (devFlags.stillset || devFlags.wtgrid || !!devFlags.wt || !!devFlags.still);
