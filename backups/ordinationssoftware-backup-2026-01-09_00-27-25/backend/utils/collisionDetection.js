const Appointment = require('../models/Appointment');
const StaffProfile = require('../models/StaffProfile');
const Room = require('../models/Room');
const Device = require('../models/Device');
const WorkShift = require('../models/WorkShift');
const Absence = require('../models/Absence');
const StaffLocationAssignment = require('../models/StaffLocationAssignment');

/**
 * Kollisionserkennung für Termine
 */
class CollisionDetection {
  
  /**
   * Prüft Kollisionen für einen neuen Termin
   * @param {Object} appointmentData - Termindaten
   * @returns {Object} Kollisionsergebnis
   */
  static async checkAppointmentCollisions(appointmentData) {
    const {
      staff_id,
      room_id,
      device_ids = [],
      location_id,
      startTime,
      endTime,
      appointment_id = null // Für Updates
    } = appointmentData;

    const collisions = {
      staff: [],
      rooms: [],
      devices: [],
      location: [],
      travel: [],
      hasCollisions: false
    };

    try {
      // Personal-Kollisionen prüfen
      if (staff_id) {
        const staffCollisions = await this.checkStaffCollisions(staff_id, startTime, endTime, appointment_id);
        collisions.staff = staffCollisions;
      }

      // Raum-Kollisionen prüfen
      if (room_id) {
        const roomCollisions = await this.checkRoomCollisions(room_id, startTime, endTime, appointment_id);
        collisions.rooms = roomCollisions;
      }

      // Geräte-Kollisionen prüfen
      if (device_ids.length > 0) {
        const deviceCollisions = await this.checkDeviceCollisions(device_ids, startTime, endTime, appointment_id);
        collisions.devices = deviceCollisions;
      }

      // Standort-Kollisionen prüfen
      if (location_id) {
        const locationCollisions = await this.checkLocationCollisions(location_id, startTime, endTime, appointment_id);
        collisions.location = locationCollisions;
      }

      // Reisezeit-Kollisionen prüfen
      if (staff_id && location_id) {
        const travelCollisions = await this.checkTravelCollisions(staff_id, location_id, startTime, endTime, appointment_id);
        collisions.travel = travelCollisions;
      }

      // Gesamtkollisionen prüfen
      collisions.hasCollisions = 
        collisions.staff.length > 0 ||
        collisions.rooms.length > 0 ||
        collisions.devices.length > 0 ||
        collisions.location.length > 0 ||
        collisions.travel.length > 0;

      return collisions;

    } catch (error) {
      console.error('Error checking appointment collisions:', error);
      throw new Error('Fehler bei der Kollisionsprüfung');
    }
  }

  /**
   * Prüft Personal-Kollisionen
   */
  static async checkStaffCollisions(staff_id, startTime, endTime, excludeAppointmentId = null) {
    const collisions = [];

    // 1. Andere Termine des Personals
    const appointmentQuery = {
      staff_id,
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    };

    if (excludeAppointmentId) {
      appointmentQuery._id = { $ne: excludeAppointmentId };
    }

    const conflictingAppointments = await Appointment.find(appointmentQuery)
      .populate('patient', 'firstName lastName')
      .select('startTime endTime title patient');

    conflictingAppointments.forEach(appointment => {
      collisions.push({
        type: 'appointment',
        message: `Termin-Konflikt: ${appointment.title} mit ${appointment.patient.firstName} ${appointment.patient.lastName}`,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        severity: 'high'
      });
    });

    // 2. Arbeitszeiten prüfen
    const workShiftQuery = {
      staffId: staff_id,
      startsAt: { $lte: endTime },
      endsAt: { $gte: startTime }
    };

    const workShifts = await WorkShift.find(workShiftQuery);
    
    if (workShifts.length === 0) {
      collisions.push({
        type: 'work_shift',
        message: 'Keine Arbeitszeit für diesen Zeitraum geplant',
        startTime,
        endTime,
        severity: 'medium'
      });
    }

    // 3. Abwesenheiten prüfen
    const absenceQuery = {
      staff_id,
      startDate: { $lte: endTime },
      endDate: { $gte: startTime },
      status: { $in: ['approved', 'pending'] }
    };

    const absences = await Absence.find(absenceQuery);
    
    absences.forEach(absence => {
      collisions.push({
        type: 'absence',
        message: `Abwesenheit: ${absence.reason}`,
        startTime: absence.startDate,
        endTime: absence.endDate,
        severity: 'high'
      });
    });

    return collisions;
  }

  /**
   * Prüft Raum-Kollisionen
   */
  static async checkRoomCollisions(room_id, startTime, endTime, excludeAppointmentId = null) {
    const collisions = [];

    // Raum-Verfügbarkeit prüfen
    const room = await Room.findById(room_id);
    if (!room || !room.isActive) {
      collisions.push({
        type: 'room_unavailable',
        message: 'Raum ist nicht verfügbar',
        severity: 'high'
      });
      return collisions;
    }

    // Termine im Raum prüfen
    const appointmentQuery = {
      room_id,
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    };

    if (excludeAppointmentId) {
      appointmentQuery._id = { $ne: excludeAppointmentId };
    }

    const conflictingAppointments = await Appointment.find(appointmentQuery)
      .populate('patient', 'firstName lastName')
      .populate('staff_id', 'display_name')
      .select('startTime endTime title patient staff_id');

    conflictingAppointments.forEach(appointment => {
      collisions.push({
        type: 'room_conflict',
        message: `Raum belegt: ${appointment.title} mit ${appointment.patient.firstName} ${appointment.patient.lastName}`,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        severity: 'high'
      });
    });

    return collisions;
  }

  /**
   * Prüft Geräte-Kollisionen
   */
  static async checkDeviceCollisions(device_ids, startTime, endTime, excludeAppointmentId = null) {
    const collisions = [];

    for (const device_id of device_ids) {
      // Gerät-Verfügbarkeit prüfen
      const device = await Device.findById(device_id);
      if (!device || !device.isActive) {
        collisions.push({
          type: 'device_unavailable',
          message: `Gerät ${device?.name || 'unbekannt'} ist nicht verfügbar`,
          device_id,
          severity: 'high'
        });
        continue;
      }

      // Termine mit Gerät prüfen
      const appointmentQuery = {
        device_ids: device_id,
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      };

      if (excludeAppointmentId) {
        appointmentQuery._id = { $ne: excludeAppointmentId };
      }

      const conflictingAppointments = await Appointment.find(appointmentQuery)
        .populate('patient', 'firstName lastName')
        .select('startTime endTime title patient');

      conflictingAppointments.forEach(appointment => {
        collisions.push({
          type: 'device_conflict',
          message: `Gerät ${device.name} belegt: ${appointment.title}`,
          device_id,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          severity: 'high'
        });
      });
    }

    return collisions;
  }

  /**
   * Prüft Standort-Kollisionen
   */
  static async checkLocationCollisions(location_id, startTime, endTime, excludeAppointmentId = null) {
    const collisions = [];

    // Standort-Verfügbarkeit prüfen
    const Location = require('../models/Location');
    const LocationHours = require('../models/LocationHours');
    const LocationClosure = require('../models/LocationClosure');

    const location = await Location.findById(location_id);
    if (!location || !location.is_active) {
      collisions.push({
        type: 'location_unavailable',
        message: 'Standort ist nicht verfügbar',
        severity: 'high'
      });
      return collisions;
    }

    // Öffnungszeiten prüfen
    const dayOfWeek = startTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const locationHours = await LocationHours.find({ location_id });
    
    const isOpen = locationHours.some(hours => {
      const rrule = hours.rrule;
      return rrule.includes(dayOfWeek.toUpperCase().substring(0, 2));
    });

    if (!isOpen) {
      collisions.push({
        type: 'location_closed',
        message: 'Standort hat an diesem Tag keine Öffnungszeiten',
        severity: 'medium'
      });
    }

    // Schließtage prüfen
    const closures = await LocationClosure.find({
      location_id,
      starts_at: { $lte: endTime },
      ends_at: { $gte: startTime }
    });

    closures.forEach(closure => {
      collisions.push({
        type: 'location_closure',
        message: `Standort geschlossen: ${closure.reason}`,
        startTime: closure.starts_at,
        endTime: closure.ends_at,
        severity: 'high'
      });
    });

    return collisions;
  }

  /**
   * Prüft Reisezeit-Kollisionen
   */
  static async checkTravelCollisions(staff_id, location_id, startTime, endTime, excludeAppointmentId = null) {
    const collisions = [];

    // Personal-Standort-Zuweisung prüfen
    const assignment = await StaffLocationAssignment.findOne({
      staff_id,
      location_id
    });

    if (!assignment) {
      collisions.push({
        type: 'staff_location_assignment',
        message: 'Personal ist diesem Standort nicht zugewiesen',
        severity: 'high'
      });
      return collisions;
    }

    // Reisezeit zwischen Terminen prüfen
    const travelTime = 30; // 30 Minuten Reisezeit
    const bufferTime = 15; // 15 Minuten Puffer

    // Vorheriger Termin
    const previousAppointment = await Appointment.findOne({
      staff_id,
      endTime: { $lte: startTime },
      _id: { $ne: excludeAppointmentId }
    }).sort({ endTime: -1 });

    if (previousAppointment) {
      const timeBetween = startTime - new Date(previousAppointment.endTime);
      const requiredTime = (travelTime + bufferTime) * 60 * 1000; // in Millisekunden

      if (timeBetween < requiredTime) {
        collisions.push({
          type: 'travel_time',
          message: `Zu wenig Zeit zwischen Terminen (${Math.round(timeBetween / 60000)} Min. statt ${travelTime + bufferTime} Min.)`,
          startTime: previousAppointment.endTime,
          endTime: startTime,
          severity: 'medium'
        });
      }
    }

    // Nachfolgender Termin
    const nextAppointment = await Appointment.findOne({
      staff_id,
      startTime: { $gte: endTime },
      _id: { $ne: excludeAppointmentId }
    }).sort({ startTime: 1 });

    if (nextAppointment) {
      const timeBetween = new Date(nextAppointment.startTime) - endTime;
      const requiredTime = (travelTime + bufferTime) * 60 * 1000;

      if (timeBetween < requiredTime) {
        collisions.push({
          type: 'travel_time',
          message: `Zu wenig Zeit zwischen Terminen (${Math.round(timeBetween / 60000)} Min. statt ${travelTime + bufferTime} Min.)`,
          startTime: endTime,
          endTime: nextAppointment.startTime,
          severity: 'medium'
        });
      }
    }

    return collisions;
  }

  /**
   * Prüft Personal-Verfügbarkeit
   */
  static async checkStaffAvailability(staff_id, startTime, endTime, location_id = null) {
    const availability = {
      available: true,
      conflicts: [],
      warnings: []
    };

    try {
      const collisions = await this.checkStaffCollisions(staff_id, startTime, endTime);
      availability.conflicts = collisions;

      if (collisions.length > 0) {
        availability.available = false;
      }

      // Standort-spezifische Prüfung
      if (location_id) {
        const locationCollisions = await this.checkLocationCollisions(location_id, startTime, endTime);
        availability.conflicts.push(...locationCollisions);

        if (locationCollisions.some(c => c.severity === 'high')) {
          availability.available = false;
        }
      }

      return availability;

    } catch (error) {
      console.error('Error checking staff availability:', error);
      return {
        available: false,
        conflicts: [{
          type: 'error',
          message: 'Fehler bei der Verfügbarkeitsprüfung',
          severity: 'high'
        }],
        warnings: []
      };
    }
  }

  /**
   * Prüft Raum-Verfügbarkeit
   */
  static async checkRoomAvailability(room_id, startTime, endTime) {
    const availability = {
      available: true,
      conflicts: [],
      warnings: []
    };

    try {
      const collisions = await this.checkRoomCollisions(room_id, startTime, endTime);
      availability.conflicts = collisions;

      if (collisions.length > 0) {
        availability.available = false;
      }

      return availability;

    } catch (error) {
      console.error('Error checking room availability:', error);
      return {
        available: false,
        conflicts: [{
          type: 'error',
          message: 'Fehler bei der Verfügbarkeitsprüfung',
          severity: 'high'
        }],
        warnings: []
      };
    }
  }
}

module.exports = CollisionDetection;
