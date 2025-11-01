const express = require('express');
const router = express.Router();
const ModuleRegistry = require('../models/ModuleRegistry');
const rbacAutoDiscovery = require('../services/rbacAutoDiscovery');
const { authorize } = require('../utils/rbac');
const { ACTIONS, RESOURCES } = require('../utils/rbac');

/**
 * GET /api/rbac/discovery/status
 * Status des RBAC Auto-Discovery Services
 */
router.get('/status', async (req, res) => {
  try {
    // Temporär ohne Authorization für Testing
    // await authorize(ACTIONS.READ, RESOURCES.SYSTEM)(req, res, () => {});
    
    const status = rbacAutoDiscovery.getStatus();
    const modules = await ModuleRegistry.find({ isActive: true }).sort({ lastUpdated: -1 });
    
    res.json({
      success: true,
      data: {
        service: status,
        modules: modules.map(m => ({
          moduleName: m.moduleName,
          displayName: m.displayName,
          resources: m.resources.length,
          permissions: m.permissions.length,
          lastUpdated: m.lastUpdated
        }))
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Discovery-Status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Discovery-Status',
      error: error.message
    });
  }
});

/**
 * POST /api/rbac/discovery/trigger
 * Manueller Trigger für RBAC-Discovery
 */
router.post('/trigger', async (req, res) => {
  try {
    await rbacAutoDiscovery.triggerDiscovery();
    
    res.json({
      success: true,
      message: 'RBAC-Discovery erfolgreich ausgelöst'
    });
  } catch (error) {
    console.error('Fehler beim Auslösen des Discovery:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Auslösen des Discovery',
      error: error.message
    });
  }
});

/**
 * GET /api/rbac/discovery/modules
 * Alle registrierten Module abrufen
 */
router.get('/modules', async (req, res) => {
  try {
    const modules = await ModuleRegistry.find({ isActive: true }).sort({ moduleName: 1 });
    
    res.json({
      success: true,
      data: modules
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Module:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Module',
      error: error.message
    });
  }
});

/**
 * GET /api/rbac/discovery/modules/:moduleName
 * Spezifisches Modul abrufen
 */
router.get('/modules/:moduleName', async (req, res) => {
  try {
    const module = await ModuleRegistry.findOne({ 
      moduleName: req.params.moduleName,
      isActive: true 
    });
    
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Modul nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: module
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Moduls:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Moduls',
      error: error.message
    });
  }
});

/**
 * POST /api/rbac/discovery/modules/:moduleName/sync
 * Modul manuell synchronisieren
 */
router.post('/modules/:moduleName/sync', async (req, res) => {
  try {
    const moduleName = req.params.moduleName;
    
    // Führe Discovery nur für dieses Modul durch
    const discoveredModules = await ModuleRegistry.discoverModules();
    const module = discoveredModules.find(m => m.moduleName === moduleName);
    
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Modul nicht in Discovery gefunden'
      });
    }
    
    // Aktualisiere das Modul
    const updatedModule = await ModuleRegistry.findOneAndUpdate(
      { moduleName: moduleName },
      {
        ...module,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );
    
    // Füge Permissions zu Rollen hinzu
    await rbacAutoDiscovery.addPermissionsToRoles(module);
    
    res.json({
      success: true,
      message: `Modul ${moduleName} erfolgreich synchronisiert`,
      data: updatedModule
    });
  } catch (error) {
    console.error('Fehler beim Synchronisieren des Moduls:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Synchronisieren des Moduls',
      error: error.message
    });
  }
});

/**
 * GET /api/rbac/discovery/permissions
 * Alle verfügbaren Permissions abrufen
 */
router.get('/permissions', async (req, res) => {
  try {
    const modules = await ModuleRegistry.find({ isActive: true });
    const allPermissions = [];
    
    for (const module of modules) {
      allPermissions.push(...module.permissions.map(p => ({
        ...p.toObject(),
        module: module.moduleName
      })));
    }
    
    // Gruppiere nach Ressource
    const groupedPermissions = allPermissions.reduce((acc, permission) => {
      const resource = permission.resource;
      if (!acc[resource]) {
        acc[resource] = [];
      }
      acc[resource].push(permission);
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: {
        permissions: allPermissions,
        grouped: groupedPermissions,
        total: allPermissions.length
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Permissions',
      error: error.message
    });
  }
});

/**
 * POST /api/rbac/discovery/start
 * RBAC Auto-Discovery Service starten
 */
router.post('/start', async (req, res) => {
  try {
    await rbacAutoDiscovery.start();
    
    res.json({
      success: true,
      message: 'RBAC Auto-Discovery Service gestartet'
    });
  } catch (error) {
    console.error('Fehler beim Starten des Discovery-Services:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Starten des Discovery-Services',
      error: error.message
    });
  }
});

/**
 * POST /api/rbac/discovery/stop
 * RBAC Auto-Discovery Service stoppen
 */
router.post('/stop', async (req, res) => {
  try {
    rbacAutoDiscovery.stop();
    
    res.json({
      success: true,
      message: 'RBAC Auto-Discovery Service gestoppt'
    });
  } catch (error) {
    console.error('Fehler beim Stoppen des Discovery-Services:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Stoppen des Discovery-Services',
      error: error.message
    });
  }
});

module.exports = router;
