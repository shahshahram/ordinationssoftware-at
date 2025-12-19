const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const OnlineBooking = require('../models/OnlineBooking');
const PatientExtended = require('../models/PatientExtended'); // Produktivsystem-Standard
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const StaffProfile = require('../models/StaffProfile');
const WeeklySchedule = require('../models/WeeklySchedule');
const ServiceCatalog = require('../models/ServiceCatalog');
const Device = require('../models/Device');
const Room = require('../models/Room');
const Location = require('../models/Location');
const SystemSettings = require('../models/SystemSettings');
const AvailabilityService = require('../services/availabilityService');
const { generateICSFromBooking } = require('../utils/icsGenerator');
const auth = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/online-booking/availability
// @desc    Get available time slots for a date
// @access  Public
router.get('/availability', async (req, res) => {
  try {
    const { date, doctorId, duration = 30, serviceId } = req.query;
    
    if (!date || !doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Datum und Arzt-ID sind erforderlich'
      });
    }

    const doctor = await User.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Arzt nicht gefunden'
      });
    }

    // Finde das StaffProfile für diesen User
    const staffProfile = await StaffProfile.findOne({ userId: doctorId });
    if (!staffProfile) {
      console.error(`[OnlineBooking] No StaffProfile found for user ${doctorId}`);
      return res.status(404).json({
        success: false,
        message: 'Personalprofil für diesen Arzt nicht gefunden'
      });
    }

    const requestedDate = new Date(date);
    if (isNaN(requestedDate.getTime())) {
      console.error(`[OnlineBooking] Invalid date format: ${date}`);
      return res.status(400).json({
        success: false,
        message: 'Ungültiges Datumsformat'
      });
    }

    // Konvertiere Datum zu Wochentag (monday, tuesday, etc.)
    const dayIndex = requestedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[dayIndex];
    
    // Standard-Arbeitszeiten (Fallback)
    let workingHours = {
      monday: { start: '09:00', end: '17:00', isWorking: true },
      tuesday: { start: '09:00', end: '17:00', isWorking: true },
      wednesday: { start: '09:00', end: '17:00', isWorking: true },
      thursday: { start: '09:00', end: '17:00', isWorking: true },
      friday: { start: '09:00', end: '17:00', isWorking: true },
      saturday: { start: '09:00', end: '12:00', isWorking: false },
      sunday: { start: '09:00', end: '12:00', isWorking: false }
    };

    // Versuche Arbeitszeiten aus WeeklySchedule abzurufen (staffId ist StaffProfile._id)
    try {
      const weeklySchedules = await WeeklySchedule.find({
        staffId: staffProfile._id,
        isActive: true,
        validFrom: { $lte: requestedDate },
        $or: [
          { validTo: { $gte: requestedDate } },
          { validTo: null }
        ]
      });

      // Aktuelle Arbeitszeiten aus WeeklySchedule setzen
      if (weeklySchedules && weeklySchedules.length > 0) {
        console.log(`[OnlineBooking] Found ${weeklySchedules.length} weekly schedule(s) for staffProfile ${staffProfile._id}`);
        for (const schedule of weeklySchedules) {
          if (schedule.schedules && Array.isArray(schedule.schedules)) {
            for (const daySchedule of schedule.schedules) {
              if (daySchedule && daySchedule.day && daySchedule.isWorking) {
                workingHours[daySchedule.day] = {
                  start: daySchedule.startTime || '09:00',
                  end: daySchedule.endTime || '17:00',
                  isWorking: true,
                  breakStart: daySchedule.breakStart,
                  breakEnd: daySchedule.breakEnd
                };
                console.log(`[OnlineBooking] Set working hours for ${daySchedule.day}: ${daySchedule.startTime} - ${daySchedule.endTime}`);
              }
            }
          }
        }
      } else {
        console.log(`[OnlineBooking] No weekly schedules found, using fallback`);
        // Fallback: Verwende Arbeitszeiten aus User.profile.onlineBookingSettings
        if (doctor.profile?.onlineBookingSettings?.workingHours && Array.isArray(doctor.profile.onlineBookingSettings.workingHours)) {
          console.log(`[OnlineBooking] Using onlineBookingSettings.workingHours (${doctor.profile.onlineBookingSettings.workingHours.length} entries)`);
          for (const wh of doctor.profile.onlineBookingSettings.workingHours) {
            if (wh && wh.day && wh.isWorking) {
              workingHours[wh.day] = {
                start: wh.startTime || '09:00',
                end: wh.endTime || '17:00',
                isWorking: true
              };
            }
          }
        } else {
          console.log(`[OnlineBooking] No onlineBookingSettings.workingHours found, using default working hours (Mon-Fri 09:00-17:00)`);
        }
      }
    } catch (scheduleError) {
      console.error('[OnlineBooking] Error loading weekly schedules:', scheduleError);
      // Verwende Standard-Arbeitszeiten als Fallback
    }

    const today = new Date();
    const isToday = requestedDate.toDateString() === today.toDateString();
    const isPast = requestedDate < today;
    
    if (isPast) {
      return res.json({
        success: true,
        data: {
          availableSlots: [],
          message: 'Vergangene Daten sind nicht verfügbar'
        }
      });
    }

    const workingDay = workingHours[dayOfWeek];
    console.log(`[OnlineBooking] Requested date: ${date}, dayOfWeek: ${dayOfWeek}, workingDay:`, workingDay);
    
    if (!workingDay || !workingDay.isWorking) {
      console.log(`[OnlineBooking] No working hours for ${dayOfWeek}, returning empty slots`);
      return res.json({
        success: true,
        data: {
          availableSlots: [],
          message: 'An diesem Tag ist keine Terminbuchung möglich'
        }
      });
    }

    // Generiere verfügbare Zeitslots
    const availableSlots = [];
    
    try {
      const startTime = new Date(`${date}T${workingDay.start}`);
      const endTime = new Date(`${date}T${workingDay.end}`);
      
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        throw new Error(`Invalid time format: ${workingDay.start} - ${workingDay.end}`);
      }
      
      // Lade Service-Daten falls serviceId vorhanden (für Ressourcen-Prüfung)
      let serviceDoc = null;
      let requiredRooms = [];
      let requiredDevices = [];
      
      if (serviceId) {
        try {
          serviceDoc = await ServiceCatalog.findById(serviceId);
          if (serviceDoc) {
            // Lade zugewiesene Räume und Geräte
            if (serviceDoc.assigned_rooms && serviceDoc.assigned_rooms.length > 0) {
              requiredRooms = serviceDoc.assigned_rooms;
            }
            if (serviceDoc.assigned_devices && serviceDoc.assigned_devices.length > 0) {
              requiredDevices = serviceDoc.assigned_devices;
            }
            console.log(`[OnlineBooking] Service ${serviceId} requires ${requiredRooms.length} rooms and ${requiredDevices.length} devices`);
          }
        } catch (serviceError) {
          console.warn('[OnlineBooking] Error loading service:', serviceError);
        }
      }

      // Prüfe bestehende Termine (doctor ist User-ID in Appointment)
      const existingAppointments = await Appointment.find({
        doctor: doctorId, // doctor ist User-ID
        startTime: {
          $gte: new Date(`${date}T00:00:00`),
          $lt: new Date(`${date}T23:59:59`)
        },
        status: { $nin: ['cancelled', 'no_show', 'abgesagt'] }
      }).catch(err => {
        console.error('[OnlineBooking] Error fetching appointments:', err);
        return []; // Fallback: keine Termine gefunden
      });

      // Prüfe belegte Räume und Geräte
      const bookedRooms = new Set();
      const bookedDevices = new Set();
      
      existingAppointments.forEach(apt => {
        if (apt.assigned_rooms && Array.isArray(apt.assigned_rooms)) {
          apt.assigned_rooms.forEach(roomId => bookedRooms.add(roomId.toString()));
        }
        if (apt.assigned_devices && Array.isArray(apt.assigned_devices)) {
          apt.assigned_devices.forEach(deviceId => bookedDevices.add(deviceId.toString()));
        }
      });

      const bookedSlots = existingAppointments.map(apt => ({
        start: apt.startTime,
        end: apt.endTime
      }));

      // Generiere 30-Minuten-Slots mit Pausenzeiten-Berücksichtigung
      const slotDuration = parseInt(duration) || 30;
      let currentTime = new Date(startTime);
      
      while (currentTime < endTime) {
        const slotStart = currentTime.toTimeString().slice(0, 5);
        const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000).toTimeString().slice(0, 5);
        
        // Prüfe ob Slot in Pausenzeiten liegt
        let isInBreak = false;
        if (workingDay.breakStart && workingDay.breakEnd) {
          if (slotStart < workingDay.breakEnd && slotEnd > workingDay.breakStart) {
            isInBreak = true;
          }
        }
        
        // Prüfe ob Slot verfügbar ist (nur wenn nicht in Pause)
        let isSlotAvailable = !isInBreak && !bookedSlots.some(booked => {
          try {
            const bookedStart = new Date(`${date}T${booked.start}`);
            const bookedEnd = new Date(`${date}T${booked.end}`);
            const slotStartTime = new Date(`${date}T${slotStart}`);
            const slotEndTime = new Date(`${date}T${slotEnd}`);
            
            return (slotStartTime < bookedEnd && slotEndTime > bookedStart);
          } catch (err) {
            console.error('[OnlineBooking] Error checking slot availability:', err);
            return false;
          }
        });

        // Prüfe Ressourcen-Verfügbarkeit (Räume und Geräte)
        if (isSlotAvailable && (requiredRooms.length > 0 || requiredDevices.length > 0)) {
          const slotStartTime = new Date(`${date}T${slotStart}`);
          const slotEndTime = new Date(`${date}T${slotEnd}`);
          
          // Prüfe ob alle benötigten Räume verfügbar sind
          if (requiredRooms.length > 0) {
            for (const roomId of requiredRooms) {
              const roomBooked = existingAppointments.some(apt => {
                if (!apt.assigned_rooms || !Array.isArray(apt.assigned_rooms)) return false;
                if (!apt.assigned_rooms.some(r => r.toString() === roomId.toString())) return false;
                
                const aptStart = new Date(apt.startTime);
                const aptEnd = new Date(apt.endTime);
                return (slotStartTime < aptEnd && slotEndTime > aptStart);
              });
              
              if (roomBooked) {
                isSlotAvailable = false;
                break;
              }
            }
          }
          
          // Prüfe ob alle benötigten Geräte verfügbar sind
          if (isSlotAvailable && requiredDevices.length > 0) {
            for (const deviceId of requiredDevices) {
              const deviceBooked = existingAppointments.some(apt => {
                if (!apt.assigned_devices || !Array.isArray(apt.assigned_devices)) return false;
                if (!apt.assigned_devices.some(d => d.toString() === deviceId.toString())) return false;
                
                const aptStart = new Date(apt.startTime);
                const aptEnd = new Date(apt.endTime);
                return (slotStartTime < aptEnd && slotEndTime > aptStart);
              });
              
              if (deviceBooked) {
                isSlotAvailable = false;
                break;
              }
            }
          }
        }

        // Prüfe Online-Kontingente falls Service angegeben
        if (isSlotAvailable && serviceDoc && serviceDoc.online_contingents && serviceDoc.online_contingents.length > 0) {
          const slotTime = slotStart; // HH:MM Format
          const dayOfWeek = requestedDate.getDay(); // 0=Sonntag, 1=Montag, etc.
          
          // Prüfe ob Slot in einem aktiven Kontingent liegt
          const matchingContingent = serviceDoc.online_contingents.find(contingent => {
            if (!contingent.isActive) return false;
            
            // Prüfe Wochentag
            if (contingent.daysOfWeek && contingent.daysOfWeek.length > 0) {
              if (!contingent.daysOfWeek.includes(dayOfWeek)) return false;
            }
            
            // Prüfe Zeitfenster
            const slotTimeMinutes = parseInt(slotTime.split(':')[0]) * 60 + parseInt(slotTime.split(':')[1]);
            const windowStartMinutes = parseInt(contingent.timeWindow.start.split(':')[0]) * 60 + parseInt(contingent.timeWindow.start.split(':')[1]);
            const windowEndMinutes = parseInt(contingent.timeWindow.end.split(':')[0]) * 60 + parseInt(contingent.timeWindow.end.split(':')[1]);
            
            if (slotTimeMinutes < windowStartMinutes || slotTimeMinutes >= windowEndMinutes) {
              return false;
            }
            
            return true;
          });
          
          // Wenn Slot in einem Kontingent liegt, prüfe maximale Buchungen
          if (matchingContingent && matchingContingent.maxOnlineBookings > 0) {
            // Zähle bereits gebuchte Online-Termine in diesem Zeitfenster
            const dateStr = requestedDate.toISOString().split('T')[0];
            const windowStart = new Date(`${dateStr}T${matchingContingent.timeWindow.start}`);
            const windowEnd = new Date(`${dateStr}T${matchingContingent.timeWindow.end}`);
            
            const existingOnlineBookings = await OnlineBooking.countDocuments({
              'appointment.date': requestedDate,
              'appointment.startTime': {
                $gte: matchingContingent.timeWindow.start,
                $lt: matchingContingent.timeWindow.end
              },
              'appointment.serviceId': serviceId,
              status: { $in: ['pending', 'confirmed'] }
            });
            
            if (existingOnlineBookings >= matchingContingent.maxOnlineBookings) {
              isSlotAvailable = false;
            }
          } else if (serviceDoc.online_contingents.length > 0) {
            // Wenn Kontingente definiert sind, aber Slot nicht in einem liegt, ist er nicht verfügbar
            isSlotAvailable = false;
          }
        }
        
        if (isSlotAvailable) {
          availableSlots.push({
            start: slotStart,
            end: slotEnd,
            duration: slotDuration
          });
        }
        
        currentTime = new Date(currentTime.getTime() + 15 * 60000); // 15-Minuten-Intervalle
      }

      console.log(`[OnlineBooking] Generated ${availableSlots.length} available slots for ${date}`);
      if (availableSlots.length > 0) {
        console.log(`[OnlineBooking] First slot: ${availableSlots[0].start} - ${availableSlots[0].end}`);
      }
      
      // Lade verfügbare Räume und Geräte (falls serviceId vorhanden)
      let availableRooms = [];
      let availableDevices = [];
      
      if (serviceId && serviceDoc) {
        try {
          // Lade verfügbare Räume (online buchbar, aktiv)
          if (serviceDoc.requires_room_selection || requiredRooms.length > 0) {
            const roomIds = requiredRooms.length > 0 ? requiredRooms : null;
            const roomQuery = {
              isActive: true,
              isOnlineBookable: true
            };
            if (roomIds && roomIds.length > 0) {
              roomQuery._id = { $in: roomIds };
            }
            availableRooms = await Room.find(roomQuery)
              .select('_id name type capacity location_id')
              .populate('location_id', 'name code')
              .sort({ name: 1 });
            console.log(`[OnlineBooking] Found ${availableRooms.length} available rooms for service ${serviceId}`);
          }
          
          // Lade verfügbare Geräte (online buchbar, aktiv)
          if (serviceDoc.requires_device_selection || requiredDevices.length > 0) {
            const deviceIds = requiredDevices.length > 0 ? requiredDevices : null;
            const deviceQuery = {
              isActive: true,
              isOnlineBookable: true
            };
            if (deviceIds && deviceIds.length > 0) {
              deviceQuery._id = { $in: deviceIds };
            }
            availableDevices = await Device.find(deviceQuery)
              .select('_id name type category location_id')
              .populate('location_id', 'name code')
              .sort({ name: 1 });
            console.log(`[OnlineBooking] Found ${availableDevices.length} available devices for service ${serviceId}`);
          }
        } catch (resourceError) {
          console.error('[OnlineBooking] Error loading resources:', resourceError);
        }
      }

      res.json({
        success: true,
        data: {
          availableSlots,
          workingHours: workingDay,
          date: date,
          availableRooms: availableRooms.map(room => ({
            id: room._id,
            name: room.name,
            type: room.type,
            capacity: room.capacity,
            location: room.location_id ? {
              id: room.location_id._id,
              name: room.location_id.name,
              code: room.location_id.code
            } : null
          })),
          availableDevices: availableDevices.map(device => ({
            id: device._id,
            name: device.name,
            type: device.type,
            category: device.category,
            location: device.location_id ? {
              id: device.location_id._id,
              name: device.location_id.name,
              code: device.location_id.code
            } : null
          })),
          serviceRequirements: serviceDoc ? {
            requiresRoomSelection: serviceDoc.requires_room_selection || false,
            roomQuantityRequired: serviceDoc.room_quantity_required || 0,
            requiresDeviceSelection: serviceDoc.requires_device_selection || false,
            deviceQuantityRequired: serviceDoc.device_quantity_required || 0
          } : null
        }
      });
    } catch (slotError) {
      console.error('[OnlineBooking] Error generating slots:', slotError);
      throw slotError; // Wird vom äußeren catch behandelt
    }
  } catch (error) {
    console.error('[OnlineBooking] Error in /availability route:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Verfügbarkeit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/online-booking/book
// @desc    Book an appointment online
// @access  Public
router.post('/book', [
  body('patient.firstName').notEmpty().trim(),
  body('patient.lastName').notEmpty().trim(),
  body('patient.email').isEmail().normalizeEmail(),
  body('patient.phone').notEmpty().trim(),
  body('patient.dateOfBirth').isISO8601(),
  body('appointment.date').isISO8601(),
  body('appointment.startTime').notEmpty(),
  body('appointment.type').notEmpty().trim(),
  body('appointment.reason').notEmpty().trim(),
  body('appointment.serviceId').optional().isMongoId(),
  body('appointment.assigned_devices').optional().isArray(),
  body('appointment.assigned_rooms').optional().isArray(),
  body('doctor.id').isMongoId()
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

    const { patient, appointment, doctor, anamnesisResponses } = req.body;

    // Prüfe ob Arzt existiert
    const doctorExists = await User.findById(doctor.id);
    if (!doctorExists) {
      return res.status(404).json({
        success: false,
        message: 'Arzt nicht gefunden'
      });
    }

    // Prüfe Service falls angegeben
    let serviceDoc = null;
    if (appointment.serviceId) {
      serviceDoc = await ServiceCatalog.findById(appointment.serviceId);
      if (!serviceDoc) {
        return res.status(404).json({
          success: false,
          message: 'Service nicht gefunden'
        });
      }

      // Prüfe ob Service online buchbar ist
      if (!serviceDoc.online_bookable) {
        return res.status(400).json({
          success: false,
          message: 'Dieser Service kann nicht online gebucht werden'
        });
      }

      // Prüfe Geräte-Kontingent falls erforderlich
      if (serviceDoc.requires_device_selection) {
        if (!appointment.assigned_devices || appointment.assigned_devices.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Für diesen Service müssen Geräte ausgewählt werden'
          });
        }

        // Prüfe ob genügend Geräte ausgewählt wurden
        if (appointment.assigned_devices.length < serviceDoc.device_quantity_required) {
          return res.status(400).json({
            success: false,
            message: `Für diesen Service werden mindestens ${serviceDoc.device_quantity_required} Geräte benötigt`
          });
        }

        // Prüfe ob Geräte verfügbar sind
        const validDevices = await Device.find({ 
          _id: { $in: appointment.assigned_devices },
          isActive: true
        });
        
        if (validDevices.length !== appointment.assigned_devices.length) {
          return res.status(400).json({
            success: false,
            message: 'Ein oder mehrere Geräte sind nicht verfügbar'
          });
        }
      }

      // Prüfe Raum-Kontingent falls erforderlich
      if (serviceDoc.requires_room_selection) {
        if (!appointment.assigned_rooms || appointment.assigned_rooms.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Für diesen Service müssen Räume ausgewählt werden'
          });
        }

        // Prüfe ob genügend Räume ausgewählt wurden
        if (appointment.assigned_rooms.length < serviceDoc.room_quantity_required) {
          return res.status(400).json({
            success: false,
            message: `Für diesen Service werden mindestens ${serviceDoc.room_quantity_required} Räume benötigt`
          });
        }

        // Prüfe ob Räume verfügbar sind
        const validRooms = await Room.find({ 
          _id: { $in: appointment.assigned_rooms },
          isActive: true
        });
        
        if (validRooms.length !== appointment.assigned_rooms.length) {
          return res.status(400).json({
            success: false,
            message: 'Ein oder mehrere Räume sind nicht verfügbar'
          });
        }
      }
    }

    // Prüfe Verfügbarkeit (Arzt)
    const requestedDate = new Date(appointment.date);
    const isAvailable = await checkAvailability(doctor.id, requestedDate, appointment.startTime);
    
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Der gewählte Termin ist nicht mehr verfügbar'
      });
    }
    
    // Prüfe Ressourcen-Verfügbarkeit (Räume und Geräte) - Kollisionsprüfung
    if (appointment.assigned_rooms && appointment.assigned_rooms.length > 0) {
      const CollisionDetection = require('../utils/collisionDetection');
      const dateStr = requestedDate.toISOString().split('T')[0];
      const [hours, minutes] = appointment.startTime.split(':').map(Number);
      const startDateTime = new Date(requestedDate);
      startDateTime.setHours(hours, minutes, 0, 0);
      const endDateTime = new Date(startDateTime.getTime() + (appointment.duration || 30) * 60000);
      
      // Prüfe jeden Raum auf Kollisionen
      for (const roomId of appointment.assigned_rooms) {
        const roomCollisions = await CollisionDetection.checkRoomCollisions(
          roomId,
          startDateTime,
          endDateTime
        );
        
        if (roomCollisions.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Raum ist zum gewählten Zeitpunkt nicht verfügbar: ${roomCollisions[0].message}`,
            code: 'ROOM_UNAVAILABLE'
          });
        }
      }
    }
    
    if (appointment.assigned_devices && appointment.assigned_devices.length > 0) {
      const CollisionDetection = require('../utils/collisionDetection');
      const dateStr = requestedDate.toISOString().split('T')[0];
      const [hours, minutes] = appointment.startTime.split(':').map(Number);
      const startDateTime = new Date(requestedDate);
      startDateTime.setHours(hours, minutes, 0, 0);
      const endDateTime = new Date(startDateTime.getTime() + (appointment.duration || 30) * 60000);
      
      // Prüfe alle Geräte auf Kollisionen
      const deviceCollisions = await CollisionDetection.checkDeviceCollisions(
        appointment.assigned_devices,
        startDateTime,
        endDateTime
      );
      
      if (deviceCollisions.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Gerät ist zum gewählten Zeitpunkt nicht verfügbar: ${deviceCollisions[0].message}`,
          code: 'DEVICE_UNAVAILABLE'
        });
      }
    }

    // Automatische Dublettenprüfung
    // Prüfe ob Patient bereits existiert (Produktivsystem: PatientExtended)
    // Suche nach verschiedenen Kombinationen für bessere Trefferquote
    let existingPatient = null;
    let isKnownPatient = false;
    
    // Prüfung 1: Exakte Übereinstimmung (Email + Name + Geburtsdatum)
    if (patient.email && patient.firstName && patient.lastName && patient.dateOfBirth) {
      const emailMatch = await PatientExtended.findOne({
        email: patient.email.toLowerCase().trim(),
        firstName: { $regex: new RegExp(`^${patient.firstName.trim()}$`, 'i') },
        lastName: { $regex: new RegExp(`^${patient.lastName.trim()}$`, 'i') },
        dateOfBirth: new Date(patient.dateOfBirth)
      });
      
      if (emailMatch) {
        existingPatient = emailMatch;
        isKnownPatient = true;
        console.log(`[OnlineBooking] Bekannter Patient gefunden (Email+Name+Geburtsdatum): ${existingPatient._id}`);
      }
    }
    
    // Prüfung 2: SVNR + Name (falls SVNR vorhanden)
    if (!existingPatient && patient.socialSecurityNumber) {
      const svnrMatch = await PatientExtended.findOne({
        socialSecurityNumber: patient.socialSecurityNumber.trim(),
        firstName: { $regex: new RegExp(`^${patient.firstName.trim()}$`, 'i') },
        lastName: { $regex: new RegExp(`^${patient.lastName.trim()}$`, 'i') }
      });
      
      if (svnrMatch) {
        existingPatient = svnrMatch;
        isKnownPatient = true;
        console.log(`[OnlineBooking] Bekannter Patient gefunden (SVNR+Name): ${existingPatient._id}`);
      }
    }
    
    // Prüfung 3: Name + Geburtsdatum + Telefon (falls keine Email)
    if (!existingPatient && patient.phone) {
      const phoneMatch = await PatientExtended.findOne({
        phone: patient.phone.trim(),
        firstName: { $regex: new RegExp(`^${patient.firstName.trim()}$`, 'i') },
        lastName: { $regex: new RegExp(`^${patient.lastName.trim()}$`, 'i') },
        dateOfBirth: new Date(patient.dateOfBirth)
      });
      
      if (phoneMatch) {
        existingPatient = phoneMatch;
        isKnownPatient = true;
        console.log(`[OnlineBooking] Bekannter Patient gefunden (Telefon+Name+Geburtsdatum): ${phoneMatch._id}`);
      }
    }
    
    // Erstelle neuen temporären Patienten, falls er nicht existiert
    if (!existingPatient) {
      // Für Online-Buchungen verwenden wir Standardwerte für erforderliche Felder
      // Diese können später vom Personal aktualisiert werden
      const newPatient = new PatientExtended({
        userId: doctor.id, // Verwende Arzt-ID als userId (kann später geändert werden)
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: new Date(patient.dateOfBirth),
        gender: 'd', // Standard: divers (kann später geändert werden)
        socialSecurityNumber: patient.socialSecurityNumber || patient.insuranceNumber || '0000000000', // Temporärer Wert
        insuranceProvider: 'ÖGK (Österreichische Gesundheitskasse)', // Standard-Versicherung
        address: {
          street: 'Nicht angegeben', // Wird später aktualisiert
          zipCode: '0000', // Temporärer Wert
          city: 'Nicht angegeben', // Wird später aktualisiert
          country: 'Österreich'
        },
        createdBy: doctor.id, // Arzt, der die Buchung erhält
        isActive: true,
        isTemporary: true, // Markiere als temporären Patienten
        notes: 'Patient über Online-Buchung erstellt - bitte Stammdaten vervollständigen'
      });
      existingPatient = await newPatient.save();
      isKnownPatient = false;
      console.log(`[OnlineBooking] Neuer temporärer Patient erstellt: ${existingPatient._id}`);
    } else {
      // Patient existiert bereits - markiere als nicht temporär (falls er temporär war)
      if (existingPatient.isTemporary) {
        existingPatient.isTemporary = false;
        await existingPatient.save();
        console.log(`[OnlineBooking] Temporärer Patient wurde validiert: ${existingPatient._id}`);
      }
    }

    const bookingData = {
      patient: {
        id: existingPatient?._id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: new Date(patient.dateOfBirth),
        insuranceNumber: patient.socialSecurityNumber || patient.insuranceNumber || '',
        isNewPatient: !isKnownPatient
      },
      isKnownPatient: isKnownPatient, // Markierung: Ist Patient bereits bekannt?
      appointment: {
        date: requestedDate,
        startTime: appointment.startTime,
        endTime: calculateEndTime(appointment.startTime, appointment.duration || 30),
        duration: appointment.duration || 30,
        type: appointment.type,
        reason: appointment.reason,
        notes: appointment.notes,
        serviceId: appointment.serviceId,
        assigned_devices: appointment.assigned_devices || [],
        assigned_rooms: appointment.assigned_rooms || []
      },
      doctor: {
        id: doctor.id,
        name: `${doctorExists.firstName} ${doctorExists.lastName}`,
        specialization: doctorExists.specialization
      },
      anamnesisAnswers: anamnesisResponses || [], // Konvertiere anamnesisResponses zu anamnesisAnswers
      source: 'online',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    // Initialisiere confirmation-Objekt falls nicht vorhanden
    if (!bookingData.confirmation) {
      bookingData.confirmation = {
        emailSent: false,
        smsSent: false,
        reminderSent: false
      };
    }
    
    // Erstelle OnlineBooking - bookingNumber wird automatisch vom pre('save') Hook generiert
    // Aber wir generieren sie manuell, um sicherzustellen, dass sie vorhanden ist
    const count = await OnlineBooking.countDocuments();
    const year = new Date().getFullYear();
    const bookingNumber = `B-${year}-${String(count + 1).padStart(6, '0')}`;
    
    bookingData.bookingNumber = bookingNumber;
    
    // Prüfe ob Double Opt-In erforderlich ist (nur für neue/unbekannte Patienten)
    const requiresDoubleOptIn = !isKnownPatient;
    
    // Generiere Double Opt-In Code falls erforderlich
    if (requiresDoubleOptIn) {
      const optInCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-stelliger Code
      const optInExpiresAt = new Date();
      optInExpiresAt.setHours(optInExpiresAt.getHours() + 24); // 24 Stunden gültig
      
      bookingData.doubleOptIn = {
        code: optInCode,
        emailSent: false,
        smsSent: false,
        verified: false,
        expiresAt: optInExpiresAt,
        attempts: 0,
        maxAttempts: 3
      };
      
      // Status auf 'pending' setzen (nicht 'confirmed')
      bookingData.status = 'pending';
    } else {
      // Bekannte Patienten: Direkt bestätigen
      bookingData.status = 'confirmed';
    }
    
    const booking = new OnlineBooking(bookingData);
    
    // Generiere Magic Link Token für Patienten-Terminverwaltung
    const magicLinkToken = crypto.randomBytes(32).toString('hex');
    const magicLinkExpiresAt = new Date();
    magicLinkExpiresAt.setDate(magicLinkExpiresAt.getDate() + 90); // 90 Tage gültig
    
    booking.magicLink = {
      token: magicLinkToken,
      expiresAt: magicLinkExpiresAt,
      createdAt: new Date(),
      usageCount: 0,
      maxUsage: 10
    };
    
    await booking.save();

    // Erstelle Termin NUR wenn Patient bekannt ist oder Double Opt-In bereits bestätigt wurde
    // Für neue Patienten wird der Termin erst nach Code-Validierung erstellt
    if (!requiresDoubleOptIn) {
      // Konvertiere startTime und endTime (Strings "HH:MM") zu Date-Objekten
      const dateStr = requestedDate.toISOString().split('T')[0];
      const startDateTime = new Date(`${dateStr}T${appointment.startTime}`);
      const endDateTime = new Date(`${dateStr}T${bookingData.appointment.endTime}`);
      
      const appointmentData = {
        patient: existingPatient._id, // Patient existiert jetzt immer
        doctor: doctor.id,
        startTime: startDateTime, // Date-Objekt
        endTime: endDateTime, // Date-Objekt
        type: appointment.type,
        anamnesisAnswers: booking.anamnesisAnswers || [], // Übernehme Anamnese-Antworten
        status: 'geplant', // Verwende 'geplant' statt 'scheduled' (entspricht dem Enum im Schema)
        title: appointment.type, // title ist required
        notes: `Online-Buchung: ${booking.bookingNumber}\nGrund: ${appointment.reason}`,
        bookingType: 'online',
        onlineBookingRef: booking.bookingNumber,
        isOnlineBooking: true
      };

      const newAppointment = new Appointment(appointmentData);
      await newAppointment.save();
    }

    // Sende E-Mail: Double Opt-In Code oder Bestätigung
    try {
      if (requiresDoubleOptIn) {
        await sendDoubleOptInEmail(booking);
      } else {
        await sendConfirmationEmail(booking);
      }
    } catch (emailError) {
      console.error('[OnlineBooking] Error sending email (non-blocking):', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Termin erfolgreich gebucht',
      data: {
        bookingNumber: booking.bookingNumber,
        appointmentDate: appointment.date,
        appointmentTime: appointment.startTime,
        doctor: doctorExists.firstName + ' ' + doctorExists.lastName,
        confirmationCode: booking.confirmation.confirmationCode
      }
    });
  } catch (error) {
    console.error('[OnlineBooking] Error in /book route:', error);
    console.error('[OnlineBooking] Error stack:', error.stack);
    console.error('[OnlineBooking] Request body:', JSON.stringify(req.body, null, 2));
    res.status(500).json({
      success: false,
      message: 'Fehler beim Buchen des Termins',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   GET /api/online-booking/cancellation-policy
// @desc    Get cancellation policy (deadline hours, etc.)
// @access  Public
router.get('/cancellation-policy', async (req, res) => {
  try {
    const cancellationDeadlineHours = await SystemSettings.getSetting(
      'onlineBooking',
      'cancellationDeadlineHours',
      24
    );
    
    const allowOnlineCancellation = await SystemSettings.getSetting(
      'onlineBooking',
      'allowOnlineCancellation',
      true
    );
    
    const cancellationPhoneNumber = await SystemSettings.getSetting(
      'onlineBooking',
      'cancellationPhoneNumber',
      null
    );
    
    res.json({
      success: true,
      data: {
        cancellationDeadlineHours,
        allowOnlineCancellation,
        cancellationPhoneNumber
      }
    });
  } catch (error) {
    console.error('[OnlineBooking] Error fetching cancellation policy:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Stornierungsrichtlinie'
    });
  }
});

// @route   GET /api/online-booking/status/:bookingNumber
// @desc    Check booking status
// @access  Public
router.get('/status/:bookingNumber', async (req, res) => {
  try {
    const booking = await OnlineBooking.findOne({ 
      bookingNumber: req.params.bookingNumber 
    }).populate('doctor.id', 'firstName lastName specialization');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Buchung nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: {
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        patient: {
          name: `${booking.patient.firstName} ${booking.patient.lastName}`,
          email: booking.patient.email
        },
        appointment: {
          date: booking.appointment.date,
          time: booking.appointment.startTime,
          type: booking.appointment.type,
          reason: booking.appointment.reason
        },
        doctor: {
          name: booking.doctor.name,
          specialization: booking.doctor.specialization
        },
        confirmation: booking.confirmation
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Buchungsinformationen'
    });
  }
});

// @route   PUT /api/online-booking/cancel/:bookingNumber
// @desc    Cancel a booking
// @access  Public
router.put('/cancel/:bookingNumber', [
  body('reason').notEmpty().trim()
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

    const booking = await OnlineBooking.findOne({ 
      bookingNumber: req.params.bookingNumber 
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Buchung nicht gefunden'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Buchung wurde bereits storniert'
      });
    }

    // Prüfe Stornierungsfristen
    const appointmentDate = new Date(booking.appointment.date);
    const appointmentTime = booking.appointment.startTime.split(':');
    const appointmentDateTime = new Date(appointmentDate);
    appointmentDateTime.setHours(parseInt(appointmentTime[0]), parseInt(appointmentTime[1]), 0, 0);
    
    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime - now) / (1000 * 60 * 60);
    
    // Lade Stornierungsfristen aus SystemSettings
    // Standard: 24 Stunden vor Termin
    const cancellationDeadlineHours = await SystemSettings.getSetting(
      'onlineBooking',
      'cancellationDeadlineHours',
      24
    );
    
    const allowOnlineCancellation = await SystemSettings.getSetting(
      'onlineBooking',
      'allowOnlineCancellation',
      true
    );
    
    const cancellationPhoneNumber = await SystemSettings.getSetting(
      'onlineBooking',
      'cancellationPhoneNumber',
      null
    );
    
    // Prüfe ob Frist überschritten ist
    if (hoursUntilAppointment < cancellationDeadlineHours) {
      // Frist überschritten - Online-Stornierung nicht mehr möglich
      const phoneMessage = cancellationPhoneNumber 
        ? ` Bitte rufen Sie uns an: ${cancellationPhoneNumber}`
        : ' Bitte kontaktieren Sie uns telefonisch.';
      
      return res.status(400).json({
        success: false,
        message: `Online-Stornierung ist nur bis ${cancellationDeadlineHours} Stunden vor dem Termin möglich.${phoneMessage}`,
        code: 'CANCELLATION_DEADLINE_EXCEEDED',
        deadlineHours: cancellationDeadlineHours,
        hoursUntilAppointment: Math.round(hoursUntilAppointment * 10) / 10,
        phoneNumber: cancellationPhoneNumber,
        allowOnlineCancellation: false
      });
    }
    
    // Prüfe ob Online-Stornierung generell erlaubt ist
    if (!allowOnlineCancellation) {
      const phoneMessage = cancellationPhoneNumber 
        ? ` Bitte rufen Sie uns an: ${cancellationPhoneNumber}`
        : ' Bitte kontaktieren Sie uns telefonisch.';
      
      return res.status(400).json({
        success: false,
        message: `Online-Stornierung ist derzeit nicht möglich.${phoneMessage}`,
        code: 'ONLINE_CANCELLATION_DISABLED',
        phoneNumber: cancellationPhoneNumber,
        allowOnlineCancellation: false
      });
    }

    // Storniere Buchung (Frist eingehalten)
    booking.status = 'cancelled';
    booking.addAuditEntry('cancelled', `Grund: ${req.body.reason}`, req.ip);
    await booking.save();

    // Storniere zugehörigen Termin
    const cancelledAppointment = await Appointment.findOneAndUpdate(
      { bookingId: booking._id },
      { status: 'cancelled' },
      { new: true }
    );

    // Benachrichtige Wartelisten-Patienten (asynchron, nicht blockierend)
    if (cancelledAppointment) {
      const waitingListNotificationService = require('../services/waitingListNotificationService');
      waitingListNotificationService.notifyWaitingListPatients(cancelledAppointment)
        .then(result => {
          console.log('[OnlineBooking] Wartelisten-Benachrichtigungen gesendet:', result);
        })
        .catch(error => {
          console.error('[OnlineBooking] Fehler bei Wartelisten-Benachrichtigung (non-blocking):', error);
        });
    }

    res.json({
      success: true,
      message: 'Buchung erfolgreich storniert'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Stornieren der Buchung'
    });
  }
});

// @route   GET /api/online-booking/doctors
// @desc    Get available doctors for online booking
// @access  Public
router.get('/doctors', async (req, res) => {
  try {
    // Suche nach Ärzten mit verschiedenen Rollen-Bezeichnungen
    const doctors = await User.find({
      role: { $in: ['doctor', 'arzt'] }, // Unterstütze sowohl 'doctor' als auch 'arzt'
      isActive: true,
      'profile.onlineBookingEnabled': true
    }).select('firstName lastName profile.specialization profile.workingHours profile.onlineBookingEnabled role');

    console.log(`[OnlineBooking] Found ${doctors.length} doctors with online booking enabled`);
    doctors.forEach(doctor => {
      console.log(`[OnlineBooking] Doctor: ${doctor.firstName} ${doctor.lastName}, role: ${doctor.role}, onlineBookingEnabled: ${doctor.profile?.onlineBookingEnabled}, profileKeys:`, doctor.profile ? Object.keys(doctor.profile) : 'no profile');
    });

    res.json({
      success: true,
      data: doctors.map(doctor => ({
        id: doctor._id,
        name: `${doctor.firstName} ${doctor.lastName}`,
        specialization: doctor.profile?.specialization || doctor.specialization || '',
        workingHours: doctor.profile?.workingHours
      }))
    });
  } catch (error) {
    console.error('[OnlineBooking] Error loading doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Ärzte'
    });
  }
});

// Hilfsfunktionen
async function checkAvailability(doctorId, date, time) {
  console.log(`[OnlineBooking] checkAvailability called: doctorId=${doctorId}, date=${date}, time=${time}`);
  
  // Konvertiere time (String "HH:MM") zu einem Date-Objekt für die Query
  const dateStr = date.toISOString().split('T')[0];
  const startDateTime = new Date(`${dateStr}T${time}`);
  const endDateTime = new Date(startDateTime.getTime() + 30 * 60000); // 30 Minuten Dauer
  
  console.log(`[OnlineBooking] Checking availability for: ${dateStr} ${time} (${startDateTime.toISOString()} - ${endDateTime.toISOString()})`);
  
  // 1. Prüfe ob Termin bereits existiert
  // startTime ist ein Date im Appointment-Modell, also müssen wir nach einem Date-Objekt suchen
  const existingAppointments = await Appointment.find({
    doctor: doctorId,
    startTime: {
      $gte: new Date(`${dateStr}T00:00:00`),
      $lt: new Date(`${dateStr}T23:59:59`)
    },
    status: { $nin: ['cancelled', 'no_show', 'abgesagt'] }
  });
  
  console.log(`[OnlineBooking] Found ${existingAppointments.length} existing appointments for this date`);
  
  // Prüfe ob der spezifische Zeitpunkt bereits belegt ist
  for (const existingAppointment of existingAppointments) {
    const existingStart = new Date(existingAppointment.startTime);
    const existingEnd = new Date(existingAppointment.endTime);
    console.log(`[OnlineBooking] Checking against existing appointment: ${existingStart.toISOString()} - ${existingEnd.toISOString()}`);
    
    // Prüfe ob der gewünschte Zeitpunkt mit einem bestehenden Termin kollidiert
    if (startDateTime < existingEnd && endDateTime > existingStart) {
      console.log(`[OnlineBooking] Time slot conflicts with existing appointment`);
      return false;
    }
  }

  // 2. Prüfe ob Arzt an diesem Tag arbeitet und ob Zeit in Pausenzeiten liegt
  // Konvertiere Datum zu Wochentag (monday, tuesday, etc.)
  const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = dayNames[dayIndex];
  
  // Finde StaffProfile für diesen Arzt (doctorId ist User-ID)
  const staffProfile = await StaffProfile.findOne({ userId: doctorId });
  if (!staffProfile) {
    console.log(`[OnlineBooking] checkAvailability: No StaffProfile found for doctor ${doctorId}`);
    return false;
  }
  
  const weeklySchedules = await WeeklySchedule.find({
    staffId: staffProfile._id, // staffId ist StaffProfile._id, nicht User-ID
    isActive: true,
    validFrom: { $lte: date },
    $or: [
      { validTo: { $gte: date } },
      { validTo: null }
    ]
  });

  for (const schedule of weeklySchedules) {
    const daySchedule = schedule.schedules.find(s => s.day === dayOfWeek);
    if (daySchedule && daySchedule.isWorking) {
      // Prüfe ob Zeit innerhalb der Arbeitszeiten liegt
      if (time >= daySchedule.startTime && time < daySchedule.endTime) {
        // Prüfe ob Zeit in Pausenzeiten liegt
        if (daySchedule.breakStart && daySchedule.breakEnd) {
          if (time >= daySchedule.breakStart && time < daySchedule.breakEnd) {
            return false; // Zeit liegt in Pausenzeiten
          }
        }
        return true; // Zeit ist verfügbar
      }
    }
  }

  return false; // Keine Arbeitszeiten an diesem Tag
}

function calculateEndTime(startTime, duration) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + duration;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}

async function sendConfirmationEmail(booking) {
  try {
    // Lade Location-Daten für Adresse (falls verfügbar)
    let location = null;
    try {
      // Versuche Location zu finden (z.B. über Appointment oder Doctor)
      // Für jetzt: Verwende erste aktive Location als Fallback
      location = await Location.findOne({ is_active: true });
    } catch (err) {
      console.warn('[OnlineBooking] Location nicht gefunden, verwende Standard-Adresse');
    }

    // Generiere ICS-Kalenderfile
    let icsContent = null;
    try {
      icsContent = generateICSFromBooking(booking, location);
      console.log('[OnlineBooking] ICS-File generiert');
    } catch (icsError) {
      console.error('[OnlineBooking] Fehler bei ICS-Generierung:', icsError);
      // ICS-Fehler sollte E-Mail-Versand nicht verhindern
    }

    // Versuche EmailService zu verwenden (falls verfügbar)
    let emailSent = false;
    try {
      const emailService = require('../services/emailService');
      
      // HTML-E-Mail-Inhalt generieren
      const emailHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563EB; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 10px 20px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Terminbestätigung</h1>
            </div>
            <div class="content">
              <p>Sehr geehrte/r ${booking.patient.firstName} ${booking.patient.lastName},</p>
              <p>Ihr Termin wurde erfolgreich gebucht.</p>
              
              <div class="details">
                <h2>Termindetails</h2>
                <p><strong>Buchungsnummer:</strong> ${booking.bookingNumber}</p>
                <p><strong>Datum:</strong> ${new Date(booking.appointment.date).toLocaleDateString('de-AT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Uhrzeit:</strong> ${booking.appointment.startTime} Uhr</p>
                <p><strong>Arzt:</strong> ${booking.doctor.name}</p>
                ${booking.doctor.specialization ? `<p><strong>Fachrichtung:</strong> ${booking.doctor.specialization}</p>` : ''}
                <p><strong>Art der Behandlung:</strong> ${booking.appointment.type}</p>
                ${booking.appointment.reason ? `<p><strong>Grund:</strong> ${booking.appointment.reason}</p>` : ''}
                ${location ? `<p><strong>Adresse:</strong> ${location.address_line1}, ${location.postal_code} ${location.city}</p>` : ''}
              </div>
              
              ${icsContent ? '<p>📅 Der Termin wurde als Anhang beigefügt und kann direkt in Ihren Kalender importiert werden.</p>' : ''}
              
              <p>Bitte erscheinen Sie pünktlich zum vereinbarten Termin.</p>
              <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
            </div>
            <div class="footer">
              <p>Mit freundlichen Grüßen<br>Ihr Praxisteam</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailText = `
Terminbestätigung

Sehr geehrte/r ${booking.patient.firstName} ${booking.patient.lastName},

Ihr Termin wurde erfolgreich gebucht.

Termindetails:
- Buchungsnummer: ${booking.bookingNumber}
- Datum: ${new Date(booking.appointment.date).toLocaleDateString('de-AT')}
- Uhrzeit: ${booking.appointment.startTime} Uhr
- Arzt: ${booking.doctor.name}
${booking.doctor.specialization ? `- Fachrichtung: ${booking.doctor.specialization}\n` : ''}- Art der Behandlung: ${booking.appointment.type}
${booking.appointment.reason ? `- Grund: ${booking.appointment.reason}\n` : ''}${location ? `- Adresse: ${location.address_line1}, ${location.postal_code} ${location.city}\n` : ''}
${icsContent ? '\nDer Termin wurde als .ics-Datei beigefügt und kann direkt in Ihren Kalender importiert werden.\n' : ''}

Sie können Ihren Termin jederzeit online verwalten:
${booking.magicLink?.token ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/patient-booking/${booking.magicLink.token}` : 'Link wird generiert...'}

Bitte erscheinen Sie pünktlich zum vereinbarten Termin.

Mit freundlichen Grüßen
Ihr Praxisteam
      `;

      // E-Mail mit ICS-Anhang senden
      const mailOptions = {
        from: {
          name: location?.name || booking.doctor.name || 'Ordination',
          address: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@praxis.at'
        },
        to: booking.patient.email,
        subject: `Terminbestätigung - ${booking.bookingNumber}`,
        html: emailHTML,
        text: emailText,
        attachments: icsContent ? [
          {
            filename: `Termin_${booking.bookingNumber}.ics`,
            content: icsContent,
            contentType: 'text/calendar; charset=utf-8; method=REQUEST'
          }
        ] : []
      };

      // Prüfe ob EmailService verfügbar ist
      if (emailService.transporter) {
        const result = await emailService.transporter.sendMail(mailOptions);
        emailSent = true;
        console.log(`📧 Bestätigungs-E-Mail mit ICS-Anhang gesendet an: ${booking.patient.email} (MessageID: ${result.messageId})`);
      } else {
        throw new Error('E-Mail-Transporter nicht verfügbar');
      }
    } catch (emailServiceError) {
      console.warn('[OnlineBooking] EmailService nicht verfügbar oder Fehler:', emailServiceError.message);
      // Fallback: Mock-E-Mail-Versand (für Entwicklung)
      console.log(`📧 [MOCK] Bestätigungs-E-Mail würde gesendet werden an: ${booking.patient.email}`);
      console.log(`📋 Buchungsnummer: ${booking.bookingNumber}`);
      console.log(`📅 Termin: ${booking.appointment.date} um ${booking.appointment.startTime}`);
      if (icsContent) {
        console.log(`📅 ICS-File generiert (${icsContent.length} Zeichen)`);
      }
      emailSent = true; // Markiere als gesendet für Mock
    }
    
    // Aktualisiere Booking-Status
    if (!booking.confirmation) {
      booking.confirmation = {};
    }
    booking.confirmation.emailSent = emailSent;
    booking.confirmation.confirmationCode = Math.random().toString(36).substr(2, 8).toUpperCase();
    booking.confirmation.confirmationDate = new Date();
    if (icsContent) {
      booking.confirmation.icsSent = true;
    }
    await booking.save();
  } catch (error) {
    console.error('[OnlineBooking] Error sending confirmation email:', error);
    // Fehler beim E-Mail-Versand sollte die Buchung nicht verhindern
    // Markiere trotzdem als versucht
    if (!booking.confirmation) {
      booking.confirmation = {};
    }
    booking.confirmation.emailSent = false;
    booking.confirmation.emailError = error.message;
    await booking.save().catch(() => {}); // Ignoriere Fehler beim Speichern
    throw error; // Wird vom aufrufenden Code behandelt
  }
}

// @route   POST /api/online-booking/waiting-list-reservation/:token
// @desc    Reserviere einen freigewordenen Termin für einen Wartelisten-Patienten
// @access  Public
router.post('/waiting-list-reservation/:token', [
  body('patientId').isMongoId().withMessage('Gültige Patient-ID erforderlich')
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

    const { token } = req.params;
    const { patientId } = req.body;

    const waitingListNotificationService = require('../services/waitingListNotificationService');
    const result = await waitingListNotificationService.reserveAppointmentForWaitingList(token, patientId);

    res.json({
      success: true,
      message: result.message,
      data: result.appointment
    });
  } catch (error) {
    console.error('[OnlineBooking] Fehler bei Termin-Reservierung:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Fehler bei der Termin-Reservierung'
    });
  }
});

// @route   GET /api/online-booking/waiting-list-reservation/:token
// @desc    Hole Details für einen Reservierungs-Link
// @access  Public
router.get('/waiting-list-reservation/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const WaitingList = require('../models/WaitingList');
    const Appointment = require('../models/Appointment');

    const waitingListEntry = await WaitingList.findOne({
      reservationToken: token,
      reservationExpiresAt: { $gt: new Date() },
      status: 'waiting'
    })
      .populate('patient', 'firstName lastName email phone dateOfBirth')
      .populate('reservationAppointmentId')
      .lean();

    if (!waitingListEntry) {
      return res.status(404).json({
        success: false,
        message: 'Ungültiger oder abgelaufener Reservierungslink'
      });
    }

    // Lade Termin-Details
    const appointment = await Appointment.findById(waitingListEntry.reservationAppointmentId)
      .populate('doctor', 'firstName lastName')
      .populate('service', 'name code')
      .lean();

    if (!appointment || appointment.status !== 'cancelled') {
      return res.status(404).json({
        success: false,
        message: 'Termin ist nicht mehr verfügbar'
      });
    }

    res.json({
      success: true,
      data: {
        waitingListEntry: {
          _id: waitingListEntry._id,
          patient: waitingListEntry.patient,
          reason: waitingListEntry.reason
        },
        appointment: {
          _id: appointment._id,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          doctor: appointment.doctor,
          service: appointment.service,
          type: appointment.type
        },
        expiresAt: waitingListEntry.reservationExpiresAt
      }
    });
  } catch (error) {
    console.error('[OnlineBooking] Fehler beim Laden der Reservierungs-Details:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Reservierungs-Details'
    });
  }
});

module.exports = router;
