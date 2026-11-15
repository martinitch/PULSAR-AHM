/* A15 · Forecasts (astronaut): their own forecasts and solutions only, in plain language. */
import { PageHead as Head } from "@/components/ui";
import { useMe } from "@/features/auth/useMe";
import { PredictionPanel } from "@/features/predictions";
import { useLang } from "@/i18n";

export function AstroPredictions() {
  const ME = useMe();
  const { tr } = useLang();
  return (
    <>
      <Head title={tr("Vos prévisions", "Your forecasts")} sub={tr("Ce que vos mesures annoncent pour les prochaines heures et les prochains jours, et ce que vous pouvez faire.", "What your measurements suggest for the next hours and days, and what you can do.")} />
      <PredictionPanel astronautId={ME.id} role="astronaute" />
    </>
  );
}
