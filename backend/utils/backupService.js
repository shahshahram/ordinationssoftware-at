const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const logger = require('./logger');

class BackupService {
  constructor() {
    this.backupPath = process.env.BACKUP_PATH || './backups';
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
    }
  }

  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup-${timestamp}.tar.gz`;
      const backupFilePath = path.join(this.backupPath, backupFileName);

      logger.info('Starte Backup-Erstellung...');

      // Create backup using mongodump
      const mongodumpCommand = `mongodump --uri="${process.env.MONGODB_URI}" --archive="${backupFilePath}" --gzip`;
      
      exec(mongodumpCommand, (error, stdout, stderr) => {
        if (error) {
          logger.error('Backup-Fehler:', error);
          return;
        }
        
        if (stderr) {
          logger.warn('Backup-Warnung:', stderr);
        }

        logger.info(`Backup erfolgreich erstellt: ${backupFilePath}`);
        
        // Clean up old backups
        this.cleanupOldBackups();
      });

    } catch (error) {
      logger.error('Backup-Service Fehler:', error);
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

  async restoreBackup(backupFileName) {
    try {
      const backupFilePath = path.join(this.backupPath, backupFileName);
      
      if (!fs.existsSync(backupFilePath)) {
        throw new Error(`Backup-Datei nicht gefunden: ${backupFileName}`);
      }

      logger.info(`Starte Backup-Wiederherstellung: ${backupFileName}`);

      const mongorestoreCommand = `mongorestore --uri="${process.env.MONGODB_URI}" --archive="${backupFilePath}" --gzip`;
      
      exec(mongorestoreCommand, (error, stdout, stderr) => {
        if (error) {
          logger.error('Restore-Fehler:', error);
          throw error;
        }
        
        if (stderr) {
          logger.warn('Restore-Warnung:', stderr);
        }

        logger.info('Backup erfolgreich wiederhergestellt');
      });

    } catch (error) {
      logger.error('Backup-Restore Fehler:', error);
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
