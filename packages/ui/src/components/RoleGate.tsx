import React from 'react';
import { useSession } from '@queenix/auth';

export type Role = 'member' | 'trainer' | 'owner' | 'operations';

export interface RoleGateProps {
  children: React.ReactNode;
  allow: Role | Role[];
  fallback?: React.ReactNode;
}

/**
 * Conditionally render UI based on the current user's role.
 * Server-side authorization is still required for data access.
 */
export const RoleGate: React.FC<RoleGateProps> = ({ children, allow, fallback = null }) => {
  const { data } = useSession();
  const user = (data as { user?: { roles?: unknown } } | null | undefined)?.user ?? null;
  if (!user) return <>{fallback}</>;

  const allowed = Array.isArray(allow) ? allow : [allow];
  const userRoles = (user as any).roles ?? [];
  const hasPermission = allowed.some((r) => userRoles.includes(r));

  if (!hasPermission) return <>{fallback}</>;
  return <>{children}</>;
};
