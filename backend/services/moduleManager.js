const ModuleRegistry = require('../models/ModuleRegistry');
const logger = require('../utils/logger');

/**
 * Module Manager Service
 * Verwaltet die Aktivierung/Deaktivierung von Modulen
 */
class ModuleManager {
  constructor() {
    this.moduleRoutes = new Map();
    this.activeModules = new Set();
    this.routeMap = this.initializeRouteMap();
  }

  /**
   * Initialisiert die Zuordnung zwischen Modulnamen und Routes
   */
  initializeRouteMap() {
    return {
      'auth': { path: '/api/auth', route: './routes/auth', required: true },
      'patients': { path: '/api/patients', route: './routes/patients', required: true },
      'patients-extended': { path: '/api/patients-extended', route: './routes/patientsExtended' },
      'appointments': { path: '/api/appointments', route: './routes/appointments', required: true },
      'resources': { path: '/api/resources', route: './routes/resources' },
      'billing': { path: '/api/billing', route: './routes/billing', required: true },
      'checkin': { path: '/api/checkin', route: './routes/checkin' },
      'documents': { path: '/api/documents', route: './routes/documents', required: true },
      'online-booking': { path: '/api/online-booking', route: './routes/onlineBooking' },
      'elga': { path: '/api/elga', route: './routes/elga' },
      'ecard': { path: '/api/ecard', route: './routes/ecard' },
      'users': { path: '/api/users', route: './routes/users', required: true },
      'backup': { path: '/api/backup', route: './routes/backup' },
      'reports': { path: '/api/reports', route: './routes/reports' },
      'audit-logs': { path: '/api/audit-logs', route: './routes/auditLogs' },
      'staff-profiles': { path: '/api/staff-profiles', route: './routes/staffProfiles', required: true },
      'work-shifts': { path: '/api/work-shifts', route: './routes/workShifts' },
      'absences': { path: '/api/absences', route: './routes/absences' },
      'availability': { path: '/api/availability', route: './routes/availability' },
      'service-catalog': { path: '/api/service-catalog', route: './routes/serviceCatalog' },
      'service-bookings': { path: '/api/service-bookings', route: './routes/serviceBookings' },
      'service-categories': { path: '/api/service-categories', route: './routes/serviceCategories' },
      'weekly-schedules': { path: '/api/weekly-schedules', route: './routes/weeklySchedules' },
      'appointment-participants': { path: '/api/appointment-participants', route: './routes/appointmentParticipants' },
      'appointment-services': { path: '/api/appointment-services', route: './routes/appointmentServices' },
      'appointment-resources': { path: '/api/appointment-resources', route: './routes/appointmentResources' },
      'clinic-hours': { path: '/api/clinic-hours', route: './routes/clinicHours' },
      'rooms': { path: '/api/rooms', route: './routes/rooms' },
      'devices': { path: '/api/devices', route: './routes/devices' },
      'locations': { path: '/api/locations', route: './routes/locations', required: true },
      'staff-location-assignments': { path: '/api/staff-location-assignments', route: './routes/staffLocationAssignments' },
      'location-weekly-schedules': { path: '/api/location-weekly-schedules', route: './routes/locationWeeklySchedules' },
      'collision-detection': { path: '/api/collision-detection', route: './routes/collisionDetection' },
      'icd10': { path: '/api/icd10', route: './routes/icd10' },
      'diagnoses': { path: '/api/diagnoses', route: './routes/diagnoses' },
      'icd10-catalog': { path: '/api/icd10-catalog', route: './routes/icd10Catalog' },
      'icd10-personal-lists': { path: '/api/icd10/personal-lists', route: './routes/icd10PersonalLists' },
      'elga-valuesets': { path: '/api/elga-valuesets', route: './routes/elgaValuesets' },
      'slot-reservations': { path: '/api/slot-reservations', route: './routes/slotReservation' },
      'document-templates': { path: '/api/document-templates', route: './routes/documentTemplates' },
      'xds': { path: '/api/xds', route: './routes/xds' },
      'pdf': { path: '/api/pdf', route: './routes/pdfGeneration' },
      'one-click-billing': { path: '/api/billing', route: './routes/oneClickBilling' },
      'rbac': { path: '/api/rbac', route: './routes/rbac', required: true },
      'rbac-discovery': { path: '/api/rbac/discovery', route: './routes/rbacDiscovery' },
      'inventory': { path: '/api/inventory', route: './routes/inventory' },
      'setup': { path: '/api/setup', route: './routes/setup' },
      'settings': { path: '/api/settings', route: './routes/settings', required: true },
      'medications': { path: '/api/medications', route: './routes/medicationCatalog' },
      'ambulanzbefunde': { path: '/api/ambulanzbefunde', route: './routes/ambulanzbefunde' }
    };
  }

  /**
   * Lädt alle aktiven Module aus der Datenbank
   */
  async loadActiveModules() {
    try {
      const modules = await ModuleRegistry.find({ isActive: true });
      this.activeModules.clear();
      
      modules.forEach(module => {
        this.activeModules.add(module.moduleName);
      });

      logger.info(`📦 ${this.activeModules.size} aktive Module geladen:`, Array.from(this.activeModules));
      return Array.from(this.activeModules);
    } catch (error) {
      logger.error('Fehler beim Laden aktiver Module:', error);
      return [];
    }
  }

  /**
   * Prüft, ob ein Modul aktiv ist
   */
  isModuleActive(moduleName) {
    // Required modules sind immer aktiv
    const routeConfig = this.routeMap[moduleName];
    if (routeConfig && routeConfig.required) {
      return true;
    }
    
    return this.activeModules.has(moduleName);
  }

  /**
   * Registriert Routen basierend auf aktiven Modulen
   */
  async registerRoutes(app) {
    await this.loadActiveModules();

    let registeredCount = 0;
    let skippedCount = 0;

    for (const [moduleName, routeConfig] of Object.entries(this.routeMap)) {
      try {
        // Required modules oder aktive Module registrieren
        if (routeConfig.required || this.isModuleActive(moduleName)) {
          const routeModule = require(routeConfig.route);
          app.use(routeConfig.path, routeModule);
          this.moduleRoutes.set(moduleName, routeConfig.path);
          registeredCount++;
          logger.debug(`✅ Route registriert: ${moduleName} -> ${routeConfig.path}`);
        } else {
          skippedCount++;
          logger.debug(`⏭️  Route übersprungen (Modul deaktiviert): ${moduleName}`);
        }
      } catch (error) {
        // Wenn Route-Datei nicht existiert, überspringen
        if (error.code === 'MODULE_NOT_FOUND') {
          logger.warn(`⚠️  Route-Datei nicht gefunden: ${routeConfig.route}`);
          skippedCount++;
        } else {
          logger.error(`❌ Fehler beim Registrieren der Route ${moduleName}:`, error.message);
        }
      }
    }

    logger.info(`🚀 Route-Registrierung abgeschlossen: ${registeredCount} registriert, ${skippedCount} übersprungen`);
    
    return {
      registered: registeredCount,
      skipped: skippedCount,
      activeModules: Array.from(this.activeModules)
    };
  }

  /**
   * Gibt alle registrierten Module zurück
   */
  getRegisteredModules() {
    return Array.from(this.moduleRoutes.keys());
  }

  /**
   * Aktualisiert den Modulstatus und lädt Module neu
   */
  async refreshModules() {
    await this.loadActiveModules();
    logger.info('🔄 Module-Status aktualisiert');
  }

  /**
   * Gibt die Route-Map zurück (für externe Prüfungen)
   */
  getRouteMap() {
    return this.routeMap;
  }
}

module.exports = new ModuleManager();

