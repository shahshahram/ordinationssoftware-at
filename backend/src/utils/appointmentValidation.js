const moment = require('moment-timezone');

class AppointmentValidator {
  constructor(settings = {}) {
    this.settings = {
      workingHours: {
        start: '08:00',
        end: '18:00',
        days: [1, 2, 3, 4, 5], // Monday to Friday
        timezone: 'Europe/Vienna'
      },
      bufferTime: 15, // minutes
      minBookingWindow: 2, // hours
      maxBookingWindow: 30, // days
      slotDuration: 30, // minutes
      maxAppointmentsPerDay: 20,
      ...settings
    };
  }

  // Validate appointment time against working hours
  validateWorkingHours(startTime, endTime) {
    const start = moment.tz(startTime, this.settings.workingHours.timezone);
    const end = moment.tz(endTime, this.settings.workingHours.timezone);
    
    const dayOfWeek = start.day();
    const startHour = start.hour();
    const startMinute = start.minute();
    const endHour = end.hour();
    const endMinute = end.minute();
    
    const workingStart = this.settings.workingHours.start.split(':');
    const workingEnd = this.settings.workingHours.end.split(':');
    const workingStartHour = parseInt(workingStart[0]);
    const workingStartMinute = parseInt(workingStart[1]);
    const workingEndHour = parseInt(workingEnd[0]);
    const workingEndMinute = parseInt(workingEnd[1]);
    
    const errors = [];
    
    // Check if appointment is on a working day
    if (!this.settings.workingHours.days.includes(dayOfWeek)) {
      errors.push('Appointment outside working days');
    }
    
    // Check if appointment starts during working hours
    const appointmentStartMinutes = startHour * 60 + startMinute;
    const workingStartMinutes = workingStartHour * 60 + workingStartMinute;
    const workingEndMinutes = workingEndHour * 60 + workingEndMinute;
    
    if (appointmentStartMinutes < workingStartMinutes) {
      errors.push('Appointment starts before working hours');
    }
    
    if (appointmentStartMinutes >= workingEndMinutes) {
      errors.push('Appointment starts after working hours');
    }
    
    // Check if appointment ends during working hours
    const appointmentEndMinutes = endHour * 60 + endMinute;
    if (appointmentEndMinutes > workingEndMinutes) {
      errors.push('Appointment ends after working hours');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate booking window
  validateBookingWindow(startTime) {
    const now = moment.tz(this.settings.workingHours.timezone);
    const appointment = moment.tz(startTime, this.settings.workingHours.timezone);
    
    const timeDiff = appointment.diff(now, 'hours', true);
    const daysDiff = appointment.diff(now, 'days', true);
    
    const errors = [];
    
    if (timeDiff < this.settings.minBookingWindow) {
      errors.push(`Minimum booking window is ${this.settings.minBookingWindow} hours`);
    }
    
    if (daysDiff > this.settings.maxBookingWindow) {
      errors.push(`Maximum booking window is ${this.settings.maxBookingWindow} days`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate appointment duration
  validateDuration(startTime, endTime) {
    const start = moment.tz(startTime, this.settings.workingHours.timezone);
    const end = moment.tz(endTime, this.settings.workingHours.timezone);
    
    const duration = end.diff(start, 'minutes');
    const errors = [];
    
    if (duration <= 0) {
      errors.push('Appointment duration must be positive');
    }
    
    if (duration < this.settings.slotDuration) {
      errors.push(`Minimum appointment duration is ${this.settings.slotDuration} minutes`);
    }
    
    if (duration > 480) { // 8 hours max
      errors.push('Maximum appointment duration is 8 hours');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      duration
    };
  }

  // Check for conflicts with existing appointments
  async checkConflicts(startTime, endTime, resourceId, appointmentId = null, Appointment) {
    const start = moment.tz(startTime, this.settings.workingHours.timezone);
    const end = moment.tz(endTime, this.settings.workingHours.timezone);
    
    const query = {
      startTime: { $lt: end.toISOString() },
      endTime: { $gt: start.toISOString() },
      status: { $in: ['scheduled', 'confirmed'] }
    };
    
    if (resourceId) {
      query.resourceId = resourceId;
    }
    
    if (appointmentId) {
      query._id = { $ne: appointmentId };
    }
    
    const conflicts = await Appointment.find(query);
    
    return {
      hasConflicts: conflicts.length > 0,
      conflicts: conflicts.map(conflict => ({
        id: conflict._id,
        title: conflict.title,
        startTime: conflict.startTime,
        endTime: conflict.endTime,
        status: conflict.status
      }))
    };
  }

  // Check buffer time requirements
  async checkBufferTime(startTime, endTime, resourceId, Appointment) {
    const start = moment.tz(startTime, this.settings.workingHours.timezone);
    const end = moment.tz(endTime, this.settings.workingHours.timezone);
    
    const bufferStart = start.subtract(this.settings.bufferTime, 'minutes');
    const bufferEnd = end.add(this.settings.bufferTime, 'minutes');
    
    const query = {
      startTime: { $lt: bufferEnd.toISOString() },
      endTime: { $gt: bufferStart.toISOString() },
      status: { $in: ['scheduled', 'confirmed'] }
    };
    
    if (resourceId) {
      query.resourceId = resourceId;
    }
    
    const conflicts = await Appointment.find(query);
    
    return {
      hasConflicts: conflicts.length > 0,
      conflicts: conflicts.map(conflict => ({
        id: conflict._id,
        title: conflict.title,
        startTime: conflict.startTime,
        endTime: conflict.endTime,
        status: conflict.status
      }))
    };
  }

  // Check daily appointment limit
  async checkDailyLimit(doctorId, date, Appointment) {
    const startOfDay = moment.tz(date, this.settings.workingHours.timezone).startOf('day');
    const endOfDay = moment.tz(date, this.settings.workingHours.timezone).endOf('day');
    
    const count = await Appointment.countDocuments({
      doctor: doctorId,
      startTime: { $gte: startOfDay.toISOString() },
      endTime: { $lte: endOfDay.toISOString() },
      status: { $in: ['scheduled', 'confirmed'] }
    });
    
    return {
      isValid: count < this.settings.maxAppointmentsPerDay,
      currentCount: count,
      maxAllowed: this.settings.maxAppointmentsPerDay
    };
  }

  // Comprehensive validation
  async validateAppointment(appointmentData, Appointment, SlotReservation = null) {
    const {
      startTime,
      endTime,
      doctorId,
      resourceId,
      appointmentId = null
    } = appointmentData;
    
    const errors = [];
    const warnings = [];
    
    // Basic time validation
    const workingHoursValidation = this.validateWorkingHours(startTime, endTime);
    if (!workingHoursValidation.isValid) {
      errors.push(...workingHoursValidation.errors);
    }
    
    const bookingWindowValidation = this.validateBookingWindow(startTime);
    if (!bookingWindowValidation.isValid) {
      errors.push(...bookingWindowValidation.errors);
    }
    
    const durationValidation = this.validateDuration(startTime, endTime);
    if (!durationValidation.isValid) {
      errors.push(...durationValidation.errors);
    }
    
    // Check for conflicts
    if (Appointment) {
      const conflictCheck = await this.checkConflicts(startTime, endTime, resourceId, appointmentId, Appointment);
      if (conflictCheck.hasConflicts) {
        errors.push('Appointment conflicts with existing appointments');
        warnings.push(...conflictCheck.conflicts);
      }
      
      // Check buffer time
      const bufferCheck = await this.checkBufferTime(startTime, endTime, resourceId, Appointment);
      if (bufferCheck.hasConflicts) {
        warnings.push('Appointment may conflict with buffer time requirements');
        warnings.push(...bufferCheck.conflicts);
      }
      
      // Check daily limit
      const dailyLimitCheck = await this.checkDailyLimit(doctorId, startTime, Appointment);
      if (!dailyLimitCheck.isValid) {
        errors.push(`Daily appointment limit exceeded (${dailyLimitCheck.currentCount}/${dailyLimitCheck.maxAllowed})`);
      }
    }
    
    // Check slot reservations
    if (SlotReservation) {
      const slotConflicts = await SlotReservation.checkConflicts(
        new Date(startTime),
        new Date(endTime),
        resourceId,
        appointmentId
      );
      
      if (slotConflicts.length > 0) {
        errors.push('Slot is currently reserved');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      duration: durationValidation.duration
    };
  }

  // Get available time slots for a date range
  async getAvailableSlots(startDate, endDate, resourceId, duration = 30, Appointment) {
    const start = moment.tz(startDate, this.settings.workingHours.timezone);
    const end = moment.tz(endDate, this.settings.workingHours.timezone);
    
    const availableSlots = [];
    const slotDuration = duration * 60 * 1000; // Convert to milliseconds
    
    // Get all appointments for the date range
    const appointments = await Appointment.find({
      resourceId,
      startTime: { $gte: start.toISOString() },
      endTime: { $lte: end.toISOString() },
      status: { $in: ['scheduled', 'confirmed'] }
    }).sort({ startTime: 1 });
    
    // Generate time slots
    let currentTime = start.clone();
    
    while (currentTime.isBefore(end)) {
      const slotEnd = currentTime.clone().add(duration, 'minutes');
      
      if (slotEnd.isAfter(end)) break;
      
      // Check if this slot is available
      const hasConflict = appointments.some(appointment => {
        const aptStart = moment.tz(appointment.startTime, this.settings.workingHours.timezone);
        const aptEnd = moment.tz(appointment.endTime, this.settings.workingHours.timezone);
        
        return currentTime.isBefore(aptEnd) && slotEnd.isAfter(aptStart);
      });
      
      if (!hasConflict) {
        // Check if slot is within working hours
        const dayOfWeek = currentTime.day();
        const hour = currentTime.hour();
        const minute = currentTime.minute();
        
        const workingStart = this.settings.workingHours.start.split(':');
        const workingEnd = this.settings.workingHours.end.split(':');
        const workingStartMinutes = parseInt(workingStart[0]) * 60 + parseInt(workingStart[1]);
        const workingEndMinutes = parseInt(workingEnd[0]) * 60 + parseInt(workingEnd[1]);
        const slotStartMinutes = hour * 60 + minute;
        const slotEndMinutes = slotStartMinutes + duration;
        
        if (this.settings.workingHours.days.includes(dayOfWeek) &&
            slotStartMinutes >= workingStartMinutes &&
            slotEndMinutes <= workingEndMinutes) {
          availableSlots.push({
            start: currentTime.toISOString(),
            end: slotEnd.toISOString(),
            duration: duration
          });
        }
      }
      
      // Move to next slot (15-minute increments)
      currentTime.add(15, 'minutes');
    }
    
    return availableSlots;
  }
}

module.exports = AppointmentValidator;


