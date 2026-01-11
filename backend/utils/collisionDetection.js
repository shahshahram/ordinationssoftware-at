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

  /**
   * Prüft Geräte-Verfügbarkeit nach Typ
   * @param {String} deviceType - Gerätetyp (z.B. 'Ultraschall')
   * @param {Date} startTime - Startzeit des Termins
   * @param {Date} endTime - Endzeit des Termins
   * @param {Number} quantityRequired - Benötigte Anzahl an Geräten
   * @param {String} locationId - Optional: Standort-ID für Filterung
   * @param {Number} maxAvailable - Optional: Maximale verfügbare Anzahl (falls nicht alle Geräte verwendet werden sollen)
   * @param {String} excludeAppointmentId - Optional: Termin-ID zum Ausschließen (bei Updates)
   * @returns {Object} Verfügbarkeitsergebnis
   */
  static async checkDeviceTypeAvailability(deviceType, startTime, endTime, quantityRequired = 1, locationId = null, maxAvailable = null, excludeAppointmentId = null) {
    const Resource = require('../models/Resource');
    
    try {
      // Zähle alle aktiven Geräte dieses Typs
      const deviceQuery = {
        type: deviceType,
        isActive: true
      };
      
      if (locationId) {
        deviceQuery.location_id = locationId;
      }
      
      const totalDevices = await Device.countDocuments(deviceQuery);
      
      // Zähle auch Geräte im Resource-Modell
      // Im Resource-Modell wird 'category' für die Geräte-Gruppierung verwendet
      const resourceQuery = {
        type: 'equipment',
        category: deviceType, // category wird für die Gruppierung verwendet (z.B. "Laser", "Ultraschall")
        isActive: true
      };
      
      // Standort-Filterung für Resource-Modell (falls properties.location vorhanden)
      // Hinweis: Resource-Modell hat kein location_id Feld direkt, sondern properties.location als String
      // Für präzise Standort-Filterung müsste ein location_id Feld hinzugefügt werden
      
      const totalResourceDevices = await Resource.countDocuments(resourceQuery);
      const totalAvailableDevices = totalDevices + totalResourceDevices;
      
      // Wenn maxAvailable gesetzt ist, verwende den kleineren Wert
      const maxDevices = maxAvailable ? Math.min(totalAvailableDevices, maxAvailable) : totalAvailableDevices;
      
      if (maxDevices < quantityRequired) {
        return {
          available: false,
          message: `Nicht genügend Geräte verfügbar. Benötigt: ${quantityRequired}, Verfügbar: ${maxDevices}`,
          totalAvailable: maxDevices,
          required: quantityRequired
        };
      }
      
      // Finde alle Termine im Zeitraum, die Geräte dieses Typs verwenden
      const appointmentQuery = {
        assigned_devices: { $exists: true, $ne: [] },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
        status: { $nin: ['cancelled', 'abgesagt', 'no_show'] }
      };
      
      if (excludeAppointmentId) {
        appointmentQuery._id = { $ne: excludeAppointmentId };
      }
      
      const conflictingAppointments = await Appointment.find(appointmentQuery)
        .populate('assigned_devices', 'type location_id')
        .select('assigned_devices startTime endTime');
      
      // Zähle belegte Geräte dieses Typs
      let bookedDevicesCount = 0;
      
      for (const appointment of conflictingAppointments) {
        if (!appointment.assigned_devices || !Array.isArray(appointment.assigned_devices)) continue;
        
        for (const device of appointment.assigned_devices) {
          if (!device) continue;
          
          // Prüfe ob Gerät vom richtigen Typ ist
          const deviceId = device._id || device;
          const deviceDoc = await Device.findById(deviceId);
          
          if (deviceDoc && deviceDoc.type === deviceType) {
            // Prüfe ob Standort-Filter passt
            if (!locationId || (deviceDoc.location_id && deviceDoc.location_id.toString() === locationId.toString())) {
              bookedDevicesCount++;
            }
          } else {
            // Prüfe auch Resource-Modell
            // Im Resource-Modell wird 'category' für die Geräte-Gruppierung verwendet
            const resourceDevice = await Resource.findOne({
              _id: deviceId,
              type: 'equipment',
              category: deviceType // category wird für die Gruppierung verwendet (z.B. "Laser", "Ultraschall")
            });
            
            if (resourceDevice) {
              // Standort-Filterung für Resource-Modell
              // Hinweis: Resource-Modell hat properties.location als String, nicht locationId
              if (!locationId) {
                bookedDevicesCount++;
              } else {
                // Fallback: Prüfe properties.location als String (falls vorhanden)
                const resourceLocation = resourceDevice.properties?.location;
                if (!resourceLocation || resourceLocation.toString().includes(locationId.toString())) {
                  bookedDevicesCount++;
                }
              }
            }
          }
        }
      }
      
      const availableDevices = maxDevices - bookedDevicesCount;
      const isAvailable = availableDevices >= quantityRequired;
      
      return {
        available: isAvailable,
        message: isAvailable 
          ? `${availableDevices} Geräte verfügbar` 
          : `Nicht genügend Geräte verfügbar. Benötigt: ${quantityRequired}, Verfügbar: ${availableDevices}`,
        totalAvailable: maxDevices,
        booked: bookedDevicesCount,
        available: availableDevices,
        required: quantityRequired
      };
      
    } catch (error) {
      console.error('Error checking device type availability:', error);
      return {
        available: false,
        message: 'Fehler bei der Verfügbarkeitsprüfung',
        error: error.message
      };
    }
  }

  /**
   * Prüft Raum-Verfügbarkeit nach Typ
   * @param {String} roomType - Raumtyp (z.B. 'treatment')
   * @param {Date} startTime - Startzeit des Termins
   * @param {Date} endTime - Endzeit des Termins
   * @param {Number} quantityRequired - Benötigte Anzahl an Räumen
   * @param {String} locationId - Optional: Standort-ID für Filterung
   * @param {Number} maxAvailable - Optional: Maximale verfügbare Anzahl
   * @param {String} excludeAppointmentId - Optional: Termin-ID zum Ausschließen (bei Updates)
   * @returns {Object} Verfügbarkeitsergebnis
   */
  static async checkRoomTypeAvailability(roomType, startTime, endTime, quantityRequired = 1, locationId = null, maxAvailable = null, excludeAppointmentId = null) {
    const Resource = require('../models/Resource');
    
    try {
      // Zähle alle aktiven Räume dieses Typs
      const roomQuery = {
        type: roomType,
        isActive: true
      };
      
      if (locationId) {
        roomQuery.location_id = locationId;
      }
      
      const totalRooms = await Room.countDocuments(roomQuery);
      
      // Zähle auch Räume im Resource-Modell
      // Im Resource-Modell wird 'category' für die Raum-Gruppierung verwendet
      const resourceQuery = {
        type: 'room',
        category: roomType, // category wird für die Gruppierung verwendet (z.B. "treatment", "consultation")
        isActive: true
      };
      
      // Standort-Filterung für Resource-Modell (falls properties.location vorhanden)
      // Hinweis: Resource-Modell hat kein location_id Feld direkt, sondern properties.location als String
      
      const totalResourceRooms = await Resource.countDocuments(resourceQuery);
      const totalAvailableRooms = totalRooms + totalResourceRooms;
      
      // Wenn maxAvailable gesetzt ist, verwende den kleineren Wert
      const maxRooms = maxAvailable ? Math.min(totalAvailableRooms, maxAvailable) : totalAvailableRooms;
      
      if (maxRooms < quantityRequired) {
        return {
          available: false,
          message: `Nicht genügend Räume verfügbar. Benötigt: ${quantityRequired}, Verfügbar: ${maxRooms}`,
          totalAvailable: maxRooms,
          required: quantityRequired
        };
      }
      
      // Finde alle Termine im Zeitraum, die Räume dieses Typs verwenden
      const appointmentQuery = {
        assigned_rooms: { $exists: true, $ne: [] },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
        status: { $nin: ['cancelled', 'abgesagt', 'no_show'] }
      };
      
      if (excludeAppointmentId) {
        appointmentQuery._id = { $ne: excludeAppointmentId };
      }
      
      const conflictingAppointments = await Appointment.find(appointmentQuery)
        .populate('assigned_rooms', 'type location_id')
        .select('assigned_rooms startTime endTime');
      
      // Zähle belegte Räume dieses Typs
      let bookedRoomsCount = 0;
      
      for (const appointment of conflictingAppointments) {
        if (!appointment.assigned_rooms || !Array.isArray(appointment.assigned_rooms)) continue;
        
        for (const room of appointment.assigned_rooms) {
          if (!room) continue;
          
          // Prüfe ob Raum vom richtigen Typ ist
          const roomId = room._id || room;
          const roomDoc = await Room.findById(roomId);
          
          if (roomDoc && roomDoc.type === roomType) {
            // Prüfe ob Standort-Filter passt
            if (!locationId || (roomDoc.location_id && roomDoc.location_id.toString() === locationId.toString())) {
              bookedRoomsCount++;
            }
          } else {
            // Prüfe auch Resource-Modell
            // Im Resource-Modell wird 'category' für die Raum-Gruppierung verwendet
            const resourceRoom = await Resource.findOne({
              _id: roomId,
              type: 'room',
              category: roomType // category wird für die Gruppierung verwendet
            });
            
            if (resourceRoom) {
              // Standort-Filterung für Resource-Modell
              // Hinweis: Resource-Modell hat properties.location als String, nicht locationId
              if (!locationId) {
                bookedRoomsCount++;
              } else {
                // Fallback: Prüfe properties.location als String (falls vorhanden)
                const resourceLocation = resourceRoom.properties?.location;
                if (!resourceLocation || resourceLocation.toString().includes(locationId.toString())) {
                  bookedRoomsCount++;
                }
              }
            }
          }
        }
      }
      
      const availableRooms = maxRooms - bookedRoomsCount;
      const isAvailable = availableRooms >= quantityRequired;
      
      return {
        available: isAvailable,
        message: isAvailable 
          ? `${availableRooms} Räume verfügbar` 
          : `Nicht genügend Räume verfügbar. Benötigt: ${quantityRequired}, Verfügbar: ${availableRooms}`,
        totalAvailable: maxRooms,
        booked: bookedRoomsCount,
        available: availableRooms,
        required: quantityRequired
      };
      
    } catch (error) {
      console.error('Error checking room type availability:', error);
      return {
        available: false,
        message: 'Fehler bei der Verfügbarkeitsprüfung',
        error: error.message
      };
    }
  }
}

module.exports = CollisionDetection;
