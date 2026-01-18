// Import-Script für SIT-Testdaten
// Importiert Versicherte und Vertragspartner aus CSV-Dateien oder JSON-Dateien

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Models
const PatientExtended = require('../models/PatientExtended');
const StaffProfile = require('../models/StaffProfile');
const Location = require('../models/Location');

// CSV-Parser (einfache Version)
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(';').map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';').map(v => v.trim());
    if (values.length === 0 || values.every(v => !v)) continue;
    
    const row = {};
    headers.forEach((header, index) => {
      if (values[index] !== undefined) {
        row[header] = values[index];
      }
    });
    data.push(row);
  }
  
  return data;
}

// Datum-Konvertierung (MM/DD/YY oder DD.MM.YYYY zu Date)
function parseDate(dateString) {
  if (!dateString) return null;
  
  // Format: MM/DD/YY oder DD.MM.YYYY
  if (dateString.includes('/')) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0]) - 1;
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      // Annahme: 2-stellige Jahre < 50 sind 20xx, sonst 19xx
      const fullYear = year < 50 ? 2000 + year : 1900 + year;
      return new Date(fullYear, month, day);
    }
  }
  
  return null;
}

// Importiert Versicherte aus JSON (multi_Principal_ASWH_MRSA Format)
async function importVersicherteFromJSON(jsonPath) {
  console.log(`\n📥 Importiere Versicherte aus JSON: ${jsonPath}`);
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Datei nicht gefunden: ${jsonPath}`);
    return { imported: 0, errors: [] };
  }
  
  const jsonContent = fs.readFileSync(jsonPath, 'utf8');
  const patients = JSON.parse(jsonContent);
  
  if (!Array.isArray(patients)) {
    console.error('❌ JSON-Datei enthält kein Array');
    return { imported: 0, errors: [] };
  }
  
  let imported = 0;
  const errors = [];
  
  for (const patientData of patients) {
    try {
      // Parse Geburtsdatum (Format: "1990-02-28T00:00:00,000+01:00")
      let birthdate = null;
      if (patientData.birthdate) {
        // Entferne Zeitzone und Millisekunden für einfacheres Parsing
        const dateStr = patientData.birthdate.split('T')[0];
        birthdate = new Date(dateStr);
        if (isNaN(birthdate.getTime())) {
          console.warn(`⚠️  Geburtsdatum konnte nicht geparst werden für ${patientData.vorname} ${patientData.familienname}`);
          continue;
        }
      }
      
      // Parse Geschlecht
      let gender = 'unbekannt';
      if (patientData.geschlecht) {
        const g = patientData.geschlecht.toLowerCase();
        if (g.includes('männlich') || g.includes('male')) gender = 'männlich';
        else if (g.includes('weiblich') || g.includes('female')) gender = 'weiblich';
      }
      
      // Erstelle oder aktualisiere Patient
      const patient = await PatientExtended.findOneAndUpdate(
        { socialSecurityNumber: patientData.sozialversicherungsnummer },
        {
          firstName: patientData.vorname,
          lastName: patientData.familienname,
          dateOfBirth: birthdate,
          gender: gender,
          socialSecurityNumber: patientData.sozialversicherungsnummer,
          insurance: {
            insuranceNumber: patientData.sozialversicherungsnummer,
            insuranceProvider: 'ÖGK',
            billingOffice: null
          },
          // Markiere als Testdaten
          metadata: {
            isTestData: true,
            testSource: 'SIT-Plattform',
            testDataVersion: '20251219',
            simuid: patientData.name // SIMUID1, SIMUID2, etc.
          }
        },
        { upsert: true, new: true }
      );
      
      imported++;
      console.log(`  ✅ ${patientData.vorname} ${patientData.familienname} (${patientData.sozialversicherungsnummer}) - ${patientData.name}`);
      
    } catch (error) {
      errors.push({ patient: patientData.name, error: error.message });
      console.error(`  ❌ Fehler bei ${patientData.name}: ${error.message}`);
    }
  }
  
  return { imported, errors };
}

// Importiert Versicherte aus Stammdaten-CSV
async function importVersicherte(csvPath) {
  console.log(`\n📥 Importiere Versicherte aus CSV: ${csvPath}`);
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Datei nicht gefunden: ${csvPath}`);
    return { imported: 0, errors: [] };
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(csvContent);
  
  let imported = 0;
  const errors = [];
  
  for (const row of rows) {
    try {
      // Überspringe leere Zeilen
      if (!row.Personenname || !row.Vorname) continue;
      
      // Parse Geburtsdatum
      const birthdate = parseDate(row.Geburtsdatum);
      if (!birthdate) {
        console.warn(`⚠️  Geburtsdatum konnte nicht geparst werden für ${row.Vorname} ${row.Personenname}`);
        continue;
      }
      
      // Parse Geschlecht
      let gender = 'unbekannt';
      if (row.Geschlecht) {
        const g = row.Geschlecht.toLowerCase();
        if (g.includes('männlich') || g.includes('male')) gender = 'männlich';
        else if (g.includes('weiblich') || g.includes('female')) gender = 'weiblich';
      }
      
      // Erstelle oder aktualisiere Patient
      const patient = await PatientExtended.findOneAndUpdate(
        { socialSecurityNumber: row.Versicherungsnummer },
        {
          firstName: row.Vorname,
          lastName: row.Personenname,
          dateOfBirth: birthdate,
          gender: gender,
          socialSecurityNumber: row.Versicherungsnummer,
          address: {
            street: row.Straße || '',
            houseNumber: row.Hausnummer || '',
            postalCode: row.PLZ || '',
            city: row.Ort || '',
            country: 'Österreich'
          },
          insurance: {
            insuranceNumber: row.Versicherungsnummer,
            insuranceProvider: 'ÖGK',
            billingOffice: row.Abrechnungsstelle || null
          },
          // Markiere als Testdaten
          metadata: {
            isTestData: true,
            testSource: 'SIT-Plattform',
            testDataVersion: '20251219'
          }
        },
        { upsert: true, new: true }
      );
      
      imported++;
      console.log(`  ✅ ${row.Vorname} ${row.Personenname} (${row.Versicherungsnummer})`);
      
    } catch (error) {
      errors.push({ row: row.Personenname, error: error.message });
      console.error(`  ❌ Fehler bei ${row.Personenname}: ${error.message}`);
    }
  }
  
  return { imported, errors };
}

// Importiert Vertragspartner aus CSV
async function importVertragspartner(csvPath) {
  console.log(`\n📥 Importiere Vertragspartner aus: ${csvPath}`);
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Datei nicht gefunden: ${csvPath}`);
    return { imported: 0, errors: [] };
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(csvContent);
  
  let imported = 0;
  const errors = [];
  const processedNames = new Set();
  
  for (const row of rows) {
    try {
      // Überspringe leere Zeilen
      if (!row.Personenname || !row.Vorname) continue;
      
      const fullName = `${row.Vorname} ${row.Personenname}`;
      
      // Verarbeite nur einmal pro Person (erste Zeile mit Adresse)
      if (processedNames.has(fullName) && !row.PLZ) continue;
      
      if (row.PLZ) {
        processedNames.add(fullName);
      }
      
      // Bestimme Typ (Arzt, Zahnarzt, Nichtärztlich)
      let staffType = 'arzt';
      let specialization = null;
      
      if (row.Klassifizerung) {
        if (row.Klassifizerung.includes('Zahn')) {
          staffType = 'zahnarzt';
        } else if (row.Klassifizerung.includes('NÄ') || row.Klassifizerung.includes('Nicht')) {
          staffType = 'nichtaerztlich';
        }
      }
      
      if (row.Fachgebiet) {
        // Extrahiere Fachgebiet (z.B. "001 - Allgemein-/Allgemein- und Familienmedizin")
        const parts = row.Fachgebiet.split(' - ');
        if (parts.length > 1) {
          specialization = parts[1].trim();
        }
      }
      
      // Finde oder erstelle Standort
      let location = null;
      if (row.PLZ && row.Ort) {
        location = await Location.findOneAndUpdate(
          { 
            'address.postalCode': row.PLZ,
            'address.city': row.Ort
          },
          {
            name: `${row.Ort} (${row.PLZ})`,
            address: {
              street: row.Straße || '',
              houseNumber: row.Hausnummer || '',
              postalCode: row.PLZ,
              city: row.Ort,
              country: 'Österreich'
            }
          },
          { upsert: true, new: true }
        );
      }
      
      // Erstelle oder aktualisiere Staff Profile
      const staffProfile = await StaffProfile.findOneAndUpdate(
        { 
          firstName: row.Vorname,
          lastName: row.Personenname
        },
        {
          firstName: row.Vorname,
          lastName: row.Personenname,
          title: row.Anrede || '',
          staffType: staffType,
          specialization: specialization,
          chamberNumber: row.Vertragspartnernr || null,
          address: row.PLZ ? {
            street: row.Straße || '',
            houseNumber: row.Hausnummer || '',
            postalCode: row.PLZ || '',
            city: row.Ort || '',
            country: 'Österreich'
          } : undefined,
          locationId: location?._id,
          // Markiere als Testdaten
          metadata: {
            isTestData: true,
            testSource: 'SIT-Plattform',
            testDataVersion: '20250617'
          }
        },
        { upsert: true, new: true }
      );
      
      if (row.PLZ) {
        imported++;
        console.log(`  ✅ ${fullName} (${staffType})`);
      }
      
    } catch (error) {
      errors.push({ row: row.Personenname, error: error.message });
      console.error(`  ❌ Fehler bei ${row.Personenname}: ${error.message}`);
    }
  }
  
  return { imported, errors };
}

// Hauptfunktion
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  // MongoDB verbinden
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware';
  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB verbunden');
  
  try {
    if (command === 'versicherte') {
      let filePath = args[1] || path.join(__dirname, '../../Downloads/Stammdaten_ASWH_MRSA_20251219.csv');
      
      // Entferne Tilde am Ende (Shell-Problem)
      filePath = filePath.replace(/~$/, '');
      
      // Prüfe ob JSON oder CSV
      if (filePath.endsWith('.json')) {
        const result = await importVersicherteFromJSON(filePath);
        console.log(`\n✨ Import abgeschlossen: ${result.imported} Versicherte importiert`);
        if (result.errors.length > 0) {
          console.log(`⚠️  ${result.errors.length} Fehler aufgetreten`);
        }
      } else {
        const result = await importVersicherte(filePath);
        console.log(`\n✨ Import abgeschlossen: ${result.imported} Versicherte importiert`);
        if (result.errors.length > 0) {
          console.log(`⚠️  ${result.errors.length} Fehler aufgetreten`);
        }
      }
    } else if (command === 'versicherte-json') {
      // Spezieller Befehl für JSON-Import
      let jsonPath = args[1] || path.join(__dirname, '../../Downloads/multi_Principal_ASWH_MRSA_20251219.json');
      
      // Entferne Tilde am Ende (Shell-Problem)
      jsonPath = jsonPath.replace(/~$/, '');
      
      const result = await importVersicherteFromJSON(jsonPath);
      console.log(`\n✨ Import abgeschlossen: ${result.imported} Versicherte importiert`);
      if (result.errors.length > 0) {
        console.log(`⚠️  ${result.errors.length} Fehler aufgetreten`);
      }
    } else if (command === 'vertragspartner') {
      const csvPath = args[1];
      if (!csvPath) {
        console.error('❌ Bitte geben Sie den Pfad zur CSV-Datei an');
        process.exit(1);
      }
      const result = await importVertragspartner(csvPath);
      console.log(`\n✨ Import abgeschlossen: ${result.imported} Vertragspartner importiert`);
      if (result.errors.length > 0) {
        console.log(`⚠️  ${result.errors.length} Fehler aufgetreten`);
      }
    } else if (command === 'all') {
      // Importiere alle
      const basePath = args[1] || path.join(__dirname, '../../Downloads');
      
      // Versicherte
      const versichertePath = path.join(basePath, 'Stammdaten_ASWH_MRSA_20251219.csv');
      await importVersicherte(versichertePath);
      
      // Vertragspartner
      const vpDir = path.join(basePath, 'ASWH_Vertragspartner_20250617');
      if (fs.existsSync(vpDir)) {
        const csvFiles = fs.readdirSync(vpDir).filter(f => f.endsWith('.csv'));
        for (const file of csvFiles) {
          await importVertragspartner(path.join(vpDir, file));
        }
      }
      
      console.log('\n✨ Alle Testdaten importiert');
    } else {
      console.log(`
Verwendung:
  node import-sit-testdata.js versicherte [pfad-zur-csv-oder-json]
  node import-sit-testdata.js versicherte-json [pfad-zur-json]
  node import-sit-testdata.js vertragspartner [pfad-zur-csv]
  node import-sit-testdata.js all [basis-pfad]

Beispiele:
  node import-sit-testdata.js versicherte
  node import-sit-testdata.js versicherte-json ~/Downloads/multi_Principal_ASWH_MRSA_20251219.json
  node import-sit-testdata.js versicherte ~/Downloads/multi_Principal_ASWH_MRSA_20251219.json
  node import-sit-testdata.js vertragspartner ~/Downloads/ASWH_Vertragspartner_20250617/ASWH-VP-Arzt-Linz-A-Tabelle\ 1.csv
  node import-sit-testdata.js all ~/Downloads
      `);
    }
  } finally {
    await mongoose.disconnect();
    console.log('✅ MongoDB-Verbindung geschlossen');
  }
}

// Ausführen
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { importVersicherte, importVertragspartner };
