/* Counter animated on scroll — "text showcase" style / figures in motion. */
import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

type Props = {
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
};

export function CountUp({ to, duration = 1.4, suffix = "", prefix = "", className }: Props) {
  const calm = !!useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [n, setN] = useState(calm ? to : 0);

  useEffect(() => {
    if (calm) { setN(to); return; }
    if (!inView) return;
    let raf = 0;
    const t0 = performance.now();
    const ms = duration * 1000;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - (1 - p) ** 3;
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [calm, duration, inView, to]);

  return (
    <span ref={ref} className={className}>
      {prefix}{n}{suffix}
    </span>
  );
}
