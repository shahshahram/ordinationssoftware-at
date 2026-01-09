const ModuleRegistry = require('../models/ModuleRegistry');
const logger = require('../utils/logger');

/**
 * Middleware zum Prüfen, ob ein Modul aktiv ist
 * Verwendung: router.use(checkModule('module-name'))
 */
const checkModule = (moduleName) => {
  return async (req, res, next) => {
    try {
      const module = await ModuleRegistry.findOne({ moduleName, isActive: true });
      
      if (!module) {
        logger.warn(`Zugriff auf deaktiviertes Modul: ${moduleName} von ${req.ip}`);
        return res.status(503).json({
          success: false,
          message: `Modul '${moduleName}' ist derzeit deaktiviert`,
          code: 'MODULE_DISABLED'
        });
      }
      
      next();
    } catch (error) {
      logger.error(`Fehler beim Prüfen des Modul-Status für ${moduleName}:`, error);
      // Im Fehlerfall erlauben wir den Zugriff (Fail-Open)
      next();
    }
  };
};

/**
 * Middleware-Factory für mehrere Module (OR-Logik)
 * Verwendung: router.use(checkAnyModule(['module1', 'module2']))
 */
const checkAnyModule = (moduleNames) => {
  return async (req, res, next) => {
    try {
      const modules = await ModuleRegistry.find({
        moduleName: { $in: moduleNames },
        isActive: true
      });
      
      if (modules.length === 0) {
        logger.warn(`Zugriff auf deaktivierte Module: ${moduleNames.join(', ')} von ${req.ip}`);
        return res.status(503).json({
          success: false,
          message: `Keines der Module '${moduleNames.join(', ')}' ist derzeit aktiv`,
          code: 'MODULES_DISABLED'
        });
      }
      
      next();
    } catch (error) {
      logger.error(`Fehler beim Prüfen der Modul-Status:`, error);
      next();
    }
  };
};

module.exports = {
  checkModule,
  checkAnyModule
};



