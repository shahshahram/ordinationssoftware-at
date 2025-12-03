const SlotReservation = require('../models/SlotReservation');
const Appointment = require('../models/Appointment');

class AppointmentValidator {
  constructor(settings = {}) {
    this.workingHours = settings.workingHours || {
      start: '08:00',
      end: '18:00',
      days: [0, 1, 2, 3, 4, 5, 6] // Sunday to Saturday (alle Tage)
    };
    this.bufferTime = settings.bufferTime || 15; // minutes
    this.bookingWindow = settings.bookingWindow || {
      min: 2, // hours
      max: 30 // days
    };
  }

  // Validate appointment slot
  async validateAppointment(appointmentData) {
    const { startTime, endTime, resourceId, skipMinBookingWindow = false } = appointmentData;
    
    // Check working hours
    if (!this.isWithinWorkingHours(startTime, endTime)) {
      throw new Error('Appointment outside working hours');
    }

    // Check booking window (skipMinBookingWindow allows internal bookings without minimum time restriction)
    if (!this.isWithinBookingWindow(startTime, skipMinBookingWindow)) {
      const now = new Date();
      const appointmentTime = new Date(startTime);
      const diffHours = (appointmentTime - now) / (1000 * 60 * 60);
      
      if (!skipMinBookingWindow && diffHours < this.bookingWindow.min) {
        throw new Error(`Termin muss mindestens ${this.bookingWindow.min} Stunden im Voraus gebucht werden`);
      } else if (diffHours > (this.bookingWindow.max * 24)) {
        throw new Error(`Termin kann maximal ${this.bookingWindow.max} Tage im Voraus gebucht werden`);
      } else {
        throw new Error('Appointment outside booking window');
      }
    }

    // Check for conflicts
    const conflicts = await this.checkConflicts(resourceId, startTime, endTime);
    if (conflicts.length > 0) {
      throw new Error('Zeitslot ist bereits belegt. Bitte wählen Sie einen anderen Zeitpunkt.');
    }

    return true;
  }

  // Check if appointment is within working hours
  isWithinWorkingHours(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const dayOfWeek = start.getDay();
    const startHour = start.getHours();
    const startMinute = start.getMinutes();
    const endHour = end.getHours();
    const endMinute = end.getMinutes();

    // Check if day is within working days
    if (!this.workingHours.days.includes(dayOfWeek)) {
      return false;
    }

    // Parse working hours
    const [workStartHour, workStartMinute] = this.workingHours.start.split(':').map(Number);
    const [workEndHour, workEndMinute] = this.workingHours.end.split(':').map(Number);

    const workStartMinutes = workStartHour * 60 + workStartMinute;
    const workEndMinutes = workEndHour * 60 + workEndMinute;
    const appointmentStartMinutes = startHour * 60 + startMinute;
    const appointmentEndMinutes = endHour * 60 + endMinute;

    return appointmentStartMinutes >= workStartMinutes && 
           appointmentEndMinutes <= workEndMinutes;
  }

  // Check if appointment is within booking window
  isWithinBookingWindow(startTime, skipMinWindow = false) {
    const now = new Date();
    const appointmentTime = new Date(startTime);
    const diffHours = (appointmentTime - now) / (1000 * 60 * 60);

    // Skip minimum window check for internal bookings (skipMinWindow = true)
    const minCheck = skipMinWindow ? true : diffHours >= this.bookingWindow.min;
    
    return minCheck && diffHours <= (this.bookingWindow.max * 24);
  }

  // Check for conflicts
  async checkConflicts(resourceId, startTime, endTime) {
    // Check existing appointments
    const existingAppointments = await Appointment.find({
      resourceId,
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    });

    // Check slot reservations
    const reservations = await SlotReservation.findConflicts(resourceId, startTime, endTime);

    return [...existingAppointments, ...reservations];
  }

  // Get available slots
  async getAvailableSlots(resourceId, date, duration = 60) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get existing appointments and reservations
    const appointments = await Appointment.find({
      resourceId,
      startTime: { $gte: startOfDay, $lte: endOfDay }
    });

    const reservations = await SlotReservation.find({
      resourceId,
      status: { $in: ['pending', 'confirmed'] },
      startTime: { $gte: startOfDay, $lte: endOfDay }
    });

    // Generate available slots
    const slots = [];
    const [workStartHour, workStartMinute] = this.workingHours.start.split(':').map(Number);
    const [workEndHour, workEndMinute] = this.workingHours.end.split(':').map(Number);

    for (let hour = workStartHour; hour < workEndHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) { // 30-minute intervals
        const slotStart = new Date(date);
        slotStart.setHours(hour, minute, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + duration);

        // Check if slot is available
        const isAvailable = !this.hasConflict(slotStart, slotEnd, [...appointments, ...reservations]);
        
        if (isAvailable) {
          slots.push({
            start: slotStart,
            end: slotEnd,
            duration: duration
          });
        }
      }
    }

    return slots;
  }

  // Check if time slot has conflicts
  hasConflict(startTime, endTime, existingItems) {
    return existingItems.some(item => {
      const itemStart = new Date(item.startTime);
      const itemEnd = new Date(item.endTime);
      
      return (startTime < itemEnd && endTime > itemStart);
    });
  }
}

module.exports = AppointmentValidator;


