/* Shell: navigation on the left (brand + groups) and toolbar above the content. */
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { Emblem, Icon, ThemeToggle, type IconName } from "@/components/ui";
import { motion as M } from "@/design/tokens";
import { useAuth } from "@/features/auth/AuthProvider";
import { ROLE_META } from "@/features/auth/roles";
import type { Role } from "@/data/types";
import { LangToggle, useLang } from "@/i18n";
import { AlarmBanner, AlarmWatcher, SoundMenu } from "@/features/sound";

/** Navigation link: [path, label, icon, exact?] */
export type NavItem = [string, string, IconName, boolean?];
/** Domain group in the bar (separator + optional label). */
export type NavGroup = { label: string; items: NavItem[] };

const CSS_ROLE: Record<Role, string> = { astronaute: "astro", "medecin-bord": "cmo", nasa: "nasa" };
const NAV_KEY = "pulsar.nav";

function initialNavOpen() {
  if (typeof window === "undefined") return true;
  try {
    const saved = localStorage.getItem(NAV_KEY);
    if (saved === "open" || saved === "closed") return saved === "open";
  } catch { /* preference unavailable */ }
  return window.matchMedia("(min-width: 900px)").matches;
}

export function RoleLayout({
  role,
  nav,
  children,
}: {
  role: Role;
  nav: NavGroup[];
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const { t, tr } = useLang();
  const go = useNavigate();
  const loc = useLocation();
  const calm = useReducedMotion();
  const meta = ROLE_META[role];
  const roleLabel = t.roles[role];
  useEffect(() => { document.title = `PULSAR · ${roleLabel}`; }, [roleLabel]);
  const denied = (loc.state as { denied?: string } | null)?.denied;
  const [navOpen, setNavOpen] = useState(initialNavOpen);
  useEffect(() => {
    try { localStorage.setItem(NAV_KEY, navOpen ? "open" : "closed"); } catch { /* preference unavailable */ }
  }, [navOpen]);

  return (
    <div className={`r-shell r-${CSS_ROLE[role]}${navOpen ? "" : " is-collapsed"}`}>
      <a className="skip-link" href="#main">{t.skip}</a>
      <aside className="r-side">
        <NavLink className="r-brand" to={meta.home} end aria-label={t.homeAria(roleLabel)}>
          <Emblem size={36} />
          <span className="r-brand-text">
            <b>PULSAR</b>
            <small>{roleLabel}</small>
          </span>
        </NavLink>
        <nav className="r-nav r-rail" aria-label={tr("Navigation", "Navigation")}>
          {nav.map((group, gi) => (
            <div key={group.label || `g-${gi}`} className="r-nav-group" data-group={group.label || undefined}>
              {group.label ? <span className="r-nav-label">{group.label}</span> : null}
              <div className="r-nav-pills" role="presentation">
                {group.items.map(([to, label, icon, end]) => (
                  <NavLink key={to} to={to} end={end} title={label}>
                    <Icon name={icon} size={18} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <button
          type="button"
          className="r-nav-toggle"
          aria-expanded={navOpen}
          aria-label={navOpen ? t.navClose : t.navOpen}
          title={navOpen ? t.navClose : t.navOpen}
          onClick={() => setNavOpen((open) => !open)}
        >
          <Icon name={navOpen ? "arrow_back" : "chevron_right"} size={18} />
        </button>
      </aside>
      <div className="r-stage">
      <header className="r-top">
        <div className="r-top-bar">
          <div className="r-top-end">
            <div className="r-tools" role="group" aria-label={t.tools}>
              <LangToggle />
              <SoundMenu />
              <ThemeToggle />
              <div className="r-user" aria-label={user?.displayName ?? roleLabel}>
                <Icon name={meta.icon} size={16} />
                <span>
                  <strong>{user?.displayName}</strong>
                  <small className="mono">{user?.id}</small>
                </span>
              </div>
              <button
                className="icon-btn r-logout"
                onClick={async () => {
                  await logout();
                  go("/connexion", { replace: true, state: { loggedOut: true } });
                }}
                aria-label={t.logout}
                title={t.logout}
              >
                <Icon name="logout" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <AlarmWatcher role={role} astronautId={user?.crewId} />
      <motion.main
        key={loc.pathname}
        className="r-main"
        id="main"
        initial={calm ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: M.fast, ease: M.easeOut }}
      >
        <AlarmBanner />
        {denied && (
          <p className="r-denied" role="status">
            <Icon name="lock" size={18} /> {t.denied(denied)}
          </p>
        )}
        {children}
      </motion.main>
      </div>
    </div>
  );
}
