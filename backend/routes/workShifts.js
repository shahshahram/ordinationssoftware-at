const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const WorkShift = require('../models/WorkShift');
const StaffProfile = require('../models/StaffProfile');
const AuditLog = require('../models/AuditLog');

// Alle Schichten abrufen
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      staffId = '', 
      startDate = '', 
      endDate = '',
      shiftType = '',
      active = 'true'
    } = req.query;

    const query = {};

    // Mitarbeiterfilter
    if (staffId) {
      query.staffId = staffId;
    }

    // Datumsfilter
    if (startDate && endDate) {
      query.startsAt = { $gte: new Date(startDate) };
      query.endsAt = { $lte: new Date(endDate) };
    }

    // Schichttypfilter
    if (shiftType) {
      query.shiftType = shiftType;
    }

    // Aktivitätsfilter
    if (active !== '') {
      query.isActive = active === 'true';
    }

    const workShifts = await WorkShift.find(query)
      .populate('staffId', 'displayName roleHint colorHex')
      .populate('availableServices', 'name code duration')
      .populate('availableResources', 'name type category')
      .sort({ startsAt: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await WorkShift.countDocuments(query);

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'work_shifts.read',
      description: 'Arbeitszeiten abgerufen',
      details: { page, limit, staffId, startDate, endDate }
    });

    res.json({
      success: true,
      data: workShifts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('WorkShift fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Arbeitszeiten',
      error: error.message
    });
  }
});

// Schicht erstellen
router.post('/', auth, [
  body('staffId').notEmpty().withMessage('Mitarbeiter-ID ist erforderlich'),
  body('startsAt').isISO8601().withMessage('Startzeit muss ein gültiges Datum sein'),
  body('endsAt').isISO8601().withMessage('Endzeit muss ein gültiges Datum sein'),
  body('shiftType').optional().isIn(['regular', 'overtime', 'on_call', 'emergency']).withMessage('Ungültiger Schichttyp')
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

    // Berechtigung prüfen
    if (!req.user.permissions.includes('resources.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Erstellen von Arbeitszeiten'
      });
    }

    // Prüfen ob Mitarbeiter existiert
    const staffProfile = await StaffProfile.findById(req.body.staffId);
    if (!staffProfile) {
      return res.status(400).json({
        success: false,
        message: 'Mitarbeiter nicht gefunden'
      });
    }

    // Validierung: Endzeit muss nach Startzeit liegen
    const startsAt = new Date(req.body.startsAt);
    const endsAt = new Date(req.body.endsAt);
    if (endsAt <= startsAt) {
      return res.status(400).json({
        success: false,
        message: 'Endzeit muss nach Startzeit liegen'
      });
    }

    const workShift = new WorkShift(req.body);
    await workShift.save();
    await workShift.populate('staffId', 'displayName roleHint colorHex');

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'work_shifts.create',
      description: 'Arbeitszeit erstellt',
      details: { 
        workShiftId: workShift._id, 
        staffId: workShift.staffId._id,
        startsAt: workShift.startsAt,
        endsAt: workShift.endsAt
      }
    });

    res.status(201).json({
      success: true,
      data: workShift
    });
  } catch (error) {
    console.error('WorkShift creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Arbeitszeit',
      error: error.message
    });
  }
});

// Schicht aktualisieren
router.put('/:id', auth, [
  body('startsAt').optional().isISO8601().withMessage('Startzeit muss ein gültiges Datum sein'),
  body('endsAt').optional().isISO8601().withMessage('Endzeit muss ein gültiges Datum sein'),
  body('shiftType').optional().isIn(['regular', 'overtime', 'on_call', 'emergency']).withMessage('Ungültiger Schichttyp')
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

    // Berechtigung prüfen
    if (!req.user.permissions.includes('resources.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Aktualisieren von Arbeitszeiten'
      });
    }

    const workShift = await WorkShift.findById(req.params.id);
    if (!workShift) {
      return res.status(404).json({
        success: false,
        message: 'Arbeitszeit nicht gefunden'
      });
    }

    // Validierung: Endzeit muss nach Startzeit liegen
    if (req.body.startsAt && req.body.endsAt) {
      const startsAt = new Date(req.body.startsAt);
      const endsAt = new Date(req.body.endsAt);
      if (endsAt <= startsAt) {
        return res.status(400).json({
          success: false,
          message: 'Endzeit muss nach Startzeit liegen'
        });
      }
    }

    Object.assign(workShift, req.body);
    workShift.updatedAt = new Date();
    await workShift.save();
    await workShift.populate('staffId', 'displayName roleHint colorHex');

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'work_shifts.update',
      description: 'Arbeitszeit aktualisiert',
      details: { workShiftId: req.params.id, changes: req.body }
    });

    res.json({
      success: true,
      data: workShift
    });
  } catch (error) {
    console.error('WorkShift update error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Arbeitszeit',
      error: error.message
    });
  }
});

// Schicht löschen
router.delete('/:id', auth, async (req, res) => {
  try {
    // Berechtigung prüfen
    if (!req.user.permissions.includes('resources.delete')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Löschen von Arbeitszeiten'
      });
    }

    const workShift = await WorkShift.findById(req.params.id);
    if (!workShift) {
      return res.status(404).json({
        success: false,
        message: 'Arbeitszeit nicht gefunden'
      });
    }

    await WorkShift.findByIdAndDelete(req.params.id);

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'work_shifts.delete',
      description: 'Arbeitszeit gelöscht',
      details: { workShiftId: req.params.id, staffId: workShift.staffId }
    });

    res.json({
      success: true,
      message: 'Arbeitszeit erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('WorkShift delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Arbeitszeit',
      error: error.message
    });
  }
});

// Schichten für Mitarbeiter abrufen
router.get('/staff/:staffId', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start- und Enddatum sind erforderlich'
      });
    }

    const workShifts = await WorkShift.getShiftsForDateRange(
      req.params.staffId, 
      new Date(startDate), 
      new Date(endDate)
    );

    res.json({
      success: true,
      data: workShifts
    });
  } catch (error) {
    console.error('WorkShift fetch for staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Arbeitszeiten für Mitarbeiter',
      error: error.message
    });
  }
});

// Verfügbare Slots für Mitarbeiter abrufen
router.get('/staff/:staffId/availability', auth, async (req, res) => {
  try {
    const { date, serviceId } = req.query;
    
    if (!date || !serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Datum und Service-ID sind erforderlich'
      });
    }

    const slots = await WorkShift.getAvailableSlots(
      req.params.staffId,
      new Date(date),
      serviceId
    );

    res.json({
      success: true,
      data: slots
    });
  } catch (error) {
    console.error('WorkShift availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der verfügbaren Slots',
      error: error.message
    });
  }
});

// Schicht-Status umschalten
router.patch('/:id/toggle-status', auth, async (req, res) => {
  try {
    // Berechtigung prüfen
    if (!req.user.permissions.includes('resources.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Ändern des Schicht-Status'
      });
    }

    const workShift = await WorkShift.findById(req.params.id);
    if (!workShift) {
      return res.status(404).json({
        success: false,
        message: 'Arbeitszeit nicht gefunden'
      });
    }

    workShift.isActive = !workShift.isActive;
    workShift.updatedAt = new Date();
    await workShift.save();

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'work_shifts.toggle_status',
      description: `Arbeitszeit ${workShift.isActive ? 'aktiviert' : 'deaktiviert'}`,
      details: { workShiftId: req.params.id, newStatus: workShift.isActive }
    });

    res.json({
      success: true,
      data: workShift,
      message: `Arbeitszeit ${workShift.isActive ? 'aktiviert' : 'deaktiviert'}`
    });
  } catch (error) {
    console.error('WorkShift toggle status error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Umschalten des Schicht-Status',
      error: error.message
    });
  }
});

module.exports = router;
