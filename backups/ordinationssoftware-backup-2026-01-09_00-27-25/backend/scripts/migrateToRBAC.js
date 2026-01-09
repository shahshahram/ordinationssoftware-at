const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Migration Script: Integriert bestehende Benutzer in das neue RBAC-System
 * 
 * Dieses Script:
 * 1. Aktualisiert bestehende Benutzer mit den neuen RBAC-Features
 * 2. Stellt sicher, dass alle Rollen korrekt zugewiesen sind
 * 3. Migriert bestehende Permissions in das neue System
 */

async function migrateToRBAC() {
  try {
    console.log('🚀 Starte RBAC-Migration...');
    
    // Verbinde zur MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ MongoDB verbunden');
    
    // Hole alle Benutzer
    const users = await User.find({});
    console.log(`📊 ${users.length} Benutzer gefunden`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        console.log(`\n👤 Verarbeite Benutzer: ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`   Aktuelle Rolle: ${user.role}`);
        
        // Prüfe ob RBAC-Features bereits existieren
        if (!user.rbac) {
          user.rbac = {
            resourceRoles: [],
            customPermissions: [],
            delegations: [],
            permissionHistory: []
          };
        }
        
        // Migriere bestehende Permissions zu customPermissions
        if (user.permissions && user.permissions.length > 0) {
          console.log(`   Migriere ${user.permissions.length} bestehende Permissions...`);
          
          // Konvertiere alte Permissions zu neuen RBAC-Format
          const customPermissions = user.permissions.map(permission => ({
            resource: extractResourceFromPermission(permission),
            actions: [extractActionFromPermission(permission)],
            grantedBy: user._id, // Selbst zugewiesen
            grantedAt: new Date(),
            reason: 'Migriert von altem Permission-System'
          }));
          
          user.rbac.customPermissions = customPermissions;
          
          // Lösche alte Permissions
          user.permissions = [];
        }
        
        // Validiere und korrigiere Rollen
        const validRoles = ['super_admin', 'admin', 'arzt', 'assistent', 'rezeption', 'billing', 'patient'];
        if (!validRoles.includes(user.role)) {
          console.log(`   ⚠️  Ungültige Rolle '${user.role}' - setze auf 'assistent'`);
          user.role = 'assistent';
        }
        
        // Füge Standard-RBAC-Features hinzu falls nicht vorhanden
        if (!user.rbac.resourceRoles) {
          user.rbac.resourceRoles = [];
        }
        if (!user.rbac.customPermissions) {
          user.rbac.customPermissions = [];
        }
        if (!user.rbac.delegations) {
          user.rbac.delegations = [];
        }
        if (!user.rbac.permissionHistory) {
          user.rbac.permissionHistory = [];
        }
        
        // Füge Migration-Eintrag zur Permission-History hinzu
        user.rbac.permissionHistory.push({
          action: 'migrated',
          permission: 'rbac_migration',
          resource: 'system',
          changedBy: user._id,
          changedAt: new Date(),
          reason: 'Migration zu RBAC-System',
          previousValue: {
            oldPermissions: user.permissions || [],
            oldRole: user.role
          }
        });
        
        // Speichere Benutzer
        await user.save();
        updatedCount++;
        
        console.log(`   ✅ Benutzer erfolgreich migriert`);
        
      } catch (error) {
        console.error(`   ❌ Fehler bei Benutzer ${user.email}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Migration abgeschlossen!`);
    console.log(`   ✅ Erfolgreich migriert: ${updatedCount}`);
    console.log(`   ❌ Fehler: ${errorCount}`);
    
    // Erstelle einen Super-Admin falls keiner existiert
    const superAdminExists = await User.findOne({ role: 'super_admin' });
    if (!superAdminExists) {
      console.log('\n🔧 Erstelle Super-Admin Benutzer...');
      
      const superAdmin = new User({
        email: 'superadmin@ordinationssoftware.at',
        password: 'SuperAdmin123!', // Sollte in Produktion geändert werden
        firstName: 'Super',
        lastName: 'Administrator',
        role: 'super_admin',
        isActive: true,
        rbac: {
          resourceRoles: [],
          customPermissions: [],
          delegations: [],
          permissionHistory: [{
            action: 'created',
            permission: 'super_admin_role',
            resource: 'system',
            changedBy: null, // System
            changedAt: new Date(),
            reason: 'Automatisch erstellt während Migration'
          }]
        }
      });
      
      await superAdmin.save();
      console.log('   ✅ Super-Admin erstellt: superadmin@ordinationssoftware.at');
    }
    
  } catch (error) {
    console.error('❌ Migration fehlgeschlagen:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB-Verbindung geschlossen');
  }
}

/**
 * Extrahiert die Ressource aus einer alten Permission
 */
function extractResourceFromPermission(permission) {
  const resourceMap = {
    'patients': 'patient',
    'appointments': 'appointment',
    'billing': 'billing',
    'documents': 'document',
    'users': 'user',
    'settings': 'settings',
    'reports': 'reports',
    'security': 'security',
    'resources': 'location',
    'service-catalog': 'service',
    'services': 'service',
    'bookings': 'appointment',
    'service-categories': 'service',
    'appointment-participants': 'appointment',
    'appointment-services': 'appointment',
    'appointment-resources': 'appointment',
    'staff': 'staff',
    'shifts': 'staff',
    'absences': 'staff',
    'availability': 'staff',
    'clinic-hours': 'location',
    'rooms': 'location',
    'devices': 'location',
    'locations': 'location',
    'staff-location-assignments': 'staff'
  };
  
  const resource = permission.split('.')[0];
  return resourceMap[resource] || 'system';
}

/**
 * Extrahiert die Aktion aus einer alten Permission
 */
function extractActionFromPermission(permission) {
  const actionMap = {
    'read': 'read',
    'write': 'update',
    'create': 'create',
    'delete': 'delete',
    'toggle_status': 'update',
    'approve': 'approve'
  };
  
  const action = permission.split('.')[1];
  return actionMap[action] || 'read';
}

// Führe Migration aus wenn Script direkt ausgeführt wird
if (require.main === module) {
  migrateToRBAC()
    .then(() => {
      console.log('✅ Migration erfolgreich abgeschlossen');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration fehlgeschlagen:', error);
      process.exit(1);
    });
}

module.exports = { migrateToRBAC };
