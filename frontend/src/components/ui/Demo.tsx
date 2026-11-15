/* « DÉMO » label: required next to any personal value that is not a real measurement. */
import { useLang } from "@/i18n";

export function Demo({ title }: { title?: string }) {
  const { tr } = useLang();
  const tip = title ?? tr("Valeur de démonstration : non issue d’une mesure réelle", "Demonstration value: not from a real measurement");
  return <span className="demo" title={tip}>{tr("DÉMO", "DEMO")}</span>;
}
