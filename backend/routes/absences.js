const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Absence = require('../models/Absence');
const StaffProfile = require('../models/StaffProfile');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Alle Abwesenheiten abrufen
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      staffId = '', 
      startDate = '', 
      endDate = '',
      reason = '',
      status = '',
      year = new Date().getFullYear()
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
    } else if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);
      query.startsAt = { $gte: startOfYear };
      query.endsAt = { $lte: endOfYear };
    }

    // Grundfilter
    if (reason) {
      query.reason = reason;
    }

    // Statusfilter
    if (status) {
      query.status = status;
    }

    const absences = await Absence.find(query)
      .populate('staffId', 'displayName roleHint colorHex')
      .populate('approvedBy', 'firstName lastName')
      .populate('replacement.staffId', 'displayName roleHint')
      .sort({ startsAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Absence.countDocuments(query);

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'absences.read',
      description: 'Abwesenheiten abgerufen',
      details: { page, limit, staffId, startDate, endDate, reason, status }
    });

    res.json({
      success: true,
      data: absences,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Absence fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Abwesenheiten',
      error: error.message
    });
  }
});

// Abwesenheit erstellen
router.post('/', auth, [
  body('staffId').notEmpty().withMessage('Mitarbeiter-ID ist erforderlich'),
  body('startsAt').isISO8601().withMessage('Startdatum muss ein gültiges Datum sein'),
  body('endsAt').isISO8601().withMessage('Enddatum muss ein gültiges Datum sein'),
  body('reason').isIn(['vacation', 'sick', 'personal', 'training', 'conference', 'other']).withMessage('Ungültiger Grund'),
  body('urgency').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Ungültige Dringlichkeit')
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
    if (!req.user.permissions.includes('appointments.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Erstellen von Abwesenheiten'
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

    // Validierung: Enddatum muss nach Startdatum liegen
    const startsAt = new Date(req.body.startsAt);
    const endsAt = new Date(req.body.endsAt);
    if (endsAt <= startsAt) {
      return res.status(400).json({
        success: false,
        message: 'Enddatum muss nach Startdatum liegen'
      });
    }

    // Prüfen ob Abwesenheit mit bestehenden kollidiert
    const conflictingAbsence = await Absence.findOne({
      staffId: req.body.staffId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        {
          startsAt: { $lte: endsAt },
          endsAt: { $gte: startsAt }
        }
      ]
    });

    if (conflictingAbsence) {
      return res.status(400).json({
        success: false,
        message: 'Abwesenheit kollidiert mit bestehender Abwesenheit'
      });
    }

    const absence = new Absence({
      ...req.body,
      createdBy: req.user._id
    });

    await absence.save();
    await absence.populate('staffId', 'displayName roleHint colorHex');

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'absences.create',
      description: 'Abwesenheit erstellt',
      details: { 
        absenceId: absence._id, 
        staffId: absence.staffId._id,
        reason: absence.reason,
        startsAt: absence.startsAt,
        endsAt: absence.endsAt
      }
    });

    res.status(201).json({
      success: true,
      data: absence
    });
  } catch (error) {
    console.error('Absence creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Abwesenheit',
      error: error.message
    });
  }
});

// Abwesenheit aktualisieren
router.put('/:id', auth, [
  body('startsAt').optional().isISO8601().withMessage('Startdatum muss ein gültiges Datum sein'),
  body('endsAt').optional().isISO8601().withMessage('Enddatum muss ein gültiges Datum sein'),
  body('reason').optional().isIn(['vacation', 'sick', 'personal', 'training', 'conference', 'other']).withMessage('Ungültiger Grund'),
  body('status').optional().isIn(['pending', 'approved', 'rejected', 'cancelled']).withMessage('Ungültiger Status')
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
    if (!req.user.permissions.includes('appointments.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Aktualisieren von Abwesenheiten'
      });
    }

    const absence = await Absence.findById(req.params.id);
    if (!absence) {
      return res.status(404).json({
        success: false,
        message: 'Abwesenheit nicht gefunden'
      });
    }

    // Validierung: Enddatum muss nach Startdatum liegen
    if (req.body.startsAt && req.body.endsAt) {
      const startsAt = new Date(req.body.startsAt);
      const endsAt = new Date(req.body.endsAt);
      if (endsAt <= startsAt) {
        return res.status(400).json({
          success: false,
          message: 'Enddatum muss nach Startdatum liegen'
        });
      }
    }

    // Status-Änderung: Genehmigung erforderlich
    if (req.body.status && req.body.status !== absence.status) {
      if (req.body.status === 'approved' || req.body.status === 'rejected') {
        req.body.approvedBy = req.user._id;
        req.body.approvedAt = new Date();
      }
    }

    Object.assign(absence, req.body);
    absence.updatedAt = new Date();
    await absence.save();
    await absence.populate('staffId', 'displayName roleHint colorHex');
    await absence.populate('approvedBy', 'firstName lastName');

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'absences.update',
      description: 'Abwesenheit aktualisiert',
      details: { absenceId: req.params.id, changes: req.body }
    });

    res.json({
      success: true,
      data: absence
    });
  } catch (error) {
    console.error('Absence update error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Abwesenheit',
      error: error.message
    });
  }
});

// Abwesenheit löschen
router.delete('/:id', auth, async (req, res) => {
  try {
    // Berechtigung prüfen
    if (!req.user.permissions.includes('appointments.delete')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Löschen von Abwesenheiten'
      });
    }

    const absence = await Absence.findById(req.params.id);
    if (!absence) {
      return res.status(404).json({
        success: false,
        message: 'Abwesenheit nicht gefunden'
      });
    }

    // Prüfen ob Abwesenheit gelöscht werden kann
    if (!absence.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: 'Abwesenheit kann nicht gelöscht werden'
      });
    }

    await Absence.findByIdAndDelete(req.params.id);

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'absences.delete',
      description: 'Abwesenheit gelöscht',
      details: { absenceId: req.params.id, staffId: absence.staffId }
    });

    res.json({
      success: true,
      message: 'Abwesenheit erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Absence delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Abwesenheit',
      error: error.message
    });
  }
});

// Ausstehende Genehmigungen abrufen
router.get('/pending-approvals', auth, async (req, res) => {
  try {
    // Berechtigung prüfen
    if (!req.user.permissions.includes('appointments.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Anzeigen von ausstehenden Genehmigungen'
      });
    }

    const pendingAbsences = await Absence.getPendingApprovals();

    res.json({
      success: true,
      data: pendingAbsences
    });
  } catch (error) {
    console.error('Pending approvals fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der ausstehenden Genehmigungen',
      error: error.message
    });
  }
});

// Abwesenheitsstatistiken abrufen
router.get('/statistics/:staffId', auth, async (req, res) => {
  try {
    const { staffId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    // Berechtigung prüfen
    if (!req.user.permissions.includes('reports.read')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Anzeigen von Statistiken'
      });
    }

    const statistics = await Absence.getAbsenceStatistics(staffId, parseInt(year));

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Absence statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Abwesenheitsstatistiken',
      error: error.message
    });
  }
});

// Abwesenheit genehmigen/ablehnen
router.patch('/:id/approve', auth, [
  body('status').isIn(['approved', 'rejected']).withMessage('Status muss approved oder rejected sein'),
  body('comment').optional().isString().withMessage('Kommentar muss ein String sein')
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
    if (!req.user.permissions.includes('appointments.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Genehmigen von Abwesenheiten'
      });
    }

    const absence = await Absence.findById(req.params.id);
    if (!absence) {
      return res.status(404).json({
        success: false,
        message: 'Abwesenheit nicht gefunden'
      });
    }

    if (absence.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Abwesenheit ist nicht zur Genehmigung ausstehend'
      });
    }

    absence.status = req.body.status;
    absence.approvedBy = req.user._id;
    absence.approvedAt = new Date();
    absence.approvalComment = req.body.comment || '';
    absence.updatedAt = new Date();

    await absence.save();
    await absence.populate('staffId', 'displayName roleHint colorHex');
    await absence.populate('approvedBy', 'firstName lastName');

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'absences.approve',
      description: `Abwesenheit ${req.body.status === 'approved' ? 'genehmigt' : 'abgelehnt'}`,
      details: { 
        absenceId: req.params.id, 
        status: req.body.status,
        comment: req.body.comment
      }
    });

    res.json({
      success: true,
      data: absence,
      message: `Abwesenheit ${req.body.status === 'approved' ? 'genehmigt' : 'abgelehnt'}`
    });
  } catch (error) {
    console.error('Absence approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Genehmigen der Abwesenheit',
      error: error.message
    });
  }
});

// Verfügbare Gründe abrufen
router.get('/reasons/available', auth, async (req, res) => {
  try {
    const reasons = [
      { value: 'vacation', label: 'Urlaub' },
      { value: 'sick', label: 'Krankheit' },
      { value: 'personal', label: 'Persönlich' },
      { value: 'training', label: 'Fortbildung' },
      { value: 'conference', label: 'Konferenz' },
      { value: 'other', label: 'Sonstiges' }
    ];

    res.json({
      success: true,
      data: reasons
    });
  } catch (error) {
    console.error('Available reasons fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der verfügbaren Gründe',
      error: error.message
    });
  }
});

module.exports = router;
