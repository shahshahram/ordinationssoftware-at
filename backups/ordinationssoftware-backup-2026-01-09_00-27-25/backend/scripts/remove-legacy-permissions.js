/**
 * Script zum Entfernen alter user.permissions nach erfolgreicher Migration
 * 
 * WICHTIG: Führen Sie dieses Script nur aus, wenn:
 * 1. Die Migration erfolgreich war
 * 2. Das System korrekt funktioniert
 * 3. Ein Backup vorhanden ist
 * 
 * Verwendung:
 * node backend/scripts/remove-legacy-permissions.js [--dry-run] [--user-id=USER_ID]
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

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
      // Finde alle Benutzer mit alten Permissions UND neuen Custom Permissions
      const usersWithPermissions = await User.aggregate([
        {
          $match: {
            permissions: { $exists: true, $ne: null },
            'rbac.customPermissions': { $exists: true, $ne: null }
          }
        },
        {
          $addFields: {
            permissionsSize: { $size: { $ifNull: ['$permissions', []] } },
            customPermissionsSize: { $size: { $ifNull: ['$rbac.customPermissions', []] } }
          }
        },
        {
          $match: {
            permissionsSize: { $gt: 0 },
            customPermissionsSize: { $gt: 0 }
          }
        }
      ]);
      
      users = await User.find({
        _id: { $in: usersWithPermissions.map(u => u._id) }
      });
    }

    console.log(`📊 Gefunden: ${users.length} Benutzer mit alten Permissions (die bereits migriert wurden)`);

    if (users.length === 0) {
      console.log('✅ Keine Benutzer mit alten Permissions gefunden, die entfernt werden müssen.');
      await mongoose.connection.close();
      process.exit(0);
    }

    if (dryRun) {
      console.log('🔍 DRY-RUN Modus - keine Änderungen werden gespeichert');
    } else {
      console.log('⚠️  WICHTIG: Stellen Sie sicher, dass ein Backup vorhanden ist!');
      console.log('⚠️  Diese Aktion kann nicht rückgängig gemacht werden!');
    }

    let totalRemoved = 0;
    let totalProcessed = 0;

    for (const user of users) {
      const oldPermissionsCount = user.permissions ? user.permissions.length : 0;
      const customPermissionsCount = user.rbac?.customPermissions ? user.rbac.customPermissions.length : 0;
      
      console.log(`\n👤 Verarbeite Benutzer: ${user.email} (${user._id})`);
      console.log(`  Alte Permissions: ${oldPermissionsCount}`);
      console.log(`  Neue Custom Permissions: ${customPermissionsCount}`);

      if (!dryRun) {
        // Entferne alte Permissions
        user.permissions = undefined;
        
        // Logge Entfernung in Permission History
        if (user.rbac && user.rbac.permissionHistory) {
          user.rbac.permissionHistory.push({
            action: 'revoked', // Verwende 'revoked' statt 'removed' (enum-Wert)
            permission: `Removed ${oldPermissionsCount} legacy permissions`,
            changedBy: user._id,
            changedAt: new Date(),
            reason: 'Alte Permissions nach erfolgreicher Migration entfernt',
            previousValue: user.permissions
          });
        }

        await user.save();
        console.log(`  ✅ ${oldPermissionsCount} alte Permissions entfernt`);
      } else {
        console.log(`  🔍 Würde ${oldPermissionsCount} alte Permissions entfernen`);
      }

      totalRemoved += oldPermissionsCount;
      totalProcessed++;
    }

    console.log(`\n📈 Zusammenfassung:`);
    console.log(`  Verarbeitet: ${totalProcessed} Benutzer`);
    console.log(`  Entfernt: ${totalRemoved} alte Permissions`);

    if (dryRun) {
      console.log(`\n💡 Führen Sie das Script ohne --dry-run aus, um die alten Permissions zu entfernen`);
    } else {
      console.log(`\n✅ Alte Permissions erfolgreich entfernt!`);
      console.log(`\n💡 Das System verwendet jetzt nur noch rbac.customPermissions`);
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Fehler beim Entfernen der alten Permissions:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Führe Script aus
if (require.main === module) {
  main();
}

module.exports = { main };

