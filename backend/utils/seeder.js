/**
 * Database Seeding: Initial Super Admin
 * Wird beim Server-Start aufgerufen, wenn die User-Collection leer ist.
 * Erstellt einen Super-Admin aus INITIAL_ADMIN_EMAIL und INITIAL_ADMIN_PASSWORD.
 */
const User = require('../models/User');
const logger = require('./logger');

/**
 * Prüft, ob User existieren. Falls nein: erstellt einen Super-Admin aus .env.
 * Kein Abbruch des Server-Starts bei Fehlern oder fehlenden Env-Variablen.
 */
async function seedDatabase() {
  try {
    const count = await User.countDocuments();
    if (count > 0) {
      logger.info('DB nicht leer, Seeding übersprungen.');
      return;
    }

    const email = process.env.INITIAL_ADMIN_EMAIL;
    const password = process.env.INITIAL_ADMIN_PASSWORD;
    if (!email || !password) {
      logger.warn('INITIAL_ADMIN_EMAIL oder INITIAL_ADMIN_PASSWORD fehlen, Seeding übersprungen.');
      return;
    }

    const user = new User({
      email: email.trim().toLowerCase(),
      password,
      role: 'super_admin',
      firstName: 'System',
      lastName: 'Admin',
      isActive: true,
      rbac: {
        resourceRoles: [],
        customPermissions: [
          {
            resource: '*',
            actions: ['*'],
            grantedBy: null,
            grantedAt: new Date(),
            reason: 'Initial super admin setup via seeding'
          }
        ],
        delegations: [],
        permissionHistory: [
          {
            action: 'created',
            permission: 'all',
            resource: '*',
            changedBy: null,
            changedAt: new Date(),
            reason: 'Initial super admin creation via seeding'
          }
        ]
      }
    });

    await user.save();
    logger.info('Initial Super Admin via Seeding erstellt.');
  } catch (err) {
    logger.error('Seeding fehlgeschlagen:', err);
  }
}

module.exports = { seedDatabase };
