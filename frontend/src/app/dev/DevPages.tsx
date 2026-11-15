/* Dev pages (outside the user flow) — see flags.ts. Returns null if no flag is active. */
import { lazy, Suspense } from "react";
import { devFlags } from "./flags";
import { StillSet } from "./StillSet";
import { Watch6, WatchGallery, type WShape, type WView } from "@/features/montre/Watch6";
import { STILL_STATES, type View } from "@/components/body3d";
const StillPage = lazy(() => import("@/components/body3d/Body3D").then((m) => ({ default: m.StillPage })));

export default function DevPages() {
  if (!devFlags.enabled) return null;
  if (devFlags.stillset) return <StillSet />;
  if (devFlags.wtgrid) return <WatchGallery />;
  if (devFlags.wt) return <div className="wt-standalone"><Watch6 shape={(devFlags.wt as WShape) || "square"} view={(devFlags.wtView as WView) || "home"} frozen={!devFlags.wtLive} /></div>;
  if (devFlags.still) {
    const theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    return <Suspense fallback={null}><StillPage view={devFlags.still as View} theme={theme} states={STILL_STATES} /></Suspense>;
  }
  return null;
}
