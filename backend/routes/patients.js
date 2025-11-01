const express = require('express');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');
const { rbacMiddleware } = require('../middleware/rbac');
const { ACTIONS, RESOURCES } = require('../utils/rbac');
const router = express.Router();

// @route   GET /api/patients
// @desc    Get all patients
// @access  Private
router.get('/', auth, rbacMiddleware.canViewPatients, async (req, res) => {
  try {
    const patients = await Patient.find().populate('createdBy', 'firstName lastName');
    res.json({
      success: true,
      count: patients.length,
      data: patients
    });
  } catch (error) {
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
