// API-Routen für intelligente, proaktive Benachrichtigungen

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const smartNotificationService = require('../services/smartNotificationService');
const logger = require('../utils/logger');

// Alle Routen erfordern Authentifizierung
router.use(auth);

/**
 * POST /api/smart-notifications/trigger
 * Löst manuell eine proaktive Benachrichtigungs-Prüfung aus
 * @access Private (nur für Admins/Ärzte)
 */
router.post('/trigger', checkPermission('notifications.manage'), async (req, res) => {
  try {
    logger.info('🔔 Manuelle Auslösung der proaktiven Benachrichtigungs-Prüfung');
    
    // Führe Prüfung asynchron aus (blockiert nicht die Antwort)
    smartNotificationService.checkAndNotify().catch(error => {
      logger.error('Fehler bei manueller Benachrichtigungs-Prüfung:', error);
    });

    res.json({
      success: true,
      message: 'Proaktive Benachrichtigungs-Prüfung wurde gestartet'
    });
  } catch (error) {
    logger.error('Fehler beim Auslösen der Benachrichtigungs-Prüfung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Auslösen der Benachrichtigungs-Prüfung',
      error: error.message
    });
  }
});

/**
 * GET /api/smart-notifications/status
 * Gibt den Status des Smart Notification Services zurück
 * @access Private
 */
router.get('/status', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        isRunning: smartNotificationService.isRunning,
        checkInterval: smartNotificationService.checkInterval ? 'active' : 'inactive'
      }
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen des Service-Status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Service-Status',
      error: error.message
    });
  }
});

module.exports = router;
