const express = require('express');
const { body, validationResult } = require('express-validator');
const OnlineBooking = require('../models/OnlineBooking');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const WeeklySchedule = require('../models/WeeklySchedule');
const AvailabilityService = require('../services/availabilityService');
const auth = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/online-booking/availability
// @desc    Get available time slots for a date
// @access  Public
router.get('/availability', async (req, res) => {
  try {
    const { date, doctorId, duration = 30 } = req.query;
    
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

    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
    
    // Arbeitszeiten des Arztes aus WeeklySchedule abrufen
    const weeklySchedules = await WeeklySchedule.find({
      staffId: doctorId,
      isActive: true,
      validFrom: { $lte: requestedDate },
      $or: [
        { validTo: { $gte: requestedDate } },
        { validTo: null }
      ]
    });

    let workingHours = {
      monday: { start: '09:00', end: '17:00', isWorking: false },
      tuesday: { start: '09:00', end: '17:00', isWorking: false },
      wednesday: { start: '09:00', end: '17:00', isWorking: false },
      thursday: { start: '09:00', end: '17:00', isWorking: false },
      friday: { start: '09:00', end: '17:00', isWorking: false },
      saturday: { start: '09:00', end: '12:00', isWorking: false },
      sunday: { start: '09:00', end: '12:00', isWorking: false }
    };

    // Aktuelle Arbeitszeiten aus WeeklySchedule setzen
    for (const schedule of weeklySchedules) {
      for (const daySchedule of schedule.schedules) {
        if (daySchedule.isWorking) {
          workingHours[daySchedule.day] = {
            start: daySchedule.startTime,
            end: daySchedule.endTime,
            isWorking: true,
            breakStart: daySchedule.breakStart,
            breakEnd: daySchedule.breakEnd
          };
        }
      }
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
    if (!workingDay || !workingDay.isWorking) {
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
    const startTime = new Date(`${date}T${workingDay.start}`);
    const endTime = new Date(`${date}T${workingDay.end}`);
    
    // Prüfe bestehende Termine
    const existingAppointments = await Appointment.find({
      doctor: doctorId,
      date: {
        $gte: new Date(`${date}T00:00:00`),
        $lt: new Date(`${date}T23:59:59`)
      },
      status: { $nin: ['cancelled', 'no_show'] }
    });

    const bookedSlots = existingAppointments.map(apt => ({
      start: apt.startTime,
      end: apt.endTime
    }));

    // Generiere 30-Minuten-Slots mit Pausenzeiten-Berücksichtigung
    const slotDuration = parseInt(duration);
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
      const isSlotAvailable = !isInBreak && !bookedSlots.some(booked => {
        const bookedStart = new Date(`${date}T${booked.start}`);
        const bookedEnd = new Date(`${date}T${booked.end}`);
        const slotStartTime = new Date(`${date}T${slotStart}`);
        const slotEndTime = new Date(`${date}T${slotEnd}`);
        
        return (slotStartTime < bookedEnd && slotEndTime > bookedStart);
      });

      if (isSlotAvailable) {
        availableSlots.push({
          start: slotStart,
          end: slotEnd,
          duration: slotDuration
        });
      }
      
      currentTime = new Date(currentTime.getTime() + 15 * 60000); // 15-Minuten-Intervalle
    }

    res.json({
      success: true,
      data: {
        availableSlots,
        workingHours: workingDay,
        date: date
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Verfügbarkeit'
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

    const { patient, appointment, doctor } = req.body;

    // Prüfe ob Arzt existiert
    const doctorExists = await User.findById(doctor.id);
    if (!doctorExists) {
      return res.status(404).json({
        success: false,
        message: 'Arzt nicht gefunden'
      });
    }

    // Prüfe Verfügbarkeit
    const requestedDate = new Date(appointment.date);
    const isAvailable = await checkAvailability(doctor.id, requestedDate, appointment.startTime);
    
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Der gewählte Termin ist nicht mehr verfügbar'
      });
    }

    // Prüfe ob Patient bereits existiert
    let existingPatient = await Patient.findOne({
      email: patient.email,
      firstName: patient.firstName,
      lastName: patient.lastName
    });

    const bookingData = {
      patient: {
        id: existingPatient?._id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: new Date(patient.dateOfBirth),
        insuranceNumber: patient.insuranceNumber,
        isNewPatient: !existingPatient
      },
      appointment: {
        date: requestedDate,
        startTime: appointment.startTime,
        endTime: calculateEndTime(appointment.startTime, appointment.duration || 30),
        duration: appointment.duration || 30,
        type: appointment.type,
        reason: appointment.reason,
        notes: appointment.notes
      },
      doctor: {
        id: doctor.id,
        name: `${doctorExists.firstName} ${doctorExists.lastName}`,
        specialization: doctorExists.specialization
      },
      source: 'online',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const booking = new OnlineBooking(bookingData);
    await booking.save();

    // Erstelle Termin in der Haupt-Terminverwaltung
    const appointmentData = {
      patient: existingPatient?._id,
      doctor: doctor.id,
      date: requestedDate,
      startTime: appointment.startTime,
      endTime: bookingData.appointment.endTime,
      type: appointment.type,
      status: 'scheduled',
      notes: `Online-Buchung: ${booking.bookingNumber}\nGrund: ${appointment.reason}`,
      source: 'online_booking',
      bookingId: booking._id
    };

    const newAppointment = new Appointment(appointmentData);
    await newAppointment.save();

    // Sende Bestätigungs-E-Mail (Mock)
    await sendConfirmationEmail(booking);

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
    res.status(500).json({
      success: false,
      message: 'Fehler beim Buchen des Termins'
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

    // Storniere Buchung
    booking.status = 'cancelled';
    booking.addAuditEntry('cancelled', `Grund: ${req.body.reason}`, req.ip);
    await booking.save();

    // Storniere zugehörigen Termin
    await Appointment.findOneAndUpdate(
      { bookingId: booking._id },
      { status: 'cancelled' }
    );

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
    const doctors = await User.find({
      role: 'doctor',
      isActive: true,
      'profile.onlineBookingEnabled': true
    }).select('firstName lastName specialization profile.workingHours');

    res.json({
      success: true,
      data: doctors.map(doctor => ({
        id: doctor._id,
        name: `${doctor.firstName} ${doctor.lastName}`,
        specialization: doctor.specialization,
        workingHours: doctor.profile?.workingHours
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Ärzte'
    });
  }
});

// Hilfsfunktionen
async function checkAvailability(doctorId, date, time) {
  // 1. Prüfe ob Termin bereits existiert
  const existingAppointment = await Appointment.findOne({
    doctor: doctorId,
    date: {
      $gte: new Date(`${date.toISOString().split('T')[0]}T00:00:00`),
      $lt: new Date(`${date.toISOString().split('T')[0]}T23:59:59`)
    },
    startTime: time,
    status: { $nin: ['cancelled', 'no_show'] }
  });

  if (existingAppointment) {
    return false;
  }

  // 2. Prüfe ob Arzt an diesem Tag arbeitet und ob Zeit in Pausenzeiten liegt
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const weeklySchedules = await WeeklySchedule.find({
    staffId: doctorId,
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
  // Mock-E-Mail-Versand
  console.log(`📧 Bestätigungs-E-Mail gesendet an: ${booking.patient.email}`);
  console.log(`📋 Buchungsnummer: ${booking.bookingNumber}`);
  console.log(`📅 Termin: ${booking.appointment.date} um ${booking.appointment.startTime}`);
  
  // In einer echten Implementierung würde hier ein E-Mail-Service verwendet werden
  booking.confirmation.emailSent = true;
  booking.confirmation.confirmationCode = Math.random().toString(36).substr(2, 8).toUpperCase();
  await booking.save();
}

module.exports = router;
