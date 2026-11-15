/* Route guard: no session → /connexion; wrong role → their own dashboard. */
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import type { Role } from "@/data/types";
import { useAuth } from "./AuthProvider";
import { homeFor } from "./roles";

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/connexion" replace state={{ from: loc.pathname }} />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace state={{ denied: loc.pathname }} />;
  return <>{children}</>;
}
