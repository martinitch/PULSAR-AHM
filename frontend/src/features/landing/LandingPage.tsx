/* Landing « / » — SPACE STRO pacing: inset scene, hero, FR/EN sections. */
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import { motion, useInView, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { Icon, Logo, ThemeToggle, useTheme } from "@/components/ui";
import { mockApi } from "@/api/mock";
import type { TelemetrySample } from "@/api";
import type { Role } from "@/data/types";
import { useAuth } from "@/features/auth/AuthProvider";
import { IS_DEMO_AUTH } from "@/features/auth/authService";
import { homeFor } from "@/features/auth/roles";
import { LangToggle, useLang } from "@/i18n";
import { LandingIntro } from "./LandingIntro";
import { HeroScene } from "./HeroScene";
import { TextShowcase } from "./TextShowcase";
import "./landing.css";

const Watch6 = lazy(() => import("@/features/montre/Watch6").then((m) => ({ default: m.Watch6 })));

const ease = [0.22, 1, 0.36, 1] as const;
const vp = { once: true, amount: 0.22, margin: "0px 0px -40px 0px" } as const;

function reveal(calm: boolean, delay = 0) {
  if (calm) return {};
  return {
    initial: { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: vp,
    transition: { duration: 0.38, delay, ease },
  };
}

function SecHead({
  eyebrow,
  title,
  id,
  sub,
  calm,
  index,
}: {
  eyebrow: string;
  title: string;
  id: string;
  sub: string;
  calm: boolean;
  index: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.35 });
  const on = calm || seen;

  return (
    <header ref={ref} className="lp-sec-head">
      <motion.div
        className="lp-sec-kicker"
        initial={calm ? false : { opacity: 0, y: 10 }}
        animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.35, ease }}
      >
        <span className="lp-sec-idx">{index}</span>
        <p className="eyebrow">{eyebrow}</p>
      </motion.div>
      <div className="lp-sec-title-mask">
        <motion.h2
          id={id}
          initial={calm ? false : { y: "105%" }}
          animate={on ? { y: "0%" } : { y: "105%" }}
          transition={{ duration: 0.55, delay: calm ? 0 : 0.06, ease }}
        >
          {title}
        </motion.h2>
      </div>
      <motion.p
        className="lp-sub"
        initial={calm ? false : { opacity: 0, y: 12 }}
        animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.4, delay: calm ? 0 : 0.12, ease }}
      >
        {sub}
      </motion.p>
    </header>
  );
}

function useLiveMock(id = "LK") {
  const [d, setD] = useState<TelemetrySample[]>([]);
  useEffect(() => {
    let on = true;
    const load = () => mockApi.telemetry({ astronautId: id, limit: 40 }).then((x) => on && setD(x));
    load();
    const i = window.setInterval(load, 2000);
    return () => { on = false; window.clearInterval(i); };
  }, [id]);
  return d;
}

function LivePanel({ live, foot }: { live: string; foot: string }) {
  const { tr } = useLang();
  const d = useLiveMock();
  const last = d[d.length - 1];
  return (
    <div className="lp-live lp-frame" aria-label={live}>
      <div className="lp-live-head">
        <p className="lp-live-k"><span className="lp-live-dot" aria-hidden="true" /> {live}</p>
        <span className="chip mono">{tr("DÉMO", "DEMO")}</span>
      </div>
      <dl className="lp-live-vals">
        <div><dt>{tr("FC", "HR")}</dt><dd className="mono">{last?.heartRate ?? "—"}<small> bpm</small></dd></div>
        <div><dt>SpO₂</dt><dd className="mono">{last?.spo2 ?? "—"}<small> %</small></dd></div>
        <div><dt>Dose</dt><dd className="mono">{last?.radiationDoseRate ?? "—"}<small> µSv/h</small></dd></div>
      </dl>
      <div className="lp-spark" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={d} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <YAxis yAxisId="hr" hide domain={[70, 120]} />
            <YAxis yAxisId="s" hide domain={[90, 100]} />
            <Line yAxisId="hr" dataKey="heartRate" stroke="var(--accent)" strokeWidth={1.75} dot={false} isAnimationActive={false} />
            <Line yAxisId="s" dataKey="spo2" stroke="var(--text-2)" strokeWidth={1.25} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="lp-live-foot mono">{foot}</p>
    </div>
  );
}

export default function LandingPage() {
  const { user, enterRole } = useAuth();
  const [entering, setEntering] = useState<Role | null>(null);
  const [entered, setEntered] = useState(false);
  const { theme } = useTheme();
  const calm = !!useReducedMotion();
  const hero = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: hero, offset: ["start start", "end start"] });
  const sceneY = useTransform(scrollYProgress, [0, 1], calm ? [0, 0] : [0, 36]);
  const copyY = useTransform(scrollYProgress, [0, 1], calm ? [0, 0] : [0, -10]);
  const [intro, setIntro] = useState(true);
  const [hz, setHz] = useState(0);
  const [navSolid, setNavSolid] = useState(false);
  const { lang, t: app } = useLang();
  const t = app.landing;
  const endIntro = useCallback(() => setIntro(false), []);
  async function openRole(role: Role) {
    setEntering(role);
    try {
      await enterRole(role);
      setEntered(true);
    } finally {
      setEntering(null);
    }
  }

  const cta = user
    ? { to: homeFor(user.role), label: t.ctaSpace }
    : { to: "/connexion", label: t.ctaLogin };

  useEffect(() => { document.title = "PULSAR"; }, []);
  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hzCur = t.mission.hazards[hz] ?? t.mission.hazards[0];

  const enter = (delay: number) =>
    calm
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease },
        };

  if (entered && user) return <Navigate to={homeFor(user.role)} replace />;

  return (
    <div className="lp" lang={lang}>
      {intro && <LandingIntro onDone={endIntro} />}
      <a className="skip-link" href="#main">{t.skip}</a>

      <div className="lp-stage">
        <header className={`lp-nav${navSolid ? " is-solid" : ""}`}>
          <Link to="/" className="lp-brand" aria-label="PULSAR">
            <Logo size={32} />
          </Link>
          <nav aria-label="Sections">
            <a href="#mission">{t.nav.why}</a>
            <a href="#parcours">{t.nav.how}</a>
            <a href="#roles">{t.nav.role}</a>
            <a href="#demo">{t.nav.preview}</a>
          </nav>
          <span className="lp-nav-r">
            <LangToggle />
            <ThemeToggle />
            <Link className="btn btn-primary sm" to={cta.to} data-testid="cta-nav">
              {cta.label} <Icon name="arrow_forward" size={16} />
            </Link>
          </span>
        </header>

        <motion.div
          key={theme}
          className="lp-theme-flash"
          initial={calm ? false : { opacity: 0.28 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.35, ease }}
          aria-hidden="true"
        />

        <main id="main">
          <section className="lp-hero" ref={hero} aria-labelledby="hero-title">
            <motion.div className="lp-hero-stage" style={{ y: sceneY }}>
              <HeroScene calm={calm} />
            </motion.div>
            <motion.div className="lp-hero-in" style={{ y: copyY }}>
              <div className="lp-hero-copy">
                <motion.h1 id="hero-title" {...enter(0.06)}>PULSAR</motion.h1>
                <motion.p className="lp-tag" {...enter(0.12)}>{t.hero.tag}</motion.p>
                <motion.p className="lp-lead" {...enter(0.18)}>{t.hero.lead}</motion.p>
                <motion.div className="btn-row" {...enter(0.24)}>
                  <Link className="btn btn-primary btn-lg" to={cta.to} data-testid="cta-hero">
                    {cta.label} <Icon name="arrow_forward" size={18} />
                  </Link>
                  <a className="btn btn-ghost-line btn-lg" href="#mission">{t.hero.why}</a>
                </motion.div>
              </div>
              <motion.div className="lp-hero-show" {...enter(0.14)}>
                <TextShowcase calm={calm} copy={t.showcase} />
              </motion.div>
            </motion.div>
          </section>

          <div className="lp-bridge" aria-hidden="true" />

          <section id="mission" className="lp-sec" aria-labelledby="mission-t">
            <SecHead
              calm={calm}
              index="01"
              eyebrow={t.mission.eyebrow}
              id="mission-t"
              title={t.mission.title}
              sub={t.mission.sub}
            />
            <motion.div className="lp-hz" {...reveal(calm, 0.06)}>
              <div className="lp-hz-list" role="tablist" aria-label={t.mission.eyebrow}>
                {t.mission.hazards.map((h, i) => (
                  <motion.button
                    key={h.title}
                    type="button"
                    role="tab"
                    className="lp-hz-tab"
                    aria-selected={hz === i}
                    onClick={() => setHz(i)}
                    {...reveal(calm, i * 0.04)}
                  >
                    <span className="lp-hz-n">{String(i + 1).padStart(2, "0")}</span>
                    <span>{h.title}</span>
                  </motion.button>
                ))}
              </div>
              <motion.div
                key={`${lang}-${hz}`}
                className="lp-hz-body"
                role="tabpanel"
                initial={calm ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease }}
              >
                <p className="lp-hz-big">{String(hz + 1).padStart(2, "0")}</p>
                <h3>{hzCur.title}</h3>
                <div className="lp-hz-cols">
                  <div>
                    <p className="lp-hz-k">{t.mission.risk}</p>
                    <p>{hzCur.risk}</p>
                  </div>
                  <div>
                    <p className="lp-hz-k">{t.mission.does}</p>
                    <p>{hzCur.pulsar}</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </section>

          <section id="parcours" className="lp-sec lp-band" aria-labelledby="path-t">
            <SecHead
              calm={calm}
              index="02"
              eyebrow={t.path.eyebrow}
              id="path-t"
              title={t.path.title}
              sub={t.path.sub}
            />

            <div id="pour-vous" className="lp-need">
              <motion.h3 className="lp-need-title" {...reveal(calm)}>{t.path.needTitle}</motion.h3>
              <ul className="lp-need-list">
                {t.path.need.map((item, i) => (
                  <motion.li key={item.title} className="lp-lift" {...reveal(calm, i * 0.07)}>
                    <span className="lp-need-n">{String(i + 1).padStart(2, "0")}</span>
                    <h4>{item.title}</h4>
                    <p>{item.text}</p>
                  </motion.li>
                ))}
              </ul>
            </div>

            <ol className="lp-chain" aria-label={t.path.title}>
              {t.path.steps.map((p, i) => (
                <motion.li key={p.step} className="lp-lift lp-chain-step" {...reveal(calm, i * 0.06)}>
                  <span className="lp-chain-n">{p.step}</span>
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </motion.li>
              ))}
            </ol>
          </section>

          <section id="roles" className="lp-sec" aria-labelledby="roles-t">
            <SecHead
              calm={calm}
              index="03"
              eyebrow={t.roles.eyebrow}
              id="roles-t"
              title={t.roles.title}
              sub={t.roles.sub}
            />
            <ul className="lp-roles">
              {t.roles.items.map((r, i) => (
                <motion.li key={r.role} className="lp-lift" {...reveal(calm, i * 0.07)}>
                  <span className="lp-roles-id">{r.idHint}</span>
                  <h3>{r.title}</h3>
                  <p className="lp-roles-dev">{r.device}</p>
                  <p>{r.access}</p>
                  {IS_DEMO_AUTH && (
                    <button
                      type="button"
                      className="btn btn-secondary lp-role-enter"
                      aria-label={`${r.enter} ${r.title}`}
                      disabled={entering !== null}
                      aria-busy={entering === r.role}
                      onClick={() => openRole(r.role)}
                    >
                      {r.enter} <Icon name="arrow_forward" size={16} />
                    </button>
                  )}
                </motion.li>
              ))}
            </ul>
          </section>

          <section id="demo" className="lp-sec lp-band" aria-labelledby="demo-t">
            <SecHead
              calm={calm}
              index="04"
              eyebrow={t.demo.eyebrow}
              id="demo-t"
              title={t.demo.title}
              sub={t.demo.sub}
            />
            <motion.div className="lp-demo" {...reveal(calm, 0.06)}>
              <div className="lp-demo-stage">
                <Suspense fallback={<p className="chart-empty">…</p>}>
                  <div className="lp-watch"><Watch6 shape="square" goals={{ streak: 12, crew: 70 }} /></div>
                </Suspense>
              </div>
              <LivePanel live={t.demo.live} foot={t.demo.foot} />
            </motion.div>
          </section>

          <section className="lp-cta" aria-labelledby="cta-t">
            <motion.div className="lp-cta-in" {...reveal(calm)}>
              <div className="lp-sec-kicker lp-sec-kicker--center">
                <span className="lp-sec-idx">05</span>
                <p className="eyebrow">{t.next.eyebrow}</p>
              </div>
              <h2 id="cta-t">{t.next.title}</h2>
              <p>{t.next.text}</p>
              <Link className="btn btn-primary btn-lg" to={cta.to}>
                {cta.label} <Icon name="arrow_forward" size={18} />
              </Link>
            </motion.div>
          </section>
        </main>

        <motion.footer id="equipe" className="lp-foot" {...reveal(calm)}>
          <div className="lp-foot-brand">
            <Logo size={28} />
          </div>
          <nav className="lp-foot-nav" aria-label="Footer">
            <a href="#mission">{t.nav.why}</a>
            <a href="#parcours">{t.nav.how}</a>
            <a href="#roles">{t.nav.role}</a>
            <Link to="/connexion">{t.footLogin}</Link>
          </nav>
        </motion.footer>
      </div>
    </div>
  );
}
