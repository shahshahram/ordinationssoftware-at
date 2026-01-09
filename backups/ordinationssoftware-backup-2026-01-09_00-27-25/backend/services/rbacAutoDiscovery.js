const ModuleRegistry = require('../models/ModuleRegistry');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

class RBACAutoDiscoveryService {
  constructor() {
    this.isRunning = false;
    this.lastDiscovery = null;
    this.discoveryInterval = 5 * 60 * 1000; // 5 Minuten
  }

  /**
   * Startet den automatischen RBAC-Discovery Service
   */
  async start() {
    if (this.isRunning) {
      console.log('RBAC Auto-Discovery läuft bereits');
      return;
    }

    console.log('🚀 Starte RBAC Auto-Discovery Service...');
    this.isRunning = true;

    // Sofortiger erster Scan
    await this.performDiscovery();

    // Regelmäßige Scans
    this.intervalId = setInterval(async () => {
      await this.performDiscovery();
    }, this.discoveryInterval);

    console.log('✅ RBAC Auto-Discovery Service gestartet');
  }

  /**
   * Stoppt den automatischen RBAC-Discovery Service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏹️ RBAC Auto-Discovery Service gestoppt');
  }

  /**
   * Führt einen RBAC-Discovery durch
   */
  async performDiscovery() {
    try {
      console.log('🔍 Führe RBAC-Discovery durch...');
      
      const discoveredModules = await ModuleRegistry.discoverModules();
      const changes = await this.processDiscoveredModules(discoveredModules);
      
      if (changes.length > 0) {
        console.log(`📊 ${changes.length} Änderungen erkannt:`, changes);
        await this.notifyAdmins(changes);
      }
      
      this.lastDiscovery = new Date();
      console.log('✅ RBAC-Discovery abgeschlossen');
      
    } catch (error) {
      console.error('❌ Fehler beim RBAC-Discovery:', error);
    }
  }

  /**
   * Verarbeitet entdeckte Module und erkennt Änderungen
   */
  async processDiscoveredModules(discoveredModules) {
    const changes = [];
    
    for (const module of discoveredModules) {
      const existingModule = await ModuleRegistry.findOne({ moduleName: module.moduleName });
      
      if (!existingModule) {
        // Neues Modul
        await ModuleRegistry.create(module);
        changes.push({
          type: 'module_added',
          module: module.moduleName,
          resources: module.resources.length,
          permissions: module.permissions.length
        });
        
        // Neue Permissions zu Rollen hinzufügen
        await this.addPermissionsToRoles(module);
        
      } else {
        // Bestehendes Modul - prüfe auf Änderungen
        const resourceChanges = this.detectResourceChanges(existingModule, module);
        const permissionChanges = this.detectPermissionChanges(existingModule, module);
        
        if (resourceChanges.length > 0 || permissionChanges.length > 0) {
          await ModuleRegistry.findByIdAndUpdate(existingModule._id, {
            ...module,
            lastUpdated: new Date()
          });
          
          changes.push({
            type: 'module_updated',
            module: module.moduleName,
            resourceChanges: resourceChanges.length,
            permissionChanges: permissionChanges.length
          });
          
          // Neue Permissions zu Rollen hinzufügen
          if (permissionChanges.length > 0) {
            await this.addPermissionsToRoles(module);
          }
        }
      }
    }
    
    return changes;
  }

  /**
   * Erkennt Änderungen in Ressourcen
   */
  detectResourceChanges(existing, discovered) {
    const changes = [];
    const existingResources = new Map(existing.resources.map(r => [r.name, r]));
    
    for (const resource of discovered.resources) {
      const existingResource = existingResources.get(resource.name);
      
      if (!existingResource) {
        changes.push({ type: 'resource_added', resource: resource.name });
      } else {
        // Prüfe auf Änderungen in Aktionen
        const existingActions = new Set(existingResource.actions.map(a => a.name));
        const newActions = resource.actions.filter(a => !existingActions.has(a.name));
        
        if (newActions.length > 0) {
          changes.push({ 
            type: 'actions_added', 
            resource: resource.name, 
            actions: newActions.map(a => a.name) 
          });
        }
      }
    }
    
    return changes;
  }

  /**
   * Erkennt Änderungen in Permissions
   */
  detectPermissionChanges(existing, discovered) {
    const changes = [];
    const existingPermissions = new Set(existing.permissions.map(p => p.name));
    
    for (const permission of discovered.permissions) {
      if (!existingPermissions.has(permission.name)) {
        changes.push({ type: 'permission_added', permission: permission.name });
      }
    }
    
    return changes;
  }

  /**
   * Fügt neue Permissions zu bestehenden Rollen hinzu
   */
  async addPermissionsToRoles(module) {
    try {
      const roles = ['super_admin', 'admin', 'arzt', 'assistent', 'rezeption', 'billing', 'patient'];
      
      for (const role of roles) {
        const roleDefaults = module.roleDefaults.find(rd => rd.role === role);
        if (!roleDefaults) continue;
        
        // Finde alle Benutzer mit dieser Rolle
        const users = await User.find({ role: role });
        
        for (const user of users) {
          // Füge neue Permissions hinzu
          const newPermissions = roleDefaults.permissions.filter(p => 
            !user.permissions || !user.permissions.includes(p)
          );
          
          if (newPermissions.length > 0) {
            user.permissions = [...(user.permissions || []), ...newPermissions];
            
            // Füge zur Permission-History hinzu
            if (!user.rbac) user.rbac = {};
            if (!user.rbac.permissionHistory) user.rbac.permissionHistory = [];
            
            user.rbac.permissionHistory.push({
              action: 'auto_granted',
              permission: newPermissions.join(', '),
              resource: module.moduleName,
              changedBy: null, // System
              changedAt: new Date(),
              reason: 'Automatisch durch RBAC-Discovery hinzugefügt'
            });
            
            await user.save();
            
            // Audit-Log
            await AuditLog.create({
              userId: user._id,
              userEmail: user.email,
              userRole: user.role,
              action: 'permission_auto_granted',
              resource: 'user',
              resourceId: user._id,
              description: `Automatisch ${newPermissions.length} Permissions hinzugefügt für Modul ${module.moduleName}`,
              details: {
                module: module.moduleName,
                permissions: newPermissions,
                reason: 'rbac_auto_discovery'
              },
              success: true
            });
          }
        }
      }
      
      console.log(`✅ Permissions für Modul ${module.moduleName} zu Rollen hinzugefügt`);
      
    } catch (error) {
      console.error(`❌ Fehler beim Hinzufügen von Permissions für Modul ${module.moduleName}:`, error);
    }
  }

  /**
   * Benachrichtigt Administratoren über Änderungen
   */
  async notifyAdmins(changes) {
    try {
      const admins = await User.find({ 
        role: { $in: ['super_admin', 'admin'] },
        isActive: true 
      });
      
      for (const admin of admins) {
        await AuditLog.create({
          userId: admin._id,
          userEmail: admin.email,
          userRole: admin.role,
          action: 'rbac_changes_detected',
          resource: 'system',
          description: `RBAC-Discovery: ${changes.length} Änderungen erkannt`,
          details: {
            changes: changes,
            timestamp: new Date()
          },
          success: true
        });
      }
      
      console.log(`📧 ${admins.length} Administratoren über RBAC-Änderungen benachrichtigt`);
      
    } catch (error) {
      console.error('❌ Fehler beim Benachrichtigen der Administratoren:', error);
    }
  }

  /**
   * Manueller Discovery-Trigger
   */
  async triggerDiscovery() {
    console.log('🔄 Manueller RBAC-Discovery ausgelöst');
    await this.performDiscovery();
  }

  /**
   * Gibt den Status des Services zurück
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastDiscovery: this.lastDiscovery,
      discoveryInterval: this.discoveryInterval
    };
  }
}

// Singleton-Instanz
const rbacAutoDiscovery = new RBACAutoDiscoveryService();

module.exports = rbacAutoDiscovery;
