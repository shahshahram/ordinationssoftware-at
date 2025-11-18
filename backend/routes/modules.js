const express = require('express');
const router = express.Router();
const ModuleRegistry = require('../models/ModuleRegistry');
const moduleManager = require('../services/moduleManager');
const { authorize } = require('../utils/rbac');
const { ACTIONS, RESOURCES } = require('../utils/rbac');
const logger = require('../utils/logger');

/**
 * GET /api/modules
 * Gibt alle Module mit ihrem Status zurück
 */
router.get('/', async (req, res) => {
  try {
    const modules = await ModuleRegistry.find().sort({ moduleName: 1 });
    
    const modulesWithStatus = modules.map(module => ({
      _id: module._id,
      moduleName: module.moduleName,
      displayName: module.displayName,
      description: module.description,
      version: module.version,
      isActive: module.isActive,
      isRegistered: moduleManager.isModuleActive(module.moduleName),
      resourcesCount: module.resources.length,
      permissionsCount: module.permissions.length,
      lastUpdated: module.lastUpdated,
      createdAt: module.createdAt
    }));

    res.json({
      success: true,
      data: modulesWithStatus,
      count: modulesWithStatus.length
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Module:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Module',
      error: error.message
    });
  }
});

/**
 * GET /api/modules/:moduleName
 * Gibt Details eines bestimmten Moduls zurück
 */
router.get('/:moduleName', async (req, res) => {
  try {
    const { moduleName } = req.params;
    const module = await ModuleRegistry.findOne({ moduleName });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: `Modul '${moduleName}' nicht gefunden`
      });
    }

    res.json({
      success: true,
      data: {
        ...module.toObject(),
        isRegistered: moduleManager.isModuleActive(moduleName)
      }
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen des Moduls ${req.params.moduleName}:`, error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Moduls',
      error: error.message
    });
  }
});

/**
 * PATCH /api/modules/:moduleName/toggle
 * Aktiviert oder deaktiviert ein Modul
 */
router.patch('/:moduleName/toggle', async (req, res) => {
  try {
    // Authorization prüfen - nur Admins können Module aktivieren/deaktivieren
    // await authorize(ACTIONS.UPDATE, RESOURCES.SYSTEM)(req, res, () => {});

    const { moduleName } = req.params;
    const { isActive } = req.body;

    const module = await ModuleRegistry.findOne({ moduleName });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: `Modul '${moduleName}' nicht gefunden`
      });
    }

    // Prüfen, ob Modul required ist
    const routeConfig = moduleManager.getRouteMap()[moduleName];
    if (routeConfig && routeConfig.required && isActive === false) {
      return res.status(400).json({
        success: false,
        message: `Modul '${moduleName}' ist ein Pflichtmodul und kann nicht deaktiviert werden`
      });
    }

    module.isActive = isActive !== undefined ? isActive : !module.isActive;
    module.lastUpdated = new Date();
    await module.save();

    // Module-Status im ModuleManager aktualisieren
    await moduleManager.refreshModules();

    logger.info(`Modul ${moduleName} wurde ${module.isActive ? 'aktiviert' : 'deaktiviert'}`);

    res.json({
      success: true,
      message: `Modul '${moduleName}' wurde ${module.isActive ? 'aktiviert' : 'deaktiviert'}`,
      data: {
        moduleName: module.moduleName,
        displayName: module.displayName,
        isActive: module.isActive,
        note: module.isActive 
          ? 'Änderung wird nach Server-Neustart wirksam'
          : 'Änderung wird nach Server-Neustart wirksam'
      }
    });
  } catch (error) {
    logger.error(`Fehler beim Aktivieren/Deaktivieren des Moduls ${req.params.moduleName}:`, error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktivieren/Deaktivieren des Moduls',
      error: error.message
    });
  }
});

/**
 * GET /api/modules/status/summary
 * Gibt eine Zusammenfassung der Modul-Status zurück
 */
router.get('/status/summary', async (req, res) => {
  try {
    const allModules = await ModuleRegistry.find();
    const activeModules = await ModuleRegistry.find({ isActive: true });
    const inactiveModules = await ModuleRegistry.find({ isActive: false });

    const registeredModules = moduleManager.getRegisteredModules();

    res.json({
      success: true,
      data: {
        total: allModules.length,
        active: activeModules.length,
        inactive: inactiveModules.length,
        registered: registeredModules.length,
        modules: {
          active: activeModules.map(m => m.moduleName),
          inactive: inactiveModules.map(m => m.moduleName),
          registered: registeredModules
        }
      }
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Modul-Status-Zusammenfassung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Modul-Status-Zusammenfassung',
      error: error.message
    });
  }
});

module.exports = router;

