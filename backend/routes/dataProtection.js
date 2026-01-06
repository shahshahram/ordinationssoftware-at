/**
 * Data Protection API Routes
 * Endpoints für Datenschutz-Compliance (DSGVO)
 */

const express = require('express');
const router = express.Router();
const DataRetentionService = require('../services/dataRetentionService');
const DataBreachService = require('../services/dataBreachService');
const auth = require('../middleware/auth');
const { rbacMiddleware } = require('../middleware/rbac');
const logger = require('../utils/logger');

/**
 * @route   POST /api/data-protection/cleanup
 * @desc    Führt manuelle Datenbereinigung durch
 * @access  Private (Admin)
 */
router.post('/cleanup', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const result = await DataRetentionService.runCleanup();
    
    res.json({
      success: true,
      message: 'Datenbereinigung erfolgreich durchgeführt',
      data: result
    });
  } catch (error) {
    logger.error('Fehler bei der Datenbereinigung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Datenbereinigung',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/data-protection/compliance
 * @desc    Prüft Compliance mit Aufbewahrungsfristen
 * @access  Private (Admin)
 */
router.get('/compliance', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const compliance = await DataRetentionService.checkCompliance();
    
    res.json({
      success: true,
      data: compliance
    });
  } catch (error) {
    logger.error('Fehler bei der Compliance-Prüfung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Compliance-Prüfung',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/data-protection/breach/detect
 * @desc    Führt manuelle Datenpannen-Erkennung durch
 * @access  Private (Admin)
 */
router.post('/breach/detect', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    const detection = await DataBreachService.detectDataBreaches(
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );
    
    res.json({
      success: true,
      data: detection
    });
  } catch (error) {
    logger.error('Fehler bei der Datenpannen-Erkennung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Datenpannen-Erkennung',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/data-protection/breach/report
 * @desc    Meldet eine Datenpanne an die Aufsichtsbehörde
 * @access  Private (Super Admin)
 */
router.post('/breach/report', auth, rbacMiddleware.requireSuperAdmin, async (req, res) => {
  try {
    const { breach } = req.body;
    
    if (!breach || !breach.type) {
      return res.status(400).json({
        success: false,
        message: 'Breach-Daten erforderlich'
      });
    }
    
    const report = await DataBreachService.reportToAuthority(breach);
    
    res.json({
      success: true,
      message: 'Datenpanne erfolgreich gemeldet',
      data: report
    });
  } catch (error) {
    logger.error('Fehler bei der Datenpannen-Meldung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Datenpannen-Meldung',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/data-protection/breach/notify
 * @desc    Benachrichtigt betroffene Personen über eine Datenpanne
 * @access  Private (Super Admin)
 */
router.post('/breach/notify', auth, rbacMiddleware.requireSuperAdmin, async (req, res) => {
  try {
    const { breach, affectedUserIds } = req.body;
    
    if (!breach || !affectedUserIds || !Array.isArray(affectedUserIds)) {
      return res.status(400).json({
        success: false,
        message: 'Breach und affectedUserIds erforderlich'
      });
    }
    
    await DataBreachService.notifyAffectedPersons(breach, affectedUserIds);
    
    res.json({
      success: true,
      message: `${affectedUserIds.length} betroffene Personen benachrichtigt`
    });
  } catch (error) {
    logger.error('Fehler bei der Benachrichtigung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Benachrichtigung',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/data-protection/retention-periods
 * @desc    Gibt die konfigurierten Aufbewahrungsfristen zurück
 * @access  Private (Admin)
 */
router.get('/retention-periods', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        retentionPeriods: DataRetentionService.RETENTION_PERIODS,
        description: {
          MEDICAL_DATA: 'Medizinische Daten (ArztG § 51)',
          BILLING_DATA: 'Abrechnungsdaten (UGB § 212)',
          AUDIT_LOGS: 'Audit-Logs (Standard)',
          USER_DATA: 'Benutzerdaten (nach Deaktivierung)',
          ANONYMIZED_DATA: 'Anonymisierte Daten (sofort löschbar)'
        }
      }
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Aufbewahrungsfristen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Aufbewahrungsfristen',
      error: error.message
    });
  }
});

module.exports = router;








