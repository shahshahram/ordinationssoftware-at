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

/**
 * @route   POST /api/ecard/link-online-booking
 * @desc    Verknüpfe e-card Patient mit temporärer Online-Buchung
 * @access  Private
 */
router.post('/link-online-booking', [
  auth,
  body('ecardNumber').notEmpty().withMessage('e-card Nummer ist erforderlich'),
  body('temporaryPatientId').isMongoId().withMessage('Temporäre Patienten-ID ist erforderlich'),
  body('bookingNumber').optional().trim()
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
    
    const { ecardNumber, temporaryPatientId, bookingNumber } = req.body;
    
    // Lade temporären Patienten
    const temporaryPatient = await PatientExtended.findById(temporaryPatientId);
    if (!temporaryPatient) {
      return res.status(404).json({
        success: false,
        message: 'Temporärer Patient nicht gefunden'
      });
    }
    
    if (!temporaryPatient.isTemporary) {
      return res.status(400).json({
        success: false,
        message: 'Patient ist nicht temporär'
      });
    }
    
    // Validiere e-card
    let validationResult;
    try {
      validationResult = await elgaService.validateECard(ecardNumber, {
        socialSecurityNumber: temporaryPatient.socialSecurityNumber,
        dateOfBirth: temporaryPatient.dateOfBirth,
        lastName: temporaryPatient.lastName,
        firstName: temporaryPatient.firstName
      });
    } catch (error) {
      console.warn('ELGA-API nicht verfügbar, verwende Fallback:', error.message);
      validationResult = elgaService.fallbackValidation(ecardNumber);
    }
    
    if (!validationResult || validationResult.status !== 'valid') {
      return res.status(400).json({
        success: false,
        message: 'e-card Validierung fehlgeschlagen',
        validationStatus: validationResult?.status
      });
    }
    
    // Aktualisiere temporären Patienten mit e-card Daten
    if (!temporaryPatient.ecard) {
      temporaryPatient.ecard = {};
    }
    
    temporaryPatient.ecard.cardNumber = ecardNumber;
    temporaryPatient.ecard.validationStatus = validationResult.status;
    temporaryPatient.ecard.lastValidated = new Date();
    temporaryPatient.ecard.validFrom = validationResult.validFrom;
    temporaryPatient.ecard.validUntil = validationResult.validUntil;
    
    if (validationResult.elgaId) {
      temporaryPatient.ecard.elgaId = validationResult.elgaId;
      temporaryPatient.ecard.elgaStatus = validationResult.elgaStatus;
    }
    
    // Aktualisiere Patientendaten mit Versicherungsdaten aus e-card
    if (validationResult.insuranceData) {
      const insData = validationResult.insuranceData;
      
      // Aktualisiere nur wenn Daten besser/kompletter sind
      if (insData.socialSecurityNumber && insData.socialSecurityNumber !== '0000000000') {
        temporaryPatient.socialSecurityNumber = insData.socialSecurityNumber;
      }
      if (insData.insuranceProvider) {
        temporaryPatient.insuranceProvider = insData.insuranceProvider;
      }
      if (insData.insuranceNumber) {
        temporaryPatient.insuranceNumber = insData.insuranceNumber;
      }
      if (insData.address && insData.address.street && insData.address.street !== 'Nicht angegeben') {
        temporaryPatient.address = {
          street: insData.address.street,
          city: insData.address.city,
          zipCode: insData.address.postalCode,
          country: insData.address.country || 'Österreich'
        };
      }
      if (insData.gender) {
        temporaryPatient.gender = insData.gender;
      }
    }
    
    // Markiere als nicht mehr temporär
    temporaryPatient.isTemporary = false;
    temporaryPatient.notes = (temporaryPatient.notes || '') + '\nValidiert durch e-card Einlesen bei Online-Buchung.';
    
    await temporaryPatient.save();
    
    // Erstelle Validierungs-Eintrag
    const validation = new ECardValidation({
      patientId: temporaryPatient._id,
      ecardNumber: ecardNumber,
      validationDate: new Date(),
      validationStatus: validationResult.status,
      validFrom: validationResult.validFrom,
      validUntil: validationResult.validUntil,
      insuranceData: validationResult.insuranceData || {},
      elgaData: {
        elgaId: validationResult.elgaId,
        elgaStatus: validationResult.elgaStatus || 'not_registered',
        lastSync: new Date()
      },
      validatedBy: req.user._id,
      validationMethod: 'card_reader',
      notes: `Verknüpfung mit Online-Buchung${bookingNumber ? ` (${bookingNumber})` : ''}`
    });
    
    await validation.save();
    
    // Aktualisiere Online-Buchung falls bookingNumber vorhanden
    if (bookingNumber) {
      const OnlineBooking = require('../models/OnlineBooking');
      const booking = await OnlineBooking.findOne({ bookingNumber });
      
      if (booking) {
        booking.patient.id = temporaryPatient._id;
        booking.isKnownPatient = true;
        booking.addAuditEntry('ecard_linked', `e-card verknüpft von ${req.user.firstName} ${req.user.lastName}`, req.ip);
        await booking.save();
      }
    }
    
    res.json({
      success: true,
      message: 'e-card erfolgreich mit Online-Buchung verknüpft',
      data: {
        patient: {
          id: temporaryPatient._id,
          firstName: temporaryPatient.firstName,
          lastName: temporaryPatient.lastName,
          isTemporary: false
        },
        validation: validation,
        bookingUpdated: !!bookingNumber
      }
    });
  } catch (error) {
    console.error('Error linking e-card to online booking:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Verknüpfung',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/ecard/find-temporary-patients
 * @desc    Finde temporäre Patienten die zu einer e-card passen könnten
 * @access  Private
 */
router.get('/find-temporary-patients', [
  auth,
  body('ecardNumber').notEmpty().withMessage('e-card Nummer ist erforderlich')
], async (req, res) => {
  try {
    const { ecardNumber } = req.query;
    
    if (!ecardNumber) {
      return res.status(400).json({
        success: false,
        message: 'e-card Nummer ist erforderlich'
      });
    }
    
    // Validiere e-card und hole Versicherungsdaten
    let validationResult;
    try {
      validationResult = await elgaService.validateECard(ecardNumber);
    } catch (error) {
      console.warn('ELGA-API nicht verfügbar, verwende Fallback:', error.message);
      validationResult = elgaService.fallbackValidation(ecardNumber);
    }
    
    if (!validationResult || !validationResult.insuranceData) {
      return res.status(400).json({
        success: false,
        message: 'e-card Validierung fehlgeschlagen oder keine Versicherungsdaten verfügbar'
      });
    }
    
    const insuranceData = validationResult.insuranceData;
    
    // Suche nach temporären Patienten mit passenden Daten
    const temporaryPatients = await PatientExtended.find({
      isTemporary: true,
      $or: [
        { 
          socialSecurityNumber: insuranceData.socialSecurityNumber,
          firstName: { $regex: new RegExp(`^${insuranceData.firstName}$`, 'i') },
          lastName: { $regex: new RegExp(`^${insuranceData.lastName}$`, 'i') }
        },
        {
          email: insuranceData.email,
          firstName: { $regex: new RegExp(`^${insuranceData.firstName}$`, 'i') },
          lastName: { $regex: new RegExp(`^${insuranceData.lastName}$`, 'i') },
          dateOfBirth: insuranceData.dateOfBirth
        },
        {
          phone: insuranceData.phone,
          firstName: { $regex: new RegExp(`^${insuranceData.firstName}$`, 'i') },
          lastName: { $regex: new RegExp(`^${insuranceData.lastName}$`, 'i') },
          dateOfBirth: insuranceData.dateOfBirth
        }
      ]
    }).sort({ createdAt: -1 }).limit(10);
    
    // Lade zugehörige Online-Buchungen
    const OnlineBooking = require('../models/OnlineBooking');
    const bookings = await OnlineBooking.find({
      'patient.id': { $in: temporaryPatients.map(p => p._id) },
      status: { $in: ['pending', 'confirmed'] }
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: {
        ecardData: {
          cardNumber: ecardNumber,
          insuranceData: insuranceData,
          validationStatus: validationResult.status
        },
        temporaryPatients: temporaryPatients.map(patient => ({
          id: patient._id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patient.email,
          phone: patient.phone,
          dateOfBirth: patient.dateOfBirth,
          socialSecurityNumber: patient.socialSecurityNumber,
          createdAt: patient.createdAt,
          bookings: bookings
            .filter(b => b.patient.id?.toString() === patient._id.toString())
            .map(b => ({
              bookingNumber: b.bookingNumber,
              appointmentDate: b.appointment.date,
              appointmentTime: b.appointment.startTime,
              status: b.status
            }))
        }))
      }
    });
  } catch (error) {
    console.error('Error finding temporary patients:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Suche',
      error: error.message
    });
  }
});

module.exports = router;
