/* NASA routes — short nav: Reports · Reply · Link (detail via the list). */
import { Route, Routes, useNavigate, useParams } from "react-router";
import { RoleLayout, type NavGroup } from "@/app/RoleLayout";
import { NotFound } from "@/app/NotFound";
import { useLang } from "@/i18n";
import { NasaInbox } from "./screens";

function Inbox({ view }: { view: "inbox" | "report" | "reply" | "link" }) {
  const go = useNavigate();
  const { id } = useParams();
  return <NasaInbox id={id} go={go} view={view} />;
}

export default function NasaApp() {
  const { t } = useLang();
  const n = t.nav.nasa;
  const NAV: NavGroup[] = [
    {
      label: n.sol,
      items: [
        ["/nasa", n.rapports, "inbox", true],
        ["/nasa/reponse", n.reponse, "reply"],
        ["/nasa/liaison", n.liaison, "satellite_alt"],
      ],
    },
  ];

  return (
    <RoleLayout role="nasa" nav={NAV}>
      <Routes>
        <Route index element={<Inbox view="inbox" />} />
        <Route path="rapport/:id?" element={<Inbox view="report" />} />
        <Route path="reponse" element={<Inbox view="reply" />} />
        <Route path="liaison" element={<Inbox view="link" />} />
        <Route path="*" element={<NotFound home="/nasa" />} />
      </Routes>
    </RoleLayout>
  );
}
