const express = require('express');
const router = express.Router();
const PatientExtended = require('../models/PatientExtended');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

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
  body('vaccinations').optional().isArray().withMessage('Impfungen müssen ein Array sein')
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

    const updatedPatient = await PatientExtended.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedPatient,
      message: 'Patient erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Error updating extended patient:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Patienten'
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

module.exports = router;
