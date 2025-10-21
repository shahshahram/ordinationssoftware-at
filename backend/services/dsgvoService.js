const User = require('../models/User');
const Patient = require('../models/Patient');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

class DSGVOService {
  /**
   * Export all data for a specific user (Art. 20 - Right to data portability)
   */
  static async exportUserData(userId) {
    try {
      const user = await User.findById(userId).select('-password');
      if (!user) {
        throw new Error('Benutzer nicht gefunden');
      }

      // Get all data related to this user
      const userData = {
        personalData: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          profile: user.profile,
          preferences: user.preferences,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        auditLogs: await AuditLog.find({ userId }).select('-__v').lean(),
        dataProcessingActivities: await this.getDataProcessingActivities(userId)
      };

      // Log the data export
      await AuditLog.createLog({
        userId,
        userEmail: user.email,
        userRole: user.role,
        action: 'DATA_EXPORT',
        description: 'DSGVO-Datenexport durchgeführt',
        severity: 'MEDIUM',
        success: true,
        legalBasis: 'DSGVO Art. 20 - Recht auf Datenübertragbarkeit'
      });

      return userData;
    } catch (error) {
      logger.error('Fehler beim DSGVO-Datenexport:', error);
      throw error;
    }
  }

  /**
   * Anonymize user data (Art. 17 - Right to erasure)
   */
  static async anonymizeUserData(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Benutzer nicht gefunden');
      }

      // Anonymize personal data
      const anonymizedData = {
        email: `anonymized_${Date.now()}@deleted.local`,
        firstName: 'Gelöscht',
        lastName: 'Benutzer',
        profile: {
          ...user.profile,
          phone: null,
          address: null
        },
        isActive: false,
        anonymizedAt: new Date()
      };

      await User.findByIdAndUpdate(userId, anonymizedData);

      // Log the anonymization
      await AuditLog.createLog({
        userId,
        userEmail: user.email,
        userRole: user.role,
        action: 'DATA_DELETION',
        description: 'Benutzerdaten anonymisiert (DSGVO Art. 17)',
        severity: 'HIGH',
        success: true,
        legalBasis: 'DSGVO Art. 17 - Recht auf Löschung'
      });

      return { success: true, message: 'Benutzerdaten erfolgreich anonymisiert' };
    } catch (error) {
      logger.error('Fehler bei der Datenanonymisierung:', error);
      throw error;
    }
  }

  /**
   * Get data processing activities (Art. 30 - Records of processing activities)
   */
  static async getDataProcessingActivities(userId = null) {
    try {
      const activities = [];

      // User management activities
      activities.push({
        category: 'Benutzerverwaltung',
        purpose: 'Authentifizierung und Autorisierung',
        legalBasis: 'DSGVO Art. 6(1)(f) - Berechtigtes Interesse',
        dataTypes: ['E-Mail', 'Name', 'Rolle', 'Login-Daten'],
        retentionPeriod: '10 Jahre',
        recipients: ['Interne Systeme', 'Audit-Logs']
      });

      // Patient data activities
      activities.push({
        category: 'Patientenverwaltung',
        purpose: 'Medizinische Behandlung und Dokumentation',
        legalBasis: 'DSGVO Art. 9(2)(h) - Gesundheitswesen',
        dataTypes: ['Personenbezogene Daten', 'Gesundheitsdaten', 'Medizinische Befunde'],
        retentionPeriod: '30 Jahre (Ärztegesetz)',
        recipients: ['Behandelnde Ärzte', 'ELGA', 'Krankenkassen']
      });

      // Document management activities
      activities.push({
        category: 'Dokumentenverwaltung',
        purpose: 'Medizinische Dokumentation und Kommunikation',
        legalBasis: 'DSGVO Art. 9(2)(h) - Gesundheitswesen',
        dataTypes: ['Rezepte', 'Überweisungen', 'Befunde', 'Arztbriefe'],
        retentionPeriod: '30 Jahre (Ärztegesetz)',
        recipients: ['Behandelnde Ärzte', 'Patienten', 'ELGA']
      });

      // Audit logging activities
      activities.push({
        category: 'Audit-Logging',
        purpose: 'Sicherheit und Compliance',
        legalBasis: 'DSGVO Art. 6(1)(f) - Berechtigtes Interesse',
        dataTypes: ['Zugriffsprotokolle', 'Benutzeraktionen', 'IP-Adressen'],
        retentionPeriod: '10 Jahre',
        recipients: ['Compliance-Team', 'Datenschutzbeauftragter']
      });

      return activities;
    } catch (error) {
      logger.error('Fehler beim Abrufen der Verarbeitungstätigkeiten:', error);
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(startDate, endDate) {
    try {
      const query = {};
      if (startDate) query.timestamp = { ...query.timestamp, $gte: new Date(startDate) };
      if (endDate) query.timestamp = { ...query.timestamp, $lte: new Date(endDate) };

      const auditLogs = await AuditLog.find(query).sort({ timestamp: -1 });
      
      // Group by action type
      const actionStats = {};
      auditLogs.forEach(log => {
        actionStats[log.action] = (actionStats[log.action] || 0) + 1;
      });

      // Group by user
      const userStats = {};
      auditLogs.forEach(log => {
        if (log.userEmail) {
          userStats[log.userEmail] = (userStats[log.userEmail] || 0) + 1;
        }
      });

      // Security incidents
      const securityIncidents = auditLogs.filter(log => 
        log.severity === 'HIGH' || log.severity === 'CRITICAL' || !log.success
      );

      const report = {
        period: {
          startDate: startDate || 'Alle Daten',
          endDate: endDate || 'Aktuell'
        },
        summary: {
          totalLogs: auditLogs.length,
          uniqueUsers: Object.keys(userStats).length,
          securityIncidents: securityIncidents.length,
          actionBreakdown: actionStats
        },
        topUsers: Object.entries(userStats)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([email, count]) => ({ email, count })),
        securityIncidents: securityIncidents.map(log => ({
          timestamp: log.timestamp,
          user: log.userEmail,
          action: log.action,
          severity: log.severity,
          description: log.description,
          ipAddress: log.ipAddress
        })),
        dataProcessingActivities: await this.getDataProcessingActivities(),
        generatedAt: new Date()
      };

      return report;
    } catch (error) {
      logger.error('Fehler beim Generieren des Compliance-Berichts:', error);
      throw error;
    }
  }

  /**
   * Check data retention compliance
   */
  static async checkRetentionCompliance() {
    try {
      const now = new Date();
      const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
      
      // Check for old audit logs that should be deleted
      const oldAuditLogs = await AuditLog.find({
        timestamp: { $lt: tenYearsAgo },
        expiresAt: { $lt: now }
      });

      // Check for users with old passwords
      const usersWithOldPasswords = await User.find({
        'loginSecurity.passwordChangedAt': { $lt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) }
      });

      return {
        oldAuditLogsCount: oldAuditLogs.length,
        usersWithOldPasswordsCount: usersWithOldPasswords.length,
        recommendations: [
          oldAuditLogs.length > 0 ? 'Alte Audit-Logs sollten gelöscht werden' : null,
          usersWithOldPasswords.length > 0 ? 'Benutzer mit alten Passwörtern sollten diese ändern' : null
        ].filter(Boolean)
      };
    } catch (error) {
      logger.error('Fehler bei der Retention-Compliance-Prüfung:', error);
      throw error;
    }
  }
}

module.exports = DSGVOService;
