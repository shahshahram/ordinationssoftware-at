const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const VitalSigns = require('../models/VitalSigns');
const Patient = require('../models/Patient');
const PatientExtended = require('../models/PatientExtended');

// GET /api/vital-signs/patient/:patientId - Alle Vitalwerte eines Patienten abrufen
router.get('/patient/:patientId', auth, checkPermission('patients.read'), async (req, res) => {
  try {
    const { patientId } = req.params;
    const { limit = 100, sort = 'desc' } = req.query;
    
    // Prüfe ob Patient existiert (in beiden Models)
    let patient = await Patient.findById(patientId);
    if (!patient) {
      patient = await PatientExtended.findById(patientId);
    }
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }
    
    const sortOrder = sort === 'asc' ? 1 : -1;
    const limitNum = parseInt(limit);
    
    const vitalSigns = await VitalSigns.find({ patientId })
      .populate('recordedBy', 'firstName lastName email')
      .populate('appointmentId', 'date startTime endTime')
      .sort({ recordedAt: sortOrder })
      .limit(limitNum)
      .lean();
    
    res.json({
      success: true,
      data: vitalSigns,
      count: vitalSigns.length
    });
  } catch (error) {
    console.error('Error fetching vital signs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Vitalwerte',
      error: error.message
    });
  }
});

// GET /api/vital-signs/:id - Einzelnen Vitalwerte-Eintrag abrufen
router.get('/:id', auth, checkPermission('patients.read'), async (req, res) => {
  try {
    const vitalSign = await VitalSigns.findById(req.params.id)
      .populate('recordedBy', 'firstName lastName email')
      .populate('appointmentId', 'date startTime endTime')
      .populate('patientId', 'firstName lastName');
    
    if (!vitalSign) {
      return res.status(404).json({
        success: false,
        message: 'Vitalwerte-Eintrag nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: vitalSign
    });
  } catch (error) {
    console.error('Error fetching vital sign:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Vitalwerte',
      error: error.message
    });
  }
});

// POST /api/vital-signs - Neue Vitalwerte erfassen
router.post('/', auth, checkPermission('patients.write'), [
  body('patientId').notEmpty().withMessage('Patient ID ist erforderlich'),
  body('recordedAt').optional().isISO8601().withMessage('Ungültiges Datum'),
  body('bloodPressure.systolic').optional().isFloat({ min: 0, max: 300 }),
  body('bloodPressure.diastolic').optional().isFloat({ min: 0, max: 200 }),
  body('pulse').optional().isFloat({ min: 0, max: 300 }),
  body('respiratoryRate').optional().isFloat({ min: 0, max: 100 }),
  body('temperature.value').optional().isFloat({ min: 30, max: 45 }),
  body('oxygenSaturation').optional().isFloat({ min: 0, max: 100 }),
  body('bloodGlucose.value').optional().isFloat({ min: 0, max: 1000 }),
  body('weight.value').optional().isFloat({ min: 0, max: 500 }),
  body('height.value').optional().isFloat({ min: 0, max: 300 }),
  body('painScale.type').optional().isIn(['NRS', 'VAS', 'VRS', 'KUSS']),
  body('painScale.value').optional().custom((value) => {
    // Akzeptiere Number oder String
    if (value === undefined || value === null || value === '') {
      return true;
    }
    if (typeof value === 'number' || typeof value === 'string') {
      return true;
    }
    throw new Error('painScale.value muss eine Zahl oder ein String sein');
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }
    
    const { patientId, appointmentId, recordedAt, ...vitalData } = req.body;
    
    // Prüfe ob Patient existiert (in beiden Models)
    let patient = await Patient.findById(patientId);
    if (!patient) {
      patient = await PatientExtended.findById(patientId);
    }
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }
    
    // Erstelle neuen Vitalwerte-Eintrag
    const vitalSign = new VitalSigns({
      patientId,
      appointmentId: appointmentId || null,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      recordedBy: req.user.id,
      ...vitalData
    });
    
    await vitalSign.save();
    
    // Lade den vollständigen Eintrag mit Populate
    const savedVitalSign = await VitalSigns.findById(vitalSign._id)
      .populate('recordedBy', 'firstName lastName email')
      .populate('appointmentId', 'date startTime endTime');
    
    res.status(201).json({
      success: true,
      data: savedVitalSign,
      message: 'Vitalwerte erfolgreich erfasst'
    });
  } catch (error) {
    console.error('Error creating vital signs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erfassen der Vitalwerte',
      error: error.message
    });
  }
});

// PUT /api/vital-signs/:id - Vitalwerte aktualisieren
router.put('/:id', auth, checkPermission('patients.write'), [
  body('bloodPressure.systolic').optional().isFloat({ min: 0, max: 300 }),
  body('bloodPressure.diastolic').optional().isFloat({ min: 0, max: 200 }),
  body('pulse').optional().isFloat({ min: 0, max: 300 }),
  body('respiratoryRate').optional().isFloat({ min: 0, max: 100 }),
  body('temperature.value').optional().isFloat({ min: 30, max: 45 }),
  body('oxygenSaturation').optional().isFloat({ min: 0, max: 100 }),
  body('bloodGlucose.value').optional().isFloat({ min: 0, max: 1000 }),
  body('weight.value').optional().isFloat({ min: 0, max: 500 }),
  body('height.value').optional().isFloat({ min: 0, max: 300 }),
  body('painScale.type').optional().isIn(['NRS', 'VAS', 'VRS', 'KUSS']),
  body('painScale.value').optional().custom((value) => {
    // Akzeptiere Number oder String
    if (value === undefined || value === null || value === '') {
      return true;
    }
    if (typeof value === 'number' || typeof value === 'string') {
      return true;
    }
    throw new Error('painScale.value muss eine Zahl oder ein String sein');
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }
    
    const vitalSign = await VitalSigns.findById(req.params.id);
    if (!vitalSign) {
      return res.status(404).json({
        success: false,
        message: 'Vitalwerte-Eintrag nicht gefunden'
      });
    }
    
    // Aktualisiere die Felder
    Object.keys(req.body).forEach(key => {
      if (key !== 'patientId' && key !== '_id' && key !== 'recordedBy') {
        vitalSign[key] = req.body[key];
      }
    });
    
    await vitalSign.save();
    
    // Lade den aktualisierten Eintrag mit Populate
    const updatedVitalSign = await VitalSigns.findById(vitalSign._id)
      .populate('recordedBy', 'firstName lastName email')
      .populate('appointmentId', 'date startTime endTime');
    
    res.json({
      success: true,
      data: updatedVitalSign,
      message: 'Vitalwerte erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Error updating vital signs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Vitalwerte',
      error: error.message
    });
  }
});

// DELETE /api/vital-signs/:id - Vitalwerte löschen
router.delete('/:id', auth, checkPermission('patients.write'), async (req, res) => {
  try {
    const vitalSign = await VitalSigns.findById(req.params.id);
    if (!vitalSign) {
      return res.status(404).json({
        success: false,
        message: 'Vitalwerte-Eintrag nicht gefunden'
      });
    }
    
    await vitalSign.deleteOne();
    
    res.json({
      success: true,
      message: 'Vitalwerte erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting vital signs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Vitalwerte',
      error: error.message
    });
  }
});

module.exports = router;

