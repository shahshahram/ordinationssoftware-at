/**
 * Data Retention Service
 * Automatische Löschung von Daten nach Aufbewahrungsfristen gemäß DSGVO und österreichischem Recht
 */

const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const Patient = require('../models/Patient');
const Document = require('../models/Document');
const User = require('../models/User');
const logger = require('../utils/logger');

class DataRetentionService {
  // Aufbewahrungsfristen in Jahren
  static RETENTION_PERIODS = {
    // Medizinische Daten (ArztG § 51)
    MEDICAL_DATA: 30,
    
    // Abrechnungsdaten (UGB § 212)
    BILLING_DATA: 7,
    
    // Audit-Logs (Standard)
    AUDIT_LOGS: 10,
    
    // Benutzerdaten (nach Deaktivierung)
    USER_DATA: 10,
    
    // Anonymisierte Daten (sofort löschbar)
    ANONYMIZED_DATA: 0
  };

  /**
   * Bereinigt abgelaufene Audit-Logs
   */
  static async cleanupAuditLogs() {
    try {
      const now = new Date();
      const tenYearsAgo = new Date(now.getFullYear() - this.RETENTION_PERIODS.AUDIT_LOGS, now.getMonth(), now.getDate());
      
      // Finde abgelaufene Logs
      const expiredLogs = await AuditLog.find({
        $or: [
          { expiresAt: { $lt: now } },
          { 
            timestamp: { $lt: tenYearsAgo },
            expiresAt: { $exists: false }
          }
        ]
      });

      if (expiredLogs.length === 0) {
        logger.info('Keine abgelaufenen Audit-Logs gefunden');
        return { deleted: 0 };
      }

      // Lösche abgelaufene Logs
      const result = await AuditLog.deleteMany({
        _id: { $in: expiredLogs.map(log => log._id) }
      });

      // Logge die Bereinigung
      await AuditLog.create({
        userId: new mongoose.Types.ObjectId(),
        userEmail: 'system@ordinationssoftware.at',
        userRole: 'system',
        action: 'DATA_CLEANUP',
        resource: 'AuditLog',
        description: `${result.deletedCount} abgelaufene Audit-Logs gelöscht`,
        severity: 'MEDIUM',
        success: true,
        legalBasis: 'DSGVO Art. 5(1)(e) - Speicherbegrenzung',
        timestamp: now
      });

      logger.info(`✅ ${result.deletedCount} abgelaufene Audit-Logs gelöscht`);
      return { deleted: result.deletedCount };
    } catch (error) {
      logger.error('Fehler beim Bereinigen von Audit-Logs:', error);
      throw error;
    }
  }

  /**
   * Bereinigt anonymisierte Benutzerdaten
   */
  static async cleanupAnonymizedUsers() {
    try {
      const anonymizedUsers = await User.find({
        email: { $regex: /^anonymized_/ },
        anonymizedAt: { $exists: true }
      });

      if (anonymizedUsers.length === 0) {
        logger.info('Keine anonymisierten Benutzer gefunden');
        return { deleted: 0 };
      }

      // Prüfe ob Aufbewahrungsfrist abgelaufen ist
      const now = new Date();
      const usersToDelete = anonymizedUsers.filter(user => {
        if (!user.anonymizedAt) return false;
        const anonymizedDate = new Date(user.anonymizedAt);
        const retentionDate = new Date(anonymizedDate.getFullYear() + this.RETENTION_PERIODS.USER_DATA, anonymizedDate.getMonth(), anonymizedDate.getDate());
        return now > retentionDate;
      });

      if (usersToDelete.length === 0) {
        logger.info('Keine anonymisierten Benutzer mit abgelaufener Aufbewahrungsfrist gefunden');
        return { deleted: 0 };
      }

      // Lösche anonymisierte Benutzer
      const result = await User.deleteMany({
        _id: { $in: usersToDelete.map(user => user._id) }
      });

      logger.info(`✅ ${result.deletedCount} anonymisierte Benutzer gelöscht`);
      return { deleted: result.deletedCount };
    } catch (error) {
      logger.error('Fehler beim Bereinigen von anonymisierten Benutzern:', error);
      throw error;
    }
  }

  /**
   * Archiviert alte medizinische Daten (30 Jahre)
   * Hinweis: Medizinische Daten werden nicht gelöscht, sondern archiviert
   */
  static async archiveOldMedicalData() {
    try {
      const now = new Date();
      const thirtyYearsAgo = new Date(now.getFullYear() - this.RETENTION_PERIODS.MEDICAL_DATA, now.getMonth(), now.getDate());
      
      // Finde alte Patienten-Daten (die nicht mehr aktiv sind)
      const oldPatients = await Patient.find({
        createdAt: { $lt: thirtyYearsAgo },
        isActive: false,
        archived: { $ne: true }
      });

      if (oldPatients.length === 0) {
        logger.info('Keine alten medizinischen Daten zum Archivieren gefunden');
        return { archived: 0 };
      }

      // Markiere als archiviert
      const result = await Patient.updateMany(
        { _id: { $in: oldPatients.map(p => p._id) } },
        { 
          $set: { 
            archived: true,
            archivedAt: now
          }
        }
      );

      logger.info(`✅ ${result.modifiedCount} Patienten-Datensätze archiviert`);
      return { archived: result.modifiedCount };
    } catch (error) {
      logger.error('Fehler beim Archivieren von medizinischen Daten:', error);
      throw error;
    }
  }

  /**
   * Bereinigt alte Abrechnungsdaten (7 Jahre)
   */
  static async cleanupOldBillingData() {
    try {
      const now = new Date();
      const sevenYearsAgo = new Date(now.getFullYear() - this.RETENTION_PERIODS.BILLING_DATA, now.getMonth(), now.getDate());
      
      // Finde alte Abrechnungsdaten
      // Hinweis: Dies muss an das tatsächliche Billing-Model angepasst werden
      logger.info('Billing-Daten-Bereinigung: Implementierung hängt vom Billing-Model ab');
      
      return { deleted: 0, note: 'Billing-Model muss implementiert werden' };
    } catch (error) {
      logger.error('Fehler beim Bereinigen von Abrechnungsdaten:', error);
      throw error;
    }
  }

  /**
   * Führt alle Bereinigungsaufgaben aus
   */
  static async runCleanup() {
    try {
      logger.info('🧹 Starte Datenbereinigung...');
      
      const results = {
        auditLogs: await this.cleanupAuditLogs(),
        anonymizedUsers: await this.cleanupAnonymizedUsers(),
        medicalData: await this.archiveOldMedicalData(),
        billingData: await this.cleanupOldBillingData()
      };

      const totalDeleted = 
        results.auditLogs.deleted + 
        results.anonymizedUsers.deleted;

      logger.info(`✅ Datenbereinigung abgeschlossen: ${totalDeleted} Datensätze gelöscht`);
      
      return {
        success: true,
        timestamp: new Date(),
        results
      };
    } catch (error) {
      logger.error('Fehler bei der Datenbereinigung:', error);
      throw error;
    }
  }

  /**
   * Prüft Compliance mit Aufbewahrungsfristen
   */
  static async checkCompliance() {
    try {
      const now = new Date();
      const issues = [];

      // Prüfe Audit-Logs
      const tenYearsAgo = new Date(now.getFullYear() - this.RETENTION_PERIODS.AUDIT_LOGS, now.getMonth(), now.getDate());
      const oldAuditLogs = await AuditLog.countDocuments({
        timestamp: { $lt: tenYearsAgo },
        expiresAt: { $exists: false }
      });
      
      if (oldAuditLogs > 0) {
        issues.push({
          type: 'AUDIT_LOGS',
          severity: 'MEDIUM',
          message: `${oldAuditLogs} Audit-Logs älter als ${this.RETENTION_PERIODS.AUDIT_LOGS} Jahre`,
          recommendation: 'Bereinigung durchführen'
        });
      }

      // Prüfe anonymisierte Benutzer
      const anonymizedUsers = await User.countDocuments({
        email: { $regex: /^anonymized_/ },
        anonymizedAt: { $exists: true }
      });

      if (anonymizedUsers > 0) {
        issues.push({
          type: 'ANONYMIZED_USERS',
          severity: 'LOW',
          message: `${anonymizedUsers} anonymisierte Benutzer gefunden`,
          recommendation: 'Prüfen ob Aufbewahrungsfrist abgelaufen'
        });
      }

      return {
        compliant: issues.length === 0,
        issues,
        checkedAt: now
      };
    } catch (error) {
      logger.error('Fehler bei der Compliance-Prüfung:', error);
      throw error;
    }
  }
}

module.exports = DataRetentionService;








