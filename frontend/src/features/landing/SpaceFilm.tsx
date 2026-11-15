/* Space scene: NASA views sequenced (4 s) + stars. Landing + sign-in. */
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useTheme } from "@/components/ui";
import { Starfield } from "./Starfield";
import { SPACE_GALLERY, SPACE_HERO } from "./spaceAssets";

const VIEW_MS = 4000;

type Props = {
  variant?: "hero" | "panel";
  interactive?: boolean;
  credit?: boolean;
  /** If true (hero default), sequences the views every 4 s. */
  cycle?: boolean;
};

export function SpaceFilm({
  variant = "hero",
  interactive = true,
  credit = false,
  cycle = variant === "hero",
}: Props) {
  const { theme } = useTheme();
  const reduce = useReducedMotion();
  const still = !!reduce;
  const light = theme === "light";
  const [i, setI] = useState(0);
  const shots = SPACE_GALLERY;
  const shot = shots[i] ?? SPACE_HERO;

  useEffect(() => {
    if (!cycle || still || shots.length < 2) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % shots.length), VIEW_MS);
    return () => window.clearInterval(id);
  }, [cycle, still, shots.length]);

  /* Preload of the following views */
  useEffect(() => {
    shots.forEach((s) => {
      const img = new Image();
      img.src = s.src;
    });
  }, [shots]);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 55, damping: 28, mass: 0.55 });
  const y = useSpring(rawY, { stiffness: 55, damping: 28, mass: 0.55 });
  const photoX = useTransform(x, [-1, 1], [-28, 28]);
  const photoY = useTransform(y, [-1, 1], [-16, 16]);
  const starsX = useTransform(x, [-1, 1], [-42, 42]);
  const starsY = useTransform(y, [-1, 1], [-24, 24]);

  const density = light
    ? (variant === "hero" ? 0.0001 : 0.00007)
    : (variant === "hero" ? 0.00022 : 0.00016);

  return (
    <div
      className={`lp-film lp-film--${variant}${light ? " is-light" : " is-dark"}`}
      onPointerMove={(e) => {
        if (still || !interactive) return;
        const r = e.currentTarget.getBoundingClientRect();
        rawX.set(((e.clientX - r.left) / r.width) * 2 - 1);
        rawY.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onPointerLeave={() => { rawX.set(0); rawY.set(0); }}
    >
      <motion.div className="lp-film-photo" style={{ x: photoX, y: photoY }} aria-hidden="true">
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={shot.src}
            className="lp-film-shot"
            initial={still ? false : { opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1.08 }}
            exit={still ? undefined : { opacity: 0, scale: 1.12 }}
            transition={{ duration: still ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="lp-film-drift"
              animate={
                still
                  ? undefined
                  : { scale: [1, 1.06, 1], x: ["-1.5%", "2%", "-1.5%"], y: ["0%", "1.2%", "0%"] }
              }
              transition={still ? undefined : { duration: VIEW_MS / 1000, ease: "easeInOut" }}
            >
              <img
                className="lp-film-sun"
                src={shot.src}
                alt=""
                width={1920}
                height={1080}
                decoding="async"
                fetchPriority={variant === "hero" && i === 0 ? "high" : "auto"}
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <motion.div className="lp-film-stars" style={{ x: starsX, y: starsY }} aria-hidden="true">
        <Starfield key={theme} density={density} />
      </motion.div>
      <div className="lp-film-scrim" aria-hidden="true" />

      {credit && (
        <p className="lp-photo-credit">{shot.label ?? SPACE_HERO.credit}</p>
      )}
    </div>
  );
}
