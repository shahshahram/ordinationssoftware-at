/**
 * Script zum Importieren der ÖGK-Katalog CSV-Datei (neues Format)
 * Format: pos_nr,name,points,pointValue,federalState,billingGroup
 * Setzt automatisch Bundesland 'oberoesterreich' und Versicherung 'OEGK'
 * WICHTIG: basePrice (khoPrice) = points * pointValue (exakt)
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const TariffImporter = require('../utils/tariff-importer');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// MongoDB URI aus Umgebungsvariablen
const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!mongoURI) {
  console.error('Fehler: MONGO_URI oder MONGODB_URI ist nicht in .env definiert');
  process.exit(1);
}

// CSV-Datei-Pfad (kann als Argument übergeben werden)
const csvFilePath = process.argv[2] || path.join(__dirname, '../../ÖGK-Tarifkatalog/oegk_katalog_final.csv');

// Parameter
const FEDERAL_STATE = 'oberoesterreich';
const INSURANCE_PROVIDER = 'oegk';

async function importOEGKKatalog() {
  try {
    console.log('=== ÖGK-Katalog Import (neues Format) ===');
    console.log(`CSV-Datei: ${csvFilePath}`);
    console.log(`Bundesland: ${FEDERAL_STATE}`);
    console.log(`Versicherung: ${INSURANCE_PROVIDER}`);
    console.log('');

    // Prüfe ob Datei existiert
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV-Datei nicht gefunden: ${csvFilePath}`);
    }

    // Verbinde mit MongoDB
    console.log('Verbinde mit MongoDB...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000
    });
    console.log('✓ MongoDB verbunden');
    console.log('');

    // Finde ersten Admin-User für createdBy
    const User = require('../models/User');
    let userId = null;
    try {
      const adminUser = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
      if (adminUser) {
        userId = adminUser._id;
        console.log(`✓ Verwende User: ${adminUser.email || adminUser.username || adminUser._id}`);
      } else {
        const firstUser = await User.findOne().sort({ createdAt: 1 });
        if (firstUser) {
          userId = firstUser._id;
          console.log(`✓ Verwende User: ${firstUser.email || firstUser.username || firstUser._id}`);
        } else {
          userId = new mongoose.Types.ObjectId();
          console.log('⚠ Kein User gefunden, verwende Dummy-ID');
        }
      }
    } catch (userError) {
      console.warn('⚠ Konnte User nicht laden, verwende Dummy-ID');
      userId = new mongoose.Types.ObjectId();
    }
    console.log('');

    // Verwende Importer-Instanz (Singleton)
    const tariffImporter = TariffImporter;

    // Importiere über die API-Methode (unterstützt neues Format)
    console.log('Starte Import über tariff-importer...');
    const result = await tariffImporter.importKHOFromCSV(csvFilePath, userId);
    
    console.log('');
    console.log('=== Import abgeschlossen ===');
    console.log(`✓ Erstellt: ${result.imported}`);
    console.log(`✓ Aktualisiert: ${result.updated}`);
    if (result.errors && result.errors.length > 0) {
      console.log(`⚠ Fehler: ${result.errors.length}`);
      result.errors.slice(0, 10).forEach((error, idx) => {
        const errorMsg = typeof error === 'string' ? error : (error.message || error.error || JSON.stringify(error));
        const errorCode = error.code || 'N/A';
        console.log(`  ${idx + 1}. Code: ${errorCode} - ${errorMsg}`);
      });
      if (result.errors.length > 10) {
        console.log(`  ... und ${result.errors.length - 10} weitere Fehler`);
      }
    }
    console.log('');

    // Schließe Verbindung
    await mongoose.connection.close();
    console.log('✓ MongoDB-Verbindung geschlossen');
    
    return {
      success: true,
      imported: result.imported,
      updated: result.updated,
      errors: result.errors ? result.errors.length : 0,
      total: result.imported + result.updated
    };

  } catch (error) {
    console.error('');
    console.error('=== FEHLER ===');
    console.error(error.message);
    console.error(error.stack);
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    process.exit(1);
  }
}

// Führe Import aus
if (require.main === module) {
  importOEGKKatalog()
    .then((result) => {
      console.log('');
      console.log('=== ERGEBNIS ===');
      console.log(`Gesamt: ${result.total} Datensätze`);
      console.log(`Neu angelegt: ${result.imported}`);
      console.log(`Aktualisiert: ${result.updated}`);
      console.log(`Fehler: ${result.errors}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fataler Fehler:', error);
      process.exit(1);
    });
}

module.exports = importOEGKKatalog;
