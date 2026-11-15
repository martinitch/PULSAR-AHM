/* 3D health silhouette — import from "@/components/body3d".
   Body3D (three.js) is loaded on demand by BodyFigure: do not import it directly in a screen. */
export { BodyFigure, BodyStill, ZoneLegend, curTheme } from "./BodyFigure";
export { VitalFloats, type VitalFloatItem } from "./VitalFloats";
export { zoneBrief, useZoneZoom } from "./zoom";
export { ZONES3D, VIEW_LABEL, VIEW_ANGLE, STILL_STATES, statesFor, type View, type ZoneState, type Proj } from "./zones";
