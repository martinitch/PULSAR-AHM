/* Intro once per visit: PULSAR logo zoom (~1 s) then ECG trace; skippable with a click. */
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Logo } from "@/components/ui";
import { useLang } from "@/i18n";

const KEY = "pulsar.landing.intro";

export function LandingIntro({ onDone }: { onDone: () => void }) {
  const calm = useReducedMotion();
  const { tr } = useLang();
  const [phase, setPhase] = useState<"logo" | "ecg" | "done">("logo");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === "1") { onDone(); return; }
    } catch { /* ignore */ }
    if (calm) {
      try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
      onDone();
      return;
    }
    const t1 = window.setTimeout(() => setPhase("ecg"), 1000);
    return () => window.clearTimeout(t1);
  }, [calm, onDone]);

  useEffect(() => {
    if (phase !== "ecg") return;
    const t2 = window.setTimeout(() => {
      try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
      setPhase("done");
      onDone();
    }, 1400);
    return () => window.clearTimeout(t2);
  }, [phase, onDone]);

  const skip = () => {
    try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    onDone();
  };

  if (phase === "done") return null;

  return (
    <button type="button" className="lp-intro" onClick={skip} aria-label={tr("Passer l’introduction", "Skip the introduction")}>
      <motion.div
        className="lp-intro-logo"
        initial={{ scale: 1.35, opacity: 0.35 }}
        animate={{ scale: phase === "logo" ? 1 : 0.92, opacity: phase === "logo" ? 1 : 0.2 }}
        transition={{ duration: 0.9, ease: [0.2, 0, 0, 1] }}
      >
        <Logo size={72} />
      </motion.div>
      {phase === "ecg" && (
        <svg className="lp-intro-ecg" viewBox="0 0 320 48" aria-hidden="true">
          <motion.path
            d="M0 24 H40 L48 24 L56 8 L64 40 L72 24 H120 L128 24 L136 4 L144 44 L152 24 H220 L228 24 L236 12 L244 36 L252 24 H320"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "linear" }}
          />
        </svg>
      )}
      <span className="lp-intro-skip muted small">{tr("Cliquer pour passer", "Click to skip")}</span>
    </button>
  );
}
