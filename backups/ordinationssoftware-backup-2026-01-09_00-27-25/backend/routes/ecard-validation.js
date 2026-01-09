// e-card Validierung Routes

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ECardValidation = require('../models/ECardValidation');
const PatientExtended = require('../models/PatientExtended');
const elgaService = require('../services/elgaService');
const { body, validationResult } = require('express-validator');

// POST /api/ecard-validation/validate - e-card validieren
router.post('/validate', [
  auth,
  body('patientId').notEmpty().withMessage('Patienten-ID ist erforderlich'),
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
    
    const { patientId, ecardNumber, validationMethod = 'card_reader' } = req.body;
    
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
      // Fallback bei API-Fehler
      console.warn('ELGA-API nicht verfügbar, verwende Fallback:', error.message);
      validationResult = elgaService.fallbackValidation(ecardNumber, {
        insuranceProvider: patient.insuranceProvider,
        insuranceNumber: patient.insuranceNumber
      });
    }
    
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
    
    // Aktualisiere Patient mit e-card Daten
    patient.ecard = {
      cardNumber: ecardNumber,
      validFrom: validation.validFrom,
      validUntil: validation.validUntil,
      lastValidated: validation.validationDate,
      validationStatus: validation.validationStatus
    };
    
    if (validationResult.elgaId) {
      patient.ecard.elgaId = validationResult.elgaId;
      patient.ecard.elgaStatus = validationResult.elgaStatus;
    }
    
    await patient.save();
    
    await validation.populate('validatedBy', 'firstName lastName');
    
    res.json({
      success: true,
      message: 'e-card erfolgreich validiert',
      data: validation,
      warning: validationResult.warning
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

// POST /api/ecard-validation/sync/:patientId - Patientendaten mit ELGA synchronisieren
router.post('/sync/:patientId', auth, async (req, res) => {
  try {
    const result = await elgaService.syncPatientData(req.params.patientId);
    
    res.json({
      success: true,
      message: 'Patientendaten erfolgreich synchronisiert',
      data: result
    });
  } catch (error) {
    console.error('Error syncing patient data:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Synchronisierung',
      error: error.message
    });
  }
});

// GET /api/ecard-validation/patient/:patientId - Letzte Validierung für Patient
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const validation = await ECardValidation.findLatestByPatient(req.params.patientId);
    
    if (!validation) {
      return res.status(404).json({
        success: false,
        message: 'Keine e-card Validierung gefunden'
      });
    }
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error fetching e-card validation:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Validierung',
      error: error.message
    });
  }
});

// GET /api/ecard-validation/valid - Alle gültigen e-cards
router.get('/valid', auth, async (req, res) => {
  try {
    const validations = await ECardValidation.findValidCards();
    
    res.json({
      success: true,
      data: validations
    });
  } catch (error) {
    console.error('Error fetching valid e-cards:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der gültigen e-cards',
      error: error.message
    });
  }
});

module.exports = router;
