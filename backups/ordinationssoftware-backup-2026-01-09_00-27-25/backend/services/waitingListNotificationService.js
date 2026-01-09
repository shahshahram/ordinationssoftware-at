const WaitingList = require('../models/WaitingList');
const PatientExtended = require('../models/PatientExtended');
const Appointment = require('../models/Appointment');
const OnlineBooking = require('../models/OnlineBooking');
const ServiceCatalog = require('../models/ServiceCatalog');
const SystemSettings = require('../models/SystemSettings');
const smsService = require('./smsService');
const emailService = require('./emailService');
const crypto = require('crypto');

/**
 * Service für Wartelisten-Benachrichtigungen
 * Implementiert die "Fast Track" Nachrücker-Automatik
 */
class WaitingListNotificationService {
  /**
   * Benachrichtigt Wartelisten-Patienten über einen freigewordenen Termin
   * @param {object} cancelledAppointment - Stornierter Termin
   * @param {object} options - Optionen (maxNotifications, notificationMethod, etc.)
   * @returns {Promise<object>} - Ergebnisse der Benachrichtigungen
   */
  async notifyWaitingListPatients(cancelledAppointment, options = {}) {
    try {
      console.log('[WaitingListNotification] Prüfe Warteliste für stornierten Termin:', cancelledAppointment._id);

      // Lade System-Einstellungen
      const maxNotifications = await SystemSettings.getSetting(
        'onlineBooking',
        'waitingListMaxNotifications',
        options.maxNotifications || 3
      );

      const notificationMethod = await SystemSettings.getSetting(
        'onlineBooking',
        'waitingListNotificationMethod',
        options.notificationMethod || 'sms' // sms, email, both
      );

      // Finde passende Wartelisten-Einträge
      const waitingListEntries = await this.findMatchingWaitingListEntries(cancelledAppointment);

      if (waitingListEntries.length === 0) {
        console.log('[WaitingListNotification] Keine passenden Wartelisten-Einträge gefunden');
        return {
          success: true,
          notified: 0,
          message: 'Keine passenden Wartelisten-Einträge gefunden'
        };
      }

      // Sortiere nach Priorität und Position
      const sortedEntries = this.sortWaitingListEntries(waitingListEntries);

      // Nimm die ersten X Einträge (Standard: 3)
      const entriesToNotify = sortedEntries.slice(0, maxNotifications);

      console.log(`[WaitingListNotification] Benachrichtige ${entriesToNotify.length} Patienten`);

      // Generiere Magic Links für Umbuchung
      const notificationResults = await Promise.all(
        entriesToNotify.map(entry => this.notifyPatient(entry, cancelledAppointment, notificationMethod))
      );

      const successCount = notificationResults.filter(r => r.success).length;
      const failureCount = notificationResults.filter(r => !r.success).length;

      return {
        success: failureCount === 0,
        notified: successCount,
        failed: failureCount,
        results: notificationResults,
        message: `${successCount} von ${entriesToNotify.length} Benachrichtigungen erfolgreich gesendet`
      };
    } catch (error) {
      console.error('[WaitingListNotification] Fehler bei Wartelisten-Benachrichtigung:', error);
      throw error;
    }
  }

  /**
   * Findet passende Wartelisten-Einträge für einen stornierten Termin
   */
  async findMatchingWaitingListEntries(appointment) {
    const query = {
      status: 'waiting'
    };

    // Prüfe Service-Match
    if (appointment.service) {
      query.service = appointment.service;
    } else {
      // Wenn kein Service, dann Service-agnostisch
      query.service = { $exists: false };
    }

    // Prüfe Arzt-Match
    if (appointment.doctor) {
      // Finde StaffProfile für diesen Arzt
      const StaffProfile = require('../models/StaffProfile');
      const staffProfile = await StaffProfile.findOne({ userId: appointment.doctor });
      if (staffProfile) {
        query.doctor = staffProfile._id;
      }
    } else {
      query.doctor = { $exists: false };
    }

    // Prüfe Standort-Match (falls vorhanden)
    if (appointment.locationId) {
      query.location = appointment.locationId;
    } else {
      query.location = { $exists: false };
    }

    const entries = await WaitingList.find(query)
      .populate('patient', 'firstName lastName email phone')
      .populate('service', 'name code')
      .populate('doctor', 'displayName')
      .populate('location', 'name')
      .sort({ priority: -1, position: 1, createdAt: 1 })
      .limit(10) // Nimm mehr als nötig für Sortierung
      .lean();

    return entries;
  }

  /**
   * Sortiert Wartelisten-Einträge nach Priorität und Position
   */
  sortWaitingListEntries(entries) {
    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };

    return entries.sort((a, b) => {
      // Zuerst nach Priorität
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;

      // Dann nach Position
      const positionDiff = (a.position || 0) - (b.position || 0);
      if (positionDiff !== 0) return positionDiff;

      // Dann nach Erstellungsdatum (ältere zuerst)
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  }

  /**
   * Benachrichtigt einen einzelnen Patienten
   */
  async notifyPatient(waitingListEntry, cancelledAppointment, notificationMethod) {
    try {
      const patient = await PatientExtended.findById(waitingListEntry.patient);
      if (!patient) {
        throw new Error('Patient nicht gefunden');
      }

      // Generiere Magic Link für Umbuchung
      const magicLinkToken = crypto.randomBytes(32).toString('hex');
      const magicLinkExpiresAt = new Date();
      magicLinkExpiresAt.setHours(magicLinkExpiresAt.getHours() + 24); // 24 Stunden gültig

      // Speichere Magic Link im Wartelisten-Eintrag
      waitingListEntry.reservationToken = magicLinkToken;
      waitingListEntry.reservationExpiresAt = magicLinkExpiresAt;
      waitingListEntry.reservationAppointmentId = cancelledAppointment._id;
      await WaitingList.findByIdAndUpdate(waitingListEntry._id, {
        reservationToken: magicLinkToken,
        reservationExpiresAt: magicLinkExpiresAt,
        reservationAppointmentId: cancelledAppointment._id,
        lastNotificationSent: new Date()
      });

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const magicLink = `${baseUrl}/waiting-list-reservation/${magicLinkToken}`;

      // Erstelle Nachricht
      const appointmentDate = new Date(cancelledAppointment.startTime);
      const formattedDate = appointmentDate.toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const serviceName = cancelledAppointment.service
        ? (typeof cancelledAppointment.service === 'object' ? cancelledAppointment.service.name : 'Termin')
        : 'Termin';

      const smsMessage = `Ein früherer ${serviceName} ist frei geworden: ${formattedDate}. Jetzt umbuchen: ${magicLink}`;
      const emailSubject = `Früherer Termin verfügbar: ${formattedDate}`;
      const emailMessage = `
        <h2>Früherer Termin verfügbar</h2>
        <p>Guten Tag ${patient.firstName} ${patient.lastName},</p>
        <p>ein früherer Termin ist frei geworden:</p>
        <ul>
          <li><strong>Datum:</strong> ${formattedDate}</li>
          <li><strong>Leistung:</strong> ${serviceName}</li>
        </ul>
        <p>Sie können diesen Termin jetzt direkt buchen:</p>
        <p><a href="${magicLink}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Termin jetzt buchen</a></p>
        <p><small>Dieser Link ist 24 Stunden gültig. Wer zuerst klickt, bekommt den Termin.</small></p>
        <p>Falls der Link nicht funktioniert, kopieren Sie diese URL in Ihren Browser:<br>${magicLink}</p>
      `;

      const results = {
        patientId: patient._id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        waitingListEntryId: waitingListEntry._id,
        magicLink,
        success: false,
        methods: []
      };

      // Sende Benachrichtigung je nach Methode
      if (notificationMethod === 'sms' || notificationMethod === 'both') {
        if (patient.phone) {
          try {
            // Prüfe ob SMS-Service verfügbar ist (konfiguriert)
            if (process.env.SMS_PROVIDER && process.env.SMS_PROVIDER !== 'mock') {
              await smsService.sendSMS(patient.phone, smsMessage);
              results.methods.push('sms');
              results.success = true;
            } else {
              // Mock-Modus: Nur loggen
              console.log(`[WaitingListNotification] [MOCK] SMS würde gesendet werden an ${patient.phone}: ${smsMessage}`);
              results.methods.push('sms (mock)');
              results.success = true;
            }
          } catch (smsError) {
            console.error(`[WaitingListNotification] SMS-Fehler für Patient ${patient._id}:`, smsError);
            results.smsError = smsError.message;
          }
        } else {
          console.warn(`[WaitingListNotification] Keine Telefonnummer für Patient ${patient._id}`);
        }
      }

      if (notificationMethod === 'email' || notificationMethod === 'both') {
        if (patient.email) {
          try {
            await emailService.sendEmail({
              to: patient.email,
              subject: emailSubject,
              html: emailMessage
            });
            results.methods.push('email');
            results.success = true;
          } catch (emailError) {
            console.error(`[WaitingListNotification] E-Mail-Fehler für Patient ${patient._id}:`, emailError);
            results.emailError = emailError.message;
          }
        } else {
          console.warn(`[WaitingListNotification] Keine E-Mail für Patient ${patient._id}`);
        }
      }

      return results;
    } catch (error) {
      console.error(`[WaitingListNotification] Fehler bei Benachrichtigung von Patient ${waitingListEntry.patient}:`, error);
      return {
        patientId: waitingListEntry.patient,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reserviert einen Termin für einen Wartelisten-Patienten (via Magic Link)
   */
  async reserveAppointmentForWaitingList(token, patientId) {
    try {
      // Finde Wartelisten-Eintrag mit diesem Token
      const waitingListEntry = await WaitingList.findOne({
        reservationToken: token,
        reservationExpiresAt: { $gt: new Date() },
        status: 'waiting'
      }).populate('patient').populate('reservationAppointmentId');

      if (!waitingListEntry) {
        throw new Error('Ungültiger oder abgelaufener Reservierungslink');
      }

      // Prüfe ob Patient übereinstimmt
      const patientIdObj = typeof waitingListEntry.patient === 'object' 
        ? waitingListEntry.patient._id 
        : waitingListEntry.patient;
      
      if (patientIdObj.toString() !== patientId.toString()) {
        throw new Error('Dieser Link gehört nicht zu Ihrem Konto');
      }

      // Prüfe ob Termin noch verfügbar ist
      const appointmentId = typeof waitingListEntry.reservationAppointmentId === 'object'
        ? waitingListEntry.reservationAppointmentId._id
        : waitingListEntry.reservationAppointmentId;
      
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment || appointment.status !== 'cancelled') {
        throw new Error('Termin ist nicht mehr verfügbar');
      }

      // Prüfe ob bereits jemand anderes den Termin gebucht hat
      const existingBooking = await Appointment.findOne({
        _id: appointment._id,
        status: { $ne: 'cancelled' }
      });

      if (existingBooking) {
        throw new Error('Termin wurde bereits von jemand anderem gebucht');
      }

      // Buche den Termin für den Patienten
      appointment.patient = patientId;
      appointment.status = 'geplant';
      appointment.notes = (appointment.notes || '') + `\nUmbuchung von Warteliste (Token: ${token.substring(0, 8)}...)`;
      await appointment.save();

      // Aktualisiere Wartelisten-Eintrag
      waitingListEntry.status = 'completed';
      waitingListEntry.reservationToken = null;
      waitingListEntry.reservationExpiresAt = null;
      await waitingListEntry.save();

      return {
        success: true,
        appointment,
        message: 'Termin erfolgreich reserviert'
      };
    } catch (error) {
      console.error('[WaitingListNotification] Fehler bei Termin-Reservierung:', error);
      throw error;
    }
  }
}

// Singleton-Instanz
const waitingListNotificationService = new WaitingListNotificationService();

module.exports = waitingListNotificationService;

