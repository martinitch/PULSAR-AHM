/* Shows where the displayed data comes from: FastAPI API or local simulator (DÉMO). */
import { useDataSource } from "@/api";
import { Demo, Icon } from "@/components/ui";
import { useLang } from "@/i18n";

/** Label next to a card title: « DÉMO » if the data comes from the simulator. */
export function DataTag() {
  const src = useDataSource();
  const { tr } = useLang();
  return src === "api" ? <span className="chip ok"><Icon name="sensors" size={14} /> {tr("Direct", "Live")}</span> : <Demo title={tr("Données simulées (backend non connecté)", "Simulated data (backend not connected)")} />;
}
