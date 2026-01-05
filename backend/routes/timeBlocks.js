const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const TimeBlock = require('../models/TimeBlock');
const Appointment = require('../models/Appointment');
const router = express.Router();

// @route   GET /api/time-blocks
// @desc    TimeBlocks abrufen (optional gefiltert)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      doctorId, 
      staffId,
      locationId, 
      startDate, 
      endDate, 
      status,
      page = 1, 
      limit = 100 
    } = req.query;

    const filter = {};
    
    // Unterstütze sowohl staffId als auch doctorId (für Rückwärtskompatibilität)
    const targetStaffId = staffId || doctorId;
    if (targetStaffId) {
      filter.$or = [
        { staffId: targetStaffId },
        { doctor: targetStaffId } // Rückwärtskompatibilität
      ];
    }
    if (locationId) filter.locationId = locationId;
    if (status) filter.status = status;
    
    // Zeitbereich-Filter
    if (startDate || endDate) {
      filter.$or = [];
      if (startDate && endDate) {
        // TimeBlocks die sich mit dem Zeitbereich überschneiden
        filter.$or.push(
          {
            startTime: { $lte: new Date(endDate) },
            endTime: { $gte: new Date(startDate) }
          }
        );
      } else if (startDate) {
        filter.endTime = { $gte: new Date(startDate) };
      } else if (endDate) {
        filter.startTime = { $lte: new Date(endDate) };
      }
    }

    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 500);

    const items = await TimeBlock.find(filter)
      .sort({ startTime: 1 })
      .limit(parsedLimit)
      .skip((parsedPage - 1) * parsedLimit)
      .populate('staffId', 'firstName lastName email')
      .populate('doctor', 'firstName lastName email') // Rückwärtskompatibilität
      .populate('locationId', 'name code')
      .populate('assigned_rooms', 'name number location')
      .populate('assigned_devices', 'name type status location')
      .populate('createdBy', 'firstName lastName email')
      .lean();

    const total = await TimeBlock.countDocuments(filter);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der TimeBlocks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Abrufen der TimeBlocks',
      error: error.message 
    });
  }
});

// @route   GET /api/time-blocks/:id
// @desc    Einzelnen TimeBlock abrufen
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const timeBlock = await TimeBlock.findById(req.params.id)
      .populate('doctor', 'firstName lastName email')
      .populate('locationId', 'name code')
      .populate('assigned_rooms', 'name number location')
      .populate('assigned_devices', 'name type status location')
      .populate('createdBy', 'firstName lastName email')
      .populate('mergedAppointmentId');

    if (!timeBlock) {
      return res.status(404).json({ 
        success: false, 
        message: 'TimeBlock nicht gefunden' 
      });
    }

    res.json({ 
      success: true, 
      data: timeBlock 
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des TimeBlocks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Abrufen des TimeBlocks',
      error: error.message 
    });
  }
});

// @route   POST /api/time-blocks
// @desc    TimeBlock erstellen
// @access  Private
router.post('/', auth, checkPermission('appointments.write'), async (req, res) => {
  try {
    const {
      startTime,
      endTime,
      staffId, // Neues Feld für alle Berufsgruppen
      doctor, // Altes Feld für Rückwärtskompatibilität
      locationId,
      resourceId,
      assigned_rooms,
      assigned_devices,
      reason,
      metadata
    } = req.body;

    // Validierung
    if (!startTime || !endTime) {
      return res.status(400).json({ 
        success: false, 
        message: 'startTime und endTime sind erforderlich' 
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({ 
        success: false, 
        message: 'endTime muss nach startTime liegen' 
      });
    }

    // Unterstütze sowohl staffId als auch doctor (für Rückwärtskompatibilität)
    const targetStaffId = staffId || doctor;
    
    // Prüfe auf Überschneidungen mit bestehenden Appointments
    // Nur prüfen wenn ein spezifisches Personal ausgewählt wurde
    if (targetStaffId) {
      const overlappingAppointments = await Appointment.find({
        $or: [
          { doctor: targetStaffId },
          { assigned_users: targetStaffId }
        ],
        $and: [
          {
            startTime: { $lt: end },
            endTime: { $gt: start }
          }
        ],
        status: { $nin: ['abgesagt'] }
      });

      if (overlappingAppointments.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Zeitslot überschneidet sich mit bestehenden Terminen',
          overlappingAppointments: overlappingAppointments.map(apt => ({
            id: apt._id,
            startTime: apt.startTime,
            endTime: apt.endTime
          }))
        });
      }
    }

    // TimeBlock erstellen
    // Wenn staffId nicht gesetzt ist (null/undefined/leer), wird die Sperre für alle gültig
    // Wenn staffId gesetzt ist, gilt die Sperre nur für diese Person (alle Berufsgruppen)
    // Stelle sicher, dass leere Strings oder undefined zu null werden
    const staffIdValue = (targetStaffId && targetStaffId !== '' && targetStaffId !== 'null') ? targetStaffId : null;
    
    // Validiere staffId, wenn es gesetzt ist
    if (staffIdValue && !mongoose.Types.ObjectId.isValid(staffIdValue)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige staffId',
        error: 'staffId muss eine gültige ObjectId sein'
      });
    }
    
    const timeBlockData = {
      startTime: start,
      endTime: end,
      locationId,
      resourceId,
      assigned_rooms: assigned_rooms || [],
      assigned_devices: assigned_devices || [],
      reason: reason || 'Manuelle Sperre',
      status: 'blocked',
      metadata: metadata || {},
      createdBy: req.user._id
    };
    
    // Nur staffId und doctor setzen, wenn sie nicht null sind
    if (staffIdValue) {
      timeBlockData.staffId = staffIdValue;
      timeBlockData.doctor = staffIdValue; // Rückwärtskompatibilität
    }
    
    const timeBlock = new TimeBlock(timeBlockData);

    await timeBlock.save();

    const populatedTimeBlock = await TimeBlock.findById(timeBlock._id)
      .populate('staffId', 'firstName lastName email')
      .populate('doctor', 'firstName lastName email') // Rückwärtskompatibilität
      .populate('locationId', 'name code')
      .populate('assigned_rooms', 'name number location')
      .populate('assigned_devices', 'name type status location')
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json({ 
      success: true, 
      data: populatedTimeBlock,
      message: 'TimeBlock erfolgreich erstellt' 
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des TimeBlocks:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Erstellen des TimeBlocks',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   PUT /api/time-blocks/:id
// @desc    TimeBlock aktualisieren
// @access  Private
router.put('/:id', auth, checkPermission('appointments.write'), async (req, res) => {
  try {
    const timeBlock = await TimeBlock.findById(req.params.id);

    if (!timeBlock) {
      return res.status(404).json({ 
        success: false, 
        message: 'TimeBlock nicht gefunden' 
      });
    }

    // Prüfe ob bereits zusammengeführt
    if (timeBlock.status === 'merged') {
      return res.status(400).json({ 
        success: false, 
        message: 'Zusammengeführte TimeBlocks können nicht bearbeitet werden' 
      });
    }

    // Aktualisiere Felder
    const {
      startTime,
      endTime,
      doctor,
      staffId,
      locationId,
      resourceId,
      assigned_rooms,
      assigned_devices,
      reason,
      metadata
    } = req.body;

    if (startTime) timeBlock.startTime = new Date(startTime);
    if (endTime) timeBlock.endTime = new Date(endTime);
    // Unterstütze sowohl staffId als auch doctor (für Rückwärtskompatibilität)
    const targetStaffId = staffId || doctor;
    if (targetStaffId !== undefined) {
      timeBlock.staffId = targetStaffId;
      timeBlock.doctor = targetStaffId; // Rückwärtskompatibilität
    }
    if (locationId !== undefined) timeBlock.locationId = locationId;
    if (resourceId !== undefined) timeBlock.resourceId = resourceId;
    if (assigned_rooms !== undefined) timeBlock.assigned_rooms = assigned_rooms;
    if (assigned_devices !== undefined) timeBlock.assigned_devices = assigned_devices;
    if (reason !== undefined) timeBlock.reason = reason;
    if (metadata !== undefined) timeBlock.metadata = metadata;

    // Validierung
    if (timeBlock.startTime >= timeBlock.endTime) {
      return res.status(400).json({ 
        success: false, 
        message: 'endTime muss nach startTime liegen' 
      });
    }

    await timeBlock.save();

    const populatedTimeBlock = await TimeBlock.findById(timeBlock._id)
      .populate('staffId', 'firstName lastName email')
      .populate('doctor', 'firstName lastName email') // Rückwärtskompatibilität
      .populate('locationId', 'name code')
      .populate('assigned_rooms', 'name number location')
      .populate('assigned_devices', 'name type status location')
      .populate('createdBy', 'firstName lastName email');

    res.json({ 
      success: true, 
      data: populatedTimeBlock,
      message: 'TimeBlock erfolgreich aktualisiert' 
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des TimeBlocks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Aktualisieren des TimeBlocks',
      error: error.message 
    });
  }
});

// @route   DELETE /api/time-blocks/:id
// @desc    TimeBlock löschen (Sperre aufheben)
// @access  Private
router.delete('/:id', auth, checkPermission('appointments.write'), async (req, res) => {
  try {
    const timeBlock = await TimeBlock.findById(req.params.id);

    if (!timeBlock) {
      return res.status(404).json({ 
        success: false, 
        message: 'TimeBlock nicht gefunden' 
      });
    }

    // Prüfe ob bereits zusammengeführt
    if (timeBlock.status === 'merged') {
      return res.status(400).json({ 
        success: false, 
        message: 'Zusammengeführte TimeBlocks können nicht gelöscht werden' 
      });
    }

    await TimeBlock.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true, 
      message: 'TimeBlock erfolgreich gelöscht' 
    });
  } catch (error) {
    console.error('Fehler beim Löschen des TimeBlocks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Löschen des TimeBlocks',
      error: error.message 
    });
  }
});

// @route   POST /api/time-blocks/:id/merge
// @desc    TimeBlock mit Patient/Leistung zusammenführen
// @access  Private
router.post('/:id/merge', auth, checkPermission('appointments.write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      patientId, 
      serviceId, 
      title, 
      notes, 
      type,
      status,
      room,
      devices,
      ...otherData 
    } = req.body;

    // TimeBlock laden
    const timeBlock = await TimeBlock.findById(id);
    if (!timeBlock) {
      return res.status(404).json({ 
        success: false, 
        message: 'TimeBlock nicht gefunden' 
      });
    }

    if (timeBlock.status === 'merged') {
      return res.status(400).json({ 
        success: false, 
        message: 'TimeBlock wurde bereits zusammengeführt' 
      });
    }

    // Validierung
    if (!patientId) {
      return res.status(400).json({ 
        success: false, 
        message: 'patientId ist erforderlich' 
      });
    }

    // Appointment erstellen
    const appointment = new Appointment({
      patient: patientId,
      doctor: timeBlock.staffId || timeBlock.doctor || req.user._id, // Verwende staffId, fallback zu doctor für Rückwärtskompatibilität
      startTime: timeBlock.startTime,
      endTime: timeBlock.endTime,
      service: serviceId,
      title: title || 'Termin',
      notes: notes,
      type: type || 'konsultation',
      status: status || 'geplant',
      room: room || timeBlock.assigned_rooms?.[0],
      devices: devices || timeBlock.assigned_devices || [],
      assigned_rooms: timeBlock.assigned_rooms || [],
      assigned_devices: timeBlock.assigned_devices || [],
      locationId: timeBlock.locationId,
      bookingType: 'internal',
      createdBy: req.user._id,
      ...otherData
    });

    await appointment.save();

    // TimeBlock aktualisieren
    timeBlock.status = 'merged';
    timeBlock.mergedAppointmentId = appointment._id;
    await timeBlock.save();

    // Appointment mit allen Populates laden
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('patient', 'firstName lastName email phone dateOfBirth')
      .populate('doctor', 'firstName lastName email')
      .populate('service', 'name code color_hex')
      .populate('room', 'name number location')
      .populate('devices', 'name type status location')
      .populate('assigned_rooms', 'name number location')
      .populate('assigned_devices', 'name type status location');

    res.json({ 
      success: true, 
      data: { 
        appointment: populatedAppointment, 
        timeBlock 
      },
      message: 'TimeBlock erfolgreich mit Termin zusammengeführt' 
    });
  } catch (error) {
    console.error('Fehler beim Zusammenführen des TimeBlocks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Zusammenführen des TimeBlocks',
      error: error.message 
    });
  }
});

module.exports = router;

