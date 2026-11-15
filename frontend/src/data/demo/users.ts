/* ⚠️ DEMONSTRATION ACCOUNTS — FRONT-END ONLY.
   Codes are in clear text here for the NASA Space Apps demo. In production, this file IS REMOVED:
   identifiers are checked by the server (see src/features/auth/authService.ts → HttpAuthService),
   codes are hashed server-side and never delivered to the browser. */
import type { Role } from "@/data/types";

export type DemoUser = {
  /** Personal id entered at sign-in (badge). */
  id: string;
  /** Personal demonstration code (6 digits). */
  code: string;
  role: Role;
  displayName: string;
  /** Job title shown under the name. */
  title: string;
  /** Link to the crew record (src/data/demo/crew.ts) — astronauts and crew medical officer. */
  crewId?: string;
};

/** Canonical account opened when a role is chosen, without id or code. */
export const ROLE_ENTRY: Record<Role, string> = {
  astronaute: "AST-001",
  "medecin-bord": "CMO-001",
  nasa: "NASA-FS-001",
};

export const DEMO_USERS: DemoUser[] = [
  { id: "AST-001", code: "482105", role: "astronaute", displayName: "Lina Kovacs", title: "Ingénieure de vol", crewId: "LK" },
  { id: "AST-002", code: "130742", role: "astronaute", displayName: "Alex Morgan", title: "Commandant", crewId: "AM" },
  { id: "AST-003", code: "559031", role: "astronaute", displayName: "Nolan Okafor", title: "Scientifique · médecin de bord", crewId: "NO" },
  { id: "AST-004", code: "246813", role: "astronaute", displayName: "Sofia Reyes", title: "Pilote", crewId: "SR" },
  { id: "CMO-001", code: "731406", role: "medecin-bord", displayName: "Dr Nolan Okafor", title: "Médecin de bord (CMO) · astronaute", crewId: "NO" },
  { id: "NASA-FS-001", code: "905218", role: "nasa", displayName: "Dr Maya Chen", title: "Flight surgeon · MCC Houston" },
  { id: "NASA-FS-002", code: "618847", role: "nasa", displayName: "Dr Daniel Brooks", title: "Flight surgeon · MCC Houston" },
];
