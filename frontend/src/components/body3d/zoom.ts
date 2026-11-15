/* Shared zone zoom: the same gesture on every dashboard. */
import { useState } from "react";
import type { ZoneState } from "./zones";
import { localizeRegions, readLang, useLang, type Lang } from "@/i18n";

export function zoneBrief(states: Record<string, ZoneState>, id: string, lang: Lang = readLang()) {
  const reg = localizeRegions(lang).find((r) => r.id === id);
  const zone = reg?.need ?? (lang === "en" ? "zone" : "zone");
  const st = states[id] ?? "none";
  if (lang === "en") {
    if (st === "high") return `Alert · ${zone}`;
    if (st === "medium") return `Caution · ${zone}`;
    if (st === "none") return "No direct measurement";
    return "Nominal";
  }
  if (st === "high") return `Alerte · ${zone}`;
  if (st === "medium") return `Attention · ${zone}`;
  if (st === "none") return "Pas de mesure directe";
  return "Nominal";
}

export function useZoneZoom(states: Record<string, ZoneState>, initial = "", scope = "") {
  const { lang } = useLang();
  const [sel, setSel] = useState(initial);
  const [seen, setSeen] = useState(scope);
  if (scope !== seen) {
    setSeen(scope);
    setSel(initial);
  }
  const pick = (id: string) => setSel((cur) => (cur === id ? "" : id));
  return {
    sel: sel || undefined,
    pick,
    zoom: !!sel,
    need: sel ? zoneBrief(states, sel, lang) : undefined,
  };
}
