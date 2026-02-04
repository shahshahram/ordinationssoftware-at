const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize, ACTIONS, RESOURCES } = require('../utils/rbac');
const WorkShift = require('../models/WorkShift');
const Absence = require('../models/Absence');
const StaffLocationAssignment = require('../models/StaffLocationAssignment');
const StaffMinimumCoverage = require('../models/StaffMinimumCoverage');
const Location = require('../models/Location');

/**
 * GET /api/staff-planning/overview
 * Aggregierte Schichten und Abwesenheiten für einen Datumsbereich, optional gefiltert nach Standort.
 * Query: startDate (ISO), endDate (ISO), locationId (optional)
 */
router.get('/overview', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.STAFF, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Mitarbeiterplanung'
      });
    }

    const { startDate, endDate, locationId } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate und endDate sind erforderlich'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    let staffIdsFilter = null;
    if (locationId) {
      const assignments = await StaffLocationAssignment.find({ location_id: locationId })
        .select('staff_id')
        .lean();
      const ids = assignments.map((a) => a.staff_id && a.staff_id.toString ? a.staff_id.toString() : a.staff_id).filter(Boolean);
      if (ids.length === 0) {
        return res.json({
          success: true,
          data: {
            workShifts: [],
            absences: []
          }
        });
      }
      staffIdsFilter = ids;
    }

    const workShiftQuery = {
      startsAt: { $gte: start },
      endsAt: { $lte: end },
      isActive: true
    };
    if (staffIdsFilter) workShiftQuery.staffId = { $in: staffIdsFilter };

    const absenceQuery = {
      startsAt: { $gte: start },
      endsAt: { $lte: end }
    };
    if (staffIdsFilter) absenceQuery.staffId = { $in: staffIdsFilter };

    const [workShifts, absences] = await Promise.all([
      WorkShift.find(workShiftQuery)
        .populate('staffId', 'displayName roleHint colorHex')
        .sort({ startsAt: 1 })
        .lean(),
      Absence.find(absenceQuery)
        .populate('staffId', 'displayName roleHint colorHex')
        .sort({ startsAt: 1 })
        .lean()
    ]);

    res.json({
      success: true,
      data: {
        workShifts,
        absences
      }
    });
  } catch (error) {
    console.error('Staff planning overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Planungsübersicht',
      error: error.message
    });
  }
});

/**
 * GET /api/staff-planning/minimum-coverage
 * Mindestbesetzung pro Standort/Wochentag. Query: locationId (optional)
 */
router.get('/minimum-coverage', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.STAFF, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Mitarbeiterplanung'
      });
    }

    const query = req.query.locationId ? { location_id: req.query.locationId } : {};
    const list = await StaffMinimumCoverage.find(query)
      .populate('location_id', 'name code')
      .sort({ location_id: 1, dayOfWeek: 1 })
      .lean();

    res.json({
      success: true,
      data: list
    });
  } catch (error) {
    console.error('Staff minimum coverage fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Mindestbesetzung',
      error: error.message
    });
  }
});

/**
 * PUT /api/staff-planning/minimum-coverage
 * Eine Mindestbesetzung setzen. Body: locationId, dayOfWeek (1–7), minimumCount
 */
router.put('/minimum-coverage', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.STAFF, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Ändern der Mindestbesetzung'
      });
    }

    const { locationId, dayOfWeek, minimumCount } = req.body;
    if (!locationId || dayOfWeek == null || minimumCount == null) {
      return res.status(400).json({
        success: false,
        message: 'locationId, dayOfWeek (1–7) und minimumCount sind erforderlich'
      });
    }
    const dow = parseInt(dayOfWeek, 10);
    const count = parseInt(minimumCount, 10);
    if (dow < 1 || dow > 7 || count < 0) {
      return res.status(400).json({
        success: false,
        message: 'dayOfWeek muss 1–7 sein, minimumCount >= 0'
      });
    }

    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    const doc = await StaffMinimumCoverage.findOneAndUpdate(
      { location_id: locationId, dayOfWeek: dow },
      { minimumCount: count },
      { new: true, upsert: true }
    ).populate('location_id', 'name code');

    res.json({
      success: true,
      data: doc
    });
  } catch (error) {
    console.error('Staff minimum coverage update error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Speichern der Mindestbesetzung',
      error: error.message
    });
  }
});

module.exports = router;
