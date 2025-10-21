const WeeklySchedule = require('../models/WeeklySchedule');
const Absence = require('../models/Absence');
const Appointment = require('../models/Appointment');
const AppointmentParticipant = require('../models/AppointmentParticipant');
const ServiceCatalog = require('../models/ServiceCatalog');

class AvailabilityService {
  /**
   * Berechnet verfügbare Terminslots für einen Mitarbeiter
   * @param {string} staffId - ID des Personalprofils
   * @param {Date} startDate - Startdatum
   * @param {Date} endDate - Enddatum
   * @param {string} serviceId - ID der gewünschten Leistung
   * @returns {Array} Verfügbare Slots
   */
  static async getAvailableSlots(staffId, startDate, endDate, serviceId) {
    try {
      // 1. Aktive wöchentliche Arbeitszeiten für den Zeitraum abrufen
      const weeklySchedules = await WeeklySchedule.find({
        staffId,
        isActive: true,
        validFrom: { $lte: endDate },
        $or: [
          { validTo: { $gte: startDate } },
          { validTo: null }
        ]
      }).populate('staffId', 'displayName');
      
      // 2. Abwesenheiten für den Zeitraum abrufen
      const absences = await Absence.find({
        staffId,
        startsAt: { $lte: endDate },
        endsAt: { $gte: startDate },
        status: 'approved'
      });
      
      // 3. Bereits gebuchte Termine abrufen
      const existingAppointments = await AppointmentParticipant.find({
        staffId,
        status: { $in: ['confirmed', 'tentative'] }
      }).populate('appointmentId');
      
      // 4. Leistungsdetails abrufen
      const service = await ServiceCatalog.findById(serviceId);
      if (!service) {
        throw new Error('Leistung nicht gefunden');
      }
      
      // 5. Verfügbare Slots berechnen
      const availableSlots = [];
      
      // Für jeden Tag im Zeitraum prüfen
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayOfWeek = this.getDayOfWeek(currentDate);
        
        // Passende Arbeitszeiten für diesen Tag finden
        for (const schedule of weeklySchedules) {
          const daySchedule = schedule.schedules.find(s => s.day === dayOfWeek);
          if (daySchedule && daySchedule.isWorking) {
            const slots = this.calculateSlotsForDay(
              currentDate,
              daySchedule,
              absences,
              existingAppointments,
              service,
              schedule.staffId
            );
            availableSlots.push(...slots);
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return availableSlots;
    } catch (error) {
      console.error('Fehler bei Verfügbarkeitsberechnung:', error);
      throw error;
    }
  }
  
  /**
   * Konvertiert Wochentag zu String
   */
  static getDayOfWeek(date) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  /**
   * Berechnet Slots für einen einzelnen Tag basierend auf wöchentlichen Arbeitszeiten
   */
  static calculateSlotsForDay(date, daySchedule, absences, existingAppointments, service, staffId) {
    const slots = [];
    const slotDuration = service.duration + service.bufferBefore + service.bufferAfter;
    const slotInterval = 15; // 15-Minuten-Intervalle
    
    // Arbeitszeiten für diesen Tag
    const startTime = this.parseTime(daySchedule.startTime);
    const endTime = this.parseTime(daySchedule.endTime);
    
    // Datum + Zeit kombinieren
    const dayStart = new Date(date);
    dayStart.setHours(startTime.hours, startTime.minutes, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(endTime.hours, endTime.minutes, 0, 0);
    
    let currentTime = new Date(dayStart);
    
    while (currentTime < dayEnd) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000);
      
      // Prüfen ob Slot verfügbar ist (inkl. Pausenzeiten)
      if (this.isSlotAvailableForDay(currentTime, slotEnd, daySchedule, absences, existingAppointments, date)) {
        slots.push({
          start: new Date(currentTime),
          end: new Date(slotEnd),
          duration: service.duration,
          serviceId: service._id,
          serviceName: service.name,
          staffId: staffId._id,
          staffName: staffId.displayName
        });
      }
      
      // Nächster Slot
      currentTime = new Date(currentTime.getTime() + slotInterval * 60000);
    }
    
    return slots;
  }

  /**
   * Parst Zeitstring (HH:MM) zu Stunden und Minuten
   */
  static parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours, minutes };
  }
  
  /**
   * Prüft ob ein Slot für einen Tag verfügbar ist (inkl. Pausenzeiten)
   */
  static isSlotAvailableForDay(startTime, endTime, daySchedule, absences, existingAppointments, date) {
    // 1. Prüfen ob Slot innerhalb der Arbeitszeiten liegt
    const startTimeStr = startTime.toTimeString().substring(0, 5);
    const endTimeStr = endTime.toTimeString().substring(0, 5);
    
    if (startTimeStr < daySchedule.startTime || endTimeStr > daySchedule.endTime) {
      return false;
    }
    
    // 2. Prüfen ob Slot in einer Abwesenheit liegt
    for (const absence of absences) {
      if (this.isDateInRange(date, absence.startsAt, absence.endsAt)) {
        return false;
      }
    }
    
    // 3. Prüfen ob Slot in einer Pause liegt
    if (daySchedule.breakStart && daySchedule.breakEnd) {
      if (this.timesOverlap(startTimeStr, endTimeStr, daySchedule.breakStart, daySchedule.breakEnd)) {
        return false;
      }
    }
    
    // 4. Prüfen ob Slot mit bestehenden Terminen kollidiert
    for (const appointment of existingAppointments) {
      if (appointment.appointmentId) {
        const appt = appointment.appointmentId;
        const apptDate = new Date(appt.startsAt);
        if (this.isSameDay(date, apptDate) && 
            this.timesOverlap(startTime, endTime, appt.startsAt, appt.endsAt)) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Prüft ob ein Datum in einem Zeitraum liegt
   */
  static isDateInRange(date, startDate, endDate) {
    const checkDate = new Date(date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return checkDate >= start && checkDate <= end;
  }

  /**
   * Prüft ob zwei Daten der gleiche Tag sind
   */
  static isSameDay(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }
  
  /**
   * Prüft ob zwei Zeiträume sich überschneiden
   */
  static timesOverlap(start1, end1, start2, end2) {
    return start1 < end2 && start2 < end1;
  }
  
  /**
   * Prüft Verfügbarkeit für mehrere Mitarbeiter
   */
  static async getMultiStaffAvailability(staffIds, startDate, endDate, serviceId) {
    const results = [];
    
    for (const staffId of staffIds) {
      try {
        const slots = await this.getAvailableSlots(staffId, startDate, endDate, serviceId);
        results.push({
          staffId,
          slots
        });
      } catch (error) {
        console.error(`Fehler bei Verfügbarkeitsprüfung für Mitarbeiter ${staffId}:`, error);
        results.push({
          staffId,
          slots: [],
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  /**
   * Findet den nächsten verfügbaren Termin
   */
  static async findNextAvailableSlot(staffId, serviceId, fromDate = new Date()) {
    const endDate = new Date(fromDate);
    endDate.setDate(endDate.getDate() + 30); // 30 Tage in die Zukunft suchen
    
    const slots = await this.getAvailableSlots(staffId, fromDate, endDate, serviceId);
    
    if (slots.length > 0) {
      return slots[0]; // Erster verfügbarer Slot
    }
    
    return null;
  }
  
  /**
   * Prüft ob ein spezifischer Termin buchbar ist
   */
  static async isTimeSlotBookable(staffId, startTime, endTime, serviceId, excludeAppointmentId = null) {
    try {
      const date = new Date(startTime);
      const dayOfWeek = this.getDayOfWeek(date);
      
      // 1. Aktive wöchentliche Arbeitszeiten für diesen Tag finden
      const weeklySchedules = await WeeklySchedule.find({
        staffId,
        isActive: true,
        validFrom: { $lte: endTime },
        $or: [
          { validTo: { $gte: startTime } },
          { validTo: null }
        ]
      });
      
      let daySchedule = null;
      for (const schedule of weeklySchedules) {
        const day = schedule.schedules.find(s => s.day === dayOfWeek);
        if (day && day.isWorking) {
          daySchedule = day;
          break;
        }
      }
      
      if (!daySchedule) {
        return { available: false, reason: 'Keine Arbeitszeiten an diesem Tag' };
      }
      
      // 2. Prüfen ob Termin innerhalb der Arbeitszeiten liegt
      const startTimeStr = startTime.toTimeString().substring(0, 5);
      const endTimeStr = endTime.toTimeString().substring(0, 5);
      
      if (startTimeStr < daySchedule.startTime || endTimeStr > daySchedule.endTime) {
        return { available: false, reason: 'Termin außerhalb der Arbeitszeiten' };
      }
      
      // 3. Prüfen ob Termin in einer Pause liegt
      if (daySchedule.breakStart && daySchedule.breakEnd) {
        if (this.timesOverlap(startTimeStr, endTimeStr, daySchedule.breakStart, daySchedule.breakEnd)) {
          return { available: false, reason: 'Termin fällt in Pausenzeiten' };
        }
      }
      
      // 4. Abwesenheiten prüfen
      const absences = await Absence.find({
        staffId,
        startsAt: { $lte: endTime },
        endsAt: { $gte: startTime },
        status: 'approved'
      });
      
      if (absences.length > 0) {
        return { available: false, reason: 'Mitarbeiter ist abwesend' };
      }
      
      // 5. Kollisionen mit bestehenden Terminen prüfen
      const existingAppointments = await AppointmentParticipant.find({
        staffId,
        status: { $in: ['confirmed', 'tentative'] }
      }).populate('appointmentId');
      
      for (const appointment of existingAppointments) {
        if (appointment.appointmentId && 
            appointment.appointmentId._id.toString() !== excludeAppointmentId &&
            this.timesOverlap(startTime, endTime, appointment.appointmentId.startsAt, appointment.appointmentId.endsAt)) {
          return { available: false, reason: 'Termin kollidiert mit bestehendem Termin' };
        }
      }
      
      return { available: true };
    } catch (error) {
      console.error('Fehler bei Terminprüfung:', error);
      return { available: false, reason: 'Fehler bei Verfügbarkeitsprüfung' };
    }
  }
  
  /**
   * Berechnet Auslastung für einen Mitarbeiter
   */
  static async getStaffUtilization(staffId, startDate, endDate) {
    try {
      // Aktive wöchentliche Arbeitszeiten abrufen
      const weeklySchedules = await WeeklySchedule.find({
        staffId,
        isActive: true,
        validFrom: { $lte: endDate },
        $or: [
          { validTo: { $gte: startDate } },
          { validTo: null }
        ]
      });
      
      // Termine abrufen
      const appointments = await AppointmentParticipant.find({
        staffId,
        status: { $in: ['confirmed', 'tentative'] }
      }).populate('appointmentId');
      
      let totalWorkHours = 0;
      let totalAppointmentHours = 0;
      
      // Arbeitsstunden für jeden Tag berechnen
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayOfWeek = this.getDayOfWeek(currentDate);
        
        for (const schedule of weeklySchedules) {
          const daySchedule = schedule.schedules.find(s => s.day === dayOfWeek);
          if (daySchedule && daySchedule.isWorking) {
            const startTime = this.parseTime(daySchedule.startTime);
            const endTime = this.parseTime(daySchedule.endTime);
            
            // Arbeitsstunden berechnen (ohne Pausen)
            let workHours = (endTime.hours * 60 + endTime.minutes) - (startTime.hours * 60 + startTime.minutes);
            
            // Pausenzeiten abziehen
            if (daySchedule.breakStart && daySchedule.breakEnd) {
              const breakStart = this.parseTime(daySchedule.breakStart);
              const breakEnd = this.parseTime(daySchedule.breakEnd);
              const breakMinutes = (breakEnd.hours * 60 + breakEnd.minutes) - (breakStart.hours * 60 + breakStart.minutes);
              workHours -= breakMinutes;
            }
            
            totalWorkHours += workHours / 60; // In Stunden umrechnen
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Terminstunden berechnen
      for (const appointment of appointments) {
        if (appointment.appointmentId) {
          const apptDate = new Date(appointment.appointmentId.startsAt);
          if (apptDate >= startDate && apptDate <= endDate) {
            const duration = (appointment.appointmentId.endsAt - appointment.appointmentId.startsAt) / (1000 * 60 * 60);
            totalAppointmentHours += duration;
          }
        }
      }
      
      const utilization = totalWorkHours > 0 ? (totalAppointmentHours / totalWorkHours) * 100 : 0;
      
      return {
        totalWorkHours: Math.round(totalWorkHours * 100) / 100,
        totalAppointmentHours: Math.round(totalAppointmentHours * 100) / 100,
        utilization: Math.round(utilization * 100) / 100
      };
    } catch (error) {
      console.error('Fehler bei Auslastungsberechnung:', error);
      throw error;
    }
  }
}

module.exports = AvailabilityService;
