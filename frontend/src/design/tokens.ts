/**
 * PULSAR AHM v7 — design tokens in TypeScript (exact mirror of tokens.css).
 * Use for three.js (silhouette tints), SVG, charts, tests.
 * In CSS/JSX: prefer var(--token) or Tailwind classes (bg-surface, text-medium…).
 */
export const font = {
  head: '"Space Grotesk", system-ui, sans-serif',
  sans: '"Space Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"IBM Plex Mono", "Space Grotesk", ui-monospace, monospace',
} as const;

export const space = { s1: 4, s2: 8, s3: 12, s4: 16, s5: 24, s6: 32, s7: 48, s8: 64 } as const;
export const radius = { sm: 4, lg: 8, xl: 32, pill: 999, tablet: 20 } as const;

export const color = {
  dark: {
    bg: "#080b12", bgDeep: "#05070c", surface: "#10161f", surface2: "#171e29",
    line: "#1c2431", lineStrong: "#2a3344", hairline: "rgba(244,246,248,0.10)",
    text: "#f4f6f8", text2: "#b4bcc8", text3: "#7f8a9a",
    accent: "#3bb8f5", accentHover: "#7dceff", onAccent: "#000000", band: "#0b2438", focus: "#3bb8f5",
    ok: "#22c55e", okBg: "#052e16", medium: "#f0a020", mediumBg: "#241800", high: "#ef4444", highBg: "#280909", low: "#5ba3f0", lowBg: "#0b1f3a",
  },
  light: {
    bg: "#fafafa", bgDeep: "#eef1f4", surface: "#ffffff", surface2: "#f3f3f5",
    line: "#ebebef", lineStrong: "#d4d4da", hairline: "rgba(23,23,27,0.09)",
    text: "#17171b", text2: "#3d3d42", text3: "#5c5c60",
    accent: "#0b4f8a", accentHover: "#083a66", onAccent: "#ffffff", band: "#e8f2fa", focus: "#0b4f8a",
    ok: "#0f7b4a", okBg: "#e3f6ec", medium: "#7a5000", mediumBg: "#fff5d6", high: "#b3261e", highBg: "#fdecea", low: "#33499e", lowBg: "#e8ecfb",
  },
} as const;

/** 3D silhouette (MakeHuman): matte gray body + discreet tint per zone according to state. */
export const body3d = { base: "#a4abb4", nominal: "#3bb8f5", medium: "#f0a020", high: "#ef4444", active: "#22c55e" } as const;

/** NASA C&W lamps: word + icon (lucide-react), never color alone. */
export const statusWord = { ok: "Nominal", caution: "Attention", warning: "Alerte" } as const;
export const statusIcon = { ok: "check_circle", caution: "warning", warning: "error" } as const;

/** Figma v6 mockup screen formats. */
export const devices = {
  tabletLandscape: { w: 1194, h: 834 }, tabletPortrait: { w: 834, h: 1194 }, infirmary: { w: 1920, h: 1080 },
  mcc: { w: 2560, h: 1440 }, laptop: { w: 1440, h: 900 }, watchSquare: { w: 198, h: 242 }, watchRound: { w: 454, h: 454 },
} as const;
export const motion = { fast: 0.2, base: 0.28, data: 0.9, easeOut: [0.22, 1, 0.36, 1] as const } as const;
