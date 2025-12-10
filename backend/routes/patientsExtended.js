const express = require('express');
const router = express.Router();
const PatientExtended = require('../models/PatientExtended');
const PatientPhoto = require('../models/PatientPhoto');
const DekursEntry = require('../models/DekursEntry');
const MedicalDataHistory = require('../models/MedicalDataHistory');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ginaService = require('../services/ginaService');
const elgaService = require('../services/elgaService');
const ECardValidation = require('../models/ECardValidation');

/**
 * Hilfsfunktion: Validiert e-card für einen Patienten automatisch
 * @param {Object} patient - Patient-Objekt
 * @param {String} userId - ID des Benutzers, der die Validierung durchführt
 */
async function validateECardForPatient(patient, userId) {
  // Prüfe ob bereits eine gültige e-card vorhanden ist
  if (patient.ecard?.cardNumber && 
      patient.ecard?.validationStatus === 'valid' &&
      patient.ecard?.validUntil &&
      new Date(patient.ecard.validUntil) > new Date()) {
    console.log(`✅ e-card bereits gültig für Patient ${patient._id}`);
    return;
  }

  // Versuche e-card-Nummer aus Patientendaten zu extrahieren oder zu generieren
  // In der Praxis würde hier ein Kartenleser verwendet werden
  // Für jetzt: Versuche Validierung mit vorhandenen Daten
  
  if (!patient.socialSecurityNumber || !patient.insuranceProvider) {
    console.log(`⚠️ Keine SVNR oder Versicherung für Patient ${patient._id}, überspringe e-card-Validierung`);
    return;
  }

  // Versuche zuerst über GINA, dann über ELGA
  let validationResult = null;
  let validationMethod = 'gina';
  
  try {
    // GINA erfordert eine e-card-Nummer, die wir hier nicht haben
    // Für automatische Validierung verwenden wir ELGA mit SVNR
    if (patient.ecard?.cardNumber) {
      validationResult = await ginaService.validateECard(patient.ecard.cardNumber, {
        socialSecurityNumber: patient.socialSecurityNumber,
        dateOfBirth: patient.dateOfBirth,
        lastName: patient.lastName,
        firstName: patient.firstName,
        insuranceProvider: patient.insuranceProvider
      });
    } else {
      // Fallback: Versuche ELGA-Validierung mit SVNR
      validationResult = await elgaService.validateECard(patient.socialSecurityNumber, {
        socialSecurityNumber: patient.socialSecurityNumber,
        dateOfBirth: patient.dateOfBirth,
        lastName: patient.lastName,
        firstName: patient.firstName,
        insuranceProvider: patient.insuranceProvider
      });
      validationMethod = 'elga';
    }
  } catch (ginaError) {
    console.warn('GINA-Validierung fehlgeschlagen, versuche ELGA:', ginaError.message);
    try {
      validationResult = await elgaService.validateECard(
        patient.ecard?.cardNumber || patient.socialSecurityNumber, 
        {
          socialSecurityNumber: patient.socialSecurityNumber,
          dateOfBirth: patient.dateOfBirth,
          lastName: patient.lastName,
          firstName: patient.firstName,
          insuranceProvider: patient.insuranceProvider
        }
      );
      validationMethod = 'elga';
    } catch (elgaError) {
      console.warn('ELGA-Validierung fehlgeschlagen:', elgaError.message);
      // Verwende Fallback-Validierung
      validationResult = {
        status: 'not_checked',
        valid: false,
        warning: 'Automatische Validierung nicht möglich. Bitte e-card manuell scannen.',
        insuranceData: {
          insuranceProvider: patient.insuranceProvider,
          insuranceNumber: patient.insuranceNumber
        }
      };
      validationMethod = 'fallback';
    }
  }

  if (!validationResult) {
    return;
  }

  // Erstelle Validierungs-Eintrag
  const validation = new ECardValidation({
    patientId: patient._id,
    ecardNumber: patient.ecard?.cardNumber || patient.socialSecurityNumber,
    validationDate: new Date(),
    validationStatus: validationResult.status || (validationResult.valid ? 'valid' : 'invalid'),
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
      elgaStatus: validationResult.elgaStatus || 'not_registered',
      lastSync: new Date()
    },
    validatedBy: userId,
    validationMethod: validationMethod,
    errorMessage: validationResult.warning || null
  });

  await validation.save();

  // Aktualisiere Patient mit e-card Daten
  if (!patient.ecard) {
    patient.ecard = {};
  }

  if (patient.ecard?.cardNumber || validationResult.cardNumber) {
    patient.ecard.cardNumber = patient.ecard.cardNumber || validationResult.cardNumber;
  }
  
  patient.ecard.validFrom = validation.validFrom;
  patient.ecard.validUntil = validation.validUntil;
  patient.ecard.lastValidated = validation.validationDate;
  patient.ecard.validationStatus = validation.validationStatus;

  if (validationResult.elgaId) {
    patient.ecard.elgaId = validationResult.elgaId;
    patient.ecard.elgaStatus = validationResult.elgaStatus;
  }

  // Aktualisiere Versicherungsdaten falls vorhanden
  if (validationResult.insuranceData) {
    if (validationResult.insuranceData.insuranceProvider) {
      patient.insuranceProvider = validationResult.insuranceData.insuranceProvider;
    }
    if (validationResult.insuranceData.insuranceNumber) {
      patient.insuranceNumber = validationResult.insuranceData.insuranceNumber;
    }
  }

  await patient.save();

  console.log(`✅ e-card automatisch validiert für Patient ${patient._id} (${validationMethod})`);
}

// Multer-Konfiguration für Foto-Uploads
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const patientId = req.params.id;
    const folderName = req.body.folderName || `scan-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    const uploadPath = path.join(__dirname, '..', 'uploads', 'patient-photos', patientId, folderName);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const photoUpload = multer({ 
  storage: photoStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB Limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien (JPEG, PNG, GIF, WebP) sind erlaubt!'));
    }
  }
});

// @route   GET /api/patients-extended/hints
// @desc    Get patients with hints
// @access  Private
router.get('/hints', auth, async (req, res) => {
  try {
    const query = (req.user.role === 'admin' || req.user.role === 'super_admin') ? { hasHint: true } : { userId: req.user.id, hasHint: true };
    
    const patients = await PatientExtended.find(query)
      .sort({ lastName: 1, firstName: 1 })
      .select('-__v');

    res.json({
      success: true,
      data: patients,
      pagination: {
        total: patients.length,
        page: 1,
        limit: patients.length,
        hasMore: false
      }
    });
  } catch (error) {
    console.error('Error fetching patients with hints:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching patients with hints'
    });
  }
});

// @route   GET /api/patients-extended/important
// @desc    Get important patients (with additional insurances or hints)
// @access  Private
router.get('/important', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit) || 10;

    // Finde Patienten mit Zusatzversicherungen oder Hinweisen
    const query = {
      $or: [
        { 'additionalInsurances.0': { $exists: true } }, // Check if array has at least one element
        { hasHint: true }
      ]
    };

    // Filter nach Benutzerrolle
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      query.userId = req.user.id;
    }

    const patients = await PatientExtended.find(query)
      .sort({ lastName: 1, firstName: 1 })
      .limit(limitNum)
      .select('-__v')
      .lean();

    res.json({
      success: true,
      data: patients,
      pagination: {
        total: patients.length,
        page: 1,
        limit: limitNum,
        hasMore: false
      }
    });
  } catch (error) {
    console.error('Error fetching important patients:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der wichtigen Patienten',
      error: error.message
    });
  }
});

// @route   GET /api/patients-extended
// @desc    Get all extended patients
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = (req.user.role === 'admin' || req.user.role === 'super_admin') ? 100 : 50, // 100 für Admins/Super-Admins, 50 für normale Benutzer
      search = '',
      status = '',
      insuranceProvider = '',
      zipCode = '',
      sortBy = 'lastName',
      sortOrder = 'asc'
    } = req.query;

    // Build query - show all patients for admin/super_admin users, or filter by userId for regular users
    const query = (req.user.role === 'admin' || req.user.role === 'super_admin') ? {} : { userId: req.user.id };
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { socialSecurityNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    if (insuranceProvider) {
      query.insuranceProvider = insuranceProvider;
    }
    
    if (zipCode) {
      query['address.zipCode'] = zipCode;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    let queryBuilder = PatientExtended.find(query)
      .sort(sort)
      .populate('createdBy', 'firstName lastName')
      .lean();

    // Always apply pagination for better performance
    queryBuilder = queryBuilder
      .limit(limit)
      .skip((page - 1) * limit);

    const patients = await queryBuilder;
    const total = await PatientExtended.countDocuments(query);

    res.json({
      success: true,
      data: patients,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasMore: (page * limit) < total,
        limit: limit,
        nextPage: (page * limit) < total ? parseInt(page) + 1 : null
      }
    });
  } catch (error) {
    console.error('Error fetching extended patients:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Patienten'
    });
  }
});

// @route   GET /api/patients-extended/validate/:id
// @desc    Get single extended patient for validation (public)
// @access  Public
router.get('/validate/:id', async (req, res) => {
  try {
    const patient = await PatientExtended.findById(req.params.id).populate('createdBy', 'firstName lastName');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('Error fetching extended patient for validation:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Patienten'
    });
  }
});

// @route   GET /api/patients-extended/:id
// @desc    Get single extended patient
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    // Admin and super_admin users can see all patients, regular users only their own
    const query = (req.user.role === 'admin' || req.user.role === 'super_admin')
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user.id };
      
    const patient = await PatientExtended.findOne(query).populate('createdBy', 'firstName lastName');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('Error fetching extended patient:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Patienten'
    });
  }
});

// @route   POST /api/patients-extended
// @desc    Create new extended patient
// @access  Private
router.post('/', [
  auth,
  body('firstName').notEmpty().withMessage('Vorname ist erforderlich'),
  body('lastName').notEmpty().withMessage('Nachname ist erforderlich'),
  body('dateOfBirth').isISO8601().withMessage('Gültiges Geburtsdatum erforderlich'),
  body('gender').isIn(['m', 'w', 'd']).withMessage('Geschlecht muss m, w oder d sein'),
  body('socialSecurityNumber').optional().matches(/^\d{10,12}$/).withMessage('Sozialversicherungsnummer muss 10-12 Ziffern haben'),
  body('insuranceProvider').optional().notEmpty().withMessage('Versicherungsanstalt ist erforderlich'),
  body('phone').optional().matches(/^[\+]?[\d\s\-\(\)]{7,}$/).withMessage('Ungültige Telefonnummer'),
  body('address.street').optional().notEmpty().withMessage('Straße ist erforderlich'),
  body('address.zipCode').optional().matches(/^\d{4,5}$/).withMessage('PLZ muss 4-5 Ziffern haben'),
  body('address.city').optional().notEmpty().withMessage('Ort ist erforderlich'),
  body('dataProtectionConsent').optional().custom((value) => {
    if (value === true || value === 'true' || value === undefined || value === null) return true;
    throw new Error('Datenschutz-Einverständnis ist erforderlich');
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('Request body:', req.body);
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }

    // Duplikatprüfung vor dem Erstellen
    const duplicateQuery = {
      userId: req.user.id,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      dateOfBirth: new Date(req.body.dateOfBirth)
    };

    // Prüfe auf Duplikat basierend auf Name und Geburtsdatum
    const existingPatient = await PatientExtended.findOne(duplicateQuery);
    
    if (existingPatient) {
      return res.status(409).json({
        success: false,
        message: 'Ein Patient mit diesem Namen und Geburtsdatum existiert bereits',
        duplicate: {
          id: existingPatient._id,
          firstName: existingPatient.firstName,
          lastName: existingPatient.lastName,
          dateOfBirth: existingPatient.dateOfBirth,
          socialSecurityNumber: existingPatient.socialSecurityNumber
        }
      });
    }

    // Zusätzliche Prüfung auf Sozialversicherungsnummer falls vorhanden
    if (req.body.socialSecurityNumber) {
      const duplicateBySSN = await PatientExtended.findOne({
        userId: req.user.id,
        socialSecurityNumber: req.body.socialSecurityNumber
      });

      if (duplicateBySSN) {
        return res.status(409).json({
          success: false,
          message: 'Ein Patient mit dieser Sozialversicherungsnummer existiert bereits',
          duplicate: {
            id: duplicateBySSN._id,
            firstName: duplicateBySSN.firstName,
            lastName: duplicateBySSN.lastName,
            dateOfBirth: duplicateBySSN.dateOfBirth,
            socialSecurityNumber: duplicateBySSN.socialSecurityNumber
          }
        });
      }
    }

    console.log('Received patient data:', req.body);
    console.log('Medical data received:');
    console.log('- Allergies:', req.body.allergies);
    console.log('- Current Medications:', req.body.currentMedications);
    console.log('- Medical History:', req.body.medicalHistory);
    console.log('- Pre-existing Conditions:', req.body.preExistingConditions);
    console.log('- Previous Surgeries:', req.body.previousSurgeries);
    console.log('- Implants:', req.body.implants);
    console.log('- Smoking Status:', req.body.smokingStatus);
    console.log('- Cigarettes Per Day:', req.body.cigarettesPerDay);
    console.log('- Years of Smoking:', req.body.yearsOfSmoking);
    console.log('- Quit Smoking Date:', req.body.quitSmokingDate);

    // Convert previousSurgeries strings to objects if needed
    let processedPreviousSurgeries = req.body.previousSurgeries || [];
    if (Array.isArray(processedPreviousSurgeries)) {
      processedPreviousSurgeries = processedPreviousSurgeries.map(surgery => {
        if (typeof surgery === 'string') {
          return {
            year: new Date().getFullYear().toString(),
            procedure: surgery,
            hospital: '',
            surgeon: ''
          };
        }
        return surgery;
      });
    }

    // Convert preExistingConditions strings to objects if needed
    let processedPreExistingConditions = req.body.preExistingConditions || [];
    if (Array.isArray(processedPreExistingConditions)) {
      processedPreExistingConditions = processedPreExistingConditions.map(condition => {
        if (typeof condition === 'string') {
          return {
            condition: condition,
            diagnosisDate: '',
            status: 'active',
            notes: ''
          };
        }
        return condition;
      });
    }

    const patientData = {
      ...req.body,
      userId: req.user.id,
      createdBy: req.user.id,
      previousSurgeries: processedPreviousSurgeries,
      preExistingConditions: processedPreExistingConditions,
      medicalHistory: req.body.medicalHistory || [],
      dataProtectionConsentDate: new Date(),
      electronicCommunicationConsentDate: req.body.electronicCommunicationConsent ? new Date() : null
    };

    const patient = new PatientExtended(patientData);
    await patient.save();

    // Automatische e-card-Abfrage wenn Versicherung vorhanden ist
    if (patient.insuranceProvider && 
        patient.insuranceProvider !== 'Privatversicherung' && 
        patient.insuranceProvider !== 'Selbstzahler' &&
        patient.socialSecurityNumber) {
      try {
        await validateECardForPatient(patient, req.user._id);
      } catch (ecardError) {
        console.warn('⚠️ Automatische e-card-Validierung fehlgeschlagen beim Erstellen:', ecardError.message);
        // Fehler wird ignoriert, Patient wird trotzdem erstellt
      }
    }

    res.status(201).json({
      success: true,
      data: patient,
      message: 'Patient erfolgreich erstellt'
    });
  } catch (error) {
    console.error('Error creating extended patient:', error);
    
    // Prüfe, ob es sich um einen Validierungsfehler handelt
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler beim Erstellen des Patienten',
        errors: validationErrors,
        details: error.errors
      });
    }
    
    // Prüfe, ob es sich um einen Duplicate-Key-Fehler handelt
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Ein Patient mit dieser ${field} existiert bereits`,
        field: field
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Patienten',
      error: error.message
    });
  }
});

// @route   PUT /api/patients-extended/:id
// @desc    Update extended patient
// @access  Private
router.put('/:id', [
  auth,
  body('firstName').optional().notEmpty().withMessage('Vorname darf nicht leer sein'),
  body('lastName').optional().notEmpty().withMessage('Nachname darf nicht leer sein'),
  body('dateOfBirth').optional().isISO8601().withMessage('Gültiges Geburtsdatum erforderlich'),
  body('gender').optional().isIn(['m', 'w', 'd']).withMessage('Geschlecht muss m, w oder d sein'),
  body('socialSecurityNumber').optional().matches(/^\d{10}$/).withMessage('Sozialversicherungsnummer muss 10 Ziffern haben'),
  body('phone').optional().matches(/^[\+]?[\d\s\-\(\)]{7,}$/).withMessage('Ungültige Telefonnummer'),
  body('address.zipCode').optional().matches(/^\d{4,5}$/).withMessage('PLZ muss 4-5 Ziffern haben'),
  // Medizinische Daten Validierung
  body('height').optional().isNumeric().withMessage('Größe muss eine Zahl sein'),
  body('weight').optional().isNumeric().withMessage('Gewicht muss eine Zahl sein'),
  body('bmi').optional().isNumeric().withMessage('BMI muss eine Zahl sein'),
  body('bloodType').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-', 'Unbekannt']).withMessage('Ungültige Blutgruppe'),
  body('currentMedications').optional().isArray().withMessage('Medikamente müssen ein Array sein'),
  body('allergies').optional().isArray().withMessage('Allergien müssen ein Array sein'),
  body('medicalHistory').optional().isArray().withMessage('Medizinische Vorgeschichte muss ein Array sein'),
  body('vaccinations').optional().isArray().withMessage('Impfungen müssen ein Array sein'),
  body('infections').optional().isArray().withMessage('Infektionen müssen ein Array sein')
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

    // Admin and super_admin users can update all patients, regular users only their own
    const query = (req.user.role === 'admin' || req.user.role === 'super_admin')
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user.id };
      
    const patient = await PatientExtended.findOne(query);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }

    // Update electronicCommunicationConsentDate if consent is given
    if (req.body.electronicCommunicationConsent && !patient.electronicCommunicationConsent) {
      req.body.electronicCommunicationConsentDate = new Date();
    }

    // Prüfe ob Versicherung geändert wurde oder vorhanden ist
    const insuranceChanged = req.body.insuranceProvider && 
                             req.body.insuranceProvider !== patient.insuranceProvider;
    const hasInsurance = req.body.insuranceProvider || patient.insuranceProvider;
    const hasValidInsurance = hasInsurance && 
                              hasInsurance !== 'Privatversicherung' && 
                              hasInsurance !== 'Selbstzahler';
    const hasSocialSecurityNumber = req.body.socialSecurityNumber || patient.socialSecurityNumber;

    console.log('🔍 Updating patient:', req.params.id);
    console.log('📦 Request body infections:', JSON.stringify(req.body.infections, null, 2));
    
    // Verarbeite infections: Konvertiere detectedDate von ISO-String zu Date-Objekt
    let processedInfections = req.body.infections;
    if (processedInfections && Array.isArray(processedInfections)) {
      processedInfections = processedInfections
        .filter(infection => 
          infection && 
          typeof infection === 'object' && 
          infection.type && 
          infection.type.trim() !== ''
        )
        .map(infection => {
          const processed = { ...infection };
          // Konvertiere detectedDate von ISO-String zu Date, falls vorhanden
          if (processed.detectedDate && typeof processed.detectedDate === 'string') {
            try {
              processed.detectedDate = new Date(processed.detectedDate);
              // Prüfe ob das Datum gültig ist
              if (isNaN(processed.detectedDate.getTime())) {
                console.warn('⚠️ Ungültiges detectedDate:', infection.detectedDate);
                processed.detectedDate = undefined;
              }
            } catch (dateError) {
              console.warn('⚠️ Fehler beim Konvertieren von detectedDate:', dateError);
              processed.detectedDate = undefined;
            }
          }
          return processed;
        });
    }
    
    // Explizit infections setzen, auch wenn es ein leeres Array ist
    const updateData = { ...req.body, updatedAt: new Date() };
    if (req.body.infections !== undefined) {
      updateData.infections = processedInfections || [];
    }
    
    console.log('📤 Update data infections:', JSON.stringify(updateData.infections, null, 2));
    
    const updatedPatient = await PatientExtended.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    console.log('✅ Updated patient infections:', JSON.stringify(updatedPatient?.infections, null, 2));

    // Erstelle Historie-Eintrag für medizinische Daten-Änderungen
    try {
      // Konvertiere Mongoose-Dokumente zu Plain Objects für korrekten Vergleich
      const oldPatientData = patient.toObject ? patient.toObject() : patient;
      const newPatientData = updatedPatient.toObject ? updatedPatient.toObject() : updatedPatient;
      
      // Definiere medizinische Datenfelder, die getrackt werden sollen
      const medicalFields = [
        'bloodType', 'height', 'weight', 'bmi', 'allergies', 'currentMedications',
        'preExistingConditions', 'medicalHistory', 'vaccinations', 'infections',
        'isPregnant', 'pregnancyWeek', 'isBreastfeeding', 'hasPacemaker',
        'hasDefibrillator', 'implants', 'smokingStatus', 'cigarettesPerDay',
        'yearsOfSmoking', 'quitSmokingDate'
      ];

      // Extrahiere alte und neue medizinische Daten
      const oldMedicalData = {};
      const newMedicalData = {};
      const changedFields = [];

      medicalFields.forEach(field => {
        const oldValue = oldPatientData[field];
        const newValue = newPatientData[field];
        
        // Normalisiere Werte für Vergleich
        // Behandle undefined/null als gleich
        const oldIsEmpty = oldValue === null || oldValue === undefined || 
                          (Array.isArray(oldValue) && oldValue.length === 0) ||
                          (typeof oldValue === 'string' && oldValue === '');
        const newIsEmpty = newValue === null || newValue === undefined || 
                          (Array.isArray(newValue) && newValue.length === 0) ||
                          (typeof newValue === 'string' && newValue === '');
        
        // Wenn beide leer sind, hat sich nichts geändert
        if (oldIsEmpty && newIsEmpty) {
          return;
        }
        
        // Normalisiere Werte für Vergleich (Arrays als JSON-String)
        const oldValueStr = Array.isArray(oldValue) ? JSON.stringify(oldValue || []) : (oldValue ?? '');
        const newValueStr = Array.isArray(newValue) ? JSON.stringify(newValue || []) : (newValue ?? '');
        
        // Prüfe auf tatsächliche Änderung
        if (oldValueStr !== newValueStr) {
          oldMedicalData[field] = oldValue;
          newMedicalData[field] = newValue;
          changedFields.push({
            field: field,
            oldValue: oldValue,
            newValue: newValue
          });
        }
      });

      // Erstelle Historie-Eintrag nur wenn sich medizinische Daten geändert haben
      if (changedFields.length > 0) {
        console.log(`📝 Erstelle Historie-Eintrag für Patient ${patient._id}`);
        console.log(`   Geänderte Felder:`, changedFields.map(f => f.field).join(', '));
        
        const historyEntry = new MedicalDataHistory({
          patientId: patient._id,
          recordedAt: new Date(),
          recordedBy: req.user.id,
          snapshot: {
            bloodType: newPatientData.bloodType,
            height: newPatientData.height,
            weight: newPatientData.weight,
            bmi: newPatientData.bmi,
            allergies: newPatientData.allergies || [],
            currentMedications: newPatientData.currentMedications || [],
            preExistingConditions: newPatientData.preExistingConditions || [],
            medicalHistory: newPatientData.medicalHistory || [],
            vaccinations: newPatientData.vaccinations || [],
            infections: newPatientData.infections || [],
            isPregnant: newPatientData.isPregnant,
            pregnancyWeek: newPatientData.pregnancyWeek,
            isBreastfeeding: newPatientData.isBreastfeeding,
            hasPacemaker: newPatientData.hasPacemaker,
            hasDefibrillator: newPatientData.hasDefibrillator,
            implants: newPatientData.implants || [],
            smokingStatus: newPatientData.smokingStatus,
            cigarettesPerDay: newPatientData.cigarettesPerDay,
            yearsOfSmoking: newPatientData.yearsOfSmoking,
            quitSmokingDate: newPatientData.quitSmokingDate
          },
          changedFields: changedFields
        });

        await historyEntry.save();
        console.log(`✅ Historie-Eintrag erstellt für Patient ${patient._id}, ${changedFields.length} Felder geändert:`, changedFields.map(f => f.field));
      } else {
        console.log(`ℹ️ Keine medizinischen Daten-Änderungen für Patient ${patient._id}`);
      }
    } catch (historyError) {
      // Fehler bei Historie-Erstellung soll das Update nicht verhindern
      console.error('⚠️ Fehler beim Erstellen der Historie:', historyError);
    }

    // Automatische e-card-Abfrage wenn Versicherung vorhanden/geändert wurde
    if (hasValidInsurance && hasSocialSecurityNumber && 
        (insuranceChanged || !updatedPatient.ecard?.cardNumber)) {
      try {
        await validateECardForPatient(updatedPatient, req.user._id);
        // Lade Patient neu, um aktualisierte e-card-Daten zu erhalten
        const refreshedPatient = await PatientExtended.findById(req.params.id);
        return res.json({
          success: true,
          data: refreshedPatient,
          message: 'Patient erfolgreich aktualisiert. e-card wurde automatisch validiert.'
        });
      } catch (ecardError) {
        console.warn('⚠️ Automatische e-card-Validierung fehlgeschlagen beim Bearbeiten:', ecardError.message);
        // Fehler wird ignoriert, Patient wird trotzdem aktualisiert
      }
    }

    res.json({
      success: true,
      data: updatedPatient,
      message: 'Patient erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('❌ Error updating extended patient:', error);
    console.error('   Error name:', error.name);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    
    // Prüfe, ob es sich um einen Validierungsfehler handelt
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      console.error('   Validation errors:', validationErrors);
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler beim Aktualisieren des Patienten',
        errors: validationErrors,
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Patienten',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   DELETE /api/patients-extended/:id
// @desc    Delete extended patient
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const patient = await PatientExtended.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }

    await PatientExtended.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Patient erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting extended patient:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Patienten'
    });
  }
});

// @route   GET /api/patients-extended/stats/overview
// @desc    Get patient statistics overview
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [
      totalPatients,
      activePatients,
      waitingPatients,
      insuranceStats,
      ageStats,
      recentAdmissions
    ] = await Promise.all([
      PatientExtended.countDocuments({ userId }),
      PatientExtended.countDocuments({ userId, status: 'aktiv' }),
      PatientExtended.countDocuments({ userId, status: 'wartend' }),
      PatientExtended.aggregate([
        { $match: { userId: new require('mongoose').Types.ObjectId(userId) } },
        { $group: { _id: '$insuranceProvider', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      PatientExtended.aggregate([
        { $match: { userId: new require('mongoose').Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            avgAge: { $avg: { $divide: [{ $subtract: [new Date(), '$dateOfBirth'] }, 365.25 * 24 * 60 * 60 * 1000] } },
            minAge: { $min: { $divide: [{ $subtract: [new Date(), '$dateOfBirth'] }, 365.25 * 24 * 60 * 60 * 1000] } },
            maxAge: { $max: { $divide: [{ $subtract: [new Date(), '$dateOfBirth'] }, 365.25 * 24 * 60 * 60 * 1000] } }
          }
        }
      ]),
      PatientExtended.find({ userId })
        .sort({ admissionDate: -1 })
        .limit(5)
        .select('firstName lastName admissionDate status')
    ]);

    res.json({
      success: true,
      data: {
        totalPatients,
        activePatients,
        waitingPatients,
        insuranceStats,
        ageStats: ageStats[0] || { avgAge: 0, minAge: 0, maxAge: 0 },
        recentAdmissions
      }
    });
  } catch (error) {
    console.error('Error fetching patient statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Statistiken'
    });
  }
});

// @route   GET /api/patients-extended/search/suggestions
// @desc    Get patient search suggestions
// @access  Private
router.get('/search/suggestions', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const suggestions = await PatientExtended.find({
      userId: req.user.id,
      $or: [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { socialSecurityNumber: { $regex: q, $options: 'i' } }
      ]
    })
    .select('firstName lastName socialSecurityNumber dateOfBirth')
    .limit(10)
    .lean();

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Suchvorschläge'
    });
  }
});

// @route   POST /api/patients-extended/validate
// @desc    Validate and update patient data via QR code
// @access  Public (for validation purposes)
router.post('/validate', async (req, res) => {
  try {
    const { patientId, updates } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patienten-ID ist erforderlich'
      });
    }

    // Patient finden
    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }

    // Updates anwenden
    const updateData = {};
    
            // Einfache Felder
            const simpleFields = [
              'firstName', 'lastName', 'dateOfBirth', 'gender', 'email', 'phone',
              'insuranceProvider', 'socialSecurityNumber', 'bloodType', 'height', 
              'weight', 'bmi', 'medicalNotes', 'isPregnant', 'pregnancyWeek', 'isBreastfeeding'
            ];
    
    simpleFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    // Adress-Felder
    if (updates['address.street'] !== undefined || 
        updates['address.city'] !== undefined || 
        updates['address.zipCode'] !== undefined) {
      
      updateData.address = {
        ...patient.address,
        street: updates['address.street'] !== undefined ? updates['address.street'] : patient.address?.street,
        city: updates['address.city'] !== undefined ? updates['address.city'] : patient.address?.city,
        zipCode: updates['address.zipCode'] !== undefined ? updates['address.zipCode'] : patient.address?.zipCode,
        country: patient.address?.country || 'Österreich'
      };
    }

    // Patient aktualisieren
    const updatedPatient = await PatientExtended.findByIdAndUpdate(
      patientId,
      { 
        ...updateData,
        updatedAt: new Date(),
        lastValidation: new Date()
      },
      { new: true, runValidators: true }
    );

    console.log(`Patient validation update: ${patientId}`, updateData);

    res.json({
      success: true,
      message: 'Patientendaten erfolgreich aktualisiert',
      data: {
        patientId: updatedPatient._id,
        updatedFields: Object.keys(updateData)
      }
    });

  } catch (error) {
    console.error('Error validating patient data:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Patientendaten'
    });
  }
});

// ============================================
// PATIENT PHOTOS ROUTES
// ============================================

// @route   GET /api/patients-extended/:id/photos
// @desc    Alle Fotos eines Patienten abrufen
// @access  Private
router.get('/:id/photos', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prüfe ob Patient existiert
    const patient = await PatientExtended.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }

    // Prüfe Berechtigung
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && patient.userId?.toString() !== req.user.id?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diesen Patienten'
      });
    }

    const photos = await PatientPhoto.find({ patientId: id })
      .populate('uploadedBy', 'firstName lastName')
      .sort({ uploadedAt: -1 });

    res.json({
      success: true,
      data: photos
    });
  } catch (error) {
    console.error('Error fetching patient photos:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Fotos',
      error: error.message
    });
  }
});

// @route   POST /api/patients-extended/:id/photos
// @desc    Foto für Patienten hochladen
// @access  Private
router.post('/:id/photos', auth, photoUpload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { description, folderName } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }

    // Prüfe ob Patient existiert
    const patient = await PatientExtended.findById(id);
    if (!patient) {
      // Lösche hochgeladene Datei
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }

    // Prüfe Berechtigung
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && patient.userId?.toString() !== req.user.id?.toString()) {
      // Lösche hochgeladene Datei
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diesen Patienten'
      });
    }

    // Erstelle relativen Pfad (relativ zu uploads/)
    const relativePath = req.file.path.replace(path.join(__dirname, '..', 'uploads') + path.sep, '').replace(/\\/g, '/');

    const photo = new PatientPhoto({
      patientId: id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: relativePath,
      description: description || '',
      source: 'direct',
      uploadedBy: req.user.id,
      folderName: folderName || undefined
    });

    await photo.save();

    res.json({
      success: true,
      message: 'Foto erfolgreich hochgeladen',
      data: photo
    });
  } catch (error) {
    // Lösche hochgeladene Datei bei Fehler
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    console.error('Error uploading patient photo:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hochladen des Fotos',
      error: error.message
    });
  }
});

// @route   POST /api/patients-extended/:id/photos/batch
// @desc    Mehrere Fotos für Patienten hochladen
// @access  Private
router.post('/:id/photos/batch', auth, photoUpload.array('photos', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { folderName } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keine Dateien hochgeladen'
      });
    }

    // Prüfe ob Patient existiert
    const patient = await PatientExtended.findById(id);
    if (!patient) {
      // Lösche hochgeladene Dateien
      req.files.forEach(file => {
        if (file.path) {
          try {
            fs.unlinkSync(file.path);
          } catch (err) {
            console.error('Error deleting file:', err);
          }
        }
      });
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }

    // Prüfe Berechtigung
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && patient.userId?.toString() !== req.user.id?.toString()) {
      // Lösche hochgeladene Dateien
      req.files.forEach(file => {
        if (file.path) {
          try {
            fs.unlinkSync(file.path);
          } catch (err) {
            console.error('Error deleting file:', err);
          }
        }
      });
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diesen Patienten'
      });
    }

    const uploadedPhotos = [];
    for (const file of req.files) {
      const relativePath = file.path.replace(path.join(__dirname, '..', 'uploads') + path.sep, '').replace(/\\/g, '/');
      
      const photo = new PatientPhoto({
        patientId: id,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: relativePath,
        source: 'direct',
        uploadedBy: req.user.id,
        folderName: folderName || undefined
      });

      await photo.save();
      uploadedPhotos.push(photo);
    }

    res.json({
      success: true,
      message: `${uploadedPhotos.length} Foto(s) erfolgreich hochgeladen`,
      data: uploadedPhotos
    });
  } catch (error) {
    // Lösche hochgeladene Dateien bei Fehler
    if (req.files) {
      req.files.forEach(file => {
        if (file.path) {
          try {
            fs.unlinkSync(file.path);
          } catch (unlinkError) {
            console.error('Error deleting file:', unlinkError);
          }
        }
      });
    }
    console.error('Error uploading patient photos batch:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hochladen der Fotos',
      error: error.message
    });
  }
});

// @route   PUT /api/patients-extended/:id/photos/move-to-folder
// @desc    Fotos in Ordner verschieben
// @access  Private
router.put('/:id/photos/move-to-folder', auth, async (req, res) => {
  // Verwende Logger für persistente Logs
  const logger = require('../utils/logger');
  
  try {
    const { id } = req.params;
    const { photoIds, folderName } = req.body;

    logger.info('PUT /api/patients-extended/:id/photos/move-to-folder aufgerufen', {
      patientId: id,
      photoIdsCount: photoIds?.length,
      folderName: folderName
    });

    console.log(`📋 PUT /api/patients-extended/${id}/photos/move-to-folder`);
    console.log(`   Request body:`, { photoIds, folderName, photoIdsCount: photoIds?.length });

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keine Foto-IDs angegeben'
      });
    }

    if (!folderName) {
      return res.status(400).json({
        success: false,
        message: 'Ordnername ist erforderlich'
      });
    }

    // Validiere patientId-Format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error(`❌ Ungültige Patient-ID: ${id}`);
      return res.status(400).json({
        success: false,
        message: 'Ungültige Patient-ID'
      });
    }

    // Prüfe ob Patient existiert
    const patient = await PatientExtended.findById(id);
    if (!patient) {
      console.error(`❌ Patient nicht gefunden: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }

    // Prüfe Berechtigung
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && patient.userId?.toString() !== req.user.id?.toString()) {
      console.error(`❌ Keine Berechtigung: User ${req.user.id} versucht auf Patient ${id} zuzugreifen`);
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diesen Patienten'
      });
    }

    // Trenne Dekurs-Fotos und direkte Fotos
    const directPhotoIds = [];
    const dekursPhotoIds = [];

    console.log(`📋 Verarbeite ${photoIds.length} Foto-ID(s):`, photoIds);

    for (const photoId of photoIds) {
      // Prüfe ob es eine gültige MongoDB ObjectId ist
      // WICHTIG: Direkte Foto-IDs müssen genau 24 Zeichen lang sein, eine gültige ObjectId sein
      // UND dürfen KEINEN Bindestrich enthalten (da Dekurs-Foto-IDs Bindestriche enthalten)
      if (photoId.length === 24 && 
          mongoose.Types.ObjectId.isValid(photoId) && 
          !photoId.includes('-')) {
        directPhotoIds.push(photoId);
        console.log(`   ✅ Direkte Foto-ID erkannt: ${photoId}`);
      } else if (photoId.includes('-')) {
        // Dekurs-Foto-Format: {dekursEntryId}-{filename}
        dekursPhotoIds.push(photoId);
        console.log(`   ✅ Dekurs-Foto-ID erkannt: ${photoId}`);
      } else {
        console.warn(`   ⚠️ Unbekanntes Foto-ID-Format: ${photoId} (Länge: ${photoId.length}, Enthält Bindestrich: ${photoId.includes('-')})`);
      }
    }

    console.log(`📊 Aufgeteilt: ${directPhotoIds.length} direkte, ${dekursPhotoIds.length} Dekurs-Fotos`);

    let directPhotoCount = 0;
    let dekursPhotoCount = 0;

    // Aktualisiere direkte Fotos (PatientPhoto)
    if (directPhotoIds.length > 0) {
      try {
        console.log(`   🔄 Aktualisiere ${directPhotoIds.length} direkte Foto(s)...`);
        const result = await PatientPhoto.updateMany(
          { _id: { $in: directPhotoIds }, patientId: id },
          { $set: { folderName } }
        );
        directPhotoCount = result.modifiedCount;
        console.log(`   ✅ ${directPhotoCount} direkte Foto(s) erfolgreich aktualisiert`);
      } catch (error) {
        console.error(`   ❌ Fehler beim Aktualisieren der direkten Fotos:`, error);
        console.error(`      Error name: ${error.name}`);
        console.error(`      Error message: ${error.message}`);
        console.error(`      Error stack: ${error.stack}`);
        // Wir fahren mit Dekurs-Fotos fort, statt komplett zu scheitern
      }
    }

    // Aktualisiere Dekurs-Fotos
    if (dekursPhotoIds.length > 0) {
      for (const dekursPhotoId of dekursPhotoIds) {
        try {
          // Parse Dekurs-Foto-ID: Format ist {dekursEntryId}-{filename}
          // MongoDB ObjectId ist genau 24 Zeichen lang
          // Beispiel: "691cda92d4dc82f17ab5477f-dekurs-691cda92d4dc82f17ab5477f-1763498669567-530558816.png"
          console.log(`🔍 Parse Dekurs-Foto-ID: "${dekursPhotoId}" (Länge: ${dekursPhotoId.length})`);
          
          if (dekursPhotoId.length > 25 && dekursPhotoId[24] === '-') {
            // Die ersten 24 Zeichen sind die Dekurs-Eintrags-ID
            const dekursEntryId = dekursPhotoId.substring(0, 24);
            // Alles nach dem Bindestrich (ab Index 25) ist der Dateiname
            const filename = dekursPhotoId.substring(25);
            
            console.log(`   📝 Dekurs-Eintrags-ID: "${dekursEntryId}"`);
            console.log(`   📝 Dateiname: "${filename}"`);

            if (mongoose.Types.ObjectId.isValid(dekursEntryId)) {
              console.log(`   🔍 Suche Dekurs-Eintrag: _id=${dekursEntryId}, patientId=${id}`);
              
              const dekursEntry = await DekursEntry.findOne({
                _id: dekursEntryId,
                patientId: id
              });

              if (!dekursEntry) {
                console.warn(`⚠️ Dekurs-Eintrag ${dekursEntryId} nicht gefunden für Patient ${id}`);
                // Versuche auch ohne patientId-Filter (falls patientId nicht gesetzt ist oder nicht übereinstimmt)
                const dekursEntryWithoutPatient = await DekursEntry.findById(dekursEntryId);
                if (dekursEntryWithoutPatient) {
                  console.log(`   ℹ️ Dekurs-Eintrag gefunden, aber patientId stimmt nicht überein. Dekurs patientId: ${dekursEntryWithoutPatient.patientId}, Request patientId: ${id}`);
                  console.log(`   ⚠️ Überspringe diesen Eintrag aus Sicherheitsgründen (patientId-Mismatch)`);
                } else {
                  console.warn(`   ⚠️ Dekurs-Eintrag ${dekursEntryId} existiert nicht`);
                }
                continue;
              }

              console.log(`   ✅ Dekurs-Eintrag gefunden. Anzahl Attachments: ${dekursEntry.attachments?.length || 0}`);

              if (!dekursEntry.attachments || dekursEntry.attachments.length === 0) {
                console.warn(`⚠️ Dekurs-Eintrag ${dekursEntryId} hat keine Attachments`);
                continue;
              }

              // Finde das Attachment mit dem passenden Dateinamen
              // Versuche zuerst exakte Übereinstimmung
              let attachmentIndex = dekursEntry.attachments.findIndex(
                att => att.filename === filename
              );

              console.log(`   🔍 Exakte Suche nach "${filename}": ${attachmentIndex !== -1 ? 'gefunden' : 'nicht gefunden'}`);

              // Falls nicht gefunden, versuche Teilübereinstimmung (falls Dateiname geändert wurde)
              if (attachmentIndex === -1) {
                // Suche nach Dateinamen, die den gesuchten Dateinamen enthalten
                attachmentIndex = dekursEntry.attachments.findIndex(
                  att => att.filename.includes(filename) || filename.includes(att.filename)
                );
                console.log(`   🔍 Teilübereinstimmung Suche: ${attachmentIndex !== -1 ? 'gefunden' : 'nicht gefunden'}`);
              }

              if (attachmentIndex === -1) {
                console.warn(`⚠️ Attachment mit Dateinamen "${filename}" nicht gefunden in Dekurs-Eintrag ${dekursEntryId}.`);
                console.warn(`   Verfügbare Dateinamen:`, dekursEntry.attachments.map(a => a.filename));
                continue;
              }

              console.log(`   ✅ Attachment gefunden an Index ${attachmentIndex}`);

              // Aktualisiere folderName für das Attachment
              // Verwende markModified, da attachments ein Subdocument-Array ist
              dekursEntry.attachments[attachmentIndex].folderName = folderName;
              dekursEntry.markModified('attachments');
              
              console.log(`   💾 Speichere Dekurs-Eintrag...`);
              
              try {
                await dekursEntry.save();
                dekursPhotoCount++;
                console.log(`✅ Dekurs-Foto "${filename}" erfolgreich in Ordner "${folderName}" verschoben`);
              } catch (saveError) {
                console.error(`❌ Fehler beim Speichern von Dekurs-Eintrag ${dekursEntryId}:`, saveError);
                console.error(`   Save error name: ${saveError.name}`);
                console.error(`   Save error message: ${saveError.message}`);
                console.error(`   Save error stack: ${saveError.stack}`);
                // Wir fahren mit den anderen Fotos fort, statt komplett zu scheitern
                // Der Fehler wird nicht weitergeworfen, damit andere Fotos noch verarbeitet werden können
              }
            } else {
              console.warn(`⚠️ Ungültige Dekurs-Eintrags-ID: ${dekursEntryId}`);
            }
          } else {
            console.warn(`Ungültiges Format für Dekurs-Foto-ID: ${dekursPhotoId} (Länge: ${dekursPhotoId.length}, Zeichen 24: "${dekursPhotoId[24]}")`);
          }
        } catch (error) {
          console.error(`❌ Fehler beim Verarbeiten von Dekurs-Foto-ID ${dekursPhotoId}:`, error);
          console.error(`   Error message: ${error.message}`);
          console.error(`   Error stack: ${error.stack}`);
          // Wir fahren mit den anderen Fotos fort, statt komplett zu scheitern
          // Der Fehler wird nicht weitergeworfen, damit andere Fotos noch verarbeitet werden können
        }
      }
    }

    const totalCount = directPhotoCount + dekursPhotoCount;

    if (totalCount === 0) {
      console.warn(`⚠️ Keine Fotos konnten verschoben werden. Direkte Fotos: ${directPhotoIds.length}, Dekurs-Fotos: ${dekursPhotoIds.length}`);
      console.warn(`   Direkte Foto-IDs:`, directPhotoIds);
      console.warn(`   Dekurs-Foto-IDs:`, dekursPhotoIds);
      return res.status(400).json({
        success: false,
        message: 'Keine Fotos konnten verschoben werden. Bitte überprüfen Sie die Foto-IDs.',
        data: { 
          modifiedCount: 0,
          directPhotos: directPhotoCount,
          dekursPhotos: dekursPhotoCount,
          requestedDirectPhotos: directPhotoIds.length,
          requestedDekursPhotos: dekursPhotoIds.length
        }
      });
    }

    console.log(`✅ Erfolgreich ${totalCount} Foto(s) verschoben (${directPhotoCount} direkte, ${dekursPhotoCount} Dekurs-Fotos)`);
    res.json({
      success: true,
      message: `${totalCount} Foto(s) erfolgreich verschoben`,
      data: { 
        modifiedCount: totalCount,
        directPhotos: directPhotoCount,
        dekursPhotos: dekursPhotoCount
      }
    });
  } catch (error) {
    console.error('❌ Error moving photos to folder:', error);
    console.error('   Error name:', error.name);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    console.error('   Request params:', { id: req.params?.id });
    console.error('   Request body:', { 
      photoIds: req.body?.photoIds, 
      folderName: req.body?.folderName,
      photoIdsCount: req.body?.photoIds?.length 
    });
    console.error('   Request user:', req.user ? { id: req.user.id, role: req.user.role } : 'Kein User');
    
    // Verwende auch den Logger für persistente Logs
    const logger = require('../utils/logger');
    logger.error('Fehler beim Verschieben von Fotos in Ordner', {
      error: error.message,
      stack: error.stack,
      patientId: req.params?.id,
      photoIds: req.body?.photoIds,
      folderName: req.body?.folderName
    });
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Verschieben der Fotos',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   DELETE /api/patients-extended/:id/photos/:photoId
// @desc    Foto löschen
// @access  Private
router.delete('/:id/photos/:photoId', auth, async (req, res) => {
  try {
    const { id, photoId } = req.params;

    // Prüfe ob Patient existiert
    const patient = await PatientExtended.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }

    // Prüfe Berechtigung
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && patient.userId?.toString() !== req.user.id?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diesen Patienten'
      });
    }

    const photo = await PatientPhoto.findOne({ _id: photoId, patientId: id });
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Foto nicht gefunden'
      });
    }

    // Lösche Datei
    const filePath = path.join(__dirname, '..', 'uploads', photo.path);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error('Error deleting photo file:', unlinkError);
      }
    }

    // Lösche Datenbankeintrag
    await PatientPhoto.findByIdAndDelete(photoId);

    res.json({
      success: true,
      message: 'Foto erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting patient photo:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Fotos',
      error: error.message
    });
  }
});

module.exports = router;
