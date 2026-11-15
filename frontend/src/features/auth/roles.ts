/* Metadata for the 3 roles = 3 dashboards. */
import type { IconName } from "@/components/ui";
import type { Role } from "@/data/types";

export const ROLE_META: Record<Role, { label: string; home: string; device: string; icon: IconName; prefix: string }> = {
  astronaute: { label: "Astronaute", home: "/astronaute", device: "Tablette personnelle · montre · kits", icon: "person", prefix: "AST" },
  "medecin-bord": { label: "Médecin de bord", home: "/medecin-bord", device: "Tablette médicale · infirmerie · sonde écho", icon: "stethoscope", prefix: "CMO" },
  nasa: { label: "NASA Houston", home: "/nasa", device: "Postes du Mission Control Center", icon: "desktop_windows", prefix: "NASA-FS" },
};
export const homeFor = (r: Role) => ROLE_META[r].home;
/** Role inferred from the identifier prefix (AST- → astronaut, CMO- → onboard physician, NASA-FS- → NASA). */
export function roleFromId(id: string): Role | null {
  if (/^AST-\d{3}$/.test(id)) return "astronaute";
  if (/^CMO-\d{3}$/.test(id)) return "medecin-bord";
  if (/^NASA-FS-\d{3}$/.test(id)) return "nasa";
  return null;
}
