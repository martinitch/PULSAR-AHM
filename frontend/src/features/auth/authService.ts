/* Authentication service — BACKEND HOOK-UP POINT.
   The `AuthService` interface is the only thing the user interface depends on.
   - DemoAuthService: local demo accounts (src/data/demo/users.ts), session in localStorage.  ← active by default
   - HttpAuthService: skeleton for a real API (enabled when VITE_AUTH_API_URL is set).
   To go to production: implement HttpAuthService on the server (POST /auth/login, POST /auth/logout,
   GET /auth/me), remove src/data/demo/users.ts, and return a generic error message
   (« Identifiant ou code incorrect ») so existing identifiers are not revealed. */
import { DEMO_USERS, ROLE_ENTRY } from "@/data/demo/users";
import type { Role } from "@/data/types";
import { AuthError, type AuthUser, type Session } from "./types";
import { roleFromId } from "./roles";

export interface AuthService {
  /** Checks identifier + code. Throws AuthError on failure. */
  login(identifier: string, code: string): Promise<Session>;
  logout(): Promise<void>;
  /** Stored session still valid, otherwise null (called at startup). */
  restore(): Session | null;
}

export const SESSION_KEY = "pulsar.session";
const SESSION_HOURS = 12;
const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 30;

export const normalizeId = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");

function save(s: Session) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
function issue(user: AuthUser): Session {
  const now = Date.now();
  const s: Session = { user, token: `demo.${crypto.randomUUID()}`, issuedAt: now, expiresAt: now + SESSION_HOURS * 3600_000 };
  save(s);
  return s;
}
function read(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as Session | null;
    if (!s || !s.user || typeof s.expiresAt !== "number" || s.expiresAt < Date.now()) { localStorage.removeItem(SESSION_KEY); return null; }
    return s;
  } catch { localStorage.removeItem(SESSION_KEY); return null; }
}
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** ⚠️ DEMO — local check, no real security (the source code contains the codes). */
export class DemoAuthService implements AuthService {
  private fails = 0;
  private lockedUntil = 0;

  async login(identifier: string, code: string): Promise<Session> {
    const id = normalizeId(identifier);
    const c = code.trim();
    if (!id || !c) throw new AuthError("EMPTY", "Renseignez votre identifiant et votre code personnel.");
    const role = roleFromId(id);
    if (!role) throw new AuthError("BAD_FORMAT", "Format d’identifiant inattendu. Exemple : AST-001, CMO-001 ou NASA-FS-001 (voir votre badge).");
    const left = Math.ceil((this.lockedUntil - Date.now()) / 1000);
    if (left > 0) throw new AuthError("LOCKED", `Trop d’essais. Réessayez dans ${left} s.`, left);
    await delay(350); // simulated network latency
    const u = DEMO_USERS.find((x) => x.id === id);
    if (!u || u.code !== c) {
      this.fails += 1;
      if (this.fails >= MAX_ATTEMPTS) { this.fails = 0; this.lockedUntil = Date.now() + LOCK_SECONDS * 1000; throw new AuthError("LOCKED", `Trop d’essais. Réessayez dans ${LOCK_SECONDS} s.`, LOCK_SECONDS); }
      const rest = MAX_ATTEMPTS - this.fails;
      if (!u) throw new AuthError("UNKNOWN_ID", `Identifiant inconnu. Vérifiez votre badge. (${rest} essai${rest > 1 ? "s" : ""} restant${rest > 1 ? "s" : ""})`);
      throw new AuthError("BAD_CODE", `Code incorrect pour ${id}. (${rest} essai${rest > 1 ? "s" : ""} restant${rest > 1 ? "s" : ""})`);
    }
    this.fails = 0;
    return issue({ id: u.id, role, displayName: u.displayName, title: u.title, crewId: u.crewId });
  }
  async logout() { localStorage.removeItem(SESSION_KEY); }
  restore() { return read(); }
}

/** Skeleton for the real API (unused until VITE_AUTH_API_URL is set). */
export class HttpAuthService implements AuthService {
  constructor(private baseUrl: string) {}
  async login(identifier: string, code: string): Promise<Session> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ identifier: normalizeId(identifier), code }) });
    } catch { throw new AuthError("NETWORK", "Serveur injoignable. Vérifiez le réseau de bord."); }
    if (res.status === 429) throw new AuthError("LOCKED", "Trop d’essais. Réessayez plus tard.");
    if (!res.ok) throw new AuthError("BAD_CODE", "Identifiant ou code incorrect.");
    const s = (await res.json()) as Session;
    save(s);
    return s;
  }
  async logout() { try { await fetch(`${this.baseUrl}/auth/logout`, { method: "POST", credentials: "include" }); } finally { localStorage.removeItem(SESSION_KEY); } }
  restore() { return read(); }
}

const API = import.meta.env.VITE_AUTH_API_URL as string | undefined;
export const authService: AuthService = API ? new HttpAuthService(API) : new DemoAuthService();
export const IS_DEMO_AUTH = !API;

/** Opens a role interface without an identifier or code. Reserved for the demo. */
export async function enterDemoRole(role: Role): Promise<Session> {
  if (API) throw new AuthError("NETWORK", "Le choix de rôle n’est pas disponible avec l’authentification serveur.");
  const u = DEMO_USERS.find((x) => x.id === ROLE_ENTRY[role] && x.role === role);
  if (!u) throw new AuthError("UNKNOWN_ID", "Ce rôle n’a pas d’interface de démonstration.");
  await delay(200);
  return issue({ id: u.id, role, displayName: u.displayName, title: u.title, crewId: u.crewId });
}
