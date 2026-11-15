/* Local medical log (this device), until the API is ready.
   The astronaut writes to it; the onboard physician reads it in the same browser. */
import { useSyncExternalStore } from "react";
import type { Light } from "@/data/types";
import { localizeEvents, useLang } from "@/i18n";

export type BoardLine = { t: string; who: string; text: string; light: Light };
const KEY = "pulsar.board.log";
const EVT = "pulsar-board";

function read(): BoardLine[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]") as BoardLine[];
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

export function pushBoard(line: { who: string; text: string; light: Light }) {
  const item: BoardLine = {
    t: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    who: line.who,
    text: line.text,
    light: line.light,
  };
  localStorage.setItem(KEY, JSON.stringify([item, ...read()].slice(0, 40)));
  window.dispatchEvent(new Event(EVT));
}

function subscribe(fn: () => void) {
  window.addEventListener(EVT, fn);
  window.addEventListener("storage", fn);
  return () => { window.removeEventListener(EVT, fn); window.removeEventListener("storage", fn); };
}

/** Events from this device, then the demo day. */
export function useJournal(): BoardLine[] {
  const { lang } = useLang();
  const snap = useSyncExternalStore(subscribe, () => localStorage.getItem(KEY) ?? "", () => "");
  void snap;
  return [...read(), ...localizeEvents(lang)];
}
