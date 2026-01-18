// Intelligenter, proaktiver Benachrichtigungs-Service
// Generiert kontext-bewusste Benachrichtigungen basierend auf Patientendaten, Terminen und Benutzerverhalten

const InternalMessage = require('../models/InternalMessage');
const PatientExtended = require('../models/PatientExtended');
const Appointment = require('../models/Appointment');
const VitalSigns = require('../models/VitalSigns');
const PatientDiagnosis = require('../models/PatientDiagnosis');
const PatientMedication = require('../models/PatientMedication');
const LaborResult = require('../models/LaborResult');
const Task = require('../models/Task');
const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');
const logger = require('../utils/logger');

class SmartNotificationService {
  constructor() {
    this.checkInterval = null;
    this.isRunning = false;
  }

  /**
   * Startet den proaktiven Benachrichtigungs-Service
   */
  start() {
    if (this.isRunning) {
      logger.warn('Smart Notification Service läuft bereits');
      return;
    }

    this.isRunning = true;
    logger.info('🚀 Smart Notification Service gestartet');

    // Führe sofort eine Prüfung durch
    this.checkAndNotify();

    // Prüfe alle 15 Minuten auf proaktive Benachrichtigungen
    this.checkInterval = setInterval(() => {
      this.checkAndNotify();
    }, 15 * 60 * 1000); // 15 Minuten
  }

  /**
   * Stoppt den Service
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    logger.info('⏹️ Smart Notification Service gestoppt');
  }

  /**
   * Hauptfunktion: Prüft alle Bedingungen und sendet proaktive Benachrichtigungen
   */
  async checkAndNotify() {
    try {
      logger.info('🔍 Starte proaktive Benachrichtigungs-Prüfung...');

      // Hole alle aktiven Benutzer
      const users = await User.find({ isActive: true }).select('_id role firstName lastName email');
      
      // Parallele Prüfungen für verschiedene Benachrichtigungstypen
      const checks = [
        this.checkUpcomingAppointments(users),
        this.checkMissingVitalSigns(users),
        this.checkCriticalLabResults(users),
        this.checkOverdueTasks(users),
        this.checkMedicationReminders(users),
        this.checkFollowUpAppointments(users),
        this.checkIncompletePatientData(users),
      ];

      await Promise.all(checks);
      
      logger.info('✅ Proaktive Benachrichtigungs-Prüfung abgeschlossen');
    } catch (error) {
      logger.error('❌ Fehler bei proaktiver Benachrichtigungs-Prüfung:', error);
    }
  }

  /**
   * Prüft auf anstehende Termine (innerhalb der nächsten 24 Stunden)
   */
  async checkUpcomingAppointments(users) {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Finde alle Termine in den nächsten 24 Stunden
      const upcomingAppointments = await Appointment.find({
        startTime: { $gte: now, $lte: tomorrow },
        status: { $in: ['geplant', 'bestätigt'] }
      })
        .populate('patient', 'firstName lastName')
        .populate('doctor', 'firstName lastName')
        .populate('service', 'name')
        .lean();

      for (const appointment of upcomingAppointments) {
        // Benachrichtige den Arzt
        if (appointment.doctor && appointment.doctor._id) {
          const doctor = users.find(u => u._id.toString() === appointment.doctor._id.toString());
          if (doctor) {
            const hoursUntil = Math.round((appointment.startTime - now) / (1000 * 60 * 60));
            const patientName = appointment.patient 
              ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
              : 'Unbekannt';
            
            let priority = 'normal';
            if (hoursUntil <= 2) priority = 'urgent';
            else if (hoursUntil <= 6) priority = 'high';

            await this.sendNotification({
              recipientId: doctor._id,
              subject: `Termin in ${hoursUntil} Stunde(n): ${patientName}`,
              message: `Termin mit ${patientName}\n` +
                       `Zeit: ${new Date(appointment.startTime).toLocaleString('de-DE')}\n` +
                       `Service: ${appointment.service?.name || 'N/A'}\n` +
                       (appointment.notes ? `Notizen: ${appointment.notes}\n` : '') +
                       `\nBitte bereiten Sie sich auf den Termin vor.`,
              priority,
              patientId: appointment.patient?._id,
              relatedResource: {
                type: 'Appointment',
                id: appointment._id
              },
              notificationType: 'upcomingAppointments'
            });
          }
        }

        // Benachrichtige zugewiesene Benutzer
        if (appointment.assigned_users && appointment.assigned_users.length > 0) {
          for (const assignedUserId of appointment.assigned_users) {
            const assignedUser = users.find(u => u._id.toString() === assignedUserId.toString());
            if (assignedUser && assignedUser._id.toString() !== appointment.doctor?._id?.toString()) {
              const hoursUntil = Math.round((appointment.startTime - now) / (1000 * 60 * 60));
              const patientName = appointment.patient 
                ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
                : 'Unbekannt';

              await this.sendNotification({
                recipientId: assignedUser._id,
                subject: `Termin in ${hoursUntil} Stunde(n): ${patientName}`,
                message: `Termin mit ${patientName}\n` +
                         `Zeit: ${new Date(appointment.startTime).toLocaleString('de-DE')}\n` +
                         `Service: ${appointment.service?.name || 'N/A'}`,
                priority: hoursUntil <= 2 ? 'high' : 'normal',
                patientId: appointment.patient?._id,
                relatedResource: {
                  type: 'Appointment',
                  id: appointment._id
                },
                notificationType: 'upcomingAppointments'
              });
            }
          }
        }
      }
    } catch (error) {
      logger.error('Fehler bei Prüfung auf anstehende Termine:', error);
    }
  }

  /**
   * Prüft auf fehlende Vitalwerte (wenn Patient seit > 1 Jahr keine Vitalwerte hat)
   */
  async checkMissingVitalSigns(users) {
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      // Finde Patienten ohne aktuelle Vitalwerte
      const patients = await PatientExtended.find({ isActive: true })
        .select('_id firstName lastName dateOfBirth')
        .lean();

      for (const patient of patients) {
        const latestVitalSigns = await VitalSigns.findOne({ patientId: patient._id })
          .sort({ recordedAt: -1 })
          .lean();

        if (!latestVitalSigns || latestVitalSigns.recordedAt < oneYearAgo) {
          // Finde den primären Arzt für diesen Patienten (z.B. aus letzten Terminen)
          const recentAppointment = await Appointment.findOne({ patient: patient._id })
            .sort({ startTime: -1 })
            .populate('doctor', '_id')
            .lean();

          if (recentAppointment && recentAppointment.doctor) {
            const doctor = users.find(u => u._id.toString() === recentAppointment.doctor._id.toString());
            if (doctor) {
              const patientName = `${patient.firstName} ${patient.lastName}`;
              const lastRecorded = latestVitalSigns 
                ? new Date(latestVitalSigns.recordedAt).toLocaleDateString('de-DE')
                : 'Nie';

              await this.sendNotification({
                recipientId: doctor._id,
                subject: `⚠️ Fehlende Vitalwerte: ${patientName}`,
                message: `Patient ${patientName} hat seit ${lastRecorded} keine Vitalwerte mehr.\n\n` +
                         `Bitte erfassen Sie aktuelle Vitalwerte beim nächsten Termin.`,
                priority: 'normal',
                patientId: patient._id,
                relatedResource: {
                  type: 'Patient',
                  id: patient._id
                },
                notificationType: 'missingVitalSigns'
              });
            }
          }
        }
      }
    } catch (error) {
      logger.error('Fehler bei Prüfung auf fehlende Vitalwerte:', error);
    }
  }

  /**
   * Prüft auf kritische Laborwerte, die noch nicht gelesen wurden
   */
  async checkCriticalLabResults(users) {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      // Finde kritische Laborwerte der letzten 24 Stunden
      const criticalResults = await LaborResult.find({
        resultDate: { $gte: oneDayAgo },
        'results.isCritical': true
      })
        .populate('patientId', 'firstName lastName')
        .lean();

      for (const result of criticalResults) {
        if (!result.patientId) continue;

        // Prüfe ob bereits eine Benachrichtigung gesendet wurde
        const existingNotification = await InternalMessage.findOne({
          recipientId: { $in: users.map(u => u._id) },
          patientId: result.patientId._id,
          subject: { $regex: /KRITISCH.*Laborwerte/i },
          createdAt: { $gte: oneDayAgo }
        });

        if (!existingNotification) {
          // Finde Mediziner für diesen Patienten
          const recentAppointment = await Appointment.findOne({ patient: result.patientId._id })
            .sort({ startTime: -1 })
            .populate('doctor', '_id')
            .lean();

          if (recentAppointment && recentAppointment.doctor) {
            const doctor = users.find(u => u._id.toString() === recentAppointment.doctor._id.toString());
            if (doctor) {
              const patientName = `${result.patientId.firstName} ${result.patientId.lastName}`;
              
              await this.sendNotification({
                recipientId: doctor._id,
                subject: `🚨 KRITISCH: Laborwerte für ${patientName}`,
                message: `Kritische Laborwerte für ${patientName} wurden erfasst.\n\n` +
                         `Datum: ${new Date(result.resultDate).toLocaleDateString('de-DE')}\n` +
                         `Bitte prüfen Sie die Laborwerte sofort im Patienten-Organizer.`,
                priority: 'urgent',
                patientId: result.patientId._id,
                relatedResource: {
                  type: 'LaborResult',
                  id: result._id
                },
                notificationType: 'criticalLabResults'
              });
            }
          }
        }
      }
    } catch (error) {
      logger.error('Fehler bei Prüfung auf kritische Laborwerte:', error);
    }
  }

  /**
   * Prüft auf überfällige Aufgaben
   */
  async checkOverdueTasks(users) {
    try {
      const now = new Date();

      // Finde überfällige Aufgaben
      const overdueTasks = await Task.find({
        dueDate: { $lt: now },
        status: { $ne: 'completed' }
      })
        .populate('assignedTo', '_id firstName lastName')
        .populate('patientId', 'firstName lastName')
        .lean();

      for (const task of overdueTasks) {
        if (task.assignedTo && task.assignedTo._id) {
          const assignedUser = users.find(u => u._id.toString() === task.assignedTo._id.toString());
          if (assignedUser) {
            const daysOverdue = Math.floor((now - task.dueDate) / (1000 * 60 * 60 * 24));
            const patientName = task.patientId 
              ? `${task.patientId.firstName} ${task.patientId.lastName}`
              : 'Allgemein';

            await this.sendNotification({
              recipientId: assignedUser._id,
              subject: `⚠️ Überfällige Aufgabe: ${task.title}`,
              message: `Die Aufgabe "${task.title}" ist seit ${daysOverdue} Tag(en) überfällig.\n\n` +
                       (task.patientId ? `Patient: ${patientName}\n` : '') +
                       `Fälligkeitsdatum: ${new Date(task.dueDate).toLocaleDateString('de-DE')}\n` +
                       `Bitte erledigen Sie die Aufgabe umgehend.`,
              priority: daysOverdue > 3 ? 'urgent' : 'high',
              patientId: task.patientId?._id,
              relatedResource: {
                type: 'Task',
                id: task._id
              },
              notificationType: 'overdueTasks'
            });
          }
        }
      }
    } catch (error) {
      logger.error('Fehler bei Prüfung auf überfällige Aufgaben:', error);
    }
  }

  /**
   * Prüft auf Medikamenten-Erinnerungen (wenn Medikament seit > 1 Jahr verschrieben wurde)
   */
  async checkMedicationReminders(users) {
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      // Finde langfristige Medikamente, die möglicherweise überprüft werden müssen
      const longTermMedications = await PatientMedication.find({
        startDate: { $lte: oneYearAgo },
        endDate: { $exists: false } // Kein Enddatum = langfristig
      })
        .populate('patientId', 'firstName lastName')
        .lean();

      for (const medication of longTermMedications) {
        if (!medication.patientId) continue;

        // Finde den verschreibenden Arzt
        const recentAppointment = await Appointment.findOne({ patient: medication.patientId._id })
          .sort({ startTime: -1 })
          .populate('doctor', '_id')
          .lean();

        if (recentAppointment && recentAppointment.doctor) {
          const doctor = users.find(u => u._id.toString() === recentAppointment.doctor._id.toString());
          if (doctor) {
            const patientName = `${medication.patientId.firstName} ${medication.patientId.lastName}`;
            const startDate = new Date(medication.startDate).toLocaleDateString('de-DE');

              await this.sendNotification({
                recipientId: doctor._id,
                subject: `💊 Medikamenten-Überprüfung: ${patientName}`,
                message: `Patient ${patientName} nimmt seit ${startDate} das Medikament "${medication.name}".\n\n` +
                         `Bitte überprüfen Sie bei nächster Gelegenheit, ob die Medikation noch angemessen ist.`,
                priority: 'normal',
                patientId: medication.patientId._id,
                relatedResource: {
                  type: 'Medication',
                  id: medication._id
                },
                notificationType: 'medicationReminders'
              });
          }
        }
      }
    } catch (error) {
      logger.error('Fehler bei Prüfung auf Medikamenten-Erinnerungen:', error);
    }
  }

  /**
   * Prüft auf fehlende Nachsorgetermine
   */
  async checkFollowUpAppointments(users) {
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // Finde Patienten mit Diagnosen, aber ohne Termine in den letzten 3 Monaten
      const patientsWithDiagnoses = await PatientDiagnosis.find({
        status: 'active',
        createdAt: { $lte: threeMonthsAgo }
      })
        .populate('patientId', '_id firstName lastName')
        .lean();

      for (const diagnosis of patientsWithDiagnoses) {
        if (!diagnosis.patientId) continue;

        // Prüfe ob Patient in den letzten 3 Monaten einen Termin hatte
        const recentAppointment = await Appointment.findOne({
          patient: diagnosis.patientId._id,
          startTime: { $gte: threeMonthsAgo }
        }).lean();

        if (!recentAppointment) {
          // Finde den behandelnden Arzt
          const lastAppointment = await Appointment.findOne({ patient: diagnosis.patientId._id })
            .sort({ startTime: -1 })
            .populate('doctor', '_id')
            .lean();

          if (lastAppointment && lastAppointment.doctor) {
            const doctor = users.find(u => u._id.toString() === lastAppointment.doctor._id.toString());
            if (doctor) {
              const patientName = `${diagnosis.patientId.firstName} ${diagnosis.patientId.lastName}`;
              const lastAppointmentDate = new Date(lastAppointment.startTime).toLocaleDateString('de-DE');

              await this.sendNotification({
                recipientId: doctor._id,
                subject: `📅 Nachsorgetermin empfohlen: ${patientName}`,
                message: `Patient ${patientName} hat seit ${lastAppointmentDate} keinen Termin mehr.\n\n` +
                         `Aktive Diagnose: ${diagnosis.display}\n` +
                         `Bitte erwägen Sie einen Nachsorgetermin.`,
                priority: 'normal',
                patientId: diagnosis.patientId._id,
                relatedResource: {
                  type: 'Diagnosis',
                  id: diagnosis._id
                },
                notificationType: 'followUpAppointments'
              });
            }
          }
        }
      }
    } catch (error) {
      logger.error('Fehler bei Prüfung auf Nachsorgetermine:', error);
    }
  }

  /**
   * Prüft auf unvollständige Patientendaten
   */
  async checkIncompletePatientData(users) {
    try {
      // Finde Patienten mit fehlenden wichtigen Daten
      const patients = await PatientExtended.find({ isActive: true })
        .select('_id firstName lastName email phone dateOfBirth allergies preExistingConditions')
        .lean();

      for (const patient of patients) {
        const missingFields = [];
        if (!patient.email) missingFields.push('E-Mail');
        if (!patient.phone) missingFields.push('Telefonnummer');
        if (!patient.dateOfBirth) missingFields.push('Geburtsdatum');
        if (!patient.allergies || patient.allergies.length === 0) missingFields.push('Allergien');
        if (!patient.preExistingConditions || patient.preExistingConditions.length === 0) {
          missingFields.push('Vorerkrankungen');
        }

        if (missingFields.length > 0) {
          // Finde den primären Arzt
          const recentAppointment = await Appointment.findOne({ patient: patient._id })
            .sort({ startTime: -1 })
            .populate('doctor', '_id')
            .lean();

          if (recentAppointment && recentAppointment.doctor) {
            const doctor = users.find(u => u._id.toString() === recentAppointment.doctor._id.toString());
            if (doctor) {
              const patientName = `${patient.firstName} ${patient.lastName}`;

              await this.sendNotification({
                recipientId: doctor._id,
                subject: `📋 Unvollständige Patientendaten: ${patientName}`,
                message: `Patient ${patientName} hat fehlende Daten:\n\n` +
                         `- ${missingFields.join('\n- ')}\n\n` +
                         `Bitte vervollständigen Sie die Patientendaten beim nächsten Termin.`,
                priority: 'low',
                patientId: patient._id,
                relatedResource: {
                  type: 'Patient',
                  id: patient._id
                },
                notificationType: 'incompletePatientData'
              });
            }
          }
        }
      }
    } catch (error) {
      logger.error('Fehler bei Prüfung auf unvollständige Patientendaten:', error);
    }
  }

  /**
   * Prüft ob ein Benutzer eine bestimmte Benachrichtigung erhalten möchte
   */
  async shouldSendNotification(userId, notificationType) {
    try {
      const user = await User.findById(userId).select('profile.preferences.notificationSettings').lean();
      
      if (!user || !user.profile?.preferences?.notificationSettings) {
        // Wenn keine Einstellungen vorhanden, Standard: aktiviert
        return true;
      }

      const settings = user.profile.preferences.notificationSettings;

      // Master-Switch prüfen
      if (settings.enabled === false) {
        return false;
      }

      // Einzelne Typen prüfen
      const typeMap = {
        'upcomingAppointments': settings.upcomingAppointments,
        'missingVitalSigns': settings.missingVitalSigns,
        'criticalLabResults': settings.criticalLabResults,
        'overdueTasks': settings.overdueTasks,
        'medicationReminders': settings.medicationReminders,
        'followUpAppointments': settings.followUpAppointments,
        'incompletePatientData': settings.incompletePatientData
      };

      return typeMap[notificationType] !== false; // Default: true wenn nicht explizit false
    } catch (error) {
      logger.error(`Fehler beim Prüfen der Benachrichtigungseinstellungen für Benutzer ${userId}:`, error);
      // Bei Fehler: Standard aktiviert (sicherer Fall)
      return true;
    }
  }

  /**
   * Sendet eine intelligente Benachrichtigung
   */
  async sendNotification({ recipientId, subject, message, priority = 'normal', patientId = null, relatedResource = null, notificationType = null }) {
    try {
      // Prüfe Benutzereinstellungen
      if (notificationType) {
        const shouldSend = await this.shouldSendNotification(recipientId, notificationType);
        if (!shouldSend) {
          logger.debug(`Benachrichtigung deaktiviert durch Benutzereinstellungen: ${notificationType} für ${recipientId}`);
          return { success: false, reason: 'disabled_by_user' };
        }
      }

      // Prüfe ob bereits eine ähnliche Benachrichtigung in den letzten 24 Stunden gesendet wurde
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const existingNotification = await InternalMessage.findOne({
        recipientId,
        subject,
        createdAt: { $gte: oneDayAgo }
      });

      if (existingNotification) {
        logger.debug(`Benachrichtigung bereits gesendet: ${subject} an ${recipientId}`);
        return { success: false, reason: 'duplicate' };
      }

      // Finde System-User als Absender
      const systemUser = await User.findOne({ 
        role: { $in: ['admin', 'super_admin'] },
        isActive: true 
      }).select('_id').lean();

      const notification = new InternalMessage({
        senderId: systemUser?._id || null,
        recipientId,
        subject,
        message,
        priority,
        status: 'sent',
        patientId,
        relatedResource
      });

      await notification.save();
      logger.info(`✅ Proaktive Benachrichtigung gesendet: ${subject} an ${recipientId}`);
      
      return { success: true, messageId: notification._id };
    } catch (error) {
      logger.error(`Fehler beim Senden der Benachrichtigung: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SmartNotificationService();
