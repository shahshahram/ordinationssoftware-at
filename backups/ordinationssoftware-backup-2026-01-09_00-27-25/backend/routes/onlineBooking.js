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
const ServiceCategory = require('../models/ServiceCategory');
const Device = require('../models/Device');
const Room = require('../models/Room');
const Location = require('../models/Location');
const SystemSettings = require('../models/SystemSettings');
const AvailabilityService = require('../services/availabilityService');
const { generateICSFromBooking } = require('../utils/icsGenerator');
const InternalMessage = require('../models/InternalMessage');
const TimeBlock = require('../models/TimeBlock');
const LocationException = require('../models/LocationException');
const auth = require('../middleware/auth');
const router = express.Router();

// SMS-Service (optional, falls konfiguriert)
let smsService = null;
try {
  smsService = require('../services/smsService');
} catch (err) {
  console.warn('[OnlineBooking] SMS-Service nicht verfügbar');
}

// @route   GET /api/online-booking/availability
// @desc    Get available time slots for a date
// @access  Public
router.get('/availability', async (req, res) => {
  try {
    const { date, doctorId, duration = 30, serviceId, locationId } = req.query;
    
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

    // Prüfe ob eine LocationException für dieses Datum existiert (überschreibt normale Öffnungszeiten)
    if (locationId) {
      try {
        const exceptionDate = new Date(date);
        exceptionDate.setHours(0, 0, 0, 0);
        const exceptionEndDate = new Date(exceptionDate);
        exceptionEndDate.setHours(23, 59, 59, 999);
        
        const locationException = await LocationException.findOne({
          location_id: locationId,
          date: {
            $gte: exceptionDate,
            $lte: exceptionEndDate
          },
          isActive: true
        })
        .populate('assignedStaff', '_id');
        
        if (locationException) {
          // Prüfe, ob assignedStaff gesetzt ist und ob der angefragte Arzt darin enthalten ist
          const hasAssignedStaff = locationException.assignedStaff && 
            Array.isArray(locationException.assignedStaff) && 
            locationException.assignedStaff.length > 0;
          
          if (hasAssignedStaff) {
            // Prüfe, ob der angefragte Arzt (doctorId ist User-ID) in assignedStaff ist
            // assignedStaff enthält User-IDs
            const assignedStaffIds = locationException.assignedStaff.map((staff) => 
              staff._id ? staff._id.toString() : staff.toString()
            );
            const doctorIdString = doctorId.toString();
            
            if (!assignedStaffIds.includes(doctorIdString)) {
              console.log(`[OnlineBooking] LocationException exists but doctor ${doctorId} is not in assignedStaff list`);
              // Diese Exception gilt nicht für diesen Arzt - verwende normale Öffnungszeiten
              // Setze isWorking auf false, damit keine Slots generiert werden
              workingHours[dayOfWeek] = {
                ...workingHours[dayOfWeek],
                isWorking: false
              };
            } else {
              console.log(`[OnlineBooking] Found LocationException for ${date} with assignedStaff: ${locationException.startTime} - ${locationException.endTime}`);
              // Überschreibe workingDay mit Exception-Daten
              workingHours[dayOfWeek] = {
                start: locationException.startTime,
                end: locationException.endTime,
                isWorking: true,
                breakStart: locationException.breakStart,
                breakEnd: locationException.breakEnd
              };
            }
          } else {
            // Kein assignedStaff gesetzt - Exception gilt für alle
            console.log(`[OnlineBooking] Found LocationException for ${date} (no assignedStaff, applies to all): ${locationException.startTime} - ${locationException.endTime}`);
            // Überschreibe workingDay mit Exception-Daten
            workingHours[dayOfWeek] = {
              start: locationException.startTime,
              end: locationException.endTime,
              isWorking: true,
              breakStart: locationException.breakStart,
              breakEnd: locationException.breakEnd
            };
          }
        }
      } catch (exceptionError) {
        console.warn('[OnlineBooking] Error checking LocationException:', exceptionError);
        // Weiter mit normalen Öffnungszeiten
      }
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

      // Prüfe TimeBlocks (gesperrte Zeitslots)
      // TimeBlocks mit Personal blockieren nur dieses Personal
      // TimeBlocks ohne Personal blockieren alle
      const timeBlocks = await TimeBlock.find({
        $or: [
          { staffId: doctorId }, // TimeBlock für dieses Personal (neues Feld)
          { doctor: doctorId }, // TimeBlock für dieses Personal (Rückwärtskompatibilität)
          { staffId: { $exists: false }, doctor: { $exists: false } }, // Oder TimeBlocks ohne Personal (blockieren alle)
          { staffId: null, doctor: null } // Oder TimeBlocks mit null (blockieren alle)
        ],
        startTime: {
          $gte: new Date(`${date}T00:00:00`),
          $lt: new Date(`${date}T23:59:59`)
        },
        status: { $in: ['blocked', 'reserved'] } // Nur aktive Sperren
      }).catch(err => {
        console.error('[OnlineBooking] Error fetching time blocks:', err);
        return []; // Fallback: keine TimeBlocks gefunden
      });

      // Füge TimeBlocks zu bookedSlots hinzu
      timeBlocks.forEach(block => {
        bookedSlots.push({
          start: block.startTime,
          end: block.endTime
        });
      });

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

// @route   GET /api/online-booking/availability-calendar
// @desc    Get available time slots for a date range (for calendar month view)
// @access  Public
router.get('/availability-calendar', async (req, res) => {
  try {
    const { startDate, endDate, doctorId, serviceId, duration = 30 } = req.query;
    
    if (!startDate || !endDate || !doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Startdatum, Enddatum und Arzt-ID sind erforderlich'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiges Datumsformat'
      });
    }

    // Lade Service-Details falls angegeben
    let serviceDoc = null;
    if (serviceId) {
      serviceDoc = await ServiceCatalog.findById(serviceId);
      if (serviceDoc && !serviceDoc.online_bookable) {
        return res.status(400).json({
          success: false,
          message: 'Dieser Service kann nicht online gebucht werden'
        });
      }
    }

    const slotDuration = serviceDoc?.base_duration_min || parseInt(duration) || 30;

    // Finde StaffProfile
    const staffProfile = await StaffProfile.findOne({ userId: doctorId });
    if (!staffProfile) {
      return res.status(404).json({
        success: false,
        message: 'Personalprofil für diesen Arzt nicht gefunden'
      });
    }

    // Generiere alle Tage im Bereich
    const calendarData = {};
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayIndex = currentDate.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = dayNames[dayIndex];

      // Lade Arbeitszeiten für diesen Tag
      const weeklySchedules = await WeeklySchedule.find({
        staffId: staffProfile._id,
        isActive: true,
        validFrom: { $lte: currentDate },
        $or: [
          { validTo: { $gte: currentDate } },
          { validTo: null }
        ]
      });

      let workingDay = null;
      if (weeklySchedules.length > 0) {
        for (const schedule of weeklySchedules) {
          const daySchedule = schedule.schedules?.find(s => s.day === dayOfWeek && s.isWorking);
          if (daySchedule) {
            workingDay = {
              start: daySchedule.startTime,
              end: daySchedule.endTime,
              breakStart: daySchedule.breakStart,
              breakEnd: daySchedule.breakEnd,
              isWorking: true
            };
            break;
          }
        }
      }

      // Wenn kein Schedule gefunden, überspringe diesen Tag
      if (!workingDay || !workingDay.isWorking) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Lade bestehende Termine für diesen Tag
      const existingAppointments = await Appointment.find({
        doctor: doctorId,
        startTime: {
          $gte: new Date(`${dateStr}T00:00:00`),
          $lt: new Date(`${dateStr}T23:59:59`)
        },
        status: { $nin: ['cancelled', 'no_show', 'abgesagt'] }
      });

      const bookedSlots = existingAppointments.map(apt => ({
        start: new Date(apt.startTime).toTimeString().slice(0, 5),
        end: new Date(apt.endTime).toTimeString().slice(0, 5)
      }));

      // Generiere verfügbare Slots
      const availableSlots = [];
      const [startHour, startMin] = workingDay.start.split(':').map(Number);
      const [endHour, endMin] = workingDay.end.split(':').map(Number);
      
      let currentTime = new Date(`${dateStr}T${workingDay.start}`);
      const endTime = new Date(`${dateStr}T${workingDay.end}`);

      while (currentTime < endTime) {
        const slotStart = currentTime.toTimeString().slice(0, 5);
        const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000).toTimeString().slice(0, 5);

        // Prüfe Pausenzeiten
        let isInBreak = false;
        if (workingDay.breakStart && workingDay.breakEnd) {
          if (slotStart < workingDay.breakEnd && slotEnd > workingDay.breakStart) {
            isInBreak = true;
          }
        }

        // Prüfe ob Slot belegt ist
        const isBooked = bookedSlots.some(booked => {
          const slotStartTime = new Date(`${dateStr}T${slotStart}`);
          const slotEndTime = new Date(`${dateStr}T${slotEnd}`);
          const bookedStartTime = new Date(`${dateStr}T${booked.start}`);
          const bookedEndTime = new Date(`${dateStr}T${booked.end}`);
          return slotStartTime < bookedEndTime && slotEndTime > bookedStartTime;
        });

        if (!isInBreak && !isBooked && new Date(`${dateStr}T${slotEnd}`) <= endTime) {
          availableSlots.push(slotStart);
        }

        currentTime = new Date(currentTime.getTime() + slotDuration * 60000);
      }

      // Prüfe Online-Kontingente falls Service angegeben
      let finalSlots = availableSlots;
      if (serviceDoc && serviceDoc.online_contingents && serviceDoc.online_contingents.length > 0) {
        const activeContingents = serviceDoc.online_contingents.filter(c => c.isActive);
        if (activeContingents.length > 0) {
          // Filtere Slots nach Kontingenten (asynchron)
          const filteredSlots = [];
          for (const slot of availableSlots) {
            let slotAllowed = false;
            
            for (const contingent of activeContingents) {
              // Prüfe ob Tag in daysOfWeek enthalten ist
              if (!contingent.daysOfWeek.includes(dayIndex)) {
                continue;
              }
              
              // Prüfe ob Slot im Zeitfenster liegt
              if (slot >= contingent.timeWindow.start && slot < contingent.timeWindow.end) {
                // Prüfe ob maxOnlineBookings erreicht ist
                const bookingsInContingent = await OnlineBooking.countDocuments({
                  'appointment.date': dateStr,
                  'appointment.startTime': {
                    $gte: `${dateStr}T${contingent.timeWindow.start}`,
                    $lt: `${dateStr}T${contingent.timeWindow.end}`
                  },
                  'appointment.serviceId': serviceId,
                  status: { $nin: ['cancelled', 'pending'] }
                });

                if (contingent.maxOnlineBookings === 0 || bookingsInContingent < contingent.maxOnlineBookings) {
                  slotAllowed = true;
                  break;
                }
              }
            }
            
            if (slotAllowed) {
              filteredSlots.push(slot);
            }
          }
          
          finalSlots = filteredSlots;
        } else {
          // Keine aktiven Kontingente = keine Slots erlaubt
          finalSlots = [];
        }
      }

      calendarData[dateStr] = {
        date: dateStr,
        availableSlots: finalSlots,
        slotCount: finalSlots.length
      };

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      success: true,
      data: {
        calendar: calendarData,
        startDate: startDate,
        endDate: endDate
      }
    });
  } catch (error) {
    console.error('[OnlineBooking] Error in /availability-calendar route:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Kalender-Verfügbarkeit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/online-booking/categories
// @desc    Get categories with online-bookable services
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    // Finde alle Kategorien, die Services mit online_bookable=true haben
    const onlineBookableServices = await ServiceCatalog.find({
      online_bookable: true,
      is_active: true
    }).select('category').lean();

    // Extrahiere eindeutige Kategorien
    const uniqueCategories = [...new Set(
      onlineBookableServices
        .map(s => s.category)
        .filter(c => c && c.trim() !== '')
    )];

    // Lade Kategorie-Details aus ServiceCategory (falls vorhanden)
    const categoryDetails = await ServiceCategory.find({
      name: { $in: uniqueCategories },
      is_active: true
    }).select('_id name code color_hex description').lean();

    // Erstelle Map für schnellen Zugriff
    const categoryMap = new Map();
    categoryDetails.forEach(cat => {
      categoryMap.set(cat.name, cat);
    });

    // Kombiniere Daten: Strukturierte Kategorien + einfache Kategorien
    const categories = uniqueCategories.map(categoryName => {
      const structured = categoryMap.get(categoryName);
      if (structured) {
        return {
          _id: structured._id,
          name: structured.name,
          code: structured.code,
          color_hex: structured.color_hex,
          description: structured.description,
          serviceCount: onlineBookableServices.filter(s => s.category === categoryName).length
        };
      } else {
        // Fallback für Kategorien, die nicht in ServiceCategory existieren
        return {
          _id: null,
          name: categoryName,
          code: categoryName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10),
          color_hex: '#6B7280',
          description: null,
          serviceCount: onlineBookableServices.filter(s => s.category === categoryName).length
        };
      }
    }).sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('[OnlineBooking] Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Kategorien',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/online-booking/services
// @desc    Get online-bookable services, optionally filtered by category
// @access  Public
router.get('/services', async (req, res) => {
  try {
    const { categoryId, categoryName } = req.query;

    const filter = {
      online_bookable: true,
      is_active: true
    };

    // Filter nach Kategorie
    if (categoryId) {
      const category = await ServiceCategory.findById(categoryId);
      if (category) {
        filter.category = category.name;
      }
    } else if (categoryName) {
      filter.category = categoryName;
    }

    const services = await ServiceCatalog.find(filter)
      .select('_id code name description category base_duration_min online_bookable assigned_users requires_user_selection assigned_devices assigned_rooms requires_device_selection requires_room_selection device_quantity_required room_quantity_required price_cents buffer_before_min buffer_after_min')
      .populate('assigned_users', '_id firstName lastName specialization')
      .sort({ name: 1 })
      .lean();

    // Transformiere Services für Frontend
    const transformedServices = services.map(service => ({
      _id: service._id,
      code: service.code,
      name: service.name,
      description: service.description,
      category: service.category,
      duration: service.base_duration_min || 30,
      base_duration_min: service.base_duration_min,
      buffer_before_min: service.buffer_before_min,
      buffer_after_min: service.buffer_after_min,
      price_cents: service.price_cents,
      assignedUsers: service.assigned_users || [],
      requiresUserSelection: service.requires_user_selection || false
    }));

    res.json({
      success: true,
      data: transformedServices
    });
  } catch (error) {
    console.error('[OnlineBooking] Error fetching services:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Services',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/online-booking/doctors
// @desc    Get doctors available for online booking, optionally filtered by service
// @access  Public
router.get('/doctors', async (req, res) => {
  try {
    const { serviceId } = req.query;

    let doctors = [];

    // Wenn serviceId angegeben, lade zugewiesene Benutzer direkt
    if (serviceId) {
      const service = await ServiceCatalog.findById(serviceId)
        .select('assigned_users requires_user_selection');

      console.log(`[OnlineBooking] Service ${serviceId} found:`, {
        hasService: !!service,
        assignedUsersCount: service?.assigned_users?.length || 0,
        assignedUsers: service?.assigned_users || [],
        requiresUserSelection: service?.requires_user_selection
      });

      if (service) {
        // Wenn assigned_users vorhanden sind, lade diese direkt (unabhängig von Rolle)
        if (service.assigned_users && service.assigned_users.length > 0) {
          const assignedUserIds = service.assigned_users.map(u => {
            // assigned_users kann ObjectId oder String sein
            return u._id ? u._id.toString() : u.toString();
          });
          
          console.log(`[OnlineBooking] Assigned user IDs for service ${serviceId}:`, assignedUserIds);
          
          // Lade alle zugewiesenen Benutzer, die online-buchbar sind
          doctors = await User.find({
            _id: { $in: assignedUserIds },
            isActive: true,
            'profile.onlineBookingEnabled': true
          })
          .select('firstName lastName profile.specialization profile.workingHours profile.onlineBookingEnabled role');
          
          console.log(`[OnlineBooking] Loaded ${doctors.length} assigned users (any role) for service ${serviceId}:`, 
            doctors.map(d => ({ id: d._id.toString(), name: `${d.firstName} ${d.lastName}`, role: d.role })));
        } else {
          // Keine assigned_users vorhanden - zeige keine Benutzer
          // (auch wenn requires_user_selection = false, zeigen wir keine, wenn serviceId angegeben ist)
          doctors = [];
          console.log(`[OnlineBooking] Service ${serviceId} has no assigned users, returning empty list`);
        }
      } else {
        // Service nicht gefunden, zeige keine Benutzer
        doctors = [];
        console.log(`[OnlineBooking] Service ${serviceId} not found`);
      }
    } else {
      // Keine serviceId angegeben, zeige nur Ärzte (Standard-Verhalten)
      const doctorQuery = {
        role: { $in: ['doctor', 'arzt'] },
        isActive: true,
        'profile.onlineBookingEnabled': true
      };
      doctors = await User.find(doctorQuery)
        .select('firstName lastName profile.specialization profile.workingHours profile.onlineBookingEnabled role');
      console.log(`[OnlineBooking] No serviceId, showing all online-bookable doctors: ${doctors.length}`);
    }

    console.log(`[OnlineBooking] Found ${doctors.length} users with online booking enabled${serviceId ? ` (filtered by service ${serviceId})` : ''}`);

    res.json({
      success: true,
      data: doctors.map(doctor => ({
        id: doctor._id,
        name: `${doctor.firstName} ${doctor.lastName}`,
        specialization: doctor.profile?.specialization || doctor.specialization || '',
        workingHours: doctor.profile?.workingHours,
        role: doctor.role
      }))
    });
  } catch (error) {
    console.error('[OnlineBooking] Error loading doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Benutzer',
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
  body('patient.gender').notEmpty().isIn(['m', 'w', 'd']).withMessage('Geschlecht muss m, w oder d sein'),
  body('patient.address.street').optional().trim(),
  body('patient.address.zipCode').optional().trim(),
  body('patient.address.city').optional().trim(),
  body('patient.address.country').optional().trim(),
  body('appointment.date').isISO8601(),
  body('appointment.startTime').notEmpty(),
  body('appointment.type').notEmpty().trim(),
  body('appointment.reason').optional().trim(), // Jetzt optional
  body('appointment.notes').optional().trim(),
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

    // Verwende zugewiesene Geräte/Räume aus dem ServiceCatalog
    // Wenn der Service assigned_devices/assigned_rooms hat, werden diese automatisch verwendet
    let finalAssignedDevices = appointment.assigned_devices || [];
    let finalAssignedRooms = appointment.assigned_rooms || [];

    // Prüfe Service falls angegeben
    let serviceDoc = null;
    if (appointment.serviceId) {
      serviceDoc = await ServiceCatalog.findById(appointment.serviceId)
        .populate('assigned_devices')
        .populate('assigned_rooms');
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

      if (serviceDoc.assigned_devices && serviceDoc.assigned_devices.length > 0) {
        // Verwende die zugewiesenen Geräte aus dem ServiceCatalog
        finalAssignedDevices = serviceDoc.assigned_devices.map(d => d._id ? d._id.toString() : d.toString());
        console.log(`[OnlineBooking] Verwende ${finalAssignedDevices.length} zugewiesene Geräte aus ServiceCatalog für Service ${serviceDoc.name}`);
      }

      if (serviceDoc.assigned_rooms && serviceDoc.assigned_rooms.length > 0) {
        // Verwende die zugewiesenen Räume aus dem ServiceCatalog
        finalAssignedRooms = serviceDoc.assigned_rooms.map(r => r._id ? r._id.toString() : r.toString());
        console.log(`[OnlineBooking] Verwende ${finalAssignedRooms.length} zugewiesene Räume aus ServiceCatalog für Service ${serviceDoc.name}`);
      }

      // Prüfe ob zugewiesene Geräte vorhanden und verfügbar sind
      if (finalAssignedDevices.length > 0) {
        const validDevices = await Device.find({ 
          _id: { $in: finalAssignedDevices },
          isActive: true
        });
        
        if (validDevices.length !== finalAssignedDevices.length) {
          return res.status(400).json({
            success: false,
            message: 'Ein oder mehrere zugewiesene Geräte sind nicht verfügbar oder nicht aktiv'
          });
        }

        // Prüfe ob genügend Geräte vorhanden sind (falls device_quantity_required gesetzt)
        if (serviceDoc.device_quantity_required && finalAssignedDevices.length < serviceDoc.device_quantity_required) {
          return res.status(400).json({
            success: false,
            message: `Für diesen Service werden mindestens ${serviceDoc.device_quantity_required} Geräte benötigt, aber nur ${finalAssignedDevices.length} zugewiesen`
          });
        }
      }

      // Prüfe ob zugewiesene Räume vorhanden und verfügbar sind
      if (finalAssignedRooms.length > 0) {
        const validRooms = await Room.find({ 
          _id: { $in: finalAssignedRooms },
          isActive: true
        });
        
        if (validRooms.length !== finalAssignedRooms.length) {
          return res.status(400).json({
            success: false,
            message: 'Ein oder mehrere zugewiesene Räume sind nicht verfügbar oder nicht aktiv'
          });
        }

        // Prüfe ob genügend Räume vorhanden sind (falls room_quantity_required gesetzt)
        if (serviceDoc.room_quantity_required && finalAssignedRooms.length < serviceDoc.room_quantity_required) {
          return res.status(400).json({
            success: false,
            message: `Für diesen Service werden mindestens ${serviceDoc.room_quantity_required} Räume benötigt, aber nur ${finalAssignedRooms.length} zugewiesen`
          });
        }
      }

      // Prüfe ob Service Geräte/Räume erfordert, aber keine zugewiesen sind
      if (serviceDoc.requires_device_selection && finalAssignedDevices.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Dieser Service erfordert Geräte, aber es sind keine Geräte im Leistungskatalog zugewiesen. Bitte kontaktieren Sie uns telefonisch.'
        });
      }

      if (serviceDoc.requires_room_selection && finalAssignedRooms.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Dieser Service erfordert Räume, aber es sind keine Räume im Leistungskatalog zugewiesen. Bitte kontaktieren Sie uns telefonisch.'
        });
      }
    }

    // Prüfe Verfügbarkeit (Arzt)
    const requestedDate = new Date(appointment.date);
    
    // Prüfe ob Datum in der Vergangenheit liegt
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Setze auf Mitternacht für korrekten Vergleich
    const requestedDateOnly = new Date(requestedDate);
    requestedDateOnly.setHours(0, 0, 0, 0);
    
    if (requestedDateOnly < today) {
      return res.status(400).json({
        success: false,
        message: 'Termine in der Vergangenheit können nicht gebucht werden'
      });
    }
    
    // Prüfe ob Datum heute ist und Zeit bereits vergangen
    const isToday = requestedDateOnly.getTime() === today.getTime();
    if (isToday) {
      const [hours, minutes] = appointment.startTime.split(':').map(Number);
      const appointmentTime = new Date();
      appointmentTime.setHours(hours, minutes, 0, 0);
      const now = new Date();
      
      if (appointmentTime < now) {
        return res.status(400).json({
          success: false,
          message: 'Die gewählte Zeit liegt in der Vergangenheit'
        });
      }
    }
    
    const isAvailable = await checkAvailability(doctor.id, requestedDate, appointment.startTime);
    
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Der gewählte Termin ist nicht mehr verfügbar'
      });
    }
    
    // Berechne korrekte Dauer aus Service (mit Pufferzeiten)
    const calculatedDuration = serviceDoc ? (
      (serviceDoc.base_duration_min || 30) + 
      (serviceDoc.buffer_before_min || 0) + 
      (serviceDoc.buffer_after_min || 0)
    ) : (appointment.duration || 30);
    
    // Prüfe Ressourcen-Verfügbarkeit (Räume und Geräte) - Kollisionsprüfung
    if (finalAssignedRooms && finalAssignedRooms.length > 0) {
      const CollisionDetection = require('../utils/collisionDetection');
      const dateStr = requestedDate.toISOString().split('T')[0];
      const [hours, minutes] = appointment.startTime.split(':').map(Number);
      const startDateTime = new Date(requestedDate);
      startDateTime.setHours(hours, minutes, 0, 0);
      // Verwende berechnete Dauer mit Pufferzeiten
      const endDateTime = new Date(startDateTime.getTime() + calculatedDuration * 60000);
      
      // Prüfe jeden Raum auf Kollisionen
      for (const roomId of finalAssignedRooms) {
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
    
    if (finalAssignedDevices && finalAssignedDevices.length > 0) {
      const CollisionDetection = require('../utils/collisionDetection');
      const dateStr = requestedDate.toISOString().split('T')[0];
      const [hours, minutes] = appointment.startTime.split(':').map(Number);
      const startDateTime = new Date(requestedDate);
      startDateTime.setHours(hours, minutes, 0, 0);
      // Verwende berechnete Dauer mit Pufferzeiten
      const endDateTime = new Date(startDateTime.getTime() + calculatedDuration * 60000);
      
      // Prüfe alle Geräte auf Kollisionen
      const deviceCollisions = await CollisionDetection.checkDeviceCollisions(
        finalAssignedDevices,
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
    // WICHTIG: Suche GLOBAL (ohne userId-Filter), da Patienten systemweit eindeutig sein sollten
    // Suche nach verschiedenen Kombinationen für bessere Trefferquote
    let existingPatient = null;
    let isKnownPatient = false;
    
    // Normalisiere Eingabedaten für bessere Trefferquote
    const normalizedEmail = patient.email ? patient.email.toLowerCase().trim() : null;
    const normalizedFirstName = patient.firstName ? patient.firstName.trim() : '';
    const normalizedLastName = patient.lastName ? patient.lastName.trim() : '';
    const normalizedPhone = patient.phone ? patient.phone.trim().replace(/\s+/g, '') : null;
    const normalizedSVNR = patient.socialSecurityNumber ? patient.socialSecurityNumber.trim().replace(/\s+/g, '') : null;
    const normalizedDateOfBirth = patient.dateOfBirth ? new Date(patient.dateOfBirth) : null;
    
    // Prüfung 1: SVNR (höchste Priorität - eindeutigste Identifikation)
    if (!existingPatient && normalizedSVNR && normalizedSVNR !== '0000000000') {
      const svnrMatch = await PatientExtended.findOne({
        socialSecurityNumber: normalizedSVNR,
        firstName: { $regex: new RegExp(`^${normalizedFirstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        lastName: { $regex: new RegExp(`^${normalizedLastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      
      if (svnrMatch) {
        existingPatient = svnrMatch;
        isKnownPatient = true;
        console.log(`[OnlineBooking] Bekannter Patient gefunden (SVNR+Name): ${existingPatient._id}`);
      }
    }
    
    // Prüfung 2: Exakte Übereinstimmung (Email + Name + Geburtsdatum)
    if (!existingPatient && normalizedEmail && normalizedFirstName && normalizedLastName && normalizedDateOfBirth) {
      // Suche mit verschiedenen Email-Varianten (mit/ohne Leerzeichen, Groß-/Kleinschreibung)
      const emailMatch = await PatientExtended.findOne({
        $or: [
          { email: normalizedEmail },
          { email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
        ],
        firstName: { $regex: new RegExp(`^${normalizedFirstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        lastName: { $regex: new RegExp(`^${normalizedLastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        dateOfBirth: {
          $gte: new Date(normalizedDateOfBirth.getFullYear(), normalizedDateOfBirth.getMonth(), normalizedDateOfBirth.getDate()),
          $lt: new Date(normalizedDateOfBirth.getFullYear(), normalizedDateOfBirth.getMonth(), normalizedDateOfBirth.getDate() + 1)
        }
      });
      
      if (emailMatch) {
        existingPatient = emailMatch;
        isKnownPatient = true;
        console.log(`[OnlineBooking] Bekannter Patient gefunden (Email+Name+Geburtsdatum): ${existingPatient._id}`);
      }
    }
    
    // Prüfung 3: Name + Geburtsdatum + Telefon (falls keine Email oder Email nicht gefunden)
    if (!existingPatient && normalizedPhone && normalizedFirstName && normalizedLastName && normalizedDateOfBirth) {
      // Normalisiere Telefonnummer (entferne Leerzeichen, Bindestriche, etc.)
      const phoneMatch = await PatientExtended.findOne({
        $or: [
          { phone: normalizedPhone },
          { phone: { $regex: new RegExp(normalizedPhone.replace(/\D/g, ''), 'i') } }
        ],
        firstName: { $regex: new RegExp(`^${normalizedFirstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        lastName: { $regex: new RegExp(`^${normalizedLastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        dateOfBirth: {
          $gte: new Date(normalizedDateOfBirth.getFullYear(), normalizedDateOfBirth.getMonth(), normalizedDateOfBirth.getDate()),
          $lt: new Date(normalizedDateOfBirth.getFullYear(), normalizedDateOfBirth.getMonth(), normalizedDateOfBirth.getDate() + 1)
        }
      });
      
      if (phoneMatch) {
        existingPatient = phoneMatch;
        isKnownPatient = true;
        console.log(`[OnlineBooking] Bekannter Patient gefunden (Telefon+Name+Geburtsdatum): ${phoneMatch._id}`);
      }
    }
    
    // Prüfung 4: Name + Geburtsdatum (Fallback - weniger spezifisch, aber besser als nichts)
    if (!existingPatient && normalizedFirstName && normalizedLastName && normalizedDateOfBirth) {
      const nameDobMatch = await PatientExtended.findOne({
        firstName: { $regex: new RegExp(`^${normalizedFirstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        lastName: { $regex: new RegExp(`^${normalizedLastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        dateOfBirth: {
          $gte: new Date(normalizedDateOfBirth.getFullYear(), normalizedDateOfBirth.getMonth(), normalizedDateOfBirth.getDate()),
          $lt: new Date(normalizedDateOfBirth.getFullYear(), normalizedDateOfBirth.getMonth(), normalizedDateOfBirth.getDate() + 1)
        }
      });
      
      if (nameDobMatch) {
        existingPatient = nameDobMatch;
        isKnownPatient = true;
        console.log(`[OnlineBooking] Bekannter Patient gefunden (Name+Geburtsdatum): ${existingPatient._id}`);
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
        gender: patient.gender || 'd', // Verwende das vom Benutzer angegebene Geschlecht
        socialSecurityNumber: patient.socialSecurityNumber || patient.insuranceNumber || '0000000000', // Temporärer Wert
        insuranceProvider: 'ÖGK (Österreichische Gesundheitskasse)', // Standard-Versicherung
        address: {
          street: patient.address?.street || 'Nicht angegeben',
          zipCode: patient.address?.zipCode || '0000',
          city: patient.address?.city || 'Nicht angegeben',
          country: patient.address?.country || 'Österreich'
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
      
      // Prüfe ob Online-Buchung für diesen Patienten blockiert ist
      if (existingPatient.onlineBookingBlocked === true) {
        console.log(`[OnlineBooking] Online-Buchung für Patient ${existingPatient._id} ist blockiert`);
        return res.status(403).json({
          success: false,
          message: 'Online-Buchungen sind für Sie nicht möglich. Bitte vereinbaren Sie Ihren Termin telefonisch.',
          code: 'ONLINE_BOOKING_BLOCKED'
        });
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
        // Berechne Dauer aus Service (base_duration_min + buffer_before_min + buffer_after_min)
        // Startzeit wird um buffer_before_min nach hinten verschoben, Endzeit um buffer_after_min nach vorne
        duration: serviceDoc ? (
          (serviceDoc.base_duration_min || 30) + 
          (serviceDoc.buffer_before_min || 0) + 
          (serviceDoc.buffer_after_min || 0)
        ) : (appointment.duration || 30),
        endTime: serviceDoc ? calculateEndTimeWithBuffer(
          appointment.startTime,
          serviceDoc.base_duration_min || 30,
          serviceDoc.buffer_before_min || 0,
          serviceDoc.buffer_after_min || 0
        ) : calculateEndTime(appointment.startTime, appointment.duration || 30),
        type: appointment.type,
        reason: appointment.reason || appointment.notes || appointment.type || 'Online-Buchung', // Fallback für reason
        notes: appointment.notes,
        serviceId: appointment.serviceId,
        assigned_devices: finalAssignedDevices,
        assigned_rooms: finalAssignedRooms
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
    
    // Hole Location-Einstellungen für Double Opt-In
    let locationDoubleOptInRequired = true; // Default: aktiviert
    let autoConfirmKnownPatients = true; // Default: aktiviert
    
    // Versuche Standort zu finden: 1. Direkt aus Service, 2. Aus zugewiesenen Räumen, 3. Aus zugewiesenen Geräten
    let location = null;
    if (serviceDoc) {
      // 1. Versuche Standort direkt aus Service zu laden
      if (serviceDoc.location_id) {
        location = await Location.findById(serviceDoc.location_id);
      }
      
      // 2. Falls nicht gefunden, versuche Standort aus zugewiesenen Räumen zu ermitteln
      if (!location && finalAssignedRooms && finalAssignedRooms.length > 0) {
        const firstRoom = await Room.findById(finalAssignedRooms[0]).select('location_id').populate('location_id');
        if (firstRoom && firstRoom.location_id) {
          location = firstRoom.location_id;
        }
      }
      
      // 3. Falls immer noch nicht gefunden, versuche Standort aus zugewiesenen Geräten zu ermitteln
      if (!location && finalAssignedDevices && finalAssignedDevices.length > 0) {
        const firstDevice = await Device.findById(finalAssignedDevices[0]).select('location_id').populate('location_id');
        if (firstDevice && firstDevice.location_id) {
          location = firstDevice.location_id;
        }
      }
      
      // 4. Falls immer noch nicht gefunden, versuche Standort aus Service-assigned_rooms zu ermitteln
      if (!location && serviceDoc.assigned_rooms && serviceDoc.assigned_rooms.length > 0) {
        const firstServiceRoom = await Room.findById(serviceDoc.assigned_rooms[0]).select('location_id').populate('location_id');
        if (firstServiceRoom && firstServiceRoom.location_id) {
          location = firstServiceRoom.location_id;
        }
      }
      
      // 5. Falls immer noch nicht gefunden, versuche Standort aus Service-assigned_devices zu ermitteln
      if (!location && serviceDoc.assigned_devices && serviceDoc.assigned_devices.length > 0) {
        const firstServiceDevice = await Device.findById(serviceDoc.assigned_devices[0]).select('location_id').populate('location_id');
        if (firstServiceDevice && firstServiceDevice.location_id) {
          location = firstServiceDevice.location_id;
        }
      }
      
      // Lade Location-Einstellungen, falls Standort gefunden wurde
      if (location && location.onlineBooking) {
        locationDoubleOptInRequired = location.onlineBooking.doubleOptInRequired !== false; // Default true, explizit false = deaktiviert
        autoConfirmKnownPatients = location.onlineBooking.autoConfirmKnownPatients !== false; // Default true, explizit false = deaktiviert
        console.log(`[OnlineBooking] Location-Einstellungen geladen von Standort "${location.name}": doubleOptInRequired=${locationDoubleOptInRequired}, autoConfirmKnownPatients=${autoConfirmKnownPatients}`);
      } else if (location) {
        console.log(`[OnlineBooking] Standort "${location.name}" gefunden, aber keine onlineBooking-Einstellungen vorhanden, verwende Defaults`);
      } else {
        console.log(`[OnlineBooking] Kein Standort gefunden, verwende Default-Einstellungen für Double Opt-In`);
      }
    }
    
    // Prüfe ob Double Opt-In erforderlich ist
    // 1. Muss vom Standort aktiviert sein (locationDoubleOptInRequired)
    // 2. Muss für neue/unbekannte Patienten sein (!isKnownPatient)
    // 3. Oder wenn autoConfirmKnownPatients = false, auch für bekannte Patienten
    let requiresDoubleOptIn = false;
    if (locationDoubleOptInRequired) {
      if (!isKnownPatient) {
        // Neue Patienten: Double Opt-In erforderlich (wenn vom Standort aktiviert)
        requiresDoubleOptIn = true;
      } else if (!autoConfirmKnownPatients) {
        // Bekannte Patienten: Double Opt-In erforderlich, wenn autoConfirmKnownPatients = false
        requiresDoubleOptIn = true;
      }
    }
    
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
    
    console.log('[OnlineBooking] Booking saved:', {
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      requiresDoubleOptIn: requiresDoubleOptIn,
      isKnownPatient: isKnownPatient,
      patientId: existingPatient?._id,
      patientExists: !!existingPatient
    });

    // Erstelle Termin:
    // - Wenn Double Opt-In deaktiviert ist: sofort für alle Patienten (neu und bekannt)
    // - Wenn Double Opt-In aktiviert ist: sofort nur für bekannte Patienten
    // - Für neue Patienten mit aktiviertem Double Opt-In: erst nach Code-Validierung (siehe /verify-opt-in Route)
    if (!requiresDoubleOptIn) {
      console.log('[OnlineBooking] Double Opt-In nicht erforderlich - erstelle Termin sofort (Patient: ' + (isKnownPatient ? 'bekannt' : 'neu') + ')');
      
      // Validierung: Patient muss existieren
      if (!existingPatient || !existingPatient._id) {
        console.error('[OnlineBooking] ERROR: Cannot create appointment - patient does not exist!');
        return res.status(500).json({
          success: false,
          message: 'Fehler: Patient konnte nicht erstellt werden'
        });
      }
      // Konvertiere startTime und endTime (Strings "HH:MM") zu Date-Objekten
      // Verwende lokale Zeitzone, um Zeitzonenprobleme zu vermeiden
      const dateStr = requestedDate.toISOString().split('T')[0];
      const [startHours, startMinutes] = appointment.startTime.split(':').map(Number);
      const [endHours, endMinutes] = bookingData.appointment.endTime.split(':').map(Number);
      
      const startDateTime = new Date(requestedDate);
      startDateTime.setHours(startHours, startMinutes, 0, 0);
      
      const endDateTime = new Date(requestedDate);
      endDateTime.setHours(endHours, endMinutes, 0, 0);
      
      const appointmentData = {
        patient: existingPatient._id, // Patient existiert jetzt immer
        doctor: doctor.id,
        startTime: startDateTime, // Date-Objekt
        endTime: endDateTime, // Date-Objekt
        duration: bookingData.appointment.duration, // Dauer mit Pufferzeiten
        type: appointment.type,
        anamnesisAnswers: booking.anamnesisAnswers || [], // Übernehme Anamnese-Antworten
        status: 'geplant', // Verwende 'geplant' statt 'scheduled' (entspricht dem Enum im Schema)
        title: appointment.type, // title ist required
        notes: `Online-Buchung: ${booking.bookingNumber}\nGrund: ${appointment.reason}`,
        bookingType: 'online',
        onlineBookingRef: booking.bookingNumber,
        isOnlineBooking: true,
        service: appointment.serviceId ? appointment.serviceId : undefined,
        assigned_users: [doctor.id], // Füge Arzt zu assigned_users hinzu
        assigned_rooms: finalAssignedRooms,
        assigned_devices: finalAssignedDevices
      };

      console.log('[OnlineBooking] Creating appointment with data:', {
        patient: appointmentData.patient,
        doctor: appointmentData.doctor,
        startTime: appointmentData.startTime,
        endTime: appointmentData.endTime,
        duration: appointmentData.duration,
        service: appointmentData.service,
        assigned_users: appointmentData.assigned_users
      });

      const newAppointment = new Appointment(appointmentData);
      await newAppointment.save();
      
      console.log('[OnlineBooking] Appointment created successfully:', {
        id: newAppointment._id,
        bookingNumber: booking.bookingNumber,
        startTime: newAppointment.startTime,
        endTime: newAppointment.endTime,
        patient: newAppointment.patient,
        doctor: newAppointment.doctor
      });

      // Benachrichtige alle Personal über die neue Online-Buchung
      try {
        await notifyStaffAboutOnlineBooking(newAppointment, existingPatient, booking, doctorExists, serviceDoc);
      } catch (notificationError) {
        console.error('[OnlineBooking] Error sending staff notifications (non-blocking):', notificationError);
      }
    } else {
      // Double Opt-In erforderlich: Sende Benachrichtigung auch ohne Termin
      // (Termin wird erst nach Code-Validierung erstellt)
      console.log('[OnlineBooking] Double Opt-In erforderlich - sende Benachrichtigung ohne Termin');
      try {
        // Erstelle temporäres Appointment-Objekt für die Benachrichtigung
        const tempStartDateTime = new Date(requestedDate);
        const tempEndDateTime = new Date(requestedDate);
        const [startHours, startMinutes] = appointment.startTime.split(':').map(Number);
        const [endHours, endMinutes] = bookingData.appointment.endTime.split(':').map(Number);
        tempStartDateTime.setHours(startHours, startMinutes, 0, 0);
        tempEndDateTime.setHours(endHours, endMinutes, 0, 0);
        
        const tempAppointment = {
          startTime: tempStartDateTime,
          endTime: tempEndDateTime,
          duration: bookingData.appointment.duration,
          type: appointment.type,
          bookingType: 'online',
          onlineBookingRef: booking.bookingNumber,
          isOnlineBooking: true
        };
        
        await notifyStaffAboutOnlineBooking(tempAppointment, existingPatient, booking, doctorExists, serviceDoc);
        console.log('[OnlineBooking] Benachrichtigung für Double Opt-In Buchung gesendet');
      } catch (notificationError) {
        console.error('[OnlineBooking] Error sending staff notifications for Double Opt-In booking (non-blocking):', notificationError);
        console.error('[OnlineBooking] Notification error details:', notificationError.stack);
      }
    }

    // Sende E-Mail: Double Opt-In Code oder Bestätigung
    try {
      if (requiresDoubleOptIn) {
        await sendDoubleOptInEmail(booking);
        // Sende auch SMS mit Code
        await sendDoubleOptInSMS(booking);
      } else {
        await sendConfirmationEmail(booking);
        // Sende auch SMS-Bestätigung
        await sendConfirmationSMS(booking);
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

// @route   POST /api/online-booking/verify-opt-in
// @desc    Verify Double Opt-In code and create appointment
// @access  Public
router.post('/verify-opt-in', [
  body('bookingNumber').notEmpty().trim(),
  body('code').notEmpty().trim().isLength({ min: 6, max: 6 })
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

    const { bookingNumber, code } = req.body;

    // Finde Buchung
    const booking = await OnlineBooking.findOne({ bookingNumber });
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Buchung nicht gefunden'
      });
    }

    // Prüfe ob Double Opt-In bereits verifiziert wurde
    if (booking.doubleOptIn?.verified) {
      return res.status(400).json({
        success: false,
        message: 'Code wurde bereits verifiziert'
      });
    }

    // Prüfe ob Code abgelaufen ist
    if (booking.doubleOptIn?.expiresAt && new Date(booking.doubleOptIn.expiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Code ist abgelaufen. Bitte fordern Sie einen neuen Code an.'
      });
    }

    // Prüfe ob maximale Versuche überschritten wurden
    if (booking.doubleOptIn?.attempts >= booking.doubleOptIn?.maxAttempts) {
      return res.status(400).json({
        success: false,
        message: 'Maximale Anzahl an Versuchen überschritten. Bitte fordern Sie einen neuen Code an.'
      });
    }

    // Prüfe Code
    if (booking.doubleOptIn?.code !== code) {
      // Erhöhe Versuche
      booking.doubleOptIn.attempts = (booking.doubleOptIn.attempts || 0) + 1;
      await booking.save();

      return res.status(400).json({
        success: false,
        message: 'Ungültiger Code. Bitte versuchen Sie es erneut.',
        attemptsRemaining: (booking.doubleOptIn.maxAttempts || 3) - booking.doubleOptIn.attempts
      });
    }

    // Code ist korrekt - verifiziere und erstelle Termin
    booking.doubleOptIn.verified = true;
    booking.doubleOptIn.verifiedAt = new Date();
    booking.status = 'confirmed';
    await booking.save();

    console.log('[OnlineBooking] Double Opt-In verified, creating appointment for booking:', bookingNumber);

    // Finde Patient
    const PatientExtended = require('../models/PatientExtended');
    const existingPatient = await PatientExtended.findById(booking.patient.id);
    if (!existingPatient) {
      console.error('[OnlineBooking] ERROR: Patient not found for booking:', bookingNumber);
      return res.status(500).json({
        success: false,
        message: 'Fehler: Patient nicht gefunden'
      });
    }

    // Prüfe ob Online-Buchung für diesen Patienten blockiert ist
    if (existingPatient.onlineBookingBlocked === true) {
      console.log(`[OnlineBooking] Online-Buchung für Patient ${existingPatient._id} ist blockiert (verify-opt-in)`);
      return res.status(403).json({
        success: false,
        message: 'Online-Buchungen sind für Sie nicht möglich. Bitte vereinbaren Sie Ihren Termin telefonisch.',
        code: 'ONLINE_BOOKING_BLOCKED'
      });
    }

    // Finde Arzt
    const doctorExists = await User.findById(booking.doctor.id);
    if (!doctorExists) {
      console.error('[OnlineBooking] ERROR: Doctor not found for booking:', bookingNumber);
      return res.status(500).json({
        success: false,
        message: 'Fehler: Arzt nicht gefunden'
      });
    }

    // Finde Service falls vorhanden
    let serviceDoc = null;
    if (booking.appointment.serviceId) {
      serviceDoc = await ServiceCatalog.findById(booking.appointment.serviceId)
        .select('base_duration_min buffer_before_min buffer_after_min');
    }

    // Berechne Endzeit
    const requestedDate = new Date(booking.appointment.date);
    const dateStr = requestedDate.toISOString().split('T')[0];
    const [startHours, startMinutes] = booking.appointment.startTime.split(':').map(Number);
    const endTime = serviceDoc ? calculateEndTimeWithBuffer(
      booking.appointment.startTime,
      serviceDoc.base_duration_min || 30,
      serviceDoc.buffer_before_min || 0,
      serviceDoc.buffer_after_min || 0
    ) : calculateEndTime(booking.appointment.startTime, booking.appointment.duration || 30);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startDateTime = new Date(requestedDate);
    startDateTime.setHours(startHours, startMinutes, 0, 0);

    const endDateTime = new Date(requestedDate);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    // Erstelle Appointment
    const appointmentData = {
      patient: existingPatient._id,
      doctor: booking.doctor.id,
      startTime: startDateTime,
      endTime: endDateTime,
      duration: serviceDoc ? (
        (serviceDoc.base_duration_min || 30) + 
        (serviceDoc.buffer_before_min || 0) + 
        (serviceDoc.buffer_after_min || 0)
      ) : (booking.appointment.duration || 30),
      type: booking.appointment.type,
      anamnesisAnswers: booking.anamnesisAnswers || [],
      status: 'geplant',
      title: booking.appointment.type,
      notes: `Online-Buchung: ${booking.bookingNumber}\nGrund: ${booking.appointment.reason}`,
      bookingType: 'online',
      onlineBookingRef: booking.bookingNumber,
      isOnlineBooking: true,
      service: booking.appointment.serviceId ? booking.appointment.serviceId : undefined,
      assigned_users: [booking.doctor.id],
      assigned_rooms: booking.appointment.assigned_rooms || [],
      assigned_devices: booking.appointment.assigned_devices || []
    };

    console.log('[OnlineBooking] Creating appointment after Double Opt-In verification:', {
      patient: appointmentData.patient,
      doctor: appointmentData.doctor,
      startTime: appointmentData.startTime,
      endTime: appointmentData.endTime,
      bookingNumber: booking.bookingNumber
    });

    const newAppointment = new Appointment(appointmentData);
    await newAppointment.save();

    console.log('[OnlineBooking] Appointment created successfully after Double Opt-In:', {
      id: newAppointment._id,
      bookingNumber: booking.bookingNumber
    });

    // Benachrichtige alle Personal über die neue Online-Buchung
    try {
      await notifyStaffAboutOnlineBooking(newAppointment, existingPatient, booking, doctorExists, serviceDoc);
    } catch (notificationError) {
      console.error('[OnlineBooking] Error sending staff notifications (non-blocking):', notificationError);
    }

    // Sende Bestätigungs-E-Mail und SMS
    try {
      await sendConfirmationEmail(booking);
      await sendConfirmationSMS(booking);
    } catch (emailError) {
      console.error('[OnlineBooking] Error sending confirmation email (non-blocking):', emailError);
    }

    res.json({
      success: true,
      message: 'E-Mail erfolgreich bestätigt! Ihr Termin ist nun bestätigt.',
      data: {
        bookingNumber: booking.bookingNumber,
        appointmentDate: booking.appointment.date,
        appointmentTime: booking.appointment.startTime,
        doctor: `${doctorExists.firstName} ${doctorExists.lastName}`
      }
    });
  } catch (error) {
    console.error('[OnlineBooking] Error in verify-opt-in route:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Code-Verifizierung',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/online-booking/resend-opt-in
// @desc    Resend Double Opt-In code
// @access  Public
router.post('/resend-opt-in', [
  body('bookingNumber').notEmpty().trim(),
  body('email').isEmail().normalizeEmail()
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

    const { bookingNumber, email } = req.body;

    const booking = await OnlineBooking.findOne({ bookingNumber });
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Buchung nicht gefunden'
      });
    }

    // Prüfe ob E-Mail übereinstimmt
    if (booking.patient.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail-Adresse stimmt nicht mit der Buchung überein'
      });
    }

    // Prüfe ob bereits verifiziert
    if (booking.doubleOptIn?.verified) {
      return res.status(400).json({
        success: false,
        message: 'Code wurde bereits verifiziert'
      });
    }

    // Generiere neuen Code
    const optInCode = Math.floor(100000 + Math.random() * 900000).toString();
    const optInExpiresAt = new Date();
    optInExpiresAt.setHours(optInExpiresAt.getHours() + 24);

    booking.doubleOptIn = {
      code: optInCode,
      emailSent: false,
      smsSent: false,
      verified: false,
      expiresAt: optInExpiresAt,
      attempts: 0,
      maxAttempts: 3
    };

    await booking.save();

    // Sende neuen Code per E-Mail und SMS
    try {
      await sendDoubleOptInEmail(booking);
      await sendDoubleOptInSMS(booking);
      res.json({
        success: true,
        message: 'Neuer Code wurde an Ihre E-Mail und Telefonnummer gesendet.'
      });
    } catch (emailError) {
      console.error('[OnlineBooking] Error sending opt-in email:', emailError);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Senden des Codes'
      });
    }
  } catch (error) {
    console.error('[OnlineBooking] Error in resend-opt-in route:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim erneuten Senden des Codes'
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

  // 2. Prüfe TimeBlocks (gesperrte Zeitslots)
  // TimeBlocks mit Personal blockieren nur dieses Personal
  // TimeBlocks ohne Personal blockieren alle
  const timeBlocks = await TimeBlock.find({
    $or: [
      { doctor: doctorId }, // TimeBlock für dieses Personal
      { doctor: { $exists: false } }, // Oder TimeBlocks ohne Personal (blockieren alle)
      { doctor: null } // Oder TimeBlocks mit null (blockieren alle)
    ],
    startTime: {
      $gte: new Date(`${dateStr}T00:00:00`),
      $lt: new Date(`${dateStr}T23:59:59`)
    },
    status: { $in: ['blocked', 'reserved'] } // Nur aktive Sperren
  }).catch(err => {
    console.error('[OnlineBooking] Error fetching time blocks:', err);
    return []; // Fallback: keine TimeBlocks gefunden
  });

  console.log(`[OnlineBooking] Found ${timeBlocks.length} time blocks for this date`);
  
  // Prüfe ob der gewünschte Zeitpunkt mit einem TimeBlock kollidiert
  for (const timeBlock of timeBlocks) {
    const blockStart = new Date(timeBlock.startTime);
    const blockEnd = new Date(timeBlock.endTime);
    console.log(`[OnlineBooking] Checking against time block: ${blockStart.toISOString()} - ${blockEnd.toISOString()}`);
    
    // Prüfe ob der gewünschte Zeitpunkt mit einem TimeBlock kollidiert
    if (startDateTime < blockEnd && endDateTime > blockStart) {
      console.log(`[OnlineBooking] Time slot conflicts with time block: ${timeBlock.reason || 'Gesperrt'}`);
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

function calculateEndTimeWithBuffer(startTime, baseDuration, bufferBefore, bufferAfter) {
  // Startzeit wird um bufferBefore nach hinten verschoben
  // Endzeit = Startzeit + bufferBefore + baseDuration + bufferAfter
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const totalMinutes = startMinutes + bufferBefore + baseDuration + bufferAfter;
  const endHours = Math.floor(totalMinutes / 60);
  const endMins = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}

/**
 * Sendet SMS-Bestätigung für Online-Buchung
 */
async function sendConfirmationSMS(booking) {
  if (!smsService) {
    return;
  }

  try {
    // Prüfe ob SMS-Benachrichtigungen aktiviert sind
    const settings = await SystemSettings.getCategorySettings('onlineBooking');
    const smsEnabled = settings['notifications.sms.enabled'] !== false; // Standard: aktiviert

    if (!smsEnabled) {
      console.log('[OnlineBooking] SMS-Benachrichtigungen sind deaktiviert');
      return;
    }

    // Prüfe ob Patient eine Telefonnummer hat
    if (!booking.patient.phone) {
      console.log('[OnlineBooking] Keine Telefonnummer für SMS-Benachrichtigung verfügbar');
      return;
    }

    // Initialisiere SMS-Service mit aktuellen Settings
    await smsService.initializeConfig();

    // Erstelle SMS-Text
    const appointmentDate = new Date(booking.appointment.date);
    const dateStr = appointmentDate.toLocaleDateString('de-AT', { 
      weekday: 'short', 
      day: '2-digit', 
      month: '2-digit' 
    });
    
    const smsText = `Terminbestätigung: ${dateStr} um ${booking.appointment.startTime} Uhr bei ${booking.doctor.name}. Buchungsnr: ${booking.bookingNumber}. ${process.env.FRONTEND_URL || ''}`;

    // Sende SMS
    const result = await smsService.sendSMS(booking.patient.phone, smsText);
    console.log(`📱 Bestätigungs-SMS gesendet an: ${booking.patient.phone} (MessageID: ${result.messageId})`);
    
    return result;
  } catch (error) {
    console.error('[OnlineBooking] Fehler beim Senden der Bestätigungs-SMS:', error);
    // SMS-Fehler sollte Buchung nicht verhindern
  }
}

/**
 * Sendet SMS mit Double Opt-In Code
 */
async function sendDoubleOptInSMS(booking) {
  if (!smsService) {
    return;
  }

  try {
    // Prüfe ob SMS-Benachrichtigungen aktiviert sind
    const settings = await SystemSettings.getCategorySettings('onlineBooking');
    const smsEnabled = settings['notifications.sms.enabled'] !== false;

    if (!smsEnabled) {
      return;
    }

    // Prüfe ob Patient eine Telefonnummer hat
    if (!booking.patient.phone) {
      return;
    }

    // Initialisiere SMS-Service mit aktuellen Settings
    await smsService.initializeConfig();

    const optInCode = booking.doubleOptIn?.code || 'NICHT VERFÜGBAR';
    const smsText = `Ihr Bestätigungscode: ${optInCode}. Bitte geben Sie diesen Code auf unserer Website ein. Buchungsnr: ${booking.bookingNumber}`;

    // Sende SMS
    const result = await smsService.sendSMS(booking.patient.phone, smsText);
    console.log(`📱 Double Opt-In SMS gesendet an: ${booking.patient.phone} (MessageID: ${result.messageId})`);
    
    // Aktualisiere Booking-Status
    if (booking.doubleOptIn) {
      booking.doubleOptIn.smsSent = true;
      await booking.save();
    }
    
    return result;
  } catch (error) {
    console.error('[OnlineBooking] Fehler beim Senden der Double Opt-In SMS:', error);
    if (booking.doubleOptIn) {
      booking.doubleOptIn.smsSent = false;
      booking.doubleOptIn.smsError = error.message;
      await booking.save().catch(() => {});
    }
  }
}

async function sendDoubleOptInEmail(booking) {
  try {
    // Lade Location-Daten für Adresse (falls verfügbar)
    let location = null;
    try {
      location = await Location.findOne({ is_active: true });
    } catch (err) {
      console.warn('[OnlineBooking] Location nicht gefunden, verwende Standard-Adresse');
    }

    // Versuche EmailService zu verwenden (falls verfügbar)
    let emailSent = false;
    try {
      const emailService = require('../services/emailService');
      
      const optInCode = booking.doubleOptIn?.code || 'NICHT VERFÜGBAR';
      
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
            .code-box { background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>E-Mail-Bestätigung erforderlich</h1>
            </div>
            <div class="content">
              <p>Sehr geehrte/r ${booking.patient.firstName} ${booking.patient.lastName},</p>
              <p>vielen Dank für Ihre Terminbuchung. Um Ihre Buchung zu bestätigen, benötigen wir eine Bestätigung Ihrer E-Mail-Adresse.</p>
              
              <div class="details">
                <h2>Ihr Bestätigungscode:</h2>
                <div class="code-box">${optInCode}</div>
                <p>Bitte geben Sie diesen 6-stelligen Code auf unserer Website ein, um Ihre Buchung zu bestätigen.</p>
              </div>
              
              <div class="details">
                <h2>Termindetails</h2>
                <p><strong>Buchungsnummer:</strong> ${booking.bookingNumber}</p>
                <p><strong>Datum:</strong> ${new Date(booking.appointment.date).toLocaleDateString('de-AT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Uhrzeit:</strong> ${booking.appointment.startTime} Uhr</p>
                <p><strong>Arzt:</strong> ${booking.doctor.name}</p>
                ${booking.doctor.specialization ? `<p><strong>Fachrichtung:</strong> ${booking.doctor.specialization}</p>` : ''}
                <p><strong>Art der Behandlung:</strong> ${stripHtmlTags(booking.appointment.type || '')}</p>
                ${booking.appointment.reason ? `<p><strong>Grund:</strong> ${stripHtmlTags(booking.appointment.reason || '')}</p>` : ''}
              </div>
              
              <p><strong>Wichtig:</strong> Ihr Termin wird erst nach Bestätigung des Codes endgültig gebucht. Der Code ist 24 Stunden gültig.</p>
            </div>
            <div class="footer">
              <p>Mit freundlichen Grüßen<br>Ihr Praxisteam</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailText = `
E-Mail-Bestätigung erforderlich

Sehr geehrte/r ${booking.patient.firstName} ${booking.patient.lastName},

vielen Dank für Ihre Terminbuchung. Um Ihre Buchung zu bestätigen, benötigen wir eine Bestätigung Ihrer E-Mail-Adresse.

Ihr Bestätigungscode: ${optInCode}

Bitte geben Sie diesen 6-stelligen Code auf unserer Website ein, um Ihre Buchung zu bestätigen.

Termindetails:
- Buchungsnummer: ${booking.bookingNumber}
- Datum: ${new Date(booking.appointment.date).toLocaleDateString('de-AT')}
- Uhrzeit: ${booking.appointment.startTime} Uhr
- Arzt: ${booking.doctor.name}
${booking.doctor.specialization ? `- Fachrichtung: ${booking.doctor.specialization}\n` : ''}- Art der Behandlung: ${stripHtmlTags(booking.appointment.type || '')}
${booking.appointment.reason ? `- Grund: ${stripHtmlTags(booking.appointment.reason || '')}\n` : ''}
Wichtig: Ihr Termin wird erst nach Bestätigung des Codes endgültig gebucht. Der Code ist 24 Stunden gültig.

Mit freundlichen Grüßen
Ihr Praxisteam
      `;

      const mailOptions = {
        from: {
          name: location?.name || booking.doctor.name || 'Ordination',
          address: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@praxis.at'
        },
        to: booking.patient.email,
        subject: `E-Mail-Bestätigung für Ihre Terminbuchung - ${booking.bookingNumber}`,
        html: emailHTML,
        text: emailText
      };

      if (emailService.transporter) {
        const result = await emailService.transporter.sendMail(mailOptions);
        emailSent = true;
        console.log(`📧 Double Opt-In E-Mail gesendet an: ${booking.patient.email} (MessageID: ${result.messageId})`);
      } else {
        throw new Error('E-Mail-Transporter nicht verfügbar');
      }
    } catch (emailServiceError) {
      console.warn('[OnlineBooking] EmailService nicht verfügbar oder Fehler:', emailServiceError.message);
      console.log(`📧 [MOCK] Double Opt-In E-Mail würde gesendet werden an: ${booking.patient.email}`);
      console.log(`📋 Buchungsnummer: ${booking.bookingNumber}`);
      console.log(`🔐 Bestätigungscode: ${booking.doubleOptIn?.code}`);
      emailSent = true;
    }
    
    // Aktualisiere Booking-Status
    if (booking.doubleOptIn) {
      booking.doubleOptIn.emailSent = emailSent;
    }
    await booking.save();
  } catch (error) {
    console.error('[OnlineBooking] Error sending double opt-in email:', error);
    if (booking.doubleOptIn) {
      booking.doubleOptIn.emailSent = false;
      booking.doubleOptIn.emailError = error.message;
    }
    await booking.save().catch(() => {});
    throw error;
  }
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
                <p><strong>Art der Behandlung:</strong> ${stripHtmlTags(booking.appointment.type || '')}</p>
                ${booking.appointment.reason ? `<p><strong>Grund:</strong> ${stripHtmlTags(booking.appointment.reason || '')}</p>` : ''}
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
${booking.doctor.specialization ? `- Fachrichtung: ${booking.doctor.specialization}\n` : ''}- Art der Behandlung: ${stripHtmlTags(booking.appointment.type || '')}
${booking.appointment.reason ? `- Grund: ${stripHtmlTags(booking.appointment.reason || '')}\n` : ''}${location ? `- Adresse: ${location.address_line1}, ${location.postal_code} ${location.city}\n` : ''}
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

// Helper-Funktion: Entferne HTML-Tags aus Text
function stripHtmlTags(html) {
  if (!html || typeof html !== 'string') return '';
  // Entferne HTML-Tags
  return html.replace(/<[^>]*>/g, '').trim();
}

// Helper-Funktion: Benachrichtige alle Personal über eine neue Online-Buchung
async function notifyStaffAboutOnlineBooking(appointment, patient, booking, doctor, serviceDoc) {
  try {
    // Finde alle aktiven Personal (alle User mit Rolle außer 'patient')
    const allStaff = await User.find({
      isActive: true,
      role: { $nin: ['patient', 'guest'] } // Alle außer Patienten und Gäste
    }).select('_id firstName lastName email');

    if (!allStaff || allStaff.length === 0) {
      console.log('[OnlineBooking] Kein Personal gefunden für Benachrichtigung');
      return;
    }

    // Finde System-User als Absender
    const systemUser = await User.findOne({
      role: { $in: ['admin', 'super_admin'] },
      isActive: true
    }).select('_id');

    const senderId = systemUser?._id || allStaff[0]._id;

    // Formatiere Termindatum und -zeit
    const appointmentDate = new Date(appointment.startTime);
    const dateStr = appointmentDate.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = appointmentDate.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Service-Name - entferne HTML-Tags
    let serviceName = appointment.type || 'Termin';
    if (serviceDoc && serviceDoc.name) {
      serviceName = serviceDoc.name;
    }
    // Entferne HTML-Tags aus dem Service-Namen
    serviceName = stripHtmlTags(serviceName);

    // Erstelle Nachrichtentext
    let message = `Neue Online-Buchung erhalten:\n\n`;
    message += `Patient:\n`;
    message += `- Name: ${patient.firstName} ${patient.lastName}\n`;
    message += `- Geburtsdatum: ${patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('de-DE') : 'Nicht angegeben'}\n`;
    message += `- E-Mail: ${patient.email || 'Nicht angegeben'}\n`;
    message += `- Telefon: ${patient.phone || 'Nicht angegeben'}\n`;
    
    if (patient.address) {
      message += `- Adresse: ${patient.address.street || ''}, ${patient.address.zipCode || ''} ${patient.address.city || ''}\n`;
    }

    message += `\nTermin:\n`;
    message += `- Datum: ${dateStr}\n`;
    message += `- Zeit: ${timeStr}\n`;
    message += `- Dauer: ${appointment.duration || 30} Minuten\n`;
    message += `- Arzt: ${doctor.firstName} ${doctor.lastName}\n`;
    message += `- Leistung: ${serviceName}\n`;
    message += `- Buchungsnummer: ${booking.bookingNumber}\n`;

    // Zusätzliche Information für neue Patienten
    if (patient.isTemporary === true) {
      message += `\n⚠️ WICHTIG: Dieser Patient ist NEU im System und hat nur temporäre Stammdaten.\n`;
      message += `Bitte vervollständigen Sie die Stammdaten im Patienten-Organizer.\n`;
      message += `Der Patient ist in der Liste "Temporäre Patienten" zu finden.`;
    }

    // Warnung für Patienten mit Hinweisen
    if (patient.hasHint === true && patient.hintText) {
      message += `\n\n🚨 WARNUNG: Dieser Patient hat einen hinterlegten Hinweis!\n`;
      message += `Hinweis: ${patient.hintText}\n`;
      message += `Bitte beachten Sie diesen Hinweis bei der Terminvorbereitung.`;
    }

    const subject = `Neue Online-Buchung: ${patient.firstName} ${patient.lastName} - ${dateStr} ${timeStr}`;
    
    // Erhöhe Priorität wenn Patient temporär ist oder einen Hinweis hat
    let priority = 'normal';
    if (patient.isTemporary === true || (patient.hasHint === true && patient.hintText)) {
      priority = 'high';
    }

    // Sende Nachricht an alle Personal
    const notificationPromises = allStaff.map(async (staffMember) => {
      try {
        const notification = new InternalMessage({
          senderId: senderId,
          recipientId: staffMember._id,
          subject: subject,
          message: message,
          priority: priority,
          status: 'sent',
          patientId: patient._id || patient.id
        });

        await notification.save();
        console.log(`✅ Online-Booking Benachrichtigung an ${staffMember.firstName} ${staffMember.lastName} gesendet`);
        return { success: true, userId: staffMember._id, messageId: notification._id };
      } catch (err) {
        console.error(`❌ Fehler beim Senden der Benachrichtigung an ${staffMember.firstName} ${staffMember.lastName}:`, err);
        return { success: false, userId: staffMember._id, error: err.message };
      }
    });

    const results = await Promise.all(notificationPromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    console.log(`📧 Online-Booking Benachrichtigungen: ${successCount} erfolgreich, ${failCount} fehlgeschlagen von ${allStaff.length} insgesamt`);
  } catch (error) {
    console.error('❌ Fehler beim Senden der Online-Booking Benachrichtigungen:', error);
    throw error;
  }
}

module.exports = router;
