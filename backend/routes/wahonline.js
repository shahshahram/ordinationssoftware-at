// WAHonline Routes - Elektronische Meldung von Wahlarzt-Leistungen

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const wahonlineConnector = require('../services/connectors/wahonlineConnector');
const wahonlineConfig = require('../config/wahonline.config');
const wahonlineFormatGenerator = require('../services/wahonlineFormatGenerator');
const { body, param, validationResult } = require('express-validator');
const Performance = require('../models/Performance');
const PatientExtended = require('../models/PatientExtended');
const User = require('../models/User');

/**
 * @route   GET /api/wahonline/status
 * @desc    WAHonline-Systemstatus prüfen
 * @access  Private
 */
router.get('/status', auth, checkPermission('settings.read'), async (req, res) => {
  try {
    const config = wahonlineConfig.getActiveConfig();
    const validation = wahonlineConfig.validate();
    
    res.json({
      success: true,
      data: {
        configured: validation.valid,
        environment: config.environment,
        api: {
          enabled: config.api.enabled,
          baseUrl: config.api.baseUrl,
          hasApiKey: !!config.apiKey,
          hasChamberNumber: !!config.chamberNumber,
          hasDoctorNumber: !!config.doctorNumber,
          hasCertificates: wahonlineConfig.hasCertificates()
        },
        errors: validation.errors
      }
    });
  } catch (error) {
    console.error('Error checking WAHonline status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Prüfen des WAHonline-Status',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/wahonline/test-connection
 * @desc    Testet WAHonline-Verbindung
 * @access  Private
 */
router.post('/test-connection', auth, checkPermission('settings.read'), async (req, res) => {
  try {
    const { environment } = req.body; // Optional: Umgebung überschreiben
    
    const result = await wahonlineConnector.testConnection(environment);
    
    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Error testing WAHonline connection:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Testen der WAHonline-Verbindung',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/wahonline/send
 * @desc    Sendet eine Wahlarzt-Meldung an WAHonline
 * @access  Private
 */
router.post('/send', auth, checkPermission('billing.write'), [
  body('performanceId').optional().isMongoId(),
  body('payload').optional().isObject(),
  body('autoFormat').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }
    
    const { performanceId, payload, autoFormat = true } = req.body;
    
    let meldungPayload = payload;
    
    // Wenn performanceId angegeben, lade Daten aus Datenbank
    if (performanceId && !payload) {
      const performance = await Performance.findById(performanceId);
      
      if (!performance) {
        return res.status(404).json({
          success: false,
          message: 'Leistung nicht gefunden'
        });
      }
      
      // Extrahiere IDs (können Objekte oder Strings sein)
      const patientId = performance.patientId?._id || performance.patientId;
      const doctorId = performance.doctorId?._id || performance.doctorId || req.user._id;
      
      const patient = await PatientExtended.findById(patientId);
      const doctor = await User.findById(doctorId).select('+profile');
      
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient nicht gefunden'
        });
      }
      
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Arzt nicht gefunden'
        });
      }
      
      meldungPayload = {
        performance,
        patient,
        doctor
      };
    }
    
    if (!meldungPayload) {
      return res.status(400).json({
        success: false,
        message: 'payload oder performanceId erforderlich'
      });
    }
    
    // Generiere Idempotency-Key
    const idempotencyKey = `wahonline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Sende Meldung
    const result = await wahonlineConnector.send(meldungPayload, idempotencyKey, autoFormat);
    
    res.json({
      success: true,
      message: 'Meldung erfolgreich an WAHonline übermittelt',
      data: result
    });
  } catch (error) {
    console.error('Error sending WAHonline meldung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Senden der WAHonline-Meldung',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/wahonline/send-batch
 * @desc    Sendet eine Batch-Meldung (mehrere Leistungen) an WAHonline
 * @access  Private
 */
router.post('/send-batch', auth, checkPermission('billing.write'), [
  body('performanceIds').isArray().withMessage('performanceIds muss ein Array sein'),
  body('performanceIds.*').isMongoId().withMessage('Ungültige Performance-ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }
    
    const { performanceIds } = req.body;
    
    // Lade alle Leistungen
    const performances = await Performance.find({ _id: { $in: performanceIds } })
      .populate('patientId', 'firstName lastName socialSecurityNumber dateOfBirth gender address')
      .populate('doctorId', 'profile');
    
    if (performances.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Keine Leistungen gefunden'
      });
    }
    
    // Lade Patienten und Ärzte
    const performancesWithData = await Promise.all(
      performances.map(async (performance) => {
        const patient = await PatientExtended.findById(performance.patientId);
        const doctor = await User.findById(performance.doctorId || req.user._id).select('+profile');
        
        if (!patient || !doctor) {
          throw new Error(`Patient oder Arzt für Leistung ${performance._id} nicht gefunden`);
        }
        
        return {
          performance,
          patient,
          doctor
        };
      })
    );
    
    // Generiere Batch-ID
    const batchId = `wahonline_batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Sende Batch-Meldung
    const result = await wahonlineConnector.sendBatch(performancesWithData, batchId);
    
    res.json({
      success: true,
      message: `Batch-Meldung mit ${performancesWithData.length} Leistungen erfolgreich übermittelt`,
      data: result
    });
  } catch (error) {
    console.error('Error sending WAHonline batch:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Senden der WAHonline-Batch-Meldung',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/wahonline/status/:referenceNumber
 * @desc    Ruft den Status einer Meldung ab
 * @access  Private
 */
router.get('/status/:referenceNumber', auth, checkPermission('billing.read'), [
  param('referenceNumber').notEmpty().withMessage('Referenznummer erforderlich')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }
    
    const { referenceNumber } = req.params;
    
    const result = await wahonlineConnector.getStatus(referenceNumber);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting WAHonline status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des WAHonline-Status',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/wahonline/format
 * @desc    Generiert WAHonline-Format für Testzwecke
 * @access  Private
 */
router.post('/format', auth, checkPermission('settings.read'), [
  body('performanceId').optional().isMongoId(),
  body('data').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }
    
    const { performanceId, data } = req.body;
    
    let formatData = data;
    
    // Wenn performanceId angegeben, lade Daten aus Datenbank
    if (performanceId && !data) {
      const performance = await Performance.findById(performanceId);
      
      if (!performance) {
        return res.status(404).json({
          success: false,
          message: 'Leistung nicht gefunden'
        });
      }
      
      // Extrahiere IDs (können Objekte oder Strings sein)
      const patientId = performance.patientId?._id || performance.patientId;
      const doctorId = performance.doctorId?._id || performance.doctorId || req.user._id;
      
      const patient = await PatientExtended.findById(patientId);
      const doctor = await User.findById(doctorId).select('+profile');
      
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient nicht gefunden'
        });
      }
      
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Arzt nicht gefunden'
        });
      }
      
      formatData = {
        performance,
        patient,
        doctor
      };
    }
    
    if (!formatData) {
      return res.status(400).json({
        success: false,
        message: 'data oder performanceId erforderlich'
      });
    }
    
    // Generiere Format
    try {
      const formatted = wahonlineFormatGenerator.generateMeldung(formatData);
      
      res.json({
        success: true,
        data: formatted
      });
    } catch (formatError) {
      console.error('Error in generateMeldung:', formatError);
      console.error('FormatData:', JSON.stringify(formatData, null, 2));
      throw formatError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('Error generating WAHonline format:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren des WAHonline-Formats',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;

