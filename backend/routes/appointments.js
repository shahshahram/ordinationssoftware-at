const express = require('express');
const auth = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const SlotReservation = require('../models/SlotReservation');
const ServiceCatalog = require('../models/ServiceCatalog');
const User = require('../models/User');
const Device = require('../models/Device');
const Room = require('../models/Room');
const AppointmentValidator = require('../utils/appointmentValidation');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Initialize validator with default settings
const validator = new AppointmentValidator();

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

    // Optimierte Abfrage: Alle Populates in einer einzigen Abfrage
    // Verhindert N+1-Problem durch separate Abfragen für jeden Termin
    const items = await Appointment.find(filter)
      .sort({ startTime: -1 })
      .limit(parsedLimit)
      .skip((parsedPage - 1) * parsedLimit)
        .populate('patient', 'firstName lastName email phone dateOfBirth gender allergies preExistingConditions medicalHistory isPregnant pregnancyWeek isBreastfeeding hasPacemaker hasDefibrillator currentMedications')
        .populate('doctor', 'firstName lastName email')
        .populate('service', 'name code color_hex category description base_duration_min price_cents isMedical')
      .populate('assigned_users', 'firstName lastName email role display_name first_name last_name')
      .populate('assigned_devices', 'name type status location')
      .populate('assigned_rooms', 'name number location')
      .populate('room', 'name number location')
      .populate('devices', 'name type status location')
      .lean();

    // Location-Informationen nachträglich hinzufügen, falls locationId vorhanden
    // Da locationId möglicherweise kein Referenz-Feld ist, müssen wir es manuell behandeln
        const Location = require('../models/Location');
      const Resource = require('../models/Resource');
      
    // Sammle alle eindeutigen locationIds
    const locationIds = new Set();
    items.forEach(item => {
      if (item.locationId) locationIds.add(item.locationId);
      if (item.location_id) locationIds.add(item.location_id);
    });
    
    // Lade alle Locations in einer Abfrage
    const locationsMap = new Map();
    if (locationIds.size > 0) {
      const locations = await Location.find({ _id: { $in: Array.from(locationIds) } }).lean();
      locations.forEach(loc => locationsMap.set(loc._id.toString(), loc));
    }
    
    // Füge Location-Informationen zu jedem Termin hinzu
    const validItems = items.map(item => {
      const locationId = item.locationId || item.location_id;
      if (locationId && locationsMap.has(locationId.toString())) {
        item.location = locationsMap.get(locationId.toString());
        item.location_id = item.location;
      }
      
      // Fallback für Geräte/Räume, die nicht über Populate geladen wurden
      // (falls sie als Resource gespeichert sind)
      if (item.assigned_devices && item.assigned_devices.length > 0) {
        item.assigned_devices = item.assigned_devices.filter(device => device !== null);
    }
      
      if (item.assigned_rooms && item.assigned_rooms.length > 0) {
        item.assigned_rooms = item.assigned_rooms.filter(room => room !== null);
      }
      
      return item;
    });

    const total = await Appointment.countDocuments(filter);

    console.log('Fetched appointments after populate - first item patient:', validItems[0]?.patient);

    res.json({
      success: true,
      data: validItems,
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

// @route   POST /api/appointments
// @desc    Neuen Termin erstellen mit Slot-Reservation
// @access  Private
router.post('/', [
  auth,
  body('title').notEmpty().withMessage('Titel ist erforderlich'),
  body('startTime').isISO8601().withMessage('Gültige Startzeit erforderlich'),
  body('endTime').isISO8601().withMessage('Gültige Endzeit erforderlich'),
  body('patient').isMongoId().withMessage('Gültige Patient-ID erforderlich'),
  body('type').optional().isIn(['consultation', 'follow-up', 'emergency', 'procedure']).withMessage('Ungültiger Termintyp')
], async (req, res) => {
  try {
    console.log('Appointment creation request:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        message: 'Validierungsfehler', 
        errors: errors.array() 
      });
    }

    const {
      title,
      startTime,
      endTime,
      patient,
      type = 'consultation',
      notes = '',
      resourceId = 'default',
      status = 'geplant',
      service,
      assigned_users = [],
      assigned_devices = [],
      assigned_rooms = []
    } = req.body;
    
    console.log('Received appointment creation request:', {
      title,
      startTime,
      endTime,
      patient,
      service,
      assigned_users,
      assigned_devices,
      assigned_rooms
    });

    // Validate appointment
    try {
      await validator.validateAppointment({
        startTime,
        endTime,
        resourceId
      });
    } catch (validationError) {
      console.log('Appointment validation failed:', validationError.message);
      return res.status(400).json({
        success: false,
        message: validationError.message || 'Termin-Validierung fehlgeschlagen'
      });
    }

    // Reserve slot first
    let reservation = null;
    try {
      reservation = await SlotReservation.reserveSlot({
        resourceId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        reservedBy: req.user.id,
        metadata: { appointmentTitle: title }
      });
    } catch (error) {
      if (error.message === 'Time slot conflict detected') {
        return res.status(409).json({
          success: false,
          message: 'Zeitslot ist bereits belegt. Bitte wählen Sie einen anderen Zeitpunkt.'
        });
      }
      throw error;
    }

    // Service-Validierung falls Service angegeben
    if (service) {
      const serviceDoc = await ServiceCatalog.findById(service);
      if (!serviceDoc) {
        return res.status(400).json({
          success: false,
          message: 'Service nicht gefunden'
        });
      }

      // Prüfen ob Benutzer-Auswahl erforderlich ist
      if (serviceDoc.requires_user_selection && (!assigned_users || assigned_users.length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Für diesen Service müssen Benutzer ausgewählt werden'
        });
      }

      // Prüfen ob zugewiesene Benutzer für den Service verfügbar sind
      if (assigned_users && assigned_users.length > 0) {
        const validUsers = await User.find({ 
          _id: { $in: assigned_users },
          isActive: true
        });
        
        if (validUsers.length !== assigned_users.length) {
          return res.status(400).json({
            success: false,
            message: 'Ein oder mehrere Benutzer sind nicht verfügbar'
          });
        }

        // Prüfen ob Personal zu dieser Zeit verfügbar ist
        const WeeklySchedule = require('../models/WeeklySchedule');
        const Absence = require('../models/Absence');
        const StaffProfile = require('../models/StaffProfile');
        const appointmentDate = new Date(startTime);
        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][appointmentDate.getDay()];
        
        for (const userId of assigned_users) {
          // Finde erst das StaffProfile für diesen User
          const User = require('../models/User');
          const user = await User.findById(userId);
          const staffProfile = await StaffProfile.findOne({ userId: userId });
          const staffProfileId = staffProfile?._id;
          const userName = user ? `${user.firstName} ${user.lastName}` : 'Unbekannt';
          
          console.log(`User ID: ${userId}, Staff Profile ID: ${staffProfileId || 'NOT FOUND'}`);
          
          // Finde aktives Wochenplan für diesen Benutzer
          // staffId im WeeklySchedule kann User._id ODER StaffProfile._id sein
          const idsToSearch = staffProfileId ? [userId, staffProfileId.toString()] : [userId];
          const weeklySchedules = await WeeklySchedule.find({
            staffId: { $in: idsToSearch },
            isActive: true,
            validFrom: { $lte: appointmentDate },
            $or: [
              { validTo: { $gte: appointmentDate } },
              { validTo: null }
            ]
          });
          
          console.log(`Found ${weeklySchedules.length} schedules for user ${userId}`);
          
          // Wenn kein Schedule gefunden wurde, überspringe die Verfügbarkeitsprüfung und prüfe nur Abwesenheiten
          if (weeklySchedules.length === 0) {
            console.log(`No schedules found for user ${userId}, skipping availability check but checking absences`);
            
            // Prüfe nur Abwesenheiten, wenn kein Schedule vorhanden ist
            const absences = await Absence.find({
              staffId: userId,
              startsAt: { $lte: new Date(endTime) },
              endsAt: { $gte: new Date(startTime) },
              status: 'approved'
            });

            if (absences.length > 0) {
              console.log(`User ${userId} has approved absence during appointment time`);
              return res.status(400).json({
                success: false,
                message: `${userName} ist zu diesem Zeitpunkt abwesend. Bitte wählen Sie einen anderen Mitarbeiter oder einen anderen Tag.`
              });
            }
            
            console.log(`User ${userId} has no schedules, skipping availability validation`);
            continue;
          }

          let isAvailable = false;
          for (const schedule of weeklySchedules) {
            const daySchedule = schedule.schedules.find(s => s.day === dayOfWeek);
            console.log(`Day schedule for ${dayOfWeek}:`, daySchedule ? { isWorking: daySchedule.isWorking, startTime: daySchedule.startTime, endTime: daySchedule.endTime } : 'N/A');
            if (daySchedule && daySchedule.isWorking) {
              const appointmentTimeStr = appointmentDate.toTimeString().substring(0, 5);
              console.log(`Checking time: ${appointmentTimeStr} against ${daySchedule.startTime} - ${daySchedule.endTime}`);
              if (appointmentTimeStr >= daySchedule.startTime && 
                  appointmentTimeStr < daySchedule.endTime) {
                // Prüfe ob Zeit in Pause liegt
                if (daySchedule.breakStart && daySchedule.breakEnd) {
                  if (appointmentTimeStr >= daySchedule.breakStart && 
                      appointmentTimeStr < daySchedule.breakEnd) {
                    console.log(`Staff is in break at ${appointmentTimeStr}`);
                    return res.status(400).json({
                      success: false,
                      message: `${userName} ist zu dieser Zeit in Pause. Bitte wählen Sie einen anderen Mitarbeiter oder einen anderen Zeitpunkt.`
                    });
                  }
                }
                console.log(`Staff is available!`);
                isAvailable = true;
                break;
              } else {
                console.log(`Time ${appointmentTimeStr} is outside working hours ${daySchedule.startTime} - ${daySchedule.endTime}`);
              }
            }
          }

          if (!isAvailable) {
            console.log(`Staff ${userId} is NOT available - no working hours found for ${dayOfWeek}`);
            return res.status(400).json({
              success: false,
              message: `${userName} ist zu diesem Termin nicht verfügbar - keine Arbeitszeiten. Bitte wählen Sie einen anderen Mitarbeiter oder einen anderen Tag.`
            });
          }

          // Prüfe Abwesenheiten
          const absences = await Absence.find({
            staffId: userId,
            startsAt: { $lte: new Date(endTime) },
            endsAt: { $gte: new Date(startTime) },
            status: 'approved'
          });

          if (absences.length > 0) {
            console.log(`User ${userId} has approved absence during appointment time`);
            return res.status(400).json({
              success: false,
              message: `${userName} ist zu diesem Zeitpunkt abwesend. Bitte wählen Sie einen anderen Mitarbeiter oder einen anderen Tag.`
            });
          }
        }
      }

      // Prüfen ob Geräte-Auswahl erforderlich ist
      if (serviceDoc.requires_device_selection && (!assigned_devices || assigned_devices.length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Für diesen Service müssen Geräte ausgewählt werden'
        });
      }

      // Prüfen ob zugewiesene Geräte verfügbar sind
      if (assigned_devices && assigned_devices.length > 0) {
        const validDevices = await Device.find({ 
          _id: { $in: assigned_devices },
          isActive: true
        });
        
        if (validDevices.length !== assigned_devices.length) {
          return res.status(400).json({
            success: false,
            message: 'Ein oder mehrere Geräte sind nicht verfügbar'
          });
        }

        // Prüfen ob Geräte dem Service zugewiesen sind
        const serviceDeviceIds = serviceDoc.assigned_devices.map(d => d.toString());
        const invalidDevices = assigned_devices.filter(deviceId => !serviceDeviceIds.includes(deviceId.toString()));
        
        if (invalidDevices.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Ein oder mehrere Geräte sind nicht für diesen Service verfügbar'
          });
        }

        // Prüfen ob genügend Geräte ausgewählt wurden
        if (assigned_devices.length < serviceDoc.device_quantity_required) {
          return res.status(400).json({
            success: false,
            message: `Für diesen Service werden mindestens ${serviceDoc.device_quantity_required} Geräte benötigt`
          });
        }
      }

      // Prüfen ob Raum-Auswahl erforderlich ist
      if (serviceDoc.requires_room_selection && (!assigned_rooms || assigned_rooms.length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Für diesen Service müssen Räume ausgewählt werden'
        });
      }

      // Prüfen ob zugewiesene Räume verfügbar sind
      if (assigned_rooms && assigned_rooms.length > 0) {
        const RoomModel = require('../models/Room');
        const ResourceModel = require('../models/Resource');
        
        // Prüfe in beiden Modellen
        // Versuche erst im Room-Modell
        const validRoomsFromRoomModel = await RoomModel.find({ 
          _id: { $in: assigned_rooms }
        });
        
        const remainingIds = assigned_rooms.filter(id => 
          !validRoomsFromRoomModel.some(room => room._id.toString() === id.toString())
        );
        
        let validRoomsFromResourceModel = [];
        if (remainingIds.length > 0) {
          validRoomsFromResourceModel = await ResourceModel.find({ 
            _id: { $in: remainingIds },
            type: 'room'
          });
        }
        
        const totalValidRooms = validRoomsFromRoomModel.length + validRoomsFromResourceModel.length;
        
        // Wenn keine Räume gefunden wurden, aber Räume zugewiesen wurden, Fehler ausgeben
        if (totalValidRooms !== assigned_rooms.length) {
          return res.status(400).json({
            success: false,
            message: 'Ein oder mehrere Räume sind nicht verfügbar'
          });
        }

        // Prüfen ob genügend Räume ausgewählt wurden
        if (serviceDoc.room_quantity_required && assigned_rooms.length < serviceDoc.room_quantity_required) {
          return res.status(400).json({
            success: false,
            message: `Für diesen Service werden mindestens ${serviceDoc.room_quantity_required} Räume benötigt`
          });
        }
      }
    }

    // Create appointment
    console.log('Creating appointment with assigned resources:', {
      assigned_users: assigned_users,
      assigned_devices: assigned_devices,
      assigned_rooms: assigned_rooms
    });
    
    const appointment = new Appointment({
      title,
      startTime,
      endTime,
      patient,
      doctor: req.user.id,
      type,
      notes,
      resourceId,
      status,
      slotReservationId: reservation._id,
      service,
      assigned_users,
      assigned_devices,
      assigned_rooms,
      createdBy: req.user.id
    });

    await appointment.save();
    console.log('Appointment saved with ID:', appointment._id);

    // Confirm reservation
    await SlotReservation.confirm(reservation._id, appointment._id);

    // Populate patient before sending response
    await appointment.populate('patient', 'firstName lastName email phone dateOfBirth gender');

    res.status(201).json({
      success: true,
      message: 'Termin erfolgreich erstellt',
      data: appointment,
      reservation: {
        id: reservation._id,
        status: reservation.status
      }
    });
  } catch (error) {
    console.error('Appointment creation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Erstellen des Termins' 
    });
  }
});

// @route   PUT /api/appointments/:id
// @desc    Termin aktualisieren mit Validierung
// @access  Private
router.put('/:id', [
  auth,
  body('title').optional().notEmpty().withMessage('Titel darf nicht leer sein'),
  body('startTime').optional().isISO8601().withMessage('Gültige Startzeit erforderlich'),
  body('endTime').optional().isISO8601().withMessage('Gültige Endzeit erforderlich'),
  body('type').optional().isIn(['consultation', 'follow-up', 'emergency', 'procedure']).withMessage('Ungültiger Termintyp')
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

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctor: req.user.id
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Termin nicht gefunden'
      });
    }

    const updateData = { ...req.body };

    // If time is being changed, validate
    if (updateData.startTime || updateData.endTime) {
      const startTime = updateData.startTime || appointment.startTime;
      const endTime = updateData.endTime || appointment.endTime;

      const validation = await validator.validateAppointment({
        startTime,
        endTime,
        doctorId: req.user.id,
        resourceId: updateData.resourceId || appointment.resourceId,
        appointmentId: appointment._id
      }, Appointment, SlotReservation);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Termin-Validierung fehlgeschlagen',
          errors: validation.errors,
          warnings: validation.warnings
        });
      }
    }

    // Update appointment
    Object.assign(appointment, updateData);
    await appointment.save();

    res.json({
      success: true,
      message: 'Termin erfolgreich aktualisiert',
      data: appointment
    });
  } catch (error) {
    console.error('Appointment update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Aktualisieren des Termins' 
    });
  }
});

// @route   DELETE /api/appointments/:id
// @desc    Termin löschen
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctor: req.user.id
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Termin nicht gefunden'
      });
    }

    // Cancel associated slot reservation
    if (appointment.slotReservationId) {
      const reservation = await SlotReservation.findById(appointment.slotReservationId);
      if (reservation) {
        await reservation.cancel();
      }
    }

    await Appointment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Termin erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Appointment deletion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Löschen des Termins' 
    });
  }
});

// @route   POST /api/appointments/validate
// @desc    Termin-Validierung ohne Erstellung
// @access  Private
router.post('/validate', [
  auth,
  body('startTime').isISO8601().withMessage('Gültige Startzeit erforderlich'),
  body('endTime').isISO8601().withMessage('Gültige Endzeit erforderlich'),
  body('resourceId').optional().notEmpty().withMessage('Resource ID darf nicht leer sein')
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

    const { startTime, endTime, resourceId = 'default', appointmentId = null } = req.body;

    const validation = await validator.validateAppointment({
      startTime,
      endTime,
      doctorId: req.user.id,
      resourceId,
      appointmentId
    }, Appointment, SlotReservation);

    res.json({
      success: true,
      data: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        duration: validation.duration
      }
    });
  } catch (error) {
    console.error('Appointment validation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler bei der Termin-Validierung' 
    });
  }
});

// @route   GET /api/appointments/available-slots
// @desc    Verfügbare Terminslots für eine Leistung abrufen
// @access  Private
router.get('/available-slots', auth, async (req, res) => {
  try {
    const { serviceId, startDate, endDate, staffId, locationId } = req.query;

    console.log('Available slots request:', { serviceId, startDate, endDate, staffId, locationId });

    if (!serviceId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Service-ID ist erforderlich' 
      });
    }

    // Parse dates
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default: 30 Tage

    // Service-Informationen abrufen
    const ServiceCatalog = require('../models/ServiceCatalog');
    const service = await ServiceCatalog.findById(serviceId);
    
    if (!service) {
      return res.status(404).json({ 
        success: false, 
        message: 'Leistung nicht gefunden' 
      });
    }

    console.log('Service found:', {
      _id: service._id,
      name: service.name,
      assigned_users: service.assigned_users
    });

    // Zugewiesene Mitarbeiter abrufen
    const User = require('../models/User');
    let assignedStaff = [];
    
    if (service.assigned_users && service.assigned_users.length > 0) {
      assignedStaff = await User.find({ 
        _id: { $in: service.assigned_users },
        ...(staffId ? { _id: staffId } : {})
      });
    }

    console.log('Assigned staff found:', assignedStaff.length);

    if (assignedStaff.length === 0) {
      return res.json({ 
        success: true, 
        data: { 
          availableSlots: [],
          message: 'Keine Mitarbeiter für diese Leistung zugewiesen' 
        } 
      });
    }

    // Verfügbare Slots für jeden Mitarbeiter berechnen
    const availableSlots = [];
    const WeeklySchedule = require('../models/WeeklySchedule');
    const Absence = require('../models/Absence');
    const StaffProfile = require('../models/StaffProfile');

    for (const staff of assignedStaff) {
      // StaffProfile finden
      const staffProfile = await StaffProfile.findOne({ userId: staff._id });
      if (!staffProfile || !staffProfile.isActive) continue;

      // Wöchentliche Arbeitszeiten abrufen
      const schedules = await WeeklySchedule.find({
        staffId: staffProfile._id,
        isActive: true,
        validFrom: { $lte: end },
        $or: [
          { validTo: { $gte: start } },
          { validTo: null }
        ]
      });

      // Abwesenheiten abrufen
      const absences = await Absence.find({
        staffId: staffProfile._id,
        startsAt: { $lte: end },
        endsAt: { $gte: start },
        status: 'approved'
      });

      // Bereits gebuchte Termine abrufen
      const existingAppointments = await Appointment.find({
        $or: [
          { assigned_users: staff._id },
          { doctor: staff._id }
        ],
        startTime: { $gte: start, $lte: end },
        status: { $nin: ['abgesagt', 'cancelled'] }
      });

      console.log(`Checking availability for staff ${staff._id}:`, {
        staffName: `${staff.firstName} ${staff.lastName}`,
        schedulesFound: schedules.length,
        existingAppointments: existingAppointments.length
      });

      // Slots generieren für jeden Tag
      const currentDate = new Date(start);
      let slotsGenerated = 0;
      while (currentDate.getTime() <= end.getTime()) {
        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentDate.getDay()];
        
        // Prüfe Arbeitszeiten für diesen Tag
        for (const schedule of schedules) {
          const daySchedule = schedule.schedules.find(s => s.day === dayOfWeek);
          if (!daySchedule || !daySchedule.isWorking) {
            if (slotsGenerated === 0) {
              console.log(`No working schedule for ${dayOfWeek} on ${currentDate.toISOString().split('T')[0]}`);
            }
            continue;
          }

          // Prüfe Abwesenheiten
          const isAbsent = absences.some(abs => 
            currentDate >= new Date(abs.startsAt) && currentDate <= new Date(abs.endsAt)
          );
          if (isAbsent) continue;

          // Generiere Slots für diesen Tag
          const [startHour, startMin] = daySchedule.startTime.split(':').map(Number);
          const [endHour, endMin] = daySchedule.endTime.split(':').map(Number);
          const [breakStartHour, breakStartMin] = (daySchedule.breakStart || '00:00').split(':').map(Number);
          const [breakEndHour, breakEndMin] = (daySchedule.breakEnd || '00:00').split(':').map(Number);

          let slotStart = new Date(currentDate);
          slotStart.setHours(startHour, startMin, 0, 0);

          const dayEnd = new Date(currentDate);
          dayEnd.setHours(endHour, endMin, 0, 0);

          const breakStart = new Date(currentDate);
          breakStart.setHours(breakStartHour, breakStartMin, 0, 0);

          const breakEnd = new Date(currentDate);
          breakEnd.setHours(breakEndHour, breakEndMin, 0, 0);

          while (slotStart < dayEnd) {
            const slotEnd = new Date(slotStart.getTime() + service.base_duration_min * 60 * 1000);

            // Prüfe ob Slot in Pausenzeiten liegt
            if (daySchedule.breakStart && daySchedule.breakEnd) {
              if (slotStart >= breakStart && slotStart < breakEnd) {
                slotStart = breakEnd;
                continue;
              }
            }

            // Prüfe ob Slot in Zukunft liegt (nicht vergangen)
            if (slotStart < new Date()) {
              slotStart = new Date(slotStart.getTime() + 15 * 60 * 1000);
              continue;
            }

            // Prüfe Konflikte mit bestehenden Terminen
            const hasConflict = existingAppointments.some(apt => 
              (slotStart < new Date(apt.endTime) && slotEnd > new Date(apt.startTime))
            );

            if (!hasConflict) {
              availableSlots.push({
                startTime: slotStart.toISOString(),
                endTime: slotEnd.toISOString(),
                staff: {
                  _id: staff._id,
                  firstName: staff.firstName,
                  lastName: staff.lastName,
                  email: staff.email
                },
                location: service.assigned_rooms && service.assigned_rooms.length > 0 
                  ? service.assigned_rooms[0].name 
                  : undefined
              });
              slotsGenerated++;
            }

            // Nächster Slot (15 Minuten Intervall)
            slotStart = new Date(slotStart.getTime() + 15 * 60 * 1000);
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`Total slots generated for ${staff.firstName} ${staff.lastName}: ${slotsGenerated}`);
    }

    // Sortiere Slots nach Zeit
    availableSlots.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    console.log(`Available slots found: ${availableSlots.length}`);

    res.json({ 
      success: true, 
      data: { 
        availableSlots: availableSlots.slice(0, 50), // Begrenze auf erste 50 Slots
        totalSlots: availableSlots.length,
        service: {
          _id: service._id,
          name: service.name,
          duration: service.base_duration_min
        }
      } 
    });

  } catch (error) {
    console.error('Available slots error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Abrufen der verfügbaren Slots' 
    });
  }
});

module.exports = router;
