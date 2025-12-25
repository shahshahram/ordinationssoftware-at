const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const PatientMedication = require('../models/PatientMedication');
const MedicationCatalog = require('../models/MedicationCatalog');
const PatientExtended = require('../models/PatientExtended');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const interactionService = require('../services/medicationInteractionService');
const dosageService = require('../services/medicationDosageService');

// Optional Auth Middleware
const optionalAuth = async (req, res, next) => {
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const User = require('../models/User');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId || decoded.user?.id;
      const user = await User.findById(userId).select('-password');
      if (user) req.user = user;
    } catch (err) {
      // Auth optional, weiter ohne User
    }
  }
  next();
};

// Middleware: Prüft ob :id eine gültige ObjectId ist (verhindert Konflikt mit /search)
const validateObjectId = (req, res, next) => {
  if (req.params.id && !mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Ungültige Medikament-ID'
    });
  }
  next();
};

// GET /api/medications/patient/:patientId - Medikamente eines Patienten
router.get('/patient/:patientId', optionalAuth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status, encounterId, page = 1, limit = 50 } = req.query;

    let query = { patientId };
    if (status) query.status = status;
    if (encounterId) query.encounterId = encounterId;

    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);

    const [medications, total] = await Promise.all([
      PatientMedication.find(query)
        .populate('encounterId', 'startTime endTime title')
        .populate('medicationId', 'name atcCode strength strengthUnit form')
        .populate('createdBy', 'firstName lastName')
        .populate('prescribedBy', 'firstName lastName')
        .sort({ startDate: -1 })
        .limit(parsedLimit)
        .skip((parsedPage - 1) * parsedLimit),
      PatientMedication.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: medications,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('Error fetching patient medications:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Medikamente'
    });
  }
});

// GET /api/medications/patient/:patientId/active - Aktive Medikamente
router.get('/patient/:patientId/active', optionalAuth, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const medications = await PatientMedication.findActive(patientId);

    res.json({
      success: true,
      data: medications
    });
  } catch (error) {
    console.error('Error fetching active medications:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der aktiven Medikamente'
    });
  }
});

// GET /api/medications/encounter/:encounterId - Medikamente eines Termins
router.get('/encounter/:encounterId', auth, async (req, res) => {
  try {
    const { encounterId } = req.params;

    const medications = await PatientMedication.findByEncounter(encounterId);

    res.json({
      success: true,
      data: medications
    });
  } catch (error) {
    console.error('Error fetching encounter medications:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Termin-Medikamente'
    });
  }
});

// GET /api/medications/:id - Einzelnes Medikament
router.get('/:id', optionalAuth, validateObjectId, async (req, res) => {
  try {
    const medication = await PatientMedication.findById(req.params.id)
      .populate('patientId', 'firstName lastName')
      .populate('encounterId', 'startTime endTime title')
      .populate('medicationId', 'name atcCode strength strengthUnit form')
      .populate('createdBy', 'firstName lastName')
      .populate('prescribedBy', 'firstName lastName');

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medikament nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: medication
    });
  } catch (error) {
    console.error('Error fetching medication:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Medikaments'
    });
  }
});

// POST /api/medications - Neues Medikament erstellen
router.post('/', auth, [
  body('patientId').notEmpty().withMessage('Patient-ID ist erforderlich'),
  body('name').notEmpty().trim().withMessage('Medikamentenname ist erforderlich'),
  body('dosage').notEmpty().trim().withMessage('Dosierung ist erforderlich'),
  body('frequency').notEmpty().trim().withMessage('Einnahmehäufigkeit ist erforderlich'),
  body('startDate').optional().isISO8601().withMessage('Ungültiges Startdatum')
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

    const {
      patientId,
      encounterId,
      medicationId,
      name,
      atcCode,
      strength,
      strengthUnit,
      form,
      dosage,
      frequency,
      duration,
      startDate,
      endDate,
      source = 'clinical',
      instructions,
      notes,
      indication
    } = req.body;

    // Prüfe ob Patient existiert
    const PatientExtended = require('../models/PatientExtended');
    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }

    // Wenn medicationId vorhanden, lade Medikament aus Katalog
    let medicationData = { name, atcCode, strength, strengthUnit, form };
    if (medicationId) {
      const catalogMedication = await MedicationCatalog.findById(medicationId);
      if (catalogMedication) {
        medicationData = {
          name: catalogMedication.name,
          atcCode: catalogMedication.atcCode,
          strength: catalogMedication.strength,
          strengthUnit: catalogMedication.strengthUnit,
          form: catalogMedication.form
        };
      }
    }

    const medication = new PatientMedication({
      patientId,
      encounterId,
      medicationId,
      ...medicationData,
      dosage,
      frequency,
      duration,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : undefined,
      source,
      prescribedBy: req.user._id || req.user.id,
      prescribedAt: new Date(),
      instructions,
      notes,
      indication,
      createdBy: req.user._id || req.user.id,
      lastModifiedBy: req.user._id || req.user.id
    });

    await medication.save();

    // Audit-Log wird hier weggelassen, da PatientMedication bereits einen eigenen auditTrail hat

    res.status(201).json({
      success: true,
      data: medication
    });
  } catch (error) {
    console.error('Error creating medication:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Medikaments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PATCH /api/medications/:id - Medikament aktualisieren
router.patch('/:id', auth, validateObjectId, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const medication = await PatientMedication.findById(id);
    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medikament nicht gefunden'
      });
    }

    // Wenn medicationId geändert wird, lade neue Daten aus Katalog
    if (updateData.medicationId && updateData.medicationId !== medication.medicationId?.toString()) {
      const catalogMedication = await MedicationCatalog.findById(updateData.medicationId);
      if (catalogMedication) {
        updateData.name = catalogMedication.name;
        updateData.atcCode = catalogMedication.atcCode;
        updateData.strength = catalogMedication.strength;
        updateData.strengthUnit = catalogMedication.strengthUnit;
        updateData.form = catalogMedication.form;
      }
    }

    // Datum-Konvertierung
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

    Object.assign(medication, updateData);
    medication.lastModifiedBy = req.user._id;
    await medication.save();

    // Audit-Log wird hier weggelassen, da PatientMedication bereits einen eigenen auditTrail hat

    res.json({
      success: true,
      data: medication
    });
  } catch (error) {
    console.error('Error updating medication:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Medikaments'
    });
  }
});

// PUT /api/medications/:id - Medikament aktualisieren (vollständig)
router.put('/:id', optionalAuth, validateObjectId, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const medication = await PatientMedication.findById(id);
    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medikament nicht gefunden'
      });
    }

    // Speichere Änderungen für Audit-Trail
    const changes = {};
    Object.keys(updates).forEach(key => {
      if (medication[key] !== updates[key]) {
        changes[key] = {
          from: medication[key],
          to: updates[key]
        };
      }
    });

    // Wenn medicationId geändert wird, lade neue Daten aus Katalog
    if (updates.medicationId && updates.medicationId !== medication.medicationId?.toString()) {
      const catalogMedication = await MedicationCatalog.findById(updates.medicationId);
      if (catalogMedication) {
        updates.name = catalogMedication.name;
        updates.atcCode = catalogMedication.atcCode;
        updates.strength = catalogMedication.strength;
        updates.strengthUnit = catalogMedication.strengthUnit;
        updates.form = catalogMedication.form;
      }
    }

    // Datum-Konvertierung
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);

    const updatedMedication = await PatientMedication.findByIdAndUpdate(
      id,
      { ...updates, lastModifiedBy: req.user?._id, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedMedication) {
      return res.status(404).json({
        success: false,
        message: 'Medikament nicht gefunden'
      });
    }

    // Audit-Log wird hier weggelassen, da PatientMedication bereits einen eigenen auditTrail hat

    res.json({
      success: true,
      data: updatedMedication,
      message: 'Medikament erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Error updating medication:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Medikaments'
    });
  }
});

// DELETE /api/medications/:id - Medikament löschen
router.delete('/:id', optionalAuth, validateObjectId, async (req, res) => {
  try {
    const { id } = req.params;

    const medication = await PatientMedication.findByIdAndDelete(id);
    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medikament nicht gefunden'
      });
    }

    // Audit-Log wird hier weggelassen, da PatientMedication bereits einen eigenen auditTrail hat

    res.json({
      success: true,
      message: 'Medikament erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting medication:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Medikaments'
    });
  }
});

// POST /api/medications/:id/discontinue - Medikament absetzen
router.post('/:id/discontinue', auth, validateObjectId, [
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const medication = await PatientMedication.findById(id);
    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medikament nicht gefunden'
      });
    }

    medication.discontinue(req.user._id, reason);
    await medication.save();

    res.json({
      success: true,
      data: medication,
      message: 'Medikament erfolgreich abgesetzt'
    });
  } catch (error) {
    console.error('Error discontinuing medication:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Absetzen des Medikaments'
    });
  }
});

// POST /api/medications/:id/reactivate - Medikament reaktivieren
router.post('/:id/reactivate', auth, validateObjectId, [
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const medication = await PatientMedication.findById(id);
    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medikament nicht gefunden'
      });
    }

    medication.reactivate(req.user._id, reason);
    await medication.save();

    res.json({
      success: true,
      data: medication,
      message: 'Medikament erfolgreich reaktiviert'
    });
  } catch (error) {
    console.error('Error reactivating medication:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Reaktivieren des Medikaments'
    });
  }
});

/**
 * @route   GET /api/medications/patient/:patientId/interactions
 * @desc    Prüft Wechselwirkungen für alle aktiven Medikamente eines Patienten
 * @access  Private
 */
router.get('/patient/:patientId/interactions', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Lade alle aktiven Medikamente des Patienten
    const medications = await PatientMedication.find({
      patientId,
      status: 'active'
    }).lean();
    
    // Prüfe Wechselwirkungen
    const interactions = interactionService.checkAllInteractions(medications);
    
    res.json({
      success: true,
      data: {
        interactions,
        medicationCount: medications.length,
        interactionCount: interactions.length
      }
    });
  } catch (error) {
    console.error('Error checking medication interactions:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Wechselwirkungsprüfung',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/medications/check-interaction
 * @desc    Prüft Wechselwirkungen für ein neues Medikament gegen bestehende Medikamente
 * @access  Private
 */
router.post('/check-interaction', auth, [
  body('patientId').notEmpty().withMessage('Patient-ID ist erforderlich'),
  body('atcCode').notEmpty().withMessage('ATC-Code ist erforderlich'),
  body('name').notEmpty().withMessage('Medikamentenname ist erforderlich')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  
  try {
    const { patientId, atcCode, name } = req.body;
    
    // Lade alle aktiven Medikamente des Patienten
    const existingMedications = await PatientMedication.find({
      patientId,
      status: 'active'
    }).lean();
    
    // Prüfe Wechselwirkungen für das neue Medikament
    const newMedication = { atcCode, name };
    const interactions = interactionService.checkNewMedicationInteractions(
      newMedication,
      existingMedications
    );
    
    res.json({
      success: true,
      data: {
        interactions,
        interactionCount: interactions.length,
        hasInteractions: interactions.length > 0
      }
    });
  } catch (error) {
    console.error('Error checking medication interaction:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Wechselwirkungsprüfung',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/medications/validate-dosage
 * @desc    Prüft Dosierung für ein Medikament basierend auf Patientendaten
 * @access  Private
 */
router.post('/validate-dosage', auth, [
  body('patientId').notEmpty().withMessage('Patient-ID ist erforderlich'),
  body('medication').notEmpty().withMessage('Medikamentendaten sind erforderlich')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  
  try {
    const { patientId, medication } = req.body;
    
    // Lade Patientendaten
    const patient = await PatientExtended.findById(patientId).lean();
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }
    
    // Prüfe Dosierung
    const validationResult = dosageService.validateDosage(medication, patient);
    
    res.json({
      success: true,
      data: validationResult
    });
  } catch (error) {
    console.error('Error validating medication dosage:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Dosierungsprüfung',
      error: error.message
    });
  }
});

module.exports = router;

