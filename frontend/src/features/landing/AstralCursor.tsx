/* Astral cursor: default arrow, matching hand on clickable areas. */
import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

const ARROW = { src: "/images/cursor-astral.png", w: 22, h: 19, tipX: 1, tipY: 1 };
const HAND = { src: "/images/cursor-hand.png", w: 26, h: 34, tipX: 12, tipY: 1 };

type Mode = "default" | "pointer" | "text" | "busy";

function modeFromTarget(el: Element | null): Mode {
  if (!el) return "default";
  if (el.closest("[disabled], [aria-busy='true']")) return "busy";
  if (el.closest("input:not([type='submit']):not([type='button']), textarea, [contenteditable='true']")) return "text";
  if (el.closest("a, button, [role='button'], [role='tab'], label, .icon-btn, .btn, summary")) return "pointer";
  return "default";
}

export function AstralCursor({ on }: { on: boolean }) {
  const [ok, setOk] = useState(false);
  const [mode, setMode] = useState<Mode>("default");
  const [down, setDown] = useState(false);
  const [visible, setVisible] = useState(false);
  const [client, setClient] = useState({ x: -80, y: -80 });
  const mx = useMotionValue(-80);
  const my = useMotionValue(-80);
  const x = useSpring(mx, { stiffness: 1400, damping: 48, mass: 0.12 });
  const y = useSpring(my, { stiffness: 1400, damping: 48, mass: 0.12 });

  const asset = mode === "pointer" ? HAND : ARROW;

  useEffect(() => {
    if (!on) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    setOk(fine);
    if (!fine) return;

    const move = (e: PointerEvent) => {
      setClient({ x: e.clientX, y: e.clientY });
      setVisible(true);
      setMode(modeFromTarget(document.elementFromPoint(e.clientX, e.clientY)));
    };
    const downH = (e: PointerEvent) => { if (e.button === 0) setDown(true); };
    const upH = () => setDown(false);
    const leave = () => setVisible(false);
    const enter = () => setVisible(true);

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", downH);
    window.addEventListener("pointerup", upH);
    window.addEventListener("pointercancel", upH);
    document.documentElement.addEventListener("mouseleave", leave);
    document.documentElement.addEventListener("mouseenter", enter);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", downH);
      window.removeEventListener("pointerup", upH);
      window.removeEventListener("pointercancel", upH);
      document.documentElement.removeEventListener("mouseleave", leave);
      document.documentElement.removeEventListener("mouseenter", enter);
    };
  }, [on]);

  /* Realign the hotspot when switching arrow ↔ hand */
  useEffect(() => {
    if (!ok) return;
    mx.set(client.x - asset.tipX);
    my.set(client.y - asset.tipY);
  }, [asset.tipX, asset.tipY, client.x, client.y, mx, my, ok]);

  if (!on || !ok) return null;

  return (
    <motion.div
      className="fig-cursor"
      style={{ x, y, opacity: visible ? 1 : 0, width: asset.w, height: asset.h }}
      aria-hidden="true"
      data-mode={mode}
      data-down={down || undefined}
    >
      <img
        className="fig-cursor-img"
        src={asset.src}
        alt=""
        width={asset.w}
        height={asset.h}
        draggable={false}
      />
      {mode === "text" && <span className="fig-cursor-caret" />}
    </motion.div>
  );
}

/** Micro-vibration (if the browser allows it). */
export function tap(ms = 10) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}
