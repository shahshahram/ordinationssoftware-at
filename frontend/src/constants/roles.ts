/**
 * Rollen-Konstanten – exakt wie in der Datenbank (User.role enum).
 * Groß-/Kleinschreibung muss mit der DB übereinstimmen.
 * @see backend/models/User.js – role.enum
 */
export const ROLES = [
  'super_admin',
  'admin',
  'arzt',
  'assistent',
  'rezeption',
  'billing',
  'patient',
] as const;

export type Role = (typeof ROLES)[number];

/** Rollen mit Admin-Zugriff (Einstellungen, Benutzer, Module). */
export const ADMIN_ROLES: readonly Role[] = ['admin', 'super_admin'];

/** Nur Super-Admin. */
export const SUPER_ADMIN_ROLES: readonly Role[] = ['super_admin'];
