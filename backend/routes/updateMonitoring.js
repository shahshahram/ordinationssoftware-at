const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const AuditLog = require('../models/AuditLog');
const serviceCatalogUpdateService = require('../services/serviceCatalogUpdateService');
const tariffUpdateService = require('../services/tariffUpdateService');
const cron = require('node-cron');

/**
 * GET /api/update-monitoring/status
 * Gibt den Status aller Update-Services zurück
 */
router.get('/status', auth, checkPermission('settings.read'), async (req, res) => {
  try {
    const now = new Date();
    
    // Berechne nächste Ausführungszeiten
    const getNextExecution = (schedule) => {
      if (!schedule) return null;
      
      // Parse cron schedule (z.B. "0 2 1 1 *" = 1. Januar, 2:00 Uhr)
      const parts = schedule.split(' ');
      if (parts.length !== 5) return null;
      
      const [minute, hour, day, month, weekday] = parts;
      
      // Für jährliche Updates (1. Januar)
      if (month === '1' && day === '1') {
        const nextYear = new Date(now.getFullYear() + 1, 0, 1, parseInt(hour), parseInt(minute));
        return nextYear;
      }
      
      // Für monatliche Updates (1. des Monats)
      if (day === '1' && month === '*') {
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, parseInt(hour), parseInt(minute));
        return nextMonth;
      }
      
      // Für wöchentliche Updates (Montag)
      if (weekday === '1' && month === '*' && day === '*') {
        const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
        const nextMonday = new Date(now);
        nextMonday.setDate(now.getDate() + daysUntilMonday);
        nextMonday.setHours(parseInt(hour), parseInt(minute), 0, 0);
        return nextMonday;
      }
      
      return null;
    };

    // 1. Jährliches Service-Katalog Update
    const annualUpdateLog = await AuditLog.findOne({
      action: 'SERVICE_CATALOG_ANNUAL_UPDATE'
    }).sort({ timestamp: -1 });

    const annualUpdateStatus = {
      name: 'Jährliches Service-Katalog Update',
      description: 'Aktualisiert den gesamten Leistungskatalog (neue Leistungen, Preise, EBM-Codes)',
      schedule: '0 2 1 1 *', // 1. Januar, 2:00 Uhr
      scheduleDescription: 'Jährlich am 1. Januar um 2:00 Uhr',
      nextExecution: getNextExecution('0 2 1 1 *'),
      lastExecution: annualUpdateLog?.timestamp || null,
      lastStatus: annualUpdateLog?.changes?.details?.errors?.length > 0 ? 'error' : 
                  annualUpdateLog ? 'success' : 'unknown',
      isRunning: false,
      canTrigger: true,
      triggerEndpoint: '/api/service-catalog/trigger-update'
    };

    // 2. Wöchentliche ServiceCatalog-Preis-Updates
    const weeklyUpdateLogs = await AuditLog.find({
      action: { $in: ['SERVICE_CATALOG_UPDATE', 'SERVICE_CATALOG_PRICE_UPDATE'] }
    }).sort({ timestamp: -1 }).limit(1);

    const weeklyUpdateStatus = {
      name: 'Wöchentliche Preis-Updates',
      description: 'Synchronisiert EBM- und GOÄ-Preise aus der Tarifdatenbank',
      schedule: '0 4 * * 1', // Montags, 4:00 Uhr
      scheduleDescription: 'Wöchentlich montags um 4:00 Uhr',
      nextExecution: getNextExecution('0 4 * * 1'),
      lastExecution: weeklyUpdateLogs[0]?.timestamp || null,
      lastStatus: weeklyUpdateLogs[0] ? 'success' : 'unknown',
      isRunning: serviceCatalogUpdateService.isRunning || false,
      canTrigger: true,
      triggerEndpoint: '/api/service-catalog/trigger-price-update'
    };

    // 3. Monatliche Tarif-Updates (EBM/KHO/GOÄ)
    const tariffUpdateLogs = await AuditLog.find({
      action: { $in: ['TARIFF_UPDATE', 'TARIFF_DOWNLOAD', 'EBM_UPDATE', 'KHO_UPDATE', 'GOAE_UPDATE'] }
    }).sort({ timestamp: -1 }).limit(1);

    const tariffStatus = tariffUpdateService.getStatus();
    
    const tariffUpdateStatus = {
      name: 'Monatliche Tarif-Updates',
      description: 'Lädt aktuelle EBM-, KHO- und GOÄ-Tarifdatenbanken von der ÖGK herunter',
      schedule: '0 5 1 * *', // 1. des Monats, 5:00 Uhr
      scheduleDescription: 'Monatlich am 1. des Monats um 5:00 Uhr',
      nextExecution: getNextExecution('0 5 1 * *'),
      lastExecution: tariffStatus.lastUpdate || tariffUpdateLogs[0]?.timestamp || null,
      lastCheck: tariffStatus.lastCheck || null,
      lastStatus: tariffUpdateLogs[0] ? 'success' : 'unknown',
      isRunning: tariffStatus.isRunning || false,
      canTrigger: true,
      triggerEndpoint: '/api/tariff-update/trigger',
      sources: {
        ebm: {
          name: 'EBM (Einheitlicher Bewertungsmaßstab)',
          url: process.env.OGK_EBM_XML_URL || 'https://www.gesundheitskasse.at/cdscontent/load?contentid=10007.850240'
        },
        kho: {
          name: 'KHO (Kassenhonorarordnung)',
          url: process.env.OGK_KHO_XML_URL || 'https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.784932'
        },
        goae: {
          name: 'GOÄ (Gebührenordnung für Ärzte)',
          url: process.env.OGK_GOAE_XML_URL || 'https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.1234569'
        }
      }
    };

    // 4. Kategorien-Update (automatisch beim jährlichen Update)
    const categoryUpdateLog = await AuditLog.findOne({
      action: 'SERVICE_CATALOG_ANNUAL_UPDATE',
      'changes.details.newCategoriesCount': { $exists: true }
    }).sort({ timestamp: -1 });

    const categoryUpdateStatus = {
      name: 'Kategorien-Update',
      description: 'Erstellt automatisch fehlende Service-Kategorien aus dem Leistungskatalog',
      schedule: 'Automatisch beim jährlichen Update',
      scheduleDescription: 'Wird automatisch beim jährlichen Update ausgeführt',
      nextExecution: annualUpdateStatus.nextExecution,
      lastExecution: categoryUpdateLog?.timestamp || null,
      lastStatus: categoryUpdateLog ? 'success' : 'unknown',
      isRunning: false,
      canTrigger: false
    };

    res.json({
      success: true,
      data: {
        services: [
          annualUpdateStatus,
          weeklyUpdateStatus,
          tariffUpdateStatus,
          categoryUpdateStatus
        ],
        lastUpdated: now
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Update-Status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Update-Status',
      error: error.message
    });
  }
});

/**
 * POST /api/update-monitoring/trigger/:serviceType
 * Löst manuell ein Update aus
 */
router.post('/trigger/:serviceType', auth, checkPermission('settings.write'), async (req, res) => {
  try {
    const { serviceType } = req.params;
    const userId = req.user.id;

    let result;
    let message;

    switch (serviceType) {
      case 'annual':
        const { updateServiceCatalog } = require('../scripts/update-service-catalog-annual');
        // Führe asynchron aus
        updateServiceCatalog()
          .then(() => {
            console.log('Manuelles jährliches Update erfolgreich abgeschlossen');
          })
          .catch((error) => {
            console.error('Manuelles jährliches Update fehlgeschlagen:', error);
          });
        message = 'Jährliches Update wurde gestartet';
        result = { success: true, message };
        break;

      case 'weekly':
        // Führe asynchron aus
        serviceCatalogUpdateService.updateAll()
          .then((updateResult) => {
            console.log('Manuelles wöchentliches Update erfolgreich abgeschlossen:', updateResult);
          })
          .catch((error) => {
            console.error('Manuelles wöchentliches Update fehlgeschlagen:', error);
          });
        message = 'Wöchentliches Preis-Update wurde gestartet';
        result = { success: true, message };
        break;

      case 'tariff':
        result = await tariffUpdateService.manualUpdate(userId);
        message = 'Tarif-Update wurde gestartet';
        break;

      default:
        return res.status(400).json({
          success: false,
          message: `Unbekannter Service-Typ: ${serviceType}`
        });
    }

    res.json({
      success: true,
      message,
      data: result
    });
  } catch (error) {
    console.error('Fehler beim Auslösen des Updates:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Auslösen des Updates',
      error: error.message
    });
  }
});

module.exports = router;

