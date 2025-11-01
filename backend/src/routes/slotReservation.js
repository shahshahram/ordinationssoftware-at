const express = require('express');
const router = express.Router();
const SlotReservation = require('../models/SlotReservation');
const Appointment = require('../models/Appointment');
const { authenticateToken, requiredRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Get all reservations for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, resourceId, start, end } = req.query;
    
    const query = { userId: req.user.id };
    
    if (status) {
      query.status = status;
    }
    
    if (resourceId) {
      query.resourceId = resourceId;
    }
    
    if (start && end) {
      query.start = { $gte: new Date(start) };
      query.end = { $lte: new Date(end) };
    }
    
    const reservations = await SlotReservation.find(query)
      .populate('appointmentId', 'title startTime endTime status')
      .sort({ createdAt: -1 });
    
    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

// Check for conflicts
router.post('/check-conflicts', [
  authenticateToken,
  body('start').isISO8601().withMessage('Valid start date required'),
  body('end').isISO8601().withMessage('Valid end date required'),
  body('resourceId').notEmpty().withMessage('Resource ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { start, end, resourceId, excludeId } = req.body;
    
    const conflicts = await SlotReservation.checkConflicts(
      new Date(start),
      new Date(end),
      resourceId,
      excludeId
    );
    
    res.json({
      hasConflicts: conflicts.length > 0,
      conflicts: conflicts.map(conflict => ({
        id: conflict._id,
        start: conflict.start,
        end: conflict.end,
        status: conflict.status,
        userId: conflict.userId
      }))
    });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({ error: 'Failed to check conflicts' });
  }
});

// Reserve a slot
router.post('/reserve', [
  authenticateToken,
  body('start').isISO8601().withMessage('Valid start date required'),
  body('end').isISO8601().withMessage('Valid end date required'),
  body('resourceId').notEmpty().withMessage('Resource ID required'),
  body('ttl').optional().isInt({ min: 1000, max: 300000 }).withMessage('TTL must be between 1-300 seconds')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { start, end, resourceId, metadata = {} } = req.body;
    const ttl = req.body.ttl || 30000; // Default 30 seconds
    
    // Validate time range
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (startDate >= endDate) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }
    
    // Check minimum duration (e.g., 15 minutes)
    const duration = endDate.getTime() - startDate.getTime();
    const minDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
    
    if (duration < minDuration) {
      return res.status(400).json({ error: 'Minimum appointment duration is 15 minutes' });
    }
    
    // Reserve slot
    const reservation = await SlotReservation.reserveSlot(
      startDate,
      endDate,
      resourceId,
      req.user.id,
      { ...metadata, ttl }
    );
    
    res.status(201).json({
      id: reservation._id,
      start: reservation.start,
      end: reservation.end,
      resourceId: reservation.resourceId,
      status: reservation.status,
      ttl: reservation.ttl,
      expiresAt: new Date(reservation.createdAt.getTime() + reservation.ttl)
    });
  } catch (error) {
    if (error.message === 'Slot conflict detected') {
      return res.status(409).json({ error: 'Slot is already reserved' });
    }
    
    console.error('Error reserving slot:', error);
    res.status(500).json({ error: 'Failed to reserve slot' });
  }
});

// Confirm a reservation (convert to appointment)
router.post('/:id/confirm', [
  authenticateToken,
  body('appointmentId').isMongoId().withMessage('Valid appointment ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { id } = req.params;
    const { appointmentId } = req.body;
    
    const reservation = await SlotReservation.findOne({
      _id: id,
      userId: req.user.id,
      status: 'pending'
    });
    
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found or already processed' });
    }
    
    if (reservation.isExpired()) {
      return res.status(410).json({ error: 'Reservation has expired' });
    }
    
    // Verify appointment exists and belongs to user
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctor: req.user.id
    });
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    // Confirm reservation
    await reservation.confirm(appointmentId);
    
    res.json({
      id: reservation._id,
      status: reservation.status,
      appointmentId: reservation.appointmentId
    });
  } catch (error) {
    console.error('Error confirming reservation:', error);
    res.status(500).json({ error: 'Failed to confirm reservation' });
  }
});

// Cancel a reservation
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const reservation = await SlotReservation.findOne({
      _id: id,
      userId: req.user.id,
      status: 'pending'
    });
    
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found or already processed' });
    }
    
    await reservation.cancel();
    
    res.json({
      id: reservation._id,
      status: reservation.status
    });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ error: 'Failed to cancel reservation' });
  }
});

// Get available slots for a time range
router.get('/available', [
  authenticateToken,
  body('start').isISO8601().withMessage('Valid start date required'),
  body('end').isISO8601().withMessage('Valid end date required'),
  body('resourceId').notEmpty().withMessage('Resource ID required'),
  body('duration').optional().isInt({ min: 15, max: 480 }).withMessage('Duration must be 15-480 minutes')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { start, end, resourceId, duration = 30 } = req.body;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const slotDuration = duration * 60 * 1000; // Convert to milliseconds
    
    // Get all reservations for the time range
    const reservations = await SlotReservation.find({
      resourceId,
      start: { $lt: endDate },
      end: { $gt: startDate },
      status: { $in: ['pending', 'confirmed'] }
    }).sort({ start: 1 });
    
    // Calculate available slots
    const availableSlots = [];
    let currentTime = startDate;
    
    while (currentTime < endDate) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration);
      
      if (slotEnd > endDate) break;
      
      // Check if this slot conflicts with any reservation
      const hasConflict = reservations.some(reservation => 
        currentTime < reservation.end && slotEnd > reservation.start
      );
      
      if (!hasConflict) {
        availableSlots.push({
          start: currentTime.toISOString(),
          end: slotEnd.toISOString(),
          duration: duration
        });
      }
      
      // Move to next slot (with 15-minute increments)
      currentTime = new Date(currentTime.getTime() + 15 * 60 * 1000);
    }
    
    res.json({
      availableSlots,
      totalSlots: availableSlots.length,
      requestedRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting available slots:', error);
    res.status(500).json({ error: 'Failed to get available slots' });
  }
});

// Clean up expired reservations (admin only)
router.delete('/cleanup', authenticateToken, requiredRole(['admin']), async (req, res) => {
  try {
    const result = await SlotReservation.deleteMany({
      status: 'pending',
      createdAt: { $lt: new Date(Date.now() - 300000) } // Older than 5 minutes
    });
    
    res.json({
      deletedCount: result.deletedCount,
      message: 'Expired reservations cleaned up'
    });
  } catch (error) {
    console.error('Error cleaning up reservations:', error);
    res.status(500).json({ error: 'Failed to clean up reservations' });
  }
});

module.exports = router;


