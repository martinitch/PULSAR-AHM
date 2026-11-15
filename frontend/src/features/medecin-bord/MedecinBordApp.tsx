/* Crew surgeon routes — short nav: Crew · Clinic · Log. */
import { Route, Routes, useNavigate, useParams } from "react-router";
import { RoleLayout, type NavGroup } from "@/app/RoleLayout";
import { NotFound } from "@/app/NotFound";
import { useLang } from "@/i18n";
import { CmoBoard, CmoCrew, CmoEcho, CmoLog } from "./screens";
import { CmoPredictions } from "./Predictions";

function Crew() { const go = useNavigate(); const { id } = useParams(); return <CmoCrew id={id} go={go} />; }
function Pred() { const go = useNavigate(); const { id } = useParams(); return <CmoPredictions id={id} go={go} />; }
function Echo() { const go = useNavigate(); const { step } = useParams(); return <CmoEcho key={step} step={step} go={go} />; }

export default function MedecinBordApp() {
  const go = useNavigate();
  const { t } = useLang();
  const n = t.nav.cmo;
  const NAV: NavGroup[] = [
    {
      label: n.equipage,
      items: [
        ["/medecin-bord", n.tableau, "groups", true],
        ["/medecin-bord/dossier", n.dossier, "badge"],
      ],
    },
    {
      label: n.clinique,
      items: [
        ["/medecin-bord/predictions", n.predictions, "insights"],
        ["/medecin-bord/echographie", n.echo, "monitor_heart"],
      ],
    },
    {
      label: n.ops,
      items: [["/medecin-bord/journal", n.journal, "history"]],
    },
  ];

  return (
    <RoleLayout role="medecin-bord" nav={NAV}>
      <Routes>
        <Route index element={<CmoBoard go={go} />} />
        <Route path="dossier/:id?" element={<Crew />} />
        <Route path="predictions/:id?" element={<Pred />} />
        <Route path="echographie/:step?" element={<Echo />} />
        <Route path="journal" element={<CmoLog />} />
        <Route path="*" element={<NotFound home="/medecin-bord" />} />
      </Routes>
    </RoleLayout>
  );
}
