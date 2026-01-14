const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const PatientNote = require('../models/PatientNote');
const PatientExtended = require('../models/PatientExtended');

// @route   GET /api/patient-notes/:patientId
// @desc    Get all notes for a patient (chronological)
// @access  Private
router.get('/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { noteType, chronological = 'true' } = req.query;
    
    // Prüfe ob Patient existiert
    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }
    
    const options = {
      noteType: noteType || undefined
    };
    
    // Lade Notizen chronologisch (älteste zuerst) oder neueste zuerst
    const notes = chronological === 'true'
      ? await PatientNote.findByPatientChronological(patientId, options)
      : await PatientNote.findByPatient(patientId, options);
    
    res.json({
      success: true,
      data: notes,
      count: notes.length
    });
  } catch (error) {
    console.error('Error fetching patient notes:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Notizen',
      error: error.message
    });
  }
});

// @route   POST /api/patient-notes
// @desc    Create a new patient note
// @access  Private
router.post('/', [
  auth,
  body('patientId').isMongoId().withMessage('Ungültige Patient-ID'),
  body('content').notEmpty().trim().withMessage('Notiz-Inhalt ist erforderlich'),
  body('noteType').optional().isIn(['general', 'medical']).withMessage('Ungültiger Notiz-Typ'),
  body('appointmentId').optional().isMongoId().withMessage('Ungültige Termin-ID')
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
    
    const { patientId, content, noteType = 'general', appointmentId } = req.body;
    
    // Prüfe ob Patient existiert
    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }
    
    // Erstelle neue Notiz
    const note = new PatientNote({
      patientId,
      content: content.trim(),
      noteType,
      appointmentId: appointmentId || undefined,
      createdBy: req.user.id,
      status: 'active',
      isDeleted: false
    });
    
    await note.save();
    
    // Populate für vollständige Daten
    await note.populate('createdBy', 'firstName lastName');
    
    // Erstelle automatisch einen Dekurs-Eintrag (EPA) für die Notiz
    try {
      const DekursEntry = require('../models/DekursEntry');
      const noteTypeLabel = noteType === 'medical' ? 'Medizinische Notiz' : 'Allgemeine Notiz';
      const notePreview = content.trim().length > 200 
        ? content.trim().substring(0, 200) + '...' 
        : content.trim();
      
      const dekursEntry = new DekursEntry({
        patientId,
        encounterId: appointmentId || undefined,
        entryDate: new Date(),
        createdBy: req.user.id,
        visitReason: noteTypeLabel,
        notes: notePreview,
        visitType: 'other',
        status: 'finalized'
      });
      await dekursEntry.save();
      console.log(`✅ Dekurs-Eintrag (EPA) für Notiz erstellt: ${dekursEntry._id}`);
    } catch (dekursError) {
      // Logge Fehler, aber verhindere nicht das Erstellen der Notiz
      console.error('⚠️ Fehler beim Erstellen des Dekurs-Eintrags für Notiz:', dekursError);
    }
    
    res.status(201).json({
      success: true,
      message: 'Notiz erfolgreich erstellt',
      data: note
    });
  } catch (error) {
    console.error('Error creating patient note:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Notiz',
      error: error.message
    });
  }
});

// @route   PUT /api/patient-notes/:id
// @desc    Update a patient note
// @access  Private
router.put('/:id', [
  auth,
  body('content').notEmpty().trim().withMessage('Notiz-Inhalt ist erforderlich'),
  body('changeReason').optional().trim().isLength({ max: 500 }).withMessage('Grund für Änderung darf maximal 500 Zeichen haben')
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
    
    const { id } = req.params;
    const { content, changeReason } = req.body;
    
    // Finde Notiz
    const note = await PatientNote.findById(id);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Notiz nicht gefunden'
      });
    }
    
    // Prüfe ob Notiz gelöscht wurde
    if (note.isDeleted || note.status === 'deleted') {
      return res.status(400).json({
        success: false,
        message: 'Notiz wurde bereits gelöscht'
      });
    }
    
    // Speichere vorherigen Inhalt für Historie
    const previousContent = note.content;
    
    // Aktualisiere Notiz
    note.content = content.trim();
    note.lastModifiedBy = req.user.id;
    if (changeReason) {
      note.changeReason = changeReason;
    }
    
    await note.save();
    
    // Populate für vollständige Daten
    await note.populate('createdBy', 'firstName lastName');
    await note.populate('lastModifiedBy', 'firstName lastName');
    await note.populate('editHistory.editedBy', 'firstName lastName');
    
    res.json({
      success: true,
      message: 'Notiz erfolgreich aktualisiert',
      data: note
    });
  } catch (error) {
    console.error('Error updating patient note:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Notiz',
      error: error.message
    });
  }
});

// @route   DELETE /api/patient-notes/:id
// @desc    Delete a patient note (soft delete)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Finde Notiz
    const note = await PatientNote.findById(id);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Notiz nicht gefunden'
      });
    }
    
    // Soft Delete
    note.isDeleted = true;
    note.status = 'deleted';
    note.lastModifiedBy = req.user.id;
    
    await note.save();
    
    res.json({
      success: true,
      message: 'Notiz erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting patient note:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Notiz',
      error: error.message
    });
  }
});

// @route   GET /api/patient-notes/:id/history
// @desc    Get edit history for a note
// @access  Private
router.get('/:id/history', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const note = await PatientNote.findById(id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName')
      .populate('editHistory.editedBy', 'firstName lastName');
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Notiz nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: {
        note: {
          id: note._id,
          content: note.content,
          createdAt: note.createdAt,
          createdBy: note.createdBy
        },
        editHistory: note.editHistory || []
      }
    });
  } catch (error) {
    console.error('Error fetching note history:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Bearbeitungshistorie',
      error: error.message
    });
  }
});

module.exports = router;
