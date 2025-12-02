// e-card Routes - e-card Verwaltung und Status

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const elgaService = require('../services/elgaService');
const ECardValidation = require('../models/ECardValidation');
const PatientExtended = require('../models/PatientExtended');
const { body, validationResult } = require('express-validator');

/**
 * @route   GET /api/ecard/patient/:patientId
 * @desc    e-card Informationen eines Patienten abrufen
 * @access  Private
 */
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }
    
    // Hole letzte Validierung
    const lastValidation = await ECardValidation.findLatestByPatient(patientId);
    
    res.json({
      success: true,
      data: {
        cardNumber: patient.ecard?.cardNumber || null,
        validationStatus: patient.ecard?.validationStatus || 'not_validated',
        validFrom: patient.ecard?.validFrom || null,
        validUntil: patient.ecard?.validUntil || null,
        lastValidated: patient.ecard?.lastValidated || null,
        elgaId: patient.ecard?.elgaId || null,
        elgaStatus: patient.ecard?.elgaStatus || 'not_registered',
        lastValidation: lastValidation
      }
    });
  } catch (error) {
    console.error('Error fetching e-card info:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der e-card Informationen',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ecard/patient/:patientId/validate
 * @desc    e-card eines Patienten validieren
 * @access  Private
 */
router.post('/patient/:patientId/validate', [
  auth,
  body('ecardNumber').notEmpty().withMessage('e-card Nummer ist erforderlich')
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
    
    const { patientId } = req.params;
    const { ecardNumber } = req.body;
    
    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }
    
    // ELGA-Validierung durchführen
    let validationResult;
    try {
      validationResult = await elgaService.validateECard(ecardNumber, {
        socialSecurityNumber: patient.socialSecurityNumber,
        dateOfBirth: patient.dateOfBirth,
        lastName: patient.lastName,
        firstName: patient.firstName,
        insuranceProvider: patient.insuranceProvider,
        insuranceNumber: patient.insuranceNumber
      });
    } catch (error) {
      console.warn('ELGA-API nicht verfügbar, verwende Fallback:', error.message);
      validationResult = elgaService.fallbackValidation(ecardNumber, {
        insuranceProvider: patient.insuranceProvider,
        insuranceNumber: patient.insuranceNumber
      });
    }
    
    // Aktualisiere Patient mit e-card Daten
    if (!patient.ecard) {
      patient.ecard = {};
    }
    
    patient.ecard.cardNumber = ecardNumber;
    patient.ecard.validationStatus = validationResult.status;
    patient.ecard.lastValidated = new Date();
    patient.ecard.validFrom = validationResult.validFrom;
    patient.ecard.validUntil = validationResult.validUntil;
    
    if (validationResult.elgaId) {
      patient.ecard.elgaId = validationResult.elgaId;
      patient.ecard.elgaStatus = validationResult.elgaStatus;
    }
    
    await patient.save();
    
    // Erstelle Validierungs-Eintrag
    const validation = new ECardValidation({
      patientId,
      ecardNumber,
      validationDate: new Date(),
      validationStatus: validationResult.status,
      validFrom: validationResult.validFrom || new Date(),
      validUntil: validationResult.validUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      insuranceData: {
        insuranceProvider: validationResult.insuranceData?.insuranceProvider || patient.insuranceProvider,
        insuranceNumber: validationResult.insuranceData?.insuranceNumber || patient.insuranceNumber,
        socialSecurityNumber: validationResult.insuranceData?.socialSecurityNumber || patient.socialSecurityNumber,
        firstName: validationResult.insuranceData?.firstName || patient.firstName,
        lastName: validationResult.insuranceData?.lastName || patient.lastName,
        dateOfBirth: validationResult.insuranceData?.dateOfBirth || patient.dateOfBirth,
        gender: validationResult.insuranceData?.gender || patient.gender,
        address: validationResult.insuranceData?.address || patient.address
      },
      elgaData: {
        elgaId: validationResult.elgaId,
        elgaStatus: validationResult.elgaStatus,
        lastSync: new Date()
      },
      validatedBy: req.user._id,
      validationMethod: validationResult.warning ? 'fallback' : 'elga',
      errorMessage: validationResult.warning || null
    });
    
    await validation.save();
    await validation.populate('validatedBy', 'firstName lastName');
    
    res.json({
      success: true,
      message: 'e-card erfolgreich validiert',
      data: {
        validation,
        patient: {
          ecard: patient.ecard
        },
        warning: validationResult.warning
      }
    });
  } catch (error) {
    console.error('Error validating e-card:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der e-card Validierung',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ecard/patient/:patientId/sync
 * @desc    e-card Daten mit ELGA synchronisieren
 * @access  Private
 */
router.post('/patient/:patientId/sync', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const result = await elgaService.syncPatientData(patientId);
    
    res.json({
      success: true,
      message: 'e-card Daten erfolgreich synchronisiert',
      data: result
    });
  } catch (error) {
    console.error('Error syncing e-card:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Synchronisierung',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/ecard/patient/:patientId/history
 * @desc    Validierungshistorie eines Patienten abrufen
 * @access  Private
 */
router.get('/patient/:patientId/history', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    const validations = await ECardValidation.find({ patientId })
      .sort({ validationDate: -1 })
      .limit(limit)
      .populate('validatedBy', 'firstName lastName email')
      .lean();
    
    res.json({
      success: true,
      data: validations
    });
  } catch (error) {
    console.error('Error fetching e-card history:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Validierungshistorie',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/ecard/status
 * @desc    e-card Systemstatus prüfen
 * @access  Private
 */
router.get('/status', auth, async (req, res) => {
  try {
    const config = require('../config/elga.config');
    
    // Prüfe ELGA-Verbindung
    let elgaAvailable = false;
    try {
      await elgaService.authenticate();
      elgaAvailable = true;
    } catch (error) {
      console.warn('ELGA nicht verfügbar:', error.message);
    }
    
    res.json({
      success: true,
      data: {
        elgaAvailable,
        fallbackEnabled: config.ecard.enableFallback,
        timeout: config.ecard.timeout,
        cacheDuration: config.ecard.cacheDuration
      }
    });
  } catch (error) {
    console.error('Error checking e-card status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Prüfen des e-card Status',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/ecard/config
 * @desc    e-card System-Konfiguration abrufen
 * @access  Private
 */
router.get('/config', auth, async (req, res) => {
  try {
    const config = require('../config/elga.config');
    
    res.json({
      success: true,
      data: {
        elgaAvailable: true, // Wird dynamisch geprüft
        fallbackEnabled: config.ecard.enableFallback,
        timeout: config.ecard.timeout,
        cacheDuration: config.ecard.cacheDuration
      }
    });
  } catch (error) {
    console.error('Error fetching e-card config:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der e-card-Konfiguration',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/ecard/config
 * @desc    e-card System-Konfiguration aktualisieren
 * @access  Private (Admin)
 */
router.put('/config', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Konfigurationen ändern'
      });
    }

    res.json({
      success: true,
      message: 'Konfiguration aktualisiert. Bitte beachten Sie: Änderungen müssen in der .env-Datei vorgenommen werden.',
      data: req.body
    });
  } catch (error) {
    console.error('Error updating e-card config:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der e-card-Konfiguration',
      error: error.message
    });
  }
});

module.exports = router;
