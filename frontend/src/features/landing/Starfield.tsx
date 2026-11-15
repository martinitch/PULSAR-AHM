/* Calm star field (canvas): fine points, very slow drift, no glow.
   prefers-reduced-motion: still image. Pause when the tab is hidden or the section is off screen. */
import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

export function Starfield({ density = 0.00022 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const calm = useReducedMotion();
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const g = cv.getContext("2d"); if (!g) return;
    let w = 0, h = 0, raf = 0, visible = true;
    let stars: { x: number; y: number; r: number; a: number; v: number; vy: number; ph: number }[] = [];
    const seed = (i: number) => { const x = Math.sin(i * 91.7) * 43758.5453; return x - Math.floor(x); };
    const ink = () => getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#f5f5f7";
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(w * h * density);
      stars = Array.from({ length: n }, (_, i) => ({
        x: seed(i) * w, y: seed(i + 7.3) * h,
        r: 0.35 + seed(i + 3.1) * 1.25,
        a: 0.28 + seed(i + 5.7) * 0.62,
        v: 0.08 + seed(i + 1.9) * 0.22,
        vy: 0.03 + seed(i + 11.2) * 0.08,
        ph: seed(i + 2.4) * Math.PI * 2,
      }));
    };
    const t0 = performance.now();
    const draw = (now = performance.now()) => {
      g.clearRect(0, 0, w, h);
      const fill = ink();
      const t = (now - t0) / 1000;
      for (const s of stars) {
        const tw = calm ? 1 : 0.55 + 0.45 * Math.sin(t * (0.7 + s.v * 3) + s.ph);
        g.globalAlpha = s.a * tw;
        g.fillStyle = fill;
        g.beginPath();
        g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    };
    const step = (now: number) => {
      if (visible && !document.hidden) {
        for (const s of stars) {
          s.x -= s.v; s.y += s.vy;
          if (s.x < -2) s.x = w + 2;
          if (s.y > h + 2) s.y = -2;
        }
        draw(now);
      }
      raf = requestAnimationFrame(step);
    };
    resize(); draw();
    const ro = new ResizeObserver(() => { resize(); draw(); }); ro.observe(cv);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(cv);
    const mo = new MutationObserver(() => draw());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    if (!calm) raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); mo.disconnect(); };
  }, [calm, density]);
  return <canvas ref={ref} className="lp-starfield" aria-hidden="true" />;
}
