# Modul-Schaltzentrale: Konzept & Vorschläge

## Übersicht

Dieses Dokument beschreibt das Konzept für eine zentrale Modul-Verwaltung, die es Administratoren ermöglicht, Module dynamisch ein- und auszuschalten, ohne die anderen Funktionalitäten zu beeinflussen.

## Aktueller Stand

### Vorhandene Infrastruktur

1. **Backend:**
   - `ModuleRegistry` Model (MongoDB Schema)
   - `moduleManager.js` Service (verwaltet Module)
   - `routes/modules.js` API-Endpunkte
   - Statische Route-Registrierung in `server.js`

2. **Frontend:**
   - Statische `menuItems` in `data/menuItems.tsx`
   - Statische Route-Definitionen in `App.tsx`
   - Keine dynamische Filterung basierend auf Modul-Status

3. **Services:**
   - Verschiedene Cron Jobs und Background Services
   - Keine zentrale Verwaltung des Service-Lifecycles

## Vorschläge für die Implementierung

### 1. Datenmodell-Erweiterungen

#### 1.1 ModuleRegistry Schema erweitern

```javascript
// Zusätzliche Felder im ModuleRegistry Schema:
{
  // ... bestehende Felder ...
  
  // Frontend-Metadaten
  frontendConfig: {
    menuItem: {
      text: String,           // Anzeigename im Menü
      icon: String,           // Icon-Name (Material-UI)
      path: String,           // Route-Pfad
      category: String,        // Kategorie (z.B. 'patients', 'billing')
      order: Number,          // Sortierreihenfolge
      requiresPermission: String, // Optional: benötigte Permission
      subItems: [{
        text: String,
        icon: String,
        path: String,
        order: Number
      }]
    },
    routes: [{
      path: String,            // Frontend-Route
      component: String,       // Komponenten-Name
      requiredPermissions: [String]
    }]
  },
  
  // Backend-Service-Konfiguration
  services: {
    cronJobs: [{
      name: String,            // Eindeutiger Name
      schedule: String,        // Cron-Schedule (z.B. '0 2 * * *')
      serviceFile: String,     // Pfad zum Service-File
      startMethod: String,     // Methodenname zum Starten
      stopMethod: String,      // Methodenname zum Stoppen
      isRunning: Boolean       // Laufender Status
    }],
    backgroundServices: [{
      name: String,
      serviceFile: String,
      startMethod: String,
      stopMethod: String,
      isRunning: Boolean
    }]
  },
  
  // Abhängigkeiten
  dependencies: [{
    moduleName: String,        // Name des abhängigen Moduls
    required: Boolean          // Ob Abhängigkeit zwingend ist
  }],
  
  // Konflikte
  conflicts: [{
    moduleName: String,        // Modul, das nicht gleichzeitig aktiv sein darf
    reason: String
  }],
  
  // Status-Tracking
  status: {
    lastActivated: Date,
    lastDeactivated: Date,
    activationCount: Number,
    errorHistory: [{
      timestamp: Date,
      error: String,
      resolved: Boolean
    }]
  }
}
```

#### 1.2 Neues ServiceRegistry Model

```javascript
// backend/models/ServiceRegistry.js
{
  serviceName: String,        // Eindeutiger Service-Name
  moduleName: String,         // Zugehöriges Modul
  type: String,              // 'cron' | 'background' | 'websocket' | 'queue'
  config: {
    schedule: String,         // Für Cron Jobs
    serviceFile: String,
    startMethod: String,
    stopMethod: String,
    restartOnError: Boolean,
    maxRestarts: Number
  },
  status: {
    isRunning: Boolean,
    lastStart: Date,
    lastStop: Date,
    restartCount: Number,
    errorCount: Number
  },
  instance: Object,           // Referenz zur laufenden Instanz (für Cron: Task-Objekt)
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Backend-Architektur

#### 2.1 Service Lifecycle Manager

**Datei:** `backend/services/serviceLifecycleManager.js`

```javascript
class ServiceLifecycleManager {
  constructor() {
    this.activeServices = new Map(); // serviceName -> ServiceInstance
    this.cronTasks = new Map();     // serviceName -> CronTask
  }
  
  /**
   * Startet alle Services eines Moduls
   */
  async startModuleServices(moduleName) {
    const module = await ModuleRegistry.findOne({ moduleName });
    if (!module || !module.isActive) return;
    
    // Starte Cron Jobs
    for (const cronJob of module.services.cronJobs || []) {
      await this.startCronJob(moduleName, cronJob);
    }
    
    // Starte Background Services
    for (const bgService of module.services.backgroundServices || []) {
      await this.startBackgroundService(moduleName, bgService);
    }
  }
  
  /**
   * Stoppt alle Services eines Moduls
   */
  async stopModuleServices(moduleName) {
    // Stoppe Cron Jobs
    const cronJobs = Array.from(this.cronTasks.entries())
      .filter(([name]) => name.startsWith(`${moduleName}:`));
    
    for (const [name, task] of cronJobs) {
      task.stop();
      this.cronTasks.delete(name);
    }
    
    // Stoppe Background Services
    const bgServices = Array.from(this.activeServices.entries())
      .filter(([name]) => name.startsWith(`${moduleName}:`));
    
    for (const [name, service] of bgServices) {
      if (service.stop) await service.stop();
      this.activeServices.delete(name);
    }
  }
  
  /**
   * Startet einen Cron Job
   */
  async startCronJob(moduleName, cronConfig) {
    const serviceName = `${moduleName}:${cronConfig.name}`;
    
    try {
      const serviceModule = require(cronConfig.serviceFile);
      const serviceInstance = serviceModule[cronConfig.startMethod]();
      
      const task = cron.schedule(cronConfig.schedule, async () => {
        try {
          await serviceInstance();
        } catch (error) {
          logger.error(`Fehler in Cron Job ${serviceName}:`, error);
        }
      });
      
      this.cronTasks.set(serviceName, task);
      
      // Update ServiceRegistry
      await ServiceRegistry.findOneAndUpdate(
        { serviceName },
        {
          moduleName,
          type: 'cron',
          status: { isRunning: true, lastStart: new Date() }
        },
        { upsert: true }
      );
      
      logger.info(`✅ Cron Job gestartet: ${serviceName}`);
    } catch (error) {
      logger.error(`❌ Fehler beim Starten von Cron Job ${serviceName}:`, error);
    }
  }
  
  /**
   * Startet einen Background Service
   */
  async startBackgroundService(moduleName, serviceConfig) {
    const serviceName = `${moduleName}:${serviceConfig.name}`;
    
    try {
      const serviceModule = require(serviceConfig.serviceFile);
      const serviceInstance = serviceModule[serviceConfig.startMethod]();
      
      this.activeServices.set(serviceName, serviceInstance);
      
      await ServiceRegistry.findOneAndUpdate(
        { serviceName },
        {
          moduleName,
          type: 'background',
          status: { isRunning: true, lastStart: new Date() }
        },
        { upsert: true }
      );
      
      logger.info(`✅ Background Service gestartet: ${serviceName}`);
    } catch (error) {
      logger.error(`❌ Fehler beim Starten von Background Service ${serviceName}:`, error);
    }
  }
  
  /**
   * Prüft Abhängigkeiten vor Aktivierung
   */
  async checkDependencies(moduleName) {
    const module = await ModuleRegistry.findOne({ moduleName });
    if (!module.dependencies || module.dependencies.length === 0) {
      return { valid: true };
    }
    
    const missing = [];
    for (const dep of module.dependencies) {
      const depModule = await ModuleRegistry.findOne({ 
        moduleName: dep.moduleName,
        isActive: true 
      });
      
      if (!depModule) {
        missing.push(dep.moduleName);
      }
    }
    
    if (missing.length > 0) {
      return {
        valid: false,
        missing,
        message: `Folgende Abhängigkeiten fehlen: ${missing.join(', ')}`
      };
    }
    
    return { valid: true };
  }
}
```

#### 2.2 Dynamische Route-Registrierung

**Erweiterung von `moduleManager.js`:**

```javascript
class ModuleManager {
  // ... bestehende Methoden ...
  
  /**
   * Registriert Routen dynamisch (ohne Server-Neustart)
   */
  async registerRouteDynamically(app, moduleName) {
    const routeConfig = this.routeMap[moduleName];
    if (!routeConfig) {
      throw new Error(`Modul ${moduleName} nicht in Route-Map gefunden`);
    }
    
    // Prüfe, ob Route bereits registriert
    if (this.moduleRoutes.has(moduleName)) {
      logger.warn(`Route ${moduleName} ist bereits registriert`);
      return;
    }
    
    try {
      const routeModule = require(routeConfig.route);
      app.use(routeConfig.path, routeModule);
      this.moduleRoutes.set(moduleName, routeConfig.path);
      logger.info(`✅ Route dynamisch registriert: ${moduleName} -> ${routeConfig.path}`);
    } catch (error) {
      logger.error(`❌ Fehler beim dynamischen Registrieren: ${moduleName}`, error);
      throw error;
    }
  }
  
  /**
   * Entfernt Route dynamisch
   */
  async unregisterRouteDynamically(app, moduleName) {
    const routePath = this.moduleRoutes.get(moduleName);
    if (!routePath) {
      logger.warn(`Route ${moduleName} ist nicht registriert`);
      return;
    }
    
    // Entferne Route aus Express-App
    // Hinweis: Express unterstützt kein dynamisches Entfernen von Routen
    // Alternative: Middleware, die 404 zurückgibt, wenn Modul deaktiviert ist
    
    this.moduleRoutes.delete(moduleName);
    logger.info(`✅ Route entfernt: ${moduleName}`);
  }
}
```

#### 2.3 Middleware für deaktivierte Module

**Datei:** `backend/middleware/moduleGuard.js`

```javascript
const moduleManager = require('../services/moduleManager');

/**
 * Middleware, die prüft, ob ein Modul aktiv ist
 */
const moduleGuard = (moduleName) => {
  return (req, res, next) => {
    if (!moduleManager.isModuleActive(moduleName)) {
      return res.status(503).json({
        success: false,
        message: `Modul '${moduleName}' ist deaktiviert`,
        error: 'MODULE_DISABLED'
      });
    }
    next();
  };
};

/**
 * Middleware für Route-Pfade (automatische Erkennung)
 */
const autoModuleGuard = (req, res, next) => {
  const path = req.path;
  
  // Extrahiere Modul-Name aus Pfad
  // z.B. /api/patients -> 'patients'
  const pathParts = path.split('/').filter(p => p);
  if (pathParts.length >= 2 && pathParts[0] === 'api') {
    const moduleName = pathParts[1].replace(/-/g, '-');
    
    if (!moduleManager.isModuleActive(moduleName)) {
      return res.status(503).json({
        success: false,
        message: `Modul '${moduleName}' ist deaktiviert`,
        error: 'MODULE_DISABLED'
      });
    }
  }
  
  next();
};

module.exports = { moduleGuard, autoModuleGuard };
```

#### 2.4 Erweiterte API-Endpunkte

**Erweiterung von `routes/modules.js`:**

```javascript
/**
 * POST /api/modules/:moduleName/activate
 * Aktiviert ein Modul (inkl. Services)
 */
router.post('/:moduleName/activate', async (req, res) => {
  try {
    const { moduleName } = req.params;
    
    // Prüfe Abhängigkeiten
    const serviceLifecycleManager = require('../services/serviceLifecycleManager');
    const dependencyCheck = await serviceLifecycleManager.checkDependencies(moduleName);
    
    if (!dependencyCheck.valid) {
      return res.status(400).json({
        success: false,
        message: dependencyCheck.message,
        missing: dependencyCheck.missing
      });
    }
    
    // Aktiviere Modul
    const module = await ModuleRegistry.findOneAndUpdate(
      { moduleName },
      { isActive: true, lastActivated: new Date() },
      { new: true }
    );
    
    // Starte Services
    await serviceLifecycleManager.startModuleServices(moduleName);
    
    // Aktualisiere Module Manager
    await moduleManager.refreshModules();
    
    res.json({
      success: true,
      message: `Modul '${moduleName}' wurde aktiviert`,
      data: module
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/modules/:moduleName/deactivate
 * Deaktiviert ein Modul (inkl. Services)
 */
router.post('/:moduleName/deactivate', async (req, res) => {
  try {
    const { moduleName } = req.params;
    
    // Prüfe, ob andere Module davon abhängen
    const dependentModules = await ModuleRegistry.find({
      'dependencies.moduleName': moduleName,
      isActive: true
    });
    
    if (dependentModules.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Modul kann nicht deaktiviert werden, da folgende Module davon abhängen: ${dependentModules.map(m => m.moduleName).join(', ')}`,
        dependentModules: dependentModules.map(m => m.moduleName)
      });
    }
    
    // Stoppe Services
    const serviceLifecycleManager = require('../services/serviceLifecycleManager');
    await serviceLifecycleManager.stopModuleServices(moduleName);
    
    // Deaktiviere Modul
    const module = await ModuleRegistry.findOneAndUpdate(
      { moduleName },
      { isActive: false, lastDeactivated: new Date() },
      { new: true }
    );
    
    // Aktualisiere Module Manager
    await moduleManager.refreshModules();
    
    res.json({
      success: true,
      message: `Modul '${moduleName}' wurde deaktiviert`,
      data: module
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/modules/:moduleName/services
 * Gibt Status aller Services eines Moduls zurück
 */
router.get('/:moduleName/services', async (req, res) => {
  try {
    const { moduleName } = req.params;
    const services = await ServiceRegistry.find({ moduleName });
    
    res.json({
      success: true,
      data: services,
      count: services.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### 3. Frontend-Architektur

#### 3.1 Modul-Status Hook

**Datei:** `frontend/src/hooks/useModuleStatus.ts`

```typescript
import { useState, useEffect } from 'react';
import api from '../utils/api';

interface ModuleStatus {
  moduleName: string;
  isActive: boolean;
  displayName: string;
  description?: string;
}

export const useModuleStatus = () => {
  const [modules, setModules] = useState<ModuleStatus[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadModules();
  }, []);
  
  const loadModules = async () => {
    try {
      const response = await api.get('/modules');
      setModules(response.data.data);
    } catch (error) {
      console.error('Fehler beim Laden der Module:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const isModuleActive = (moduleName: string): boolean => {
    const module = modules.find(m => m.moduleName === moduleName);
    return module?.isActive ?? true; // Default: aktiv, wenn nicht gefunden
  };
  
  return {
    modules,
    loading,
    isModuleActive,
    refresh: loadModules
  };
};
```

#### 3.2 Dynamische Menu-Items

**Erweiterung von `data/menuItems.tsx`:**

```typescript
import { useModuleStatus } from '../hooks/useModuleStatus';

// Basis-Menu-Items mit Modul-Zuordnung
export const baseMenuItems: MenuItem[] = [
  {
    text: 'Dashboard',
    icon: <Dashboard />,
    path: '/dashboard',
    module: null // Immer sichtbar
  },
  {
    text: 'Patienten',
    icon: <People />,
    path: '/patients',
    module: 'patients', // Nur sichtbar, wenn Modul aktiv
    subItems: [
      { text: 'Patientenliste', path: '/patients', module: 'patients' },
      { text: 'Online-Buchungen', path: '/online-bookings', module: 'online-booking' },
      // ...
    ]
  },
  {
    text: 'ELGA',
    icon: <HealthAndSafety />,
    path: '/elga',
    module: 'elga' // Nur sichtbar, wenn ELGA-Modul aktiv
  },
  // ...
];

// Hook zum Filtern der Menu-Items
export const useFilteredMenuItems = (): MenuItem[] => {
  const { isModuleActive } = useModuleStatus();
  
  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items
      .filter(item => {
        // Wenn kein Modul zugeordnet, immer anzeigen
        if (!item.module) return true;
        
        // Prüfe, ob Modul aktiv ist
        return isModuleActive(item.module);
      })
      .map(item => {
        // Filtere auch Sub-Items
        if (item.subItems) {
          return {
            ...item,
            subItems: filterMenuItems(item.subItems)
          };
        }
        return item;
      });
  };
  
  return filterMenuItems(baseMenuItems);
};
```

#### 3.3 Protected Route mit Modul-Check

**Erweiterung von `components/ProtectedRoute.tsx`:**

```typescript
import { useModuleStatus } from '../hooks/useModuleStatus';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredModule?: string; // Optional: benötigtes Modul
  // ... andere Props ...
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredModule,
  ...otherProps
}) => {
  const { isModuleActive } = useModuleStatus();
  
  // Prüfe Modul-Status
  if (requiredModule && !isModuleActive(requiredModule)) {
    return <Navigate to="/module-disabled" replace />;
  }
  
  // ... restliche ProtectedRoute-Logik ...
};
```

#### 3.4 Admin-Seite: Modul-Verwaltung

**Datei:** `frontend/src/pages/ModuleManagement.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  CircularProgress
} from '@mui/material';
import {
  PowerSettingsNew,
  Info,
  Warning,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';
import api from '../utils/api';
import { useModuleStatus } from '../hooks/useModuleStatus';

interface Module {
  _id: string;
  moduleName: string;
  displayName: string;
  description?: string;
  version: string;
  isActive: boolean;
  dependencies?: Array<{ moduleName: string; required: boolean }>;
  services?: {
    cronJobs?: Array<{ name: string; schedule: string }>;
    backgroundServices?: Array<{ name: string }>;
  };
}

const ModuleManagement: React.FC = () => {
  const { modules, loading, refresh } = useModuleStatus();
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  
  const handleToggleModule = async (module: Module) => {
    setActivating(module.moduleName);
    
    try {
      const endpoint = module.isActive ? 'deactivate' : 'activate';
      await api.post(`/modules/${module.moduleName}/${endpoint}`);
      await refresh();
    } catch (error: any) {
      console.error('Fehler beim Aktivieren/Deaktivieren:', error);
      // Zeige Fehler-Snackbar
    } finally {
      setActivating(null);
    }
  };
  
  const handleViewDetails = async (moduleName: string) => {
    try {
      const response = await api.get(`/modules/${moduleName}`);
      setSelectedModule(response.data.data);
      setDetailsOpen(true);
    } catch (error) {
      console.error('Fehler beim Laden der Details:', error);
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Modul-Verwaltung
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Hier können Sie Module aktivieren oder deaktivieren. Deaktivierte Module werden im Frontend ausgeblendet und ihre Services werden gestoppt.
      </Alert>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {modules.map((module) => (
            <Grid item xs={12} md={6} lg={4} key={module._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">{module.displayName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {module.moduleName}
                      </Typography>
                    </Box>
                    <Chip
                      label={module.isActive ? 'Aktiv' : 'Inaktiv'}
                      color={module.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  
                  {module.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {module.description}
                    </Typography>
                  )}
                  
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Switch
                      checked={module.isActive}
                      onChange={() => handleToggleModule(module)}
                      disabled={activating === module.moduleName}
                    />
                    <Typography variant="body2">
                      {module.isActive ? 'Deaktivieren' : 'Aktivieren'}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => handleViewDetails(module.moduleName)}
                      sx={{ ml: 'auto' }}
                    >
                      Details
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Modul-Details: {selectedModule?.displayName}
        </DialogTitle>
        <DialogContent>
          {selectedModule && (
            <List>
              <ListItem>
                <ListItemText
                  primary="Version"
                  secondary={selectedModule.version}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Status"
                  secondary={selectedModule.isActive ? 'Aktiv' : 'Inaktiv'}
                />
              </ListItem>
              {selectedModule.dependencies && selectedModule.dependencies.length > 0 && (
                <ListItem>
                  <ListItemText
                    primary="Abhängigkeiten"
                    secondary={selectedModule.dependencies.map(d => d.moduleName).join(', ')}
                  />
                </ListItem>
              )}
              {selectedModule.services && (
                <>
                  {selectedModule.services.cronJobs && selectedModule.services.cronJobs.length > 0 && (
                    <ListItem>
                      <ListItemText
                        primary="Cron Jobs"
                        secondary={selectedModule.services.cronJobs.map(j => `${j.name} (${j.schedule})`).join(', ')}
                      />
                    </ListItem>
                  )}
                  {selectedModule.services.backgroundServices && selectedModule.services.backgroundServices.length > 0 && (
                    <ListItem>
                      <ListItemText
                        primary="Background Services"
                        secondary={selectedModule.services.backgroundServices.map(s => s.name).join(', ')}
                      />
                    </ListItem>
                  )}
                </>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ModuleManagement;
```

### 4. Service-Konfiguration

#### 4.1 Service-Deklaration in Modulen

Jedes Modul sollte seine Services in der `ModuleRegistry` deklarieren:

```javascript
// Beispiel: ELGA-Modul
{
  moduleName: 'elga',
  services: {
    cronJobs: [
      {
        name: 'elga-sync',
        schedule: '0 2 * * *', // Täglich um 2 Uhr
        serviceFile: './services/elgaSyncService',
        startMethod: 'start',
        stopMethod: 'stop'
      }
    ],
    backgroundServices: [
      {
        name: 'elga-connection-monitor',
        serviceFile: './services/elgaConnectionMonitor',
        startMethod: 'start',
        stopMethod: 'stop'
      }
    ]
  }
}
```

#### 4.2 Service-Implementierung

Services sollten einheitliche Start/Stop-Methoden haben:

```javascript
// backend/services/elgaSyncService.js
class ELGASyncService {
  constructor() {
    this.isRunning = false;
    this.cronTask = null;
  }
  
  start() {
    if (this.isRunning) {
      logger.warn('ELGA Sync Service läuft bereits');
      return;
    }
    
    this.cronTask = cron.schedule('0 2 * * *', async () => {
      await this.sync();
    });
    
    this.isRunning = true;
    logger.info('✅ ELGA Sync Service gestartet');
  }
  
  stop() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }
    this.isRunning = false;
    logger.info('⏹️ ELGA Sync Service gestoppt');
  }
  
  async sync() {
    // Sync-Logik
  }
}

// Export als Singleton
const service = new ELGASyncService();
module.exports = {
  start: () => service.start(),
  stop: () => service.stop(),
  getStatus: () => ({ isRunning: service.isRunning })
};
```

### 5. Migration & Initialisierung

#### 5.1 Initialisierung beim Server-Start

**Erweiterung von `server.js`:**

```javascript
// Nach DB-Verbindung
mongoose.connection.once('open', async () => {
  logger.info('✅ MongoDB verbunden');
  
  // Lade aktive Module
  const moduleManager = require('./services/moduleManager');
  await moduleManager.loadActiveModules();
  
  // Starte Services für aktive Module
  const serviceLifecycleManager = require('./services/serviceLifecycleManager');
  const activeModules = await ModuleRegistry.find({ isActive: true });
  
  for (const module of activeModules) {
    await serviceLifecycleManager.startModuleServices(module.moduleName);
  }
  
  // Registriere Routen dynamisch (falls Module Manager aktiviert)
  if (USE_MODULE_MANAGER) {
    await moduleManager.registerRoutes(app);
  }
  
  // Starte Server
  app.listen(PORT, () => {
    logger.info(`🚀 Server läuft auf Port ${PORT}`);
  });
});
```

#### 5.2 Migration bestehender Services

Bestehende Services müssen angepasst werden:

1. **Cron Jobs in `server.js`:**
   - In Service-Dateien verschieben
   - Start/Stop-Methoden hinzufügen
   - In `ModuleRegistry` registrieren

2. **Background Services:**
   - Start/Stop-Methoden hinzufügen
   - In `ModuleRegistry` registrieren

### 6. Sicherheitsaspekte

1. **Berechtigungen:**
   - Nur Super-Admin und Admin können Module aktivieren/deaktivieren
   - RBAC-Integration für Modul-Verwaltung

2. **Validierung:**
   - Abhängigkeiten prüfen
   - Konflikte erkennen
   - Required-Module schützen

3. **Audit-Logging:**
   - Alle Modul-Aktivierungen/Deaktivierungen protokollieren
   - Service-Starts/Stops protokollieren

### 7. UI/UX Überlegungen

1. **Admin-Bereich:**
   - Übersichtliche Karten-Ansicht
   - Filter nach Status/Kategorie
   - Suche nach Modul-Namen
   - Bulk-Aktionen (mehrere Module gleichzeitig)

2. **Feedback:**
   - Loading-States während Aktivierung
   - Erfolgs-/Fehler-Meldungen
   - Warnungen bei Abhängigkeiten

3. **Details:**
   - Service-Status anzeigen
   - Abhängigkeiten visualisieren
   - Aktivierungs-Historie

### 8. Vorteile dieser Architektur

1. **Flexibilität:**
   - Module können ohne Code-Änderungen ein-/ausgeschaltet werden
   - Neue Module können einfach hinzugefügt werden

2. **Performance:**
   - Deaktivierte Module belasten das System nicht
   - Services werden nur gestartet, wenn benötigt

3. **Wartbarkeit:**
   - Klare Trennung zwischen Modulen
   - Einfache Erweiterung
   - Zentrale Verwaltung

4. **Sicherheit:**
   - Unbenötigte Endpunkte sind nicht erreichbar
   - Reduzierte Angriffsfläche

### 9. Offene Fragen & Herausforderungen

1. **Express Route-Entfernung:**
   - Express unterstützt kein dynamisches Entfernen von Routen
   - Lösung: Middleware, die 503 zurückgibt, wenn Modul deaktiviert

2. **Service-Lifecycle:**
   - Komplexe Services müssen sauber gestoppt werden können
   - Graceful Shutdown implementieren

3. **Frontend-Bundle:**
   - Deaktivierte Module werden trotzdem gebundelt
   - Lösung: Code-Splitting und Lazy Loading

4. **Datenintegrität:**
   - Was passiert mit Daten, wenn Modul deaktiviert wird?
   - Lösung: Daten bleiben erhalten, nur Zugriff blockiert

### 10. Implementierungsreihenfolge

1. **Phase 1: Backend-Grundlagen**
   - ServiceLifecycleManager implementieren
   - ModuleRegistry Schema erweitern
   - API-Endpunkte erweitern

2. **Phase 2: Service-Migration**
   - Bestehende Services migrieren
   - Start/Stop-Methoden hinzufügen

3. **Phase 3: Frontend-Integration**
   - useModuleStatus Hook
   - Dynamische Menu-Items
   - ProtectedRoute erweitern

4. **Phase 4: Admin-Interface**
   - ModuleManagement Seite
   - UI/UX-Verbesserungen

5. **Phase 5: Testing & Optimierung**
   - Umfassende Tests
   - Performance-Optimierung
   - Dokumentation

## Zusammenfassung

Dieses Konzept bietet eine vollständige Lösung für die Modul-Verwaltung:

- ✅ Dynamisches Ein-/Ausschalten von Modulen
- ✅ Automatisches Starten/Stoppen von Services
- ✅ Frontend-Ausblendung deaktivierter Module
- ✅ Zentrale Admin-Schaltzentrale
- ✅ Abhängigkeitsprüfung
- ✅ Service-Lifecycle-Management

Die Implementierung kann schrittweise erfolgen und ist rückwärtskompatibel mit der bestehenden Architektur.
