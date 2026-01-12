const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const crypto = require('crypto');
const logger = require('./logger');
const AuditLog = require('../models/AuditLog');

const execAsync = promisify(exec);

class BackupService {
  constructor() {
    this.backupPath = process.env.BACKUP_PATH || './backups';
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    this.confirmationTokens = new Map(); // Store confirmation tokens temporarily
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
    }
  }

  // Generate confirmation token for restore
  generateConfirmationToken(backupFileName) {
    const token = crypto.randomBytes(32).toString('hex');
    this.confirmationTokens.set(backupFileName, {
      token,
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes
    });
    return token;
  }

  // Validate confirmation token
  validateConfirmationToken(backupFileName, token) {
    const stored = this.confirmationTokens.get(backupFileName);
    if (!stored) {
      return false;
    }
    if (Date.now() > stored.expiresAt) {
      this.confirmationTokens.delete(backupFileName);
      return false;
    }
    return stored.token === token;
  }

  // Get average backup size
  async getAverageBackupSize() {
    try {
      const backups = this.getBackupList();
      if (backups.length < 2) {
        return null;
      }
      const sizes = backups.map(b => b.size);
      const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
      return avgSize;
    } catch (error) {
      logger.error('Fehler beim Berechnen der durchschnittlichen Backup-Größe:', error);
      return null;
    }
  }

  // Validate backup size
  async validateBackupSize(backupSize) {
    const avgSize = await this.getAverageBackupSize();
    if (!avgSize) {
      return { valid: true, warning: null };
    }
    const threshold = avgSize * 0.8; // 80% of average
    if (backupSize < threshold) {
      return {
        valid: true,
        warning: `⚠️ Ungewöhnlich kleines Backup: ${(backupSize / 1024 / 1024).toFixed(2)}MB (Durchschnitt: ${(avgSize / 1024 / 1024).toFixed(2)}MB)`
      };
    }
    return { valid: true, warning: null };
  }

  // Dry-run restore (shows what would be restored)
  async dryRunRestore(backupFileName) {
    try {
      const backupFilePath = path.join(this.backupPath, backupFileName);
      if (!fs.existsSync(backupFilePath)) {
        throw new Error(`Backup-Datei nicht gefunden: ${backupFileName}`);
      }

      // Use mongorestore with --dryRun flag (if available) or parse archive
      const stats = fs.statSync(backupFilePath);
      const validation = await this.validateBackupSize(stats.size);

      return {
        backupFileName,
        backupSize: stats.size,
        backupSizeMB: (stats.size / 1024 / 1024).toFixed(2),
        validation,
        collections: [] // Would need to parse archive to get actual collections
      };
    } catch (error) {
      logger.error('Dry-Run Fehler:', error);
      throw error;
    }
  }

  async createBackup(userId = null, userEmail = null, userRole = null) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup-${timestamp}.tar.gz`;
      const backupFilePath = path.join(this.backupPath, backupFileName);

      logger.info('Starte Backup-Erstellung...');

      // Create backup using mongodump
      const mongodumpCommand = `mongodump --uri="${process.env.MONGODB_URI}" --archive="${backupFilePath}" --gzip`;
      
      const { stdout, stderr } = await execAsync(mongodumpCommand);
      
      if (stderr && !stderr.includes('writing')) {
        logger.warn('Backup-Warnung:', stderr);
      }

      const stats = fs.statSync(backupFilePath);
      const validation = await this.validateBackupSize(stats.size);

      logger.info(`Backup erfolgreich erstellt: ${backupFilePath} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);

      // Log to audit log if user info provided
      if (userId) {
        try {
          await AuditLog.createLog({
            userId,
            userEmail: userEmail || 'system',
            userRole: userRole || 'system',
            action: 'backup.create',
            resource: 'Backup',
            description: `Backup erstellt: ${backupFileName}`,
            details: {
              backupFileName,
              backupSize: stats.size,
              backupSizeMB: (stats.size / 1024 / 1024).toFixed(2),
              validation
            },
            severity: validation.warning ? 'MEDIUM' : 'LOW',
            success: true
          });
        } catch (auditError) {
          logger.error('Fehler beim Erstellen des Audit-Logs:', auditError);
        }
      }

      // Clean up old backups
      this.cleanupOldBackups();

      return {
        success: true,
        backupFileName,
        backupSize: stats.size,
        backupSizeMB: (stats.size / 1024 / 1024).toFixed(2),
        validation
      };
    } catch (error) {
      logger.error('Backup-Fehler:', error);
      
      // Log error to audit log if user info provided
      if (userId) {
        try {
          await AuditLog.createLog({
            userId,
            userEmail: userEmail || 'system',
            userRole: userRole || 'system',
            action: 'backup.create',
            resource: 'Backup',
            description: `Backup-Erstellung fehlgeschlagen`,
            details: { error: error.message },
            severity: 'HIGH',
            success: false,
            errorMessage: error.message
          });
        } catch (auditError) {
          logger.error('Fehler beim Erstellen des Audit-Logs:', auditError);
        }
      }
      
      throw error;
    }
  }

  cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.backupPath);
      const now = new Date();
      
      files.forEach(file => {
        if (file.startsWith('backup-') && file.endsWith('.tar.gz')) {
          const filePath = path.join(this.backupPath, file);
          const stats = fs.statSync(filePath);
          const fileAge = (now - stats.mtime) / (1000 * 60 * 60 * 24); // days
          
          if (fileAge > this.retentionDays) {
            fs.unlinkSync(filePath);
            logger.info(`Altes Backup gelöscht: ${file}`);
          }
        }
      });
    } catch (error) {
      logger.error('Backup-Cleanup Fehler:', error);
    }
  }

  async requestRestore(backupFileName) {
    try {
      const backupFilePath = path.join(this.backupPath, backupFileName);
      
      if (!fs.existsSync(backupFilePath)) {
        throw new Error(`Backup-Datei nicht gefunden: ${backupFileName}`);
      }

      const dryRun = await this.dryRunRestore(backupFileName);
      const confirmationToken = this.generateConfirmationToken(backupFileName);

      return {
        confirmationToken,
        dryRun,
        message: 'Restore-Anfrage erstellt. Bestätigung erforderlich.'
      };
    } catch (error) {
      logger.error('Restore-Anfrage Fehler:', error);
      throw error;
    }
  }

  async restoreBackup(backupFileName, confirmationToken, userId = null, userEmail = null, userRole = null, ipAddress = null, userAgent = null) {
    try {
      // Validate confirmation token
      if (!this.validateConfirmationToken(backupFileName, confirmationToken)) {
        throw new Error('Ungültiger oder abgelaufener Bestätigungstoken');
      }

      const backupFilePath = path.join(this.backupPath, backupFileName);
      
      if (!fs.existsSync(backupFilePath)) {
        throw new Error(`Backup-Datei nicht gefunden: ${backupFileName}`);
      }

      logger.info(`⚠️ KRITISCH: Starte Backup-Wiederherstellung: ${backupFileName}`);

      // Create backup before restore
      logger.info('Erstelle Backup vor Restore...');
      const preRestoreBackup = await this.createBackup(userId, userEmail, userRole);
      logger.info(`Pre-Restore Backup erstellt: ${preRestoreBackup.backupFileName}`);

      // Execute restore
      const mongorestoreCommand = `mongorestore --uri="${process.env.MONGODB_URI}" --archive="${backupFilePath}" --gzip --drop`;
      
      const { stdout, stderr } = await execAsync(mongorestoreCommand);
      
      if (stderr && !stderr.includes('finished')) {
        logger.warn('Restore-Warnung:', stderr);
      }

      logger.info('✅ Backup erfolgreich wiederhergestellt');

      // Delete confirmation token
      this.confirmationTokens.delete(backupFileName);

      // Log to audit log
      if (userId) {
        try {
          const stats = fs.statSync(backupFilePath);
          await AuditLog.createLog({
            userId,
            userEmail: userEmail || 'system',
            userRole: userRole || 'system',
            action: 'backup.restore',
            resource: 'Backup',
            description: `⚠️ KRITISCH: Backup wiederhergestellt: ${backupFileName}`,
            details: {
              backupFileName,
              backupSize: stats.size,
              backupSizeMB: (stats.size / 1024 / 1024).toFixed(2),
              preRestoreBackup: preRestoreBackup.backupFileName,
              ipAddress,
              userAgent
            },
            severity: 'CRITICAL',
            success: true,
            ipAddress,
            userAgent
          });
        } catch (auditError) {
          logger.error('Fehler beim Erstellen des Audit-Logs:', auditError);
        }
      }

      return {
        success: true,
        message: 'Backup erfolgreich wiederhergestellt',
        preRestoreBackup: preRestoreBackup.backupFileName
      };
    } catch (error) {
      logger.error('Restore-Fehler:', error);
      
      // Log error to audit log
      if (userId) {
        try {
          await AuditLog.createLog({
            userId,
            userEmail: userEmail || 'system',
            userRole: userRole || 'system',
            action: 'backup.restore',
            resource: 'Backup',
            description: `Restore fehlgeschlagen: ${backupFileName}`,
            details: { error: error.message },
            severity: 'CRITICAL',
            success: false,
            errorMessage: error.message,
            ipAddress,
            userAgent
          });
        } catch (auditError) {
          logger.error('Fehler beim Erstellen des Audit-Logs:', auditError);
        }
      }
      
      throw error;
    }
  }

  getBackupList() {
    try {
      const files = fs.readdirSync(this.backupPath);
      return files
        .filter(file => file.startsWith('backup-') && file.endsWith('.tar.gz'))
        .map(file => {
          const filePath = path.join(this.backupPath, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            created: stats.mtime,
            path: filePath
          };
        })
        .sort((a, b) => b.created - a.created);
    } catch (error) {
      logger.error('Backup-Liste Fehler:', error);
      return [];
    }
  }
}

module.exports = new BackupService();
