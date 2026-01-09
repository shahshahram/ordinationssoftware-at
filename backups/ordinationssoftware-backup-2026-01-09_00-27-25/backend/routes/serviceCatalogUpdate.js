const express = require('express');
const router = express.Router();
const ServiceCatalog = require('../models/ServiceCatalog');
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

// GET /api/service-catalog/update-status - Update-Status abrufen
router.get('/update-status', auth, checkPermission('services.read'), async (req, res) => {
  try {
    // Hole letzte Update-Informationen aus Audit Log
    const lastUpdate = await AuditLog.findOne({
      action: 'SERVICE_CATALOG_ANNUAL_UPDATE'
    }).sort({ timestamp: -1 });

    // Berechne nächstes Update (1. Januar des nächsten Jahres)
    const currentYear = new Date().getFullYear();
    const nextUpdate = new Date(currentYear + 1, 0, 1); // 1. Januar des nächsten Jahres

    // Hole Statistiken
    const totalServices = await ServiceCatalog.countDocuments();
    const activeServices = await ServiceCatalog.countDocuments({ is_active: true });
    
    // Hole Updates des aktuellen Jahres
    const currentYearStart = new Date(currentYear, 0, 1);
    const currentYearUpdates = await AuditLog.find({
      action: 'SERVICE_CATALOG_ANNUAL_UPDATE',
      timestamp: { $gte: currentYearStart }
    }).sort({ timestamp: -1 });

    // Berechne Statistiken für das aktuelle Jahr
    let newServicesThisYear = 0;
    let deprecatedServicesThisYear = 0;
    let priceAdjustmentsThisYear = 0;

    currentYearUpdates.forEach(update => {
      if (update.changes && update.changes.details) {
        newServicesThisYear += update.changes.details.newServices || 0;
        deprecatedServicesThisYear += update.changes.details.deprecatedServices || 0;
        priceAdjustmentsThisYear += update.changes.details.updatedPrices || 0;
      }
    });

    // Hole letzte Updates für die Historie
    const recentUpdates = await AuditLog.find({
      action: 'SERVICE_CATALOG_ANNUAL_UPDATE'
    })
    .sort({ timestamp: -1 })
    .limit(10)
    .select('timestamp changes.metadata');

    const formattedRecentUpdates = recentUpdates.map(update => ({
      date: update.timestamp,
      type: 'price', // Vereinfacht - könnte erweitert werden
      description: `Update ${update.timestamp.getFullYear()}`,
      count: update.changes?.details?.newServices || 0
    }));

    // Bestimme Status
    let status = 'never';
    if (lastUpdate) {
      const lastUpdateYear = lastUpdate.timestamp.getFullYear();
      const currentYear = new Date().getFullYear();
      
      if (lastUpdateYear === currentYear) {
        status = 'success';
      } else if (lastUpdateYear < currentYear) {
        status = 'pending';
      }
    }

    const updateStatus = {
      lastUpdate: lastUpdate ? lastUpdate.timestamp.toISOString() : null,
      nextUpdate: nextUpdate.toISOString(),
      status,
      statistics: {
        totalServices,
        activeServices,
        newServicesThisYear,
        deprecatedServicesThisYear,
        priceAdjustmentsThisYear
      },
      recentUpdates: formattedRecentUpdates
    };

    res.json(updateStatus);

  } catch (error) {
    console.error('Fehler beim Laden der Update-Status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Update-Status',
      error: error.message
    });
  }
});

// POST /api/service-catalog/trigger-update - Manuelles Update auslösen
router.post('/trigger-update', auth, checkPermission('services.write'), async (req, res) => {
  try {
    // Prüfe ob bereits ein Update läuft
    const runningUpdate = await AuditLog.findOne({
      action: 'SERVICE_CATALOG_ANNUAL_UPDATE',
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Letzte 24 Stunden
    });

    if (runningUpdate) {
      return res.status(400).json({
        success: false,
        message: 'Ein Update wurde bereits in den letzten 24 Stunden durchgeführt'
      });
    }

    // Starte Update-Prozess (asynchron)
    const { updateServiceCatalog } = require('../scripts/update-service-catalog-annual');
    
    // Führe Update in Hintergrund aus
    updateServiceCatalog()
      .then(() => {
        console.log('Manuelles Service-Katalog Update erfolgreich abgeschlossen');
      })
      .catch((error) => {
        console.error('Manuelles Service-Katalog Update fehlgeschlagen:', error);
      });

    res.json({
      success: true,
      message: 'Service-Katalog Update wurde gestartet'
    });

  } catch (error) {
    console.error('Fehler beim Starten des Updates:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Starten des Updates',
      error: error.message
    });
  }
});

// GET /api/service-catalog/update-history - Update-Historie abrufen
router.get('/update-history', auth, checkPermission('services.read'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const updates = await AuditLog.find({
      action: 'SERVICE_CATALOG_ANNUAL_UPDATE'
    })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select('timestamp changes performedBy metadata');

    const total = await AuditLog.countDocuments({
      action: 'SERVICE_CATALOG_ANNUAL_UPDATE'
    });

    res.json({
      success: true,
      data: updates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Fehler beim Laden der Update-Historie:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Update-Historie',
      error: error.message
    });
  }
});

module.exports = router;






