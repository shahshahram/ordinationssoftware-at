// Automatischer Tarif-Update-Service
// Prüft regelmäßig auf Updates und lädt neue Tarifdatenbanken herunter

const cron = require('node-cron');
const ogkTariffDownloader = require('./ogkTariffDownloader');
const User = require('../models/User');

class TariffUpdateService {
  constructor() {
    this.isRunning = false;
    this.lastCheck = null;
    this.lastUpdate = null;
  }

  /**
   * Startet automatische Update-Prüfung (monatlich am 1. des Monats um 2:00 Uhr)
   */
  start() {
    // Monatlich am 1. des Monats um 2:00 Uhr
    cron.schedule('0 2 1 * *', async () => {
      await this.checkAndUpdate();
    });
    
    // Optional: Auch wöchentlich prüfen (jeden Montag um 2:00 Uhr)
    cron.schedule('0 2 * * 1', async () => {
      await this.checkForUpdates();
    });
    
    console.log('✅ Tarif-Update-Service gestartet (monatlich am 1., wöchentlich montags)');
  }

  /**
   * Prüft auf Updates und lädt sie herunter wenn verfügbar
   */
  async checkAndUpdate() {
    if (this.isRunning) {
      console.log('⏳ Tarif-Update läuft bereits');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starte Tarif-Update-Prüfung...');

    try {
      // Prüfe auf Updates
      const updateInfo = await ogkTariffDownloader.checkForUpdates();
      
      if (updateInfo.hasUpdate) {
        console.log('📥 Update verfügbar, starte Download...');
        
        // Finde Admin-User für Import
        const adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
          console.warn('⚠️ Kein Admin-User gefunden für Tarif-Import');
          return;
        }

        // Lade alle Tarifdatenbanken herunter und importiere
        const result = await ogkTariffDownloader.downloadAndImportAll(adminUser._id, 'xml');
        
        this.lastUpdate = new Date();
        
        console.log(`✅ Tarif-Update abgeschlossen:`);
        console.log(`   - EBM: ${result.ebm ? 'Erfolgreich' : 'Fehler'}`);
        console.log(`   - KHO: ${result.kho ? 'Erfolgreich' : 'Fehler'}`);
        console.log(`   - GOÄ: ${result.goae ? 'Erfolgreich' : 'Fehler'}`);
        console.log(`   - Fehler: ${result.errors.length}`);
        
        return result;
      } else {
        console.log('ℹ️ Keine Updates verfügbar');
        this.lastCheck = new Date();
        return { hasUpdate: false };
      }
    } catch (error) {
      console.error('❌ Fehler bei Tarif-Update:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Prüft nur auf Updates (ohne Download)
   */
  async checkForUpdates() {
    try {
      const updateInfo = await ogkTariffDownloader.checkForUpdates();
      this.lastCheck = new Date();
      return updateInfo;
    } catch (error) {
      console.error('Fehler bei Update-Prüfung:', error);
      return { hasUpdate: false, error: error.message };
    }
  }

  /**
   * Manuelle Update-Auslösung
   */
  async manualUpdate(userId) {
    return await ogkTariffDownloader.downloadAndImportAll(userId, 'xml');
  }

  /**
   * Status abrufen
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheck: this.lastCheck,
      lastUpdate: this.lastUpdate
    };
  }
}

module.exports = new TariffUpdateService();
























