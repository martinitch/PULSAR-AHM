/* Text Showcase — restrained roll + stats. */
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CountUp } from "./CountUp";
import type { LandingCopy } from "./locale";

const MS = 3200;
const ease = [0.22, 1, 0.36, 1] as const;

export function TextShowcase({
  calm: calmProp,
  copy,
}: {
  calm?: boolean;
  copy: LandingCopy["showcase"];
}) {
  const reduce = useReducedMotion();
  const calm = calmProp ?? !!reduce;
  const [i, setI] = useState(0);
  const lines = copy.lines;

  useEffect(() => {
    setI(0);
  }, [copy]);

  useEffect(() => {
    if (calm || lines.length < 2) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % lines.length), MS);
    return () => window.clearInterval(id);
  }, [calm, lines.length]);

  const line = lines[i] ?? lines[0];

  return (
    <div className="lp-showcase" aria-live="polite">
      <p className="lp-showcase-kicker">{copy.kicker}</p>
      <div className="lp-showcase-roll">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={`${line.fixed}-${line.word}`}
            className="lp-showcase-pair"
            initial={calm ? false : { y: "110%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={calm ? undefined : { y: "-110%", opacity: 0 }}
            transition={{ duration: calm ? 0 : 0.48, ease }}
          >
            <span className="lp-showcase-fixed">{line.fixed}</span>
            <span className="lp-showcase-word">{line.word}</span>
          </motion.p>
        </AnimatePresence>
      </div>

      <ul className="lp-showcase-stats">
        {copy.stats.map((s, n) => (
          <li key={s.label}>
            <strong className="lp-showcase-num">
              <CountUp to={s.value} suffix={s.suffix ?? ""} duration={1.2 + n * 0.12} />
            </strong>
            <span>{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
