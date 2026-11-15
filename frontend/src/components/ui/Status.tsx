/* NASA C&W lamps: ALWAYS icon + word (never color alone). Color only outside nominal. */
import { Icon } from "./Icon";
import { usePortrait } from "./CrewPhoto";
import type { Light } from "@/data/types";
import { useLang } from "@/i18n";
export const LIGHT: Record<Light, { word: string; icon: "check_circle" | "warning" | "error" }> = {
  ok: { word: "Nominal", icon: "check_circle" },
  caution: { word: "Attention", icon: "warning" },
  warning: { word: "Alerte", icon: "error" },
};
const LIGHT_EN: Record<Light, string> = { ok: "Nominal", caution: "Caution", warning: "Alert" };
export function Lamp({ l, compact }: { l: Light; compact?: boolean }) {
  const { lang } = useLang();
  const word = lang === "en" ? LIGHT_EN[l] : LIGHT[l].word;
  return <span className={`lamp lamp-${l}`} role="img" aria-label={word}><Icon name={LIGHT[l].icon} size={compact ? 16 : 18} />{!compact && <b>{word}</b>}</span>;
}
export function Avatar({ id, l }: { id: string; l?: Light }) {
  const photo = usePortrait(id);
  return (
    <span className={`r-av ${l ? `av-${l}` : ""}${photo ? " has-photo" : ""}`}>
      {photo ? <img src={photo} alt="" /> : id}
    </span>
  );
}
