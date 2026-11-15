/* App language, EN by default, FR second (localStorage "pulsar.lang"). */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LANG_KEY, MESSAGES, readLang, type AppMessages, type Lang } from "./messages";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: AppMessages;
  /** English by default; French when FR is selected. */
  tr: (fr: string, en: string) => string;
};

const LangCtx = createContext<Ctx>({
  lang: "en",
  setLang: () => {},
  t: MESSAGES.en,
  tr: (_fr, en) => en,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (typeof window === "undefined" ? "en" : readLang()));
  const setLang = useCallback((l: Lang) => {
    try { localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
    setLangState(l);
    document.documentElement.lang = l;
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const value = useMemo(() => ({
    lang,
    setLang,
    t: MESSAGES[lang],
    tr: (fr: string, en: string) => (lang === "en" ? en : fr),
  }), [lang, setLang]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}

/** EN | FR switch — landing nav and dashboards. English is the first option. */
export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="lp-lang" role="group" aria-label={lang === "en" ? "Language" : "Langue"}>
      <button type="button" className="lp-lang__btn" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
        EN
      </button>
      <button type="button" className="lp-lang__btn" aria-pressed={lang === "fr"} onClick={() => setLang("fr")}>
        FR
      </button>
    </div>
  );
}
