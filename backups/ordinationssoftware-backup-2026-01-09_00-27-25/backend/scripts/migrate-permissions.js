/**
 * Migration-Script: Migriert alte user.permissions zu user.rbac.customPermissions
 * 
 * Verwendung:
 * node backend/scripts/migrate-permissions.js [--dry-run] [--user-id=USER_ID]
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

// Resource-Mapping (plural zu singular)
const RESOURCE_MAPPING = {
  'patients': 'patient',
  'appointments': 'appointment',
  'documents': 'document',
  'users': 'user',
  'billings': 'billing',
  'locations': 'location',
  'services': 'service',
  'roles': 'role',
  'templates': 'template',
  'audit_logs': 'audit_log',
  'reports': 'reports',
  'staff': 'staff',
  'systems': 'system',
  'settings': 'settings',
  'security': 'security'
};

// Action-Mapping
const ACTION_MAPPING = {
  'read': 'read',
  'write': ['create', 'update'],
  'create': 'create',
  'update': 'update',
  'delete': 'delete',
  'manage': 'manage_users'
};

/**
 * Parst eine Permission im Format "resource.action" oder "action"
 */
function parsePermission(permission) {
  if (!permission || typeof permission !== 'string') {
    return null;
  }

  // Einfache Permission ohne Resource
  if (!permission.includes('.')) {
    return {
      resource: 'system',
      actions: [permission]
    };
  }

  const [resourcePart, actionPart] = permission.split('.');
  
  // Konvertiere plural zu singular
  const resource = RESOURCE_MAPPING[resourcePart] || resourcePart;
  
  // Konvertiere Action
  let actions = [];
  if (ACTION_MAPPING[actionPart]) {
    if (Array.isArray(ACTION_MAPPING[actionPart])) {
      actions = ACTION_MAPPING[actionPart];
    } else {
      actions = [ACTION_MAPPING[actionPart]];
    }
  } else {
    actions = [actionPart];
  }

  return { resource, actions };
}

/**
 * Migriert Permissions eines Benutzers
 */
async function migrateUserPermissions(user, dryRun = false) {
  if (!user.permissions || !Array.isArray(user.permissions) || user.permissions.length === 0) {
    return { migrated: 0, skipped: 0 };
  }

  // Initialisiere rbac falls nicht vorhanden
  if (!user.rbac) {
    user.rbac = {
      customPermissions: [],
      resourceRoles: [],
      permissionHistory: []
    };
  }

  if (!user.rbac.customPermissions) {
    user.rbac.customPermissions = [];
  }

  let migrated = 0;
  let skipped = 0;

  // Gruppiere Permissions nach Resource
  const permissionsByResource = {};

  for (const permission of user.permissions) {
    const parsed = parsePermission(permission);
    if (!parsed) {
      skipped++;
      continue;
    }

    const { resource, actions } = parsed;

    if (!permissionsByResource[resource]) {
      permissionsByResource[resource] = new Set();
    }

    actions.forEach(action => permissionsByResource[resource].add(action));
  }

  // Erstelle Custom Permissions
  for (const [resource, actionsSet] of Object.entries(permissionsByResource)) {
    const actions = Array.from(actionsSet);

    // Prüfe ob bereits eine Custom Permission für diese Resource existiert
    const existingPermission = user.rbac.customPermissions.find(
      cp => cp.resource === resource && !cp.resourceId
    );

    if (existingPermission) {
      // Merge Actions
      const mergedActions = Array.from(new Set([...existingPermission.actions, ...actions]));
      if (!dryRun) {
        existingPermission.actions = mergedActions;
      }
      migrated++;
    } else {
      // Erstelle neue Custom Permission
      if (!dryRun) {
        user.rbac.customPermissions.push({
          resource,
          resourceId: null, // Allgemeine Permission für alle Resources dieses Typs
          actions,
          conditions: {},
          grantedBy: user._id, // System-Migration
          grantedAt: new Date(),
          expiresAt: null
        });
      }
      migrated++;
    }
  }

  // Logge Migration in Permission History
  if (!dryRun && migrated > 0) {
    user.rbac.permissionHistory.push({
      action: 'migrated',
      permission: `Migrated ${user.permissions.length} legacy permissions`,
      changedBy: user._id,
      changedAt: new Date(),
      reason: 'Automatische Migration von user.permissions zu rbac.customPermissions',
      previousValue: user.permissions
    });
  }

  return { migrated, skipped };
}

/**
 * Hauptfunktion
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const userIdArg = args.find(arg => arg.startsWith('--user-id='));
  const userId = userIdArg ? userIdArg.split('=')[1] : null;

  try {
    // Verbinde mit MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware';
    await mongoose.connect(mongoUri);
    console.log('✅ Verbunden mit MongoDB');

    // Finde Benutzer
    let users;
    if (userId) {
      users = [await User.findById(userId)];
      if (!users[0]) {
        console.error(`❌ Benutzer mit ID ${userId} nicht gefunden`);
        process.exit(1);
      }
    } else {
      // Finde alle Benutzer mit Permissions
      // Verwende Aggregation, da $size in find() nicht direkt funktioniert
      const usersWithPermissions = await User.aggregate([
        {
          $match: {
            permissions: { $exists: true, $ne: null }
          }
        },
        {
          $addFields: {
            permissionsSize: { $size: { $ifNull: ['$permissions', []] } }
          }
        },
        {
          $match: {
            permissionsSize: { $gt: 0 }
          }
        }
      ]);
      
      // Konvertiere zu Mongoose-Dokumenten
      users = await User.find({
        _id: { $in: usersWithPermissions.map(u => u._id) }
      });
    }

    console.log(`📊 Gefunden: ${users.length} Benutzer mit Permissions`);

    if (dryRun) {
      console.log('🔍 DRY-RUN Modus - keine Änderungen werden gespeichert');
    }

    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalProcessed = 0;

    for (const user of users) {
      console.log(`\n👤 Verarbeite Benutzer: ${user.email} (${user._id})`);
      
      const result = await migrateUserPermissions(user, dryRun);
      totalMigrated += result.migrated;
      totalSkipped += result.skipped;
      totalProcessed++;

      if (!dryRun && result.migrated > 0) {
        await user.save();
        console.log(`  ✅ ${result.migrated} Permissions migriert, ${result.skipped} übersprungen`);
      } else if (dryRun) {
        console.log(`  🔍 Würde ${result.migrated} Permissions migrieren, ${result.skipped} übersprungen`);
      } else {
        console.log(`  ⏭️  Keine Migration nötig`);
      }
    }

    console.log(`\n📈 Zusammenfassung:`);
    console.log(`  Verarbeitet: ${totalProcessed} Benutzer`);
    console.log(`  Migriert: ${totalMigrated} Permission-Gruppen`);
    console.log(`  Übersprungen: ${totalSkipped} Permissions`);

    if (dryRun) {
      console.log(`\n💡 Führen Sie das Script ohne --dry-run aus, um die Migration durchzuführen`);
    } else {
      console.log(`\n✅ Migration abgeschlossen!`);
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Fehler bei der Migration:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Führe Migration aus
if (require.main === module) {
  main();
}

module.exports = { migrateUserPermissions, parsePermission };

