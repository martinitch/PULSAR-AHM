/* Entry — same space scene as the landing (stars + limb). Role choice, without an identifier. */
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { Icon, Logo, ThemeToggle, useTheme } from "@/components/ui";
import { motion as M } from "@/design/tokens";
import { LangToggle, useLang } from "@/i18n";
import type { Role } from "@/data/types";
import { useAuth } from "./AuthProvider";
import { IS_DEMO_AUTH } from "./authService";
import { AuthError } from "./types";
import { homeFor, ROLE_META } from "./roles";
import { SpaceFilm } from "@/features/landing/SpaceFilm";
import "@/features/landing/landing.css";

export function LoginPage() {
  const { user, enterRole } = useAuth();
  const { theme } = useTheme();
  const { t } = useLang();
  const L = t.login;
  const nav = useNavigate();
  const loc = useLocation() as { state?: { loggedOut?: boolean } };
  const calm = useReducedMotion();
  const [opening, setOpening] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { document.title = L.titleDoc; }, [L.titleDoc]);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const roles = Object.keys(ROLE_META) as Role[];

  async function pick(role: Role) {
    setErr(null);
    setOpening(true);
    try {
      const u = await enterRole(role);
      nav(homeFor(u.role), { replace: true });
    } catch (x) {
      const a = x instanceof AuthError ? x : new AuthError("NETWORK", "Ouverture impossible. Réessayez.");
      setErr(a.message);
      setOpening(false);
    }
  }

  return (
    <div className="login">
      <motion.div
        key={theme}
        className="lp-theme-flash"
        initial={calm ? false : { opacity: 0.35 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.45, ease: M.easeOut }}
        aria-hidden="true"
      />
      <figure className="login-photo login-photo--film">
        <SpaceFilm variant="panel" interactive={!calm} cycle credit={false} />
      </figure>
      <div className="login-side">
        <div className="login-top">
          <Link to="/" aria-label={L.back}>
            <Logo size={36} />
          </Link>
          <span className="login-top-r">
            <LangToggle />
            <ThemeToggle />
          </span>
        </div>
        <main id="main" className="login-main">
          <Link className="btn btn-ghost sm login-back" to="/">
            <Icon name="arrow_back" size={16} /> {L.back}
          </Link>
          <h1 style={{ whiteSpace: "pre-line" }}>{L.h1}</h1>
          <p className="lead">{L.lead}</p>
          {IS_DEMO_AUTH && (
            <section className="login-roles" aria-label={L.rolesLabel}>
              <p className="hint">{L.rolesLead}</p>
              {roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  className="login-role"
                  disabled={opening}
                  onClick={() => pick(role)}
                >
                  <Icon name={ROLE_META[role].icon} />
                  <span>
                    <strong>{t.roles[role]}</strong>
                    <small>{L.roleDevice[role]}</small>
                  </span>
                  <Icon name="arrow_forward" size={16} />
                </button>
              ))}
            </section>
          )}
          {loc.state?.loggedOut && (
            <p className="hint" role="status"><Icon name="check_circle" size={18} /> {L.loggedOut}</p>
          )}
          <AnimatePresence initial={false}>
            {err && (
              <motion.p
                key="login-error"
                className="form-error"
                id="login-error"
                role="alert"
                initial={calm ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: M.fast }}
              >
                <Icon name="error" size={18} /> {err}
              </motion.p>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
