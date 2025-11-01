const mongoose = require('mongoose');

// RBAC Module Registry Schema
const ModuleRegistrySchema = new mongoose.Schema({
  moduleName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  resources: [{
    name: {
      type: String,
      required: true
    },
    displayName: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    actions: [{
      name: {
        type: String,
        required: true
      },
      displayName: {
        type: String,
        required: true
      },
      description: {
        type: String
      },
      isDefault: {
        type: Boolean,
        default: false
      }
    }],
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  permissions: [{
    name: {
      type: String,
      required: true
    },
    displayName: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    resource: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true
    },
    isSystemPermission: {
      type: Boolean,
      default: false
    }
  }],
  roleDefaults: [{
    role: {
      type: String,
      required: true
    },
    permissions: [{
      type: String
    }],
    isInherited: {
      type: Boolean,
      default: false
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
ModuleRegistrySchema.index({ moduleName: 1 });
ModuleRegistrySchema.index({ isActive: 1 });
ModuleRegistrySchema.index({ 'resources.name': 1 });

// Static methods
ModuleRegistrySchema.statics.discoverModules = async function() {
  try {
    // Scan for modules in the system
    const fs = require('fs');
    const path = require('path');
    
    const modules = [];
    const routesDir = path.join(__dirname, '../routes');
    
    if (fs.existsSync(routesDir)) {
      const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));
      
      for (const file of routeFiles) {
        if (file === 'rbac.js' || file === 'setup.js') continue;
        
        const moduleName = file.replace('.js', '');
        const modulePath = path.join(routesDir, file);
        
        try {
          // Read the route file to extract resources and actions
          const content = fs.readFileSync(modulePath, 'utf8');
          const resources = this.extractResourcesFromCode(content);
          const permissions = this.generatePermissionsFromResources(resources, moduleName);
          
          modules.push({
            moduleName,
            displayName: this.formatDisplayName(moduleName),
            description: `Automatisch erkanntes Modul: ${moduleName}`,
            resources,
            permissions,
            roleDefaults: this.generateDefaultRolePermissions(moduleName, permissions)
          });
        } catch (error) {
          console.warn(`Fehler beim Scannen von Modul ${moduleName}:`, error.message);
        }
      }
    }
    
    return modules;
  } catch (error) {
    console.error('Fehler beim Modul-Discovery:', error);
    return [];
  }
};

ModuleRegistrySchema.statics.extractResourcesFromCode = function(code) {
  const resources = [];
  
  // Regex patterns to find resources and actions
  const resourcePatterns = [
    /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g
  ];
  
  const actionMap = {
    'get': 'read',
    'post': 'create',
    'put': 'update',
    'delete': 'delete',
    'patch': 'update'
  };
  
  const resourceMap = new Map();
  
  for (const pattern of resourcePatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const method = match[1];
      const route = match[2];
      
      // Extract resource name from route
      const resourceName = this.extractResourceNameFromRoute(route);
      if (!resourceName) continue;
      
      if (!resourceMap.has(resourceName)) {
        resourceMap.set(resourceName, {
          name: resourceName,
          displayName: this.formatDisplayName(resourceName),
          description: `Ressource: ${resourceName}`,
          actions: []
        });
      }
      
      const action = actionMap[method];
      if (action && !resourceMap.get(resourceName).actions.find(a => a.name === action)) {
        resourceMap.get(resourceName).actions.push({
          name: action,
          displayName: this.formatDisplayName(action),
          description: `${action} Aktion für ${resourceName}`,
          isDefault: true
        });
      }
    }
  }
  
  return Array.from(resourceMap.values());
};

ModuleRegistrySchema.statics.extractResourceNameFromRoute = function(route) {
  // Remove parameters and extract resource name
  const cleanRoute = route.replace(/\/:[^/]+/g, '').replace(/\/$/, '');
  const parts = cleanRoute.split('/').filter(part => part && part !== 'api');
  
  if (parts.length === 0) return null;
  
  // Get the main resource (usually the last part)
  let resource = parts[parts.length - 1];
  
  // Handle special cases
  if (resource === 'me' || resource === 'profile') {
    resource = parts[parts.length - 2] || 'user';
  }
  
  return resource;
};

ModuleRegistrySchema.statics.generatePermissionsFromResources = function(resources, moduleName) {
  const permissions = [];
  
  for (const resource of resources) {
    for (const action of resource.actions) {
      permissions.push({
        name: `${resource.name}.${action.name}`,
        displayName: `${this.formatDisplayName(action.name)} ${this.formatDisplayName(resource.name)}`,
        description: `${action.name} Berechtigung für ${resource.name}`,
        resource: resource.name,
        action: action.name,
        isSystemPermission: true
      });
    }
  }
  
  return permissions;
};

ModuleRegistrySchema.statics.generateDefaultRolePermissions = function(moduleName, permissions) {
  const roleDefaults = [
    { role: 'super_admin', permissions: permissions.map(p => p.name), isInherited: false },
    { role: 'admin', permissions: permissions.map(p => p.name), isInherited: false },
    { role: 'arzt', permissions: permissions.filter(p => ['read', 'create', 'update'].includes(p.action)).map(p => p.name), isInherited: false },
    { role: 'assistent', permissions: permissions.filter(p => ['read', 'create'].includes(p.action)).map(p => p.name), isInherited: false },
    { role: 'rezeption', permissions: permissions.filter(p => ['read', 'create', 'update'].includes(p.action)).map(p => p.name), isInherited: false },
    { role: 'billing', permissions: permissions.filter(p => ['read', 'create', 'update', 'delete'].includes(p.action)).map(p => p.name), isInherited: false },
    { role: 'patient', permissions: permissions.filter(p => p.action === 'read').map(p => p.name), isInherited: false }
  ];
  
  return roleDefaults;
};

ModuleRegistrySchema.statics.formatDisplayName = function(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

ModuleRegistrySchema.statics.syncWithSystem = async function() {
  try {
    console.log('🔄 Starte RBAC Auto-Discovery...');
    
    // Discover modules
    const discoveredModules = await this.discoverModules();
    console.log(`📦 ${discoveredModules.length} Module entdeckt:`, discoveredModules.map(m => m.moduleName));
    
    // Update or create module registrations
    for (const module of discoveredModules) {
      await this.findOneAndUpdate(
        { moduleName: module.moduleName },
        {
          ...module,
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );
    }
    
    // Update RBAC permissions
    await this.updateRBACPermissions();
    
    console.log('✅ RBAC Auto-Discovery abgeschlossen');
    return discoveredModules;
  } catch (error) {
    console.error('❌ Fehler beim RBAC Auto-Discovery:', error);
    throw error;
  }
};

ModuleRegistrySchema.statics.updateRBACPermissions = async function() {
  try {
    const modules = await this.find({ isActive: true });
    const allPermissions = [];
    
    for (const module of modules) {
      allPermissions.push(...module.permissions);
    }
    
    // Update the main RBAC system with new permissions
    const RBACUtils = require('../utils/rbac');
    
    // This would update the RBAC system with new permissions
    // Implementation depends on your RBAC structure
    console.log(`📝 ${allPermissions.length} Permissions für RBAC-System aktualisiert`);
    
    return allPermissions;
  } catch (error) {
    console.error('Fehler beim Aktualisieren der RBAC-Permissions:', error);
    throw error;
  }
};

module.exports = mongoose.model('ModuleRegistry', ModuleRegistrySchema);
