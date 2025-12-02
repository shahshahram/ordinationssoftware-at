// GINA Routes - Gesundheits-Informations-Netz-Adapter

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ginaService = require('../services/ginaService');
const PatientExtended = require('../models/PatientExtended');
const ECardValidation = require('../models/ECardValidation');
const { body, validationResult } = require('express-validator');

/**
 * @route   GET /api/gina/status
 * @desc    GINA-Systemstatus prüfen
 * @access  Private
 */
router.get('/status', auth, async (req, res) => {
  try {
    const validation = ginaService.validate();
    const status = await ginaService.getStatus();
    
    res.json({
      success: true,
      data: {
        configured: validation.valid,
        environment: ginaService.config.environment,
        hasCertificates: ginaService.hasCertificates(),
        ginaStatus: status,
        errors: validation.errors
      }
    });
  } catch (error) {
    console.error('Error checking GINA status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Prüfen des GINA-Status',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/gina/ecard/validate
 * @desc    e-card über GINA validieren
 * @access  Private
 */
router.post('/ecard/validate', [
  auth,
  body('ecardNumber').notEmpty().withMessage('e-card Nummer ist erforderlich'),
  body('patientId').notEmpty().withMessage('Patienten-ID ist erforderlich')
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
    
    const { ecardNumber, patientId } = req.body;
    
    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }
    
    // GINA-Validierung durchführen
    const validationResult = await ginaService.validateECard(ecardNumber, {
      socialSecurityNumber: patient.socialSecurityNumber,
      dateOfBirth: patient.dateOfBirth,
      lastName: patient.lastName,
      firstName: patient.firstName,
      insuranceProvider: patient.insuranceProvider,
      insuranceNumber: patient.insuranceNumber
    });
    
    // Aktualisiere Patient mit e-card Daten
    if (!patient.ecard) {
      patient.ecard = {};
    }
    
    patient.ecard.cardNumber = ecardNumber;
    patient.ecard.validationStatus = validationResult.status;
    patient.ecard.lastValidated = new Date();
    patient.ecard.validFrom = validationResult.validFrom;
    patient.ecard.validUntil = validationResult.validUntil;
    
    if (validationResult.ginaId) {
      if (!patient.ecard.gina) {
        patient.ecard.gina = {};
      }
      patient.ecard.gina.ginaId = validationResult.ginaId;
      patient.ecard.gina.ginaStatus = validationResult.ginaStatus;
      patient.ecard.gina.lastSync = new Date();
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
        elgaId: null,
        elgaStatus: 'not_registered'
      },
      validatedBy: req.user._id,
      validationMethod: 'gina'
    });
    
    await validation.save();
    await validation.populate('validatedBy', 'firstName lastName');
    
    res.json({
      success: true,
      message: 'e-card erfolgreich über GINA validiert',
      data: validation
    });
  } catch (error) {
    console.error('Error validating e-card via GINA:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der e-card Validierung über GINA',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/gina/ecard/:ecardNumber/insurance
 * @desc    Versicherungsdaten über GINA abrufen
 * @access  Private
 */
router.get('/ecard/:ecardNumber/insurance', auth, async (req, res) => {
  try {
    const { ecardNumber } = req.params;
    
    const result = await ginaService.getInsuranceData(ecardNumber);
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error fetching insurance data via GINA:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Versicherungsdaten',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/gina/patient/:patientId/sync
 * @desc    Patientendaten mit GINA synchronisieren
 * @access  Private
 */
router.post('/patient/:patientId/sync', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const result = await ginaService.syncPatientData(patientId);
    
    res.json({
      success: true,
      message: 'Patientendaten erfolgreich mit GINA synchronisiert',
      data: result
    });
  } catch (error) {
    console.error('Error syncing patient with GINA:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Synchronisierung',
      error: error.message
    });
  }
});

module.exports = router;





