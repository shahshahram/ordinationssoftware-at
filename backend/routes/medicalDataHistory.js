const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const MedicalDataHistory = require('../models/MedicalDataHistory');
const Patient = require('../models/Patient');
const PatientExtended = require('../models/PatientExtended');

// GET /api/medical-data-history/patient/:patientId - Alle Historie-Einträge eines Patienten abrufen
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
    
    const history = await MedicalDataHistory.find({ patientId })
      .populate('recordedBy', 'firstName lastName email')
      .populate('appointmentId', 'date startTime endTime')
      .sort({ recordedAt: sortOrder })
      .limit(limitNum)
      .lean();
    
    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error('Error fetching medical data history:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Historie',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Interner Serverfehler',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/medical-data-history/:id - Einzelnen Historie-Eintrag abrufen
router.get('/:id', auth, checkPermission('patients.read'), async (req, res) => {
  try {
    const historyEntry = await MedicalDataHistory.findById(req.params.id)
      .populate('recordedBy', 'firstName lastName email')
      .populate('appointmentId', 'date startTime endTime')
      .populate('patientId', 'firstName lastName');
    
    if (!historyEntry) {
      return res.status(404).json({
        success: false,
        message: 'Historie-Eintrag nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: historyEntry
    });
  } catch (error) {
    console.error('Error fetching medical data history entry:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Historie',
      error: error.message
    });
  }
});

// POST /api/medical-data-history - Neuen Historie-Eintrag erstellen
router.post('/', auth, checkPermission('patients.write'), async (req, res) => {
  try {
    const { patientId, appointmentId, recordedAt, snapshot, changedFields, changeNotes } = req.body;
    
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
    
    // Erstelle neuen Historie-Eintrag
    const historyEntry = new MedicalDataHistory({
      patientId,
      appointmentId: appointmentId || null,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      recordedBy: req.user.id,
      snapshot: snapshot || {},
      changedFields: changedFields || [],
      changeNotes: changeNotes || ''
    });
    
    await historyEntry.save();
    
    // Lade den vollständigen Eintrag mit Populate
    const savedEntry = await MedicalDataHistory.findById(historyEntry._id)
      .populate('recordedBy', 'firstName lastName email')
      .populate('appointmentId', 'date startTime endTime');
    
    res.status(201).json({
      success: true,
      data: savedEntry,
      message: 'Historie-Eintrag erfolgreich erstellt'
    });
  } catch (error) {
    console.error('Error creating medical data history:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Historie',
      error: error.message
    });
  }
});

module.exports = router;












