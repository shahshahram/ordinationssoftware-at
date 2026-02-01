import React from 'react';
import { useAppSelector } from '../../store/hooks';

interface RoleGuardProps {
  /** Erlaubte Rollen (exakt wie in der DB: z. B. 'admin', 'super_admin'). */
  allowedRoles: readonly string[];
  children: React.ReactNode;
}

/**
 * Zeigt children nur, wenn der eingeloggte User eine der allowedRoles hat.
 * Nutzt Redux (state.auth.user.role). Ohne Rolle oder nicht in allowedRoles → null.
 */
const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const user = useAppSelector((state) => state.auth.user);

  if (!user?.role) {
    return null;
  }

  const roles = Array.isArray(allowedRoles) ? [...allowedRoles] : [allowedRoles];
  if (!roles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
};

export default RoleGuard;
