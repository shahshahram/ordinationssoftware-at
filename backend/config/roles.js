/**
 * Zentrale Rollen-Definition – exakt wie in der Datenbank (User.role enum).
 * Groß-/Kleinschreibung muss mit der DB übereinstimmen.
 * @see backend/models/User.js – role.enum
 */
const ROLES = Object.freeze([
  'super_admin',
  'admin',
  'arzt',
  'assistent',
  'rezeption',
  'billing',
  'patient'
]);

/** Rollen mit Admin-Zugriff (Einstellungen, Benutzer, Module). */
const ADMIN_ROLES = Object.freeze(['admin', 'super_admin']);

/** Nur Super-Admin. */
const SUPER_ADMIN_ROLES = Object.freeze(['super_admin']);

/** Rollen mit Arzt-Berechtigungen (z. B. sensible Daten). */
const ARZT_ROLES = Object.freeze(['arzt', 'admin', 'super_admin']);

/** Rollen mit Personal-Berechtigungen (Assistent, Rezeption, Arzt, Admin). */
const STAFF_ROLES = Object.freeze(['assistent', 'rezeption', 'arzt', 'admin', 'super_admin']);

module.exports = {
  ROLES,
  ADMIN_ROLES,
  SUPER_ADMIN_ROLES,
  ARZT_ROLES,
  STAFF_ROLES
};
