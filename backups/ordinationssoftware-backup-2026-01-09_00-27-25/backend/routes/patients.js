const express = require('express');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');
const { rbacMiddleware } = require('../middleware/rbac');
const { ACTIONS, RESOURCES } = require('../utils/rbac');
const router = express.Router();

// @route   GET /api/patients
// @desc    Get all patients with pagination
// @access  Private
router.get('/', auth, rbacMiddleware.canViewPatients, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      sortBy = 'lastName',
      sortOrder = 'asc'
    } = req.query;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { insuranceNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const patients = await Patient.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Patient.countDocuments(query);

    res.json({
      success: true,
      data: patients,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        hasMore: (parseInt(page) * parseInt(limit)) < total,
        limit: parseInt(limit),
        nextPage: (parseInt(page) * parseInt(limit)) < total ? parseInt(page) + 1 : null
      }
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Patienten'
    });
  }
});

// @route   GET /api/patients/:id
// @desc    Get single patient
// @access  Private
router.get('/:id', auth, rbacMiddleware.canViewPatients, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).populate('createdBy', 'firstName lastName');
    
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
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Patienten'
    });
  }
});

// @route   POST /api/patients
// @desc    Create new patient
// @access  Private
router.post('/', auth, rbacMiddleware.canCreatePatients, async (req, res) => {
  try {
    // Duplikatprüfung vor dem Erstellen
    const duplicateQuery = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      dateOfBirth: req.body.dateOfBirth
    };

    // Prüfe auf Duplikat basierend auf Name und Geburtsdatum
    const existingPatient = await Patient.findOne(duplicateQuery);
    
    if (existingPatient) {
      return res.status(409).json({
        success: false,
        message: 'Ein Patient mit diesem Namen und Geburtsdatum existiert bereits',
        duplicate: {
          id: existingPatient._id,
          firstName: existingPatient.firstName,
          lastName: existingPatient.lastName,
          dateOfBirth: existingPatient.dateOfBirth,
          insuranceNumber: existingPatient.insuranceNumber
        }
      });
    }

    // Zusätzliche Prüfung auf Versicherungsnummer falls vorhanden
    if (req.body.insuranceNumber) {
      const duplicateByInsurance = await Patient.findOne({
        insuranceNumber: req.body.insuranceNumber
      });

      if (duplicateByInsurance) {
        return res.status(409).json({
          success: false,
          message: 'Ein Patient mit dieser Versicherungsnummer existiert bereits',
          duplicate: {
            id: duplicateByInsurance._id,
            firstName: duplicateByInsurance.firstName,
            lastName: duplicateByInsurance.lastName,
            dateOfBirth: duplicateByInsurance.dateOfBirth,
            insuranceNumber: duplicateByInsurance.insuranceNumber
          }
        });
      }
    }

    const patientData = {
      ...req.body,
      createdBy: req.user.id
    };

    const patient = new Patient(patientData);
    await patient.save();

    res.status(201).json({
      success: true,
      message: 'Patient erfolgreich erstellt',
      data: patient
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Patienten',
      error: error.message
    });
  }
});

// @route   PUT /api/patients/:id
// @desc    Update patient
// @access  Private
router.put('/:id', auth, rbacMiddleware.canUpdatePatients, async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastModifiedBy: req.user.id },
      { new: true, runValidators: true }
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Patient erfolgreich aktualisiert',
      data: patient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Patienten'
    });
  }
});

// @route   DELETE /api/patients/:id
// @desc    Delete patient
// @access  Private
router.delete('/:id', auth, rbacMiddleware.canDeletePatients, async (req, res) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Patient erfolgreich gelöscht'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Patienten'
    });
  }
});

module.exports = router;
