const express = require('express');
const auth = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const router = express.Router();

// @route   GET /api/appointments
// @desc    Termine abrufen (optional gefiltert) mit Paginierung
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { patientId, doctorId, locationId, from, to, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (patientId) filter.patient = patientId;
    if (doctorId) filter.doctor = doctorId;
    if (locationId) filter.locationId = locationId;
    if (from || to) {
      filter.startTime = {};
      if (from) filter.startTime.$gte = new Date(from);
      if (to) filter.startTime.$lte = new Date(to);
    }

    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 200);

    const [items, total] = await Promise.all([
      Appointment.find(filter)
        .sort({ startTime: -1 })
        .limit(parsedLimit)
        .skip((parsedPage - 1) * parsedLimit)
        .lean(),
      Appointment.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        current: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('Appointments fetch error:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Laden der Termine' });
  }
});

module.exports = router;
