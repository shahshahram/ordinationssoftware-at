#!/usr/bin/env node
/**
 * Skript zum Prüfen der Update-Historie in der Datenbank
 * Zeigt alle automatischen und manuellen Updates an
 */

const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

// MongoDB-Verbindung
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware';

// Update-Actions die wir suchen
const UPDATE_ACTIONS = [
  'SERVICE_CATALOG_ANNUAL_UPDATE',
  'SERVICE_CATALOG_UPDATE',
  'SERVICE_CATALOG_PRICE_UPDATE',
  'TARIFF_UPDATE',
  'TARIFF_DOWNLOAD',
  'EBM_UPDATE',
  'KHO_UPDATE',
  'GOAE_UPDATE'
];

// Hilfsfunktion: Gibt einen lesbaren Namen für den Update-Typ zurück
const getUpdateTypeName = (action) => {
  const typeMap = {
    'SERVICE_CATALOG_ANNUAL_UPDATE': 'Jährliches Service-Katalog Update',
    'SERVICE_CATALOG_UPDATE': 'Service-Katalog Update',
    'SERVICE_CATALOG_PRICE_UPDATE': 'Preis-Update',
    'TARIFF_UPDATE': 'Tarif-Update',
    'TARIFF_DOWNLOAD': 'Tarif-Download',
    'EBM_UPDATE': 'EBM-Update',
    'KHO_UPDATE': 'KHO-Update',
    'GOAE_UPDATE': 'GOÄ-Update'
  };
  return typeMap[action] || action;
};

// Formatiere Datum
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Formatiere relative Zeit
const formatRelativeTime = (date) => {
  if (!date) return 'N/A';
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  if (hours > 0) return `vor ${hours} Stunde${hours > 1 ? 'n' : ''}`;
  if (minutes > 0) return `vor ${minutes} Minute${minutes > 1 ? 'n' : ''}`;
  return 'gerade eben';
};

async function checkUpdateHistory() {
  try {
    console.log('🔌 Verbinde mit MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Verbunden mit MongoDB\n');

    // Suche nach allen Update-Einträgen
    console.log('🔍 Suche nach Update-Einträgen...\n');
    const updates = await AuditLog.find({
      action: { $in: UPDATE_ACTIONS }
    })
      .sort({ timestamp: -1 })
      .populate('userId', 'firstName lastName email')
      .lean();

    console.log(`📊 Gefundene Update-Einträge: ${updates.length}\n`);

    if (updates.length === 0) {
      console.log('❌ Keine Update-Einträge gefunden.');
      console.log('\n💡 Mögliche Gründe:');
      console.log('   - Es wurden noch keine automatischen Updates ausgeführt');
      console.log('   - Es wurden noch keine manuellen Updates getriggert');
      console.log('   - Die Cron-Jobs laufen nur zu bestimmten Zeiten:');
      console.log('     • Wöchentlich: Montags um 4:00 Uhr');
      console.log('     • Monatlich: 1. des Monats um 5:00 Uhr');
      console.log('     • Jährlich: 1. Januar um 2:00 Uhr\n');
    } else {
      // Gruppiere nach Action-Typ
      const grouped = {};
      updates.forEach(update => {
        if (!grouped[update.action]) {
          grouped[update.action] = [];
        }
        grouped[update.action].push(update);
      });

      // Zeige Zusammenfassung
      console.log('📈 Zusammenfassung nach Update-Typ:\n');
      Object.keys(grouped).sort().forEach(action => {
        const count = grouped[action].length;
        const latest = grouped[action][0];
        const successCount = grouped[action].filter(u => u.success !== false).length;
        const errorCount = count - successCount;
        
        console.log(`  ${getUpdateTypeName(action)}:`);
        console.log(`    • Anzahl: ${count}`);
        console.log(`    • Erfolgreich: ${successCount}`);
        console.log(`    • Fehler: ${errorCount}`);
        console.log(`    • Letzte Ausführung: ${formatDate(latest.timestamp)} (${formatRelativeTime(latest.timestamp)})`);
        console.log('');
      });

      // Zeige Details der letzten 10 Updates
      console.log('📋 Details der letzten 10 Updates:\n');
      updates.slice(0, 10).forEach((update, index) => {
        console.log(`${index + 1}. ${getUpdateTypeName(update.action)}`);
        console.log(`   Zeitpunkt: ${formatDate(update.timestamp)} (${formatRelativeTime(update.timestamp)})`);
        console.log(`   Status: ${update.success !== false ? '✅ Erfolgreich' : '❌ Fehler'}`);
        
        if (update.userId && typeof update.userId === 'object') {
          const userName = `${update.userId.firstName || ''} ${update.userId.lastName || ''}`.trim() || update.userEmail || 'Unbekannt';
          console.log(`   Benutzer: ${userName} (${update.userEmail || 'N/A'})`);
        } else {
          console.log(`   Benutzer: System`);
        }
        
        if (update.description) {
          console.log(`   Beschreibung: ${update.description}`);
        }
        
        if (update.errorMessage) {
          console.log(`   Fehler: ${update.errorMessage}`);
        }
        
        // Extrahiere Details
        let details = {};
        if (update.changes) {
          if (update.changes.details && typeof update.changes.details === 'object') {
            details = update.changes.details;
          } else if (typeof update.changes === 'object') {
            details = update.changes;
          }
        }
        if (Object.keys(details).length === 0 && update.details) {
          if (update.details.details && typeof update.details.details === 'object') {
            details = update.details.details;
          } else if (typeof update.details === 'object') {
            details = update.details;
          }
        }
        
        if (details.newServices || details.newServicesCount) {
          console.log(`   Neue Services: ${details.newServices || details.newServicesCount || 0}`);
        }
        if (details.updatedServices || details.updatedServicesCount) {
          console.log(`   Aktualisierte Services: ${details.updatedServices || details.updatedServicesCount || 0}`);
        }
        if (details.updatedPrices || details.updatedPricesCount) {
          console.log(`   Preis-Updates: ${details.updatedPrices || details.updatedPricesCount || 0}`);
        }
        if (details.deprecatedServices || details.deprecatedServicesCount) {
          console.log(`   Veraltete Services: ${details.deprecatedServices || details.deprecatedServicesCount || 0}`);
        }
        if (details.errors && Array.isArray(details.errors) && details.errors.length > 0) {
          console.log(`   Fehler: ${details.errors.length}`);
          details.errors.slice(0, 3).forEach(err => {
            console.log(`     - ${err}`);
          });
        }
        
        console.log('');
      });

      // Zeige Statistiken
      console.log('📊 Statistiken:\n');
      const totalSuccess = updates.filter(u => u.success !== false).length;
      const totalErrors = updates.length - totalSuccess;
      const oldestUpdate = updates[updates.length - 1];
      const newestUpdate = updates[0];
      
      console.log(`   Gesamt: ${updates.length} Updates`);
      console.log(`   Erfolgreich: ${totalSuccess} (${Math.round(totalSuccess / updates.length * 100)}%)`);
      console.log(`   Fehler: ${totalErrors} (${Math.round(totalErrors / updates.length * 100)}%)`);
      console.log(`   Erster Update: ${formatDate(oldestUpdate.timestamp)}`);
      console.log(`   Letzter Update: ${formatDate(newestUpdate.timestamp)}`);
      console.log('');
    }

    // Prüfe nächste geplante Ausführungen
    console.log('⏰ Nächste geplante Ausführungen:\n');
    const now = new Date();
    
    // Wöchentlich (Montags um 4:00 Uhr)
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(4, 0, 0, 0);
    console.log(`   Wöchentliches Preis-Update: ${formatDate(nextMonday)} (${formatRelativeTime(nextMonday)})`);
    
    // Monatlich (1. des Monats um 5:00 Uhr)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 5, 0, 0);
    console.log(`   Monatliches Tarif-Update: ${formatDate(nextMonth)} (${formatRelativeTime(nextMonth)})`);
    
    // Jährlich (1. Januar um 2:00 Uhr)
    const nextYear = new Date(now.getFullYear() + 1, 0, 1, 2, 0, 0);
    console.log(`   Jährliches Service-Katalog Update: ${formatDate(nextYear)} (${formatRelativeTime(nextYear)})`);
    console.log('');

  } catch (error) {
    console.error('❌ Fehler:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Datenbankverbindung geschlossen');
  }
}

// Skript ausführen
if (require.main === module) {
  checkUpdateHistory()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Kritischer Fehler:', error);
      process.exit(1);
    });
}

module.exports = { checkUpdateHistory };

