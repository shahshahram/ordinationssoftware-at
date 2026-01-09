const express = require('express');
const router = express.Router();
const SlotReservation = require('../models/SlotReservation');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

// @route   GET /api/slot-reservations
// @desc    Get all slot reservations
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const reservations = await SlotReservation.find()
      .populate('resourceId', 'name type')
      .populate('staffId', 'firstName lastName')
      .sort({ startTime: 1 });

    res.json({
      success: true,
      reservations
    });
  } catch (error) {
    logger.error('Error fetching slot reservations:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Slot-Reservierungen'
    });
  }
});

// @route   POST /api/slot-reservations
// @desc    Create a new slot reservation
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      resourceId,
      staffId,
      startTime,
      endTime,
      status = 'reserved',
      notes
    } = req.body;

    // Validate required fields
    if (!resourceId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Resource ID, Start- und Endzeit sind erforderlich'
      });
    }

    // Check for conflicts
    const conflictingReservation = await SlotReservation.findOne({
      resourceId,
      $or: [
        {
          startTime: { $lt: new Date(endTime) },
          endTime: { $gt: new Date(startTime) }
        }
      ],
      status: { $in: ['reserved', 'confirmed'] }
    });

    if (conflictingReservation) {
      return res.status(409).json({
        success: false,
        message: 'Zeitslot bereits reserviert',
        conflictingReservation
      });
    }

    const reservation = new SlotReservation({
      resourceId,
      staffId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status,
      notes,
      createdBy: req.user.id
    });

    await reservation.save();

    res.status(201).json({
      success: true,
      message: 'Slot-Reservierung erfolgreich erstellt',
      reservation
    });
  } catch (error) {
    logger.error('Error creating slot reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Slot-Reservierung'
    });
  }
});

// @route   PUT /api/slot-reservations/:id
// @desc    Update a slot reservation
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const reservation = await SlotReservation.findById(id);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Slot-Reservierung nicht gefunden'
      });
    }

    // Check for conflicts if time is being updated
    if (updates.startTime || updates.endTime) {
      const startTime = updates.startTime ? new Date(updates.startTime) : reservation.startTime;
      const endTime = updates.endTime ? new Date(updates.endTime) : reservation.endTime;

      const conflictingReservation = await SlotReservation.findOne({
        _id: { $ne: id },
        resourceId: updates.resourceId || reservation.resourceId,
        $or: [
          {
            startTime: { $lt: endTime },
            endTime: { $gt: startTime }
          }
        ],
        status: { $in: ['reserved', 'confirmed'] }
      });

      if (conflictingReservation) {
        return res.status(409).json({
          success: false,
          message: 'Zeitslot bereits reserviert',
          conflictingReservation
        });
      }
    }

    Object.assign(reservation, updates);
    reservation.updatedBy = req.user.id;
    await reservation.save();

    res.json({
      success: true,
      message: 'Slot-Reservierung erfolgreich aktualisiert',
      reservation
    });
  } catch (error) {
    logger.error('Error updating slot reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Slot-Reservierung'
    });
  }
});

// @route   DELETE /api/slot-reservations/:id
// @desc    Delete a slot reservation
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const reservation = await SlotReservation.findById(id);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Slot-Reservierung nicht gefunden'
      });
    }

    await SlotReservation.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Slot-Reservierung erfolgreich gelöscht'
    });
  } catch (error) {
    logger.error('Error deleting slot reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Slot-Reservierung'
    });
  }
});

// @route   GET /api/slot-reservations/availability
// @desc    Check resource availability for a time slot
// @access  Private
router.get('/availability', auth, async (req, res) => {
  try {
    const { resourceId, startTime, endTime } = req.query;

    if (!resourceId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Resource ID, Start- und Endzeit sind erforderlich'
      });
    }

    const conflictingReservation = await SlotReservation.findOne({
      resourceId,
      $or: [
        {
          startTime: { $lt: new Date(endTime) },
          endTime: { $gt: new Date(startTime) }
        }
      ],
      status: { $in: ['reserved', 'confirmed'] }
    });

    res.json({
      success: true,
      available: !conflictingReservation,
      conflictingReservation
    });
  } catch (error) {
    logger.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Überprüfen der Verfügbarkeit'
    });
  }
});

module.exports = router;


