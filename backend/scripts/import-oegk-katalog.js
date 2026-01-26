/**
 * Script zum Importieren der ÖGK-Katalog CSV-Datei
 * Setzt automatisch Bundesland 'oberoesterreich' und Versicherung 'OEGK'
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const TariffImporter = require('../utils/tariff-importer');

// MongoDB URI aus Umgebungsvariablen
const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!mongoURI) {
  console.error('Fehler: MONGO_URI oder MONGODB_URI ist nicht in .env definiert');
  process.exit(1);
}

// CSV-Datei-Pfad (kann als Argument übergeben werden)
// Standard-Pfade prüfen
const possiblePaths = [
  process.argv[2], // Explizit übergeben
  path.join(__dirname, '../../oegk_katalog_komplett.csv'),
  path.join(__dirname, '../../ÖGK-Tarifkatalog/oegk_katalog_komplett.csv'),
  path.join(__dirname, '../../ÖGK-Tarifkatalog/oegk_tarife_2024.csv')
].filter(Boolean);

let csvFilePath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    csvFilePath = p;
    break;
  }
}

if (!csvFilePath) {
  console.error('Fehler: CSV-Datei nicht gefunden. Bitte Pfad als Argument angeben:');
  console.error('  node import-oegk-katalog.js /pfad/zur/oegk_katalog_komplett.csv');
  process.exit(1);
}

// Parameter
const FEDERAL_STATE = 'oberoesterreich';
const INSURANCE_PROVIDER = 'oegk';
const POINT_VALUE = 0.53; // OÖ Punktwert

async function importOEGKKatalog() {
  try {
    console.log('=== ÖGK-Katalog Import ===');
    console.log(`CSV-Datei: ${csvFilePath}`);
    console.log(`Bundesland: ${FEDERAL_STATE}`);
    console.log(`Versicherung: ${INSURANCE_PROVIDER}`);
    console.log(`Punktwert: ${POINT_VALUE} €`);
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
        // Fallback: Erster User
        const firstUser = await User.findOne().sort({ createdAt: 1 });
        if (firstUser) {
          userId = firstUser._id;
          console.log(`✓ Verwende User: ${firstUser.email || firstUser.username || firstUser._id}`);
        } else {
          // Dummy User ID als letzter Fallback
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

    // Lese CSV und modifiziere Daten
    console.log('Lese CSV-Datei...');
    const csv = require('csv-parser');
    const tariffs = [];
    
    let lineCount = 0;
    await new Promise((resolve, reject) => {
      const stream = fs.createReadStream(csvFilePath)
        .pipe(csv({
          separator: ';', // Semikolon-getrennt
          skipEmptyLines: true,
          skipLinesWithError: true,
          headers: ['pos_nr', 'bezeichnung', 'wert', 'einheit', 'fachgebiet', 'limitierung'] // Explizite Header
        }))
        .on('data', (row) => {
          lineCount++;
          try {
            // ServiceCode aus pos_nr oder code
            const serviceCode = row.pos_nr || row.code || row.POS_NR;
            const khoCode = row.khoCode || row.ebmCode || row.KHO_CODE || serviceCode;
            
            // Überspringe leere oder ungültige Zeilen
            if (!serviceCode || serviceCode.trim() === '' || serviceCode === 'pos_nr') {
              return; // Überspringe Header-Zeile oder leere Zeilen
            }
            
            if (!khoCode && !serviceCode) {
              return; // Überspringe Zeilen ohne Code
            }
            
            // Name/Bezeichnung
            const name = row.name || row.bezeichnung || row.BEZEICHNUNG || row.description || 'Unbenannt';
            
            // Wert ermitteln (kann Punkte oder Preis sein)
            const wert = row.wert || row.WERT || row.price || row.khoPrice;
            let points = null;
            let khoPrice = null;
            let calculatedFromPoints = false;
            
            if (wert) {
              const wertNum = parseFloat(wert);
              
              // Prüfe Einheit - wenn "EUR" oder "Euro", ist es bereits ein Preis
              const einheit = (row.einheit || row.EINHEIT || '').toUpperCase();
              
              if (einheit === 'EUR' || einheit === 'EURO' || einheit === '€') {
                // Direkter Preis in Euro
                khoPrice = wertNum;
              } else {
                // Wahrscheinlich Punkte - berechne Preis
                points = wertNum;
                khoPrice = points * POINT_VALUE;
                calculatedFromPoints = true;
              }
            }
            
            // Falls points explizit vorhanden
            if (row.points) {
              points = parseFloat(row.points);
              if (!khoPrice) {
                khoPrice = points * POINT_VALUE;
                calculatedFromPoints = true;
              }
            }
            
            // Falls Preis explizit vorhanden
            if (row.price || row.khoPrice) {
              khoPrice = parseFloat(row.price || row.khoPrice);
              calculatedFromPoints = false;
            }
            
            // billingGroup ermitteln (kann aus Kategorie oder Limitierung kommen)
            const billingGroup = row.billingGroup || row.billing_group || row.BILLING_GROUP || null;
            
            // Kategorie
            const category = row.category || row.kategorie || row.KATEGORIE || '';
            
            // Fachgebiet normalisieren
            const specialtyRaw = (row.specialty || row.fachgebiet || row.FACHGEBIET || 'allgemein').toLowerCase();
            // Normalisiere Fachgebiete: "allgemein" bleibt, "fachärzte" -> "allgemein" (da es kein spezifisches Fach ist)
            const specialtyMap = {
              'allgemein': 'allgemein',
              'fachärzte': 'allgemein',
              'fachaerzte': 'allgemein',
              'fachärzt': 'allgemein',
              'fachaerzt': 'allgemein'
            };
            const specialty = specialtyMap[specialtyRaw] || 'allgemein';
            
            // Limitierung
            const limitation = row.limitierung || row.LIMITIERUNG || row.limitation || '';
            
            tariffs.push({
              code: serviceCode,
              name: name,
              description: row.description || row.DESCRIPTION || limitation || '',
              tariffType: 'kho',
              kho: {
                khoCode: khoCode,
                ebmCode: row.ebmCode || khoCode, // Legacy
                khoPrice: khoPrice || 0, // Preis in Euro
                price: khoPrice ? Math.round(khoPrice * 100) : null, // Legacy: In Cent
                points: points,
                pointValue: POINT_VALUE, // OÖ Punktwert
                calculatedFromPoints: calculatedFromPoints,
                category: category,
                billingGroup: billingGroup,
                requiresApproval: row.requiresApproval === 'true' || row.requiresApproval === true,
                billingFrequency: row.billingFrequency || 'once',
                insuranceProvider: INSURANCE_PROVIDER, // Explizit auf OEGK gesetzt
                federalState: FEDERAL_STATE // Explizit auf oberoesterreich gesetzt
              },
              specialty: specialty,
              validFrom: row.validFrom ? new Date(row.validFrom) : new Date(),
              validUntil: row.validUntil ? new Date(row.validUntil) : null,
              isActive: row.isActive !== 'false',
              createdBy: userId
            });
          } catch (rowError) {
            console.error(`[Fehler] Zeile übersprungen:`, rowError.message);
          }
        })
        .on('end', () => {
          console.log(`✓ ${lineCount} Zeilen verarbeitet`);
          // Lösche temporäre Datei
          try {
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
            }
          } catch (unlinkError) {
            console.warn('Konnte temporäre Datei nicht löschen:', unlinkError.message);
          }
          resolve();
        })
        .on('error', (error) => {
          // Lösche temporäre Datei auch bei Fehler
          try {
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
            }
          } catch (unlinkError) {
            // Ignoriere Fehler beim Löschen
          }
          reject(error);
        });
    });

    console.log(`✓ ${tariffs.length} Tarife aus CSV gelesen`);
    console.log('');

    if (tariffs.length === 0) {
      throw new Error('Keine Tarife in der CSV-Datei gefunden');
    }

    // Speichere Tarife
    console.log('Speichere Tarife in Datenbank...');
    const results = await tariffImporter.saveTariffs(tariffs);
    
    console.log('');
    console.log('=== Import abgeschlossen ===');
    console.log(`✓ Erstellt: ${results.created}`);
    console.log(`✓ Aktualisiert: ${results.updated}`);
    if (results.errors.length > 0) {
      console.log(`⚠ Fehler: ${results.errors.length}`);
      results.errors.slice(0, 10).forEach((error, idx) => {
        const errorMsg = typeof error === 'string' ? error : (error.message || error.error || JSON.stringify(error));
        const errorCode = error.code || 'N/A';
        console.log(`  ${idx + 1}. Code: ${errorCode} - ${errorMsg}`);
      });
      if (results.errors.length > 10) {
        console.log(`  ... und ${results.errors.length - 10} weitere Fehler`);
      }
    }
    console.log('');

    // Schließe Verbindung
    await mongoose.connection.close();
    console.log('✓ MongoDB-Verbindung geschlossen');
    
    return {
      success: true,
      imported: results.created,
      updated: results.updated,
      errors: results.errors.length,
      total: tariffs.length
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
