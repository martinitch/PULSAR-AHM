import type { Role } from "@/data/types";

/** Signed-in user (never a code/password here). */
export type AuthUser = {
  id: string;            // personal identifier, e.g. "AST-001"
  role: Role;
  displayName: string;
  title: string;
  crewId?: string;       // link to the crew record (astronauts, onboard physician)
};

export type Session = {
  user: AuthUser;
  token: string;         // opaque token (demo: random; prod: returned by the API)
  issuedAt: number;      // epoch ms
  expiresAt: number;     // epoch ms
};

export type AuthErrorCode = "EMPTY" | "BAD_FORMAT" | "UNKNOWN_ID" | "BAD_CODE" | "LOCKED" | "NETWORK";

export class AuthError extends Error {
  constructor(public code: AuthErrorCode, message: string, public retryInSec?: number) { super(message); this.name = "AuthError"; }
}
