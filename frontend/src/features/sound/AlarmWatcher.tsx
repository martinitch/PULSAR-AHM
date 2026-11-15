/* Watches backend alerts (or the simulator) and raises alarms.
   Sound: RED / extreme level only. Orange = silent banner. NASA: no beep on arrival. */
import { useEffect } from "react";
import { useAlerts } from "@/api";
import { CREW } from "@/data/demo/crew";
import type { Role } from "@/data/types";
import { useSound } from "./SoundProvider";

export function AlarmWatcher({ role, astronautId }: { role: Role; astronautId?: string }) {
  const { raise } = useSound();
  const { data } = useAlerts(role === "astronaute" ? { astronautId } : {});
  useEffect(() => {
    if (role === "nasa" || !data) return;
    for (const a of data) {
      if (a.acknowledged || a.level === "vert") continue;
      const who = CREW.find((m) => m.id === a.astronautId)?.name ?? a.astronautId;
      const extreme = a.level === "rouge";
      raise({
        id: a.id,
        level: extreme ? "rouge" : "orange",
        title: role === "astronaute" ? a.message : `${who} · ${a.message}`,
        detail: `${a.id} · ${a.createdAt.slice(11, 16)} UTC`,
      });
    }
  }, [data, role, raise]);
  return null;
}
