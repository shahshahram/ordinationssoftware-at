/**
 * Data Breach Detection and Notification Service
 * Erkennung und Meldung von Datenpannen gemäß DSGVO Art. 33, 34
 */

const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const nodemailer = require('nodemailer');

class DataBreachService {
  // Schwellenwerte für Datenpannen-Erkennung
  static THRESHOLDS = {
    // Anzahl fehlgeschlagener Login-Versuche
    FAILED_LOGIN_ATTEMPTS: 5,
    
    // Anzahl unberechtigter Zugriffe
    UNAUTHORIZED_ACCESS_ATTEMPTS: 3,
    
    // Zeitfenster für Erkennung (in Minuten)
    DETECTION_WINDOW: 15,
    
    // Kritische Aktionen
    CRITICAL_ACTIONS: [
      'PATIENT_DELETED',
      'DATA_EXPORT',
      'DATA_DELETION',
      'BULK_DELETE',
      'PERMISSION_GRANTED',
      'ROLE_CHANGED'
    ]
  };

  /**
   * Erkennt potenzielle Datenpannen
   */
  static async detectDataBreaches(startDate = null, endDate = null) {
    try {
      const now = new Date();
      const windowStart = startDate || new Date(now.getTime() - this.THRESHOLDS.DETECTION_WINDOW * 60 * 1000);
      const windowEnd = endDate || now;

      const breaches = [];

      // 1. Prüfe auf multiple fehlgeschlagene Login-Versuche
      const failedLogins = await AuditLog.aggregate([
        {
          $match: {
            action: 'LOGIN_FAILED',
            timestamp: { $gte: windowStart, $lte: windowEnd },
            success: false
          }
        },
        {
          $group: {
            _id: '$ipAddress',
            count: { $sum: 1 },
            attempts: { $push: '$$ROOT' }
          }
        },
        {
          $match: {
            count: { $gte: this.THRESHOLDS.FAILED_LOGIN_ATTEMPTS }
          }
        }
      ]);

      if (failedLogins.length > 0) {
        breaches.push({
          type: 'BRUTE_FORCE_ATTACK',
          severity: 'HIGH',
          description: 'Mehrfache fehlgeschlagene Login-Versuche von derselben IP',
          detectedAt: now,
          details: failedLogins,
          recommendation: 'IP-Adresse blockieren, Benutzer benachrichtigen'
        });
      }

      // 2. Prüfe auf unberechtigte Zugriffe
      const unauthorizedAccess = await AuditLog.aggregate([
        {
          $match: {
            action: 'authorization',
            timestamp: { $gte: windowStart, $lte: windowEnd },
            success: false,
            severity: { $in: ['HIGH', 'CRITICAL'] }
          }
        },
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 },
            attempts: { $push: '$$ROOT' }
          }
        },
        {
          $match: {
            count: { $gte: this.THRESHOLDS.UNAUTHORIZED_ACCESS_ATTEMPTS }
          }
        }
      ]);

      if (unauthorizedAccess.length > 0) {
        breaches.push({
          type: 'UNAUTHORIZED_ACCESS',
          severity: 'CRITICAL',
          description: 'Mehrfache unberechtigte Zugriffsversuche',
          detectedAt: now,
          details: unauthorizedAccess,
          recommendation: 'Benutzerkonto überprüfen, ggf. sperren'
        });
      }

      // 3. Prüfe auf kritische Aktionen außerhalb der normalen Arbeitszeiten
      const criticalActions = await AuditLog.find({
        action: { $in: this.THRESHOLDS.CRITICAL_ACTIONS },
        timestamp: { $gte: windowStart, $lte: windowEnd },
        $or: [
          // Außerhalb 6-22 Uhr
          { $expr: { $lt: [{ $hour: '$timestamp' }, 6] } },
          { $expr: { $gte: [{ $hour: '$timestamp' }, 22] } }
        ]
      });

      if (criticalActions.length > 0) {
        breaches.push({
          type: 'SUSPICIOUS_ACTIVITY',
          severity: 'MEDIUM',
          description: 'Kritische Aktionen außerhalb der normalen Arbeitszeiten',
          detectedAt: now,
          details: criticalActions,
          recommendation: 'Aktivität überprüfen'
        });
      }

      // 4. Prüfe auf ungewöhnliche Datenexporte
      const dataExports = await AuditLog.find({
        action: 'DATA_EXPORT',
        timestamp: { $gte: windowStart, $lte: windowEnd }
      });

      if (dataExports.length > 3) {
        breaches.push({
          type: 'EXCESSIVE_DATA_EXPORT',
          severity: 'HIGH',
          description: 'Ungewöhnlich viele Datenexporte in kurzer Zeit',
          detectedAt: now,
          details: dataExports,
          recommendation: 'Exporte überprüfen, ggf. einschränken'
        });
      }

      // 5. Prüfe auf Löschungen großer Datenmengen
      const bulkDeletes = await AuditLog.find({
        action: { $in: ['PATIENT_DELETED', 'BULK_DELETE', 'DATA_DELETION'] },
        timestamp: { $gte: windowStart, $lte: windowEnd }
      });

      if (bulkDeletes.length > 5) {
        breaches.push({
          type: 'BULK_DELETION',
          severity: 'CRITICAL',
          description: 'Ungewöhnlich viele Löschungen in kurzer Zeit',
          detectedAt: now,
          details: bulkDeletes,
          recommendation: 'Sofortige Überprüfung erforderlich'
        });
      }

      return {
        detected: breaches.length > 0,
        breaches,
        checkedAt: now,
        window: { start: windowStart, end: windowEnd }
      };
    } catch (error) {
      logger.error('Fehler bei der Datenpannen-Erkennung:', error);
      throw error;
    }
  }

  /**
   * Meldet eine Datenpanne an die Aufsichtsbehörde (DSGVO Art. 33)
   */
  static async reportToAuthority(breach) {
    try {
      // Erstelle Meldung
      const report = {
        breachId: new mongoose.Types.ObjectId(),
        type: breach.type,
        severity: breach.severity,
        description: breach.description,
        detectedAt: breach.detectedAt,
        affectedDataSubjects: breach.affectedDataSubjects || [],
        measuresTaken: breach.measuresTaken || [],
        reportedAt: new Date(),
        authority: process.env.DATA_PROTECTION_AUTHORITY || 'Austrian Data Protection Authority',
        status: 'PENDING'
      };

      // Logge die Meldung
      await AuditLog.create({
        userId: new mongoose.Types.ObjectId(),
        userEmail: 'system@ordinationssoftware.at',
        userRole: 'system',
        action: 'DATA_BREACH_REPORTED',
        resource: 'DataBreach',
        resourceId: report.breachId,
        description: `Datenpanne gemeldet: ${breach.type}`,
        severity: 'CRITICAL',
        success: true,
        legalBasis: 'DSGVO Art. 33 - Meldepflicht bei Datenpannen',
        details: report,
        timestamp: new Date()
      });

      // Sende E-Mail an Datenschutzbeauftragten
      await this.notifyDataProtectionOfficer(report);

      logger.info(`✅ Datenpanne gemeldet: ${breach.type}`);
      return report;
    } catch (error) {
      logger.error('Fehler bei der Meldung der Datenpanne:', error);
      throw error;
    }
  }

  /**
   * Benachrichtigt betroffene Personen (DSGVO Art. 34)
   */
  static async notifyAffectedPersons(breach, affectedUserIds) {
    try {
      const User = require('../models/User');
      const users = await User.find({ _id: { $in: affectedUserIds } });

      for (const user of users) {
        // Sende E-Mail-Benachrichtigung
        await this.sendBreachNotificationEmail(user, breach);

        // Logge die Benachrichtigung
        await AuditLog.create({
          userId: user._id,
          userEmail: user.email,
          userRole: user.role,
          action: 'DATA_BREACH_NOTIFICATION',
          resource: 'DataBreach',
          description: `Datenpanne-Benachrichtigung gesendet`,
          severity: 'HIGH',
          success: true,
          legalBasis: 'DSGVO Art. 34 - Benachrichtigung betroffener Personen',
          timestamp: new Date()
        });
      }

      logger.info(`✅ ${users.length} betroffene Personen benachrichtigt`);
    } catch (error) {
      logger.error('Fehler bei der Benachrichtigung betroffener Personen:', error);
      throw error;
    }
  }

  /**
   * Sendet E-Mail-Benachrichtigung an Datenschutzbeauftragten
   */
  static async notifyDataProtectionOfficer(report) {
    try {
      const dpoEmail = process.env.DATA_PROTECTION_OFFICER_EMAIL || 'dpo@ordinationssoftware.at';
      
      // E-Mail-Transporter konfigurieren (vereinfacht)
      // In Produktion sollte hier der tatsächliche E-Mail-Service verwendet werden
      logger.info(`📧 Datenpanne-Meldung würde an ${dpoEmail} gesendet werden`);
      logger.info(`Meldung: ${JSON.stringify(report, null, 2)}`);
      
      // TODO: Implementiere tatsächlichen E-Mail-Versand
    } catch (error) {
      logger.error('Fehler beim Senden der E-Mail an Datenschutzbeauftragten:', error);
    }
  }

  /**
   * Sendet E-Mail-Benachrichtigung an betroffene Person
   */
  static async sendBreachNotificationEmail(user, breach) {
    try {
      logger.info(`📧 Datenpanne-Benachrichtigung würde an ${user.email} gesendet werden`);
      logger.info(`Typ: ${breach.type}, Schweregrad: ${breach.severity}`);
      
      // TODO: Implementiere tatsächlichen E-Mail-Versand mit DSGVO-konformer Nachricht
    } catch (error) {
      logger.error('Fehler beim Senden der E-Mail-Benachrichtigung:', error);
    }
  }

  /**
   * Führt kontinuierliche Überwachung durch
   */
  static async startMonitoring() {
    try {
      logger.info('🔍 Starte Datenpannen-Überwachung...');
      
      // Führe Erkennung durch
      const detection = await this.detectDataBreaches();
      
      if (detection.detected) {
        logger.warn(`⚠️ ${detection.breaches.length} potenzielle Datenpannen erkannt`);
        
        for (const breach of detection.breaches) {
          // Bei kritischen Pannen: Sofort melden
          if (breach.severity === 'CRITICAL') {
            await this.reportToAuthority(breach);
          }
          
          // Logge die erkannte Panne
          await AuditLog.create({
            userId: new mongoose.Types.ObjectId(),
            userEmail: 'system@ordinationssoftware.at',
            userRole: 'system',
            action: 'DATA_BREACH_DETECTED',
            resource: 'DataBreach',
            description: `Datenpanne erkannt: ${breach.type}`,
            severity: breach.severity,
            success: true,
            legalBasis: 'DSGVO Art. 33 - Meldepflicht bei Datenpannen',
            details: breach,
            timestamp: new Date()
          });
        }
      } else {
        logger.info('✅ Keine Datenpannen erkannt');
      }
      
      return detection;
    } catch (error) {
      logger.error('Fehler bei der Datenpannen-Überwachung:', error);
      throw error;
    }
  }
}

module.exports = DataBreachService;








