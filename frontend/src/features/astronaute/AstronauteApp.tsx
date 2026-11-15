/* Astronaut routes — nav: Monitoring · Measurements (face scan included) · Account. */
import { Route, Routes, useNavigate } from "react-router";
import { Icon } from "@/components/ui";
import { RoleLayout, type NavGroup, type NavItem } from "@/app/RoleLayout";
import { WatchGallery } from "@/features/montre/Watch6";
import { NotFound } from "@/app/NotFound";
import { useMe } from "@/features/auth/useMe";
import { useGamification, AstroGoals, AstroSettings } from "@/features/gamification";
import { useLang } from "@/i18n";
import { AstroPredictions } from "./Predictions";
import { AstroHome, AstroBody, AstroScan, AstroKits, AstroWellbeing, AstroWatch, AstroReminders, ArmMode } from "./screens";

export default function AstronauteApp() {
  const go = useNavigate();
  const ME = useMe();
  const { enabled } = useGamification(ME.id);
  const { t, tr } = useLang();
  const a = t.nav.astro;

  const suivi: NavItem[] = [
    ["/astronaute", a.accueil, "home", true],
    ["/astronaute/silhouette", a.silhouette, "accessibility_new"],
    ["/astronaute/predictions", a.predictions, "insights"],
  ];
  const mesures: NavItem[] = [
    ["/astronaute/scan", a.scan, "face"],
    ["/astronaute/kits", a.kits, "bloodtype"],
    ["/astronaute/montre", a.montre, "watch"],
  ];
  const compte: NavItem[] = [
    ...(enabled ? [["/astronaute/objectifs", a.objectifs, "award"] as NavItem] : []),
    ["/astronaute/reglages", a.reglages, "settings"],
  ];

  const nav: NavGroup[] = [
    { label: a.suivi, items: suivi },
    { label: a.mesures, items: mesures },
    { label: a.compte, items: compte },
  ];

  return (
    <Routes>
      <Route path="mode-bras" element={<ArmMode go={go} />} />
      <Route path="*" element={
        <RoleLayout role="astronaute" nav={nav}>
          <Routes>
            <Route index element={<AstroHome go={go} />} />
            <Route path="silhouette" element={<AstroBody go={go} />} />
            <Route path="scan" element={<AstroScan go={go} />} />
            <Route path="kits" element={<AstroKits />} />
            <Route path="bien-etre" element={<AstroWellbeing />} />
            <Route path="montre" element={<AstroWatch />} />
            <Route path="montre/ecrans" element={<WatchGallery />} />
            <Route path="rappels" element={<AstroReminders go={go} />} />
            <Route path="predictions" element={<AstroPredictions />} />
            <Route path="objectifs" element={<AstroGoals />} />
            <Route path="reglages" element={<AstroSettings />} />
            <Route path="*" element={<NotFound home="/astronaute" />} />
          </Routes>
          <button type="button" className="arm-toggle" onClick={() => go("/astronaute/mode-bras")}>
            <Icon name="pan_tool" size={20} /> {tr("Mode bras (EVA)", "Arm mode (EVA)")}
          </button>
        </RoleLayout>
      } />
    </Routes>
  );
}
