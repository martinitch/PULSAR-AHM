/* Light / dark theme — remembered (localStorage « pulsar-theme »), otherwise system preference.
   Display: « modes » toggle (Espace / Clinique) in the toolbar. */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { useLang } from "@/i18n";

export type Theme = "light" | "dark";
const KEY = "pulsar-theme";
const Ctx = createContext<{ theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }>({
  theme: "dark",
  toggle: () => {},
  setTheme: () => {},
});

function initial(): Theme {
  const q = new URLSearchParams(window.location.search).get("theme");
  if (q === "light" || q === "dark") return q;
  const saved = localStorage.getItem(KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initial);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  const setTheme = useCallback((n: Theme) => {
    localStorage.setItem(KEY, n);
    setThemeState(n);
  }, []);
  const toggle = useCallback(() => {
    setThemeState((t) => {
      const n = t === "dark" ? "light" : "dark";
      localStorage.setItem(KEY, n);
      return n;
    });
  }, []);
  return <Ctx.Provider value={{ theme, toggle, setTheme }}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);

/** Visual toggle: icons only (dark / light). */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { tr } = useLang();
  const dark = tr("Mode sombre", "Dark mode");
  const light = tr("Mode clair", "Light mode");
  return (
    <div className="theme-modes" role="group" aria-label={tr("Mode d’affichage", "Display mode")}>
      <button
        type="button"
        className="theme-modes__btn"
        aria-pressed={theme === "dark"}
        aria-label={dark}
        onClick={() => setTheme("dark")}
        title={dark}
      >
        <Icon name="dark_mode" size={16} />
      </button>
      <button
        type="button"
        className="theme-modes__btn"
        aria-pressed={theme === "light"}
        aria-label={light}
        onClick={() => setTheme("light")}
        title={light}
      >
        <Icon name="light_mode" size={16} />
      </button>
    </div>
  );
}
