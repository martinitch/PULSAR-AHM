/* Solid gamification glyphs (streak, XP, badge, crew).
   Original drawings, a single color (currentColor): not the Duolingo brand. */

const GLYPHS = {
  flame: "M12 2.2c.6 2.6-1.4 4-1.4 6.4 0 1.3.7 2.2 1.6 2.8 2.4-1.8 4-3.8 4-6.4 2.4 2.2 3.8 5 3.8 8.2C20 18.4 16.4 22 12 22S4 18.4 4 13.2C4 9.4 6.2 6.4 8.6 4.8 9.8 6.6 10.6 7.4 10.6 9c0-2.8-1.2-5 1.4-6.8z",
  bolt: "M13.2 1.6 3.4 13.2h6.4l-1.6 9.2 10.4-13.2h-6.6L13.2 1.6z",
  gem: "M12 2.2 21 9.2 12 21.8 3 9.2 12 2.2z",
  crew: "M8 11.2a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8zM3.2 18.6v-1c0-2.1 2.2-3.6 4.8-3.6s4.8 1.5 4.8 3.6v1H3.2zM16.5 10.6a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2zM13.4 18.6v-.7c0-1.7 1.5-3 3.2-3s3.2 1.3 3.2 3v.7h-6.4z",
  missions: "M7 3.2h10a2 2 0 0 1 2 2v14.2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5.2a2 2 0 0 1 2-2zm2.1 7.4 1.5 1.5 3.6-3.6 1.3 1.3-4.9 4.9-2.8-2.8 1.3-1.3z",
  medal: "M8.4 2.4h2.3l1.3 4.2 1.3-4.2h2.3L13.2 9H10.8L8.4 2.4zM12 20.8a4.7 4.7 0 1 0 0-9.4 4.7 4.7 0 0 0 0 9.4z",
  moon: "M15.2 2.8A8.4 8.4 0 1 0 20 16.6 6.5 6.5 0 0 1 15.2 2.8z",
  heart: "M12 20.6s-6.6-4.1-6.6-8.8a3.6 3.6 0 0 1 6.6-1.9 3.6 3.6 0 0 1 6.6 1.9c0 4.7-6.6 8.8-6.6 8.8z",
  clock: "M12 2.4a9.6 9.6 0 1 0 .1 0zM11.2 6.8h1.6V12h4.2v1.6H11.2V6.8z",
  orbit: "M12 8.2a3.8 3.8 0 1 0 .1 0zM12 2.4c5.2 0 9.2 2.2 9.2 4.8S17.2 12 12 12 2.8 9.8 2.8 7.2 6.8 2.4 12 2.4zm0 1.7c-3.6 0-6.6 1.4-6.6 3.1S8.4 10.3 12 10.3s6.6-1.4 6.6-3.1S15.6 4.1 12 4.1z",
  comet: "M16.6 3.6a2 2 0 0 1 .5 2.4c-2.2 3.6-5.4 6.4-9.2 8.4-.7.4-1.5-.5-1-.1 2.4-2.6 5.4-5 7.6-6.8-1.6.2-3 .8-4.2 2-.5.5-1.3 0-.9-.6 1.6-2.4 4.2-4 7.2-5.3z",
  beacon: "M10 21.6h4V12h-4v9.6zM12 2.2 18.2 12H5.8L12 2.2zM6.4 13.4h11.2v2.4H6.4z",
  relay: "M2.4 8.6h6.4v2.6H2.4zM15.2 8.6h6.4v2.6h-6.4zM8.6 7.8h6.8v8.2H8.6zM10.8 16h2.4v3.6h-2.4zM7.2 20.2h9.6v2H7.2z",
  watch: "M9 2.4h6v2.2H9V2.4zM9 19.4h6V21.6H9v-2.2zM7.2 6.2h9.6A2.2 2.2 0 0 1 19 8.4v7.2a2.2 2.2 0 0 1-2.2 2.2H7.2A2.2 2.2 0 0 1 5 15.6V8.4a2.2 2.2 0 0 1 2.2-2.2z",
} as const;

export type GameIconName = keyof typeof GLYPHS;

const BADGE_GLYPH: Record<string, GameIconName> = {
  "b-7": "orbit",
  "b-30": "moon",
  "b-100d": "comet",
  "b-100": "beacon",
  "b-500": "relay",
  "b-1000": "gem",
  "b-ex": "medal",
  "b-breath": "heart",
  "b-night": "watch",
  "b-time": "clock",
  "b-echo": "beacon",
};

export function badgeGlyph(id: string): GameIconName {
  return BADGE_GLYPH[id] ?? "gem";
}

export function GameIcon({ name, size = 20, className }: { name: GameIconName; size?: number; className?: string }) {
  return (
    <svg className={className ? `icon game-icon ${className}` : "icon game-icon"} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" fillRule={name === "missions" || name === "clock" || name === "orbit" ? "evenodd" : "nonzero"} d={GLYPHS[name]} />
    </svg>
  );
}
