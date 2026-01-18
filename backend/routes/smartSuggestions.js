const express = require('express');
const router = express.Router();
const smartSuggestionService = require('../services/smartSuggestionService');
const authenticate = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route   GET /api/smart-suggestions/patient/:patientId
 * @desc    Generiert intelligente Vorschläge für einen Patienten
 * @access  Private
 */
router.get('/patient/:patientId', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.id;

    logger.info(`[SmartSuggestions] API aufgerufen für patientId: ${patientId}, userId: ${userId}`);

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'Patient-ID ist erforderlich'
      });
    }

    const result = await smartSuggestionService.generateSuggestions(patientId, userId);

    logger.info(`[SmartSuggestions] Vorschläge generiert: success=${result?.success}, suggestions vorhanden=${!!result?.suggestions}`);

    // Wenn result ein Fehler-Objekt ist (hat success: false)
    if (result && result.success === false) {
      logger.error(`[SmartSuggestions] Fehler beim Generieren: ${result.error}`);
      return res.status(500).json(result);
    }

    // result ist bereits {success: true, suggestions: {...}}, also direkt zurückgeben
    logger.info(`[SmartSuggestions] Sende Antwort mit ${Object.keys(result?.suggestions || {}).length} Kategorien`);
    res.json(result);
  } catch (error) {
    logger.error('Fehler beim Generieren von Vorschlägen:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Generieren von Vorschlägen',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
