#!/usr/bin/env node

/**
 * Importiert ELGA Dokumentenklassen aus CSV-Datei
 * Quelle: ValueSet-elga-dokumentenklassen.1.propcsv.csv
 */

// Lade .env aus verschiedenen möglichen Pfaden
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend/.env')
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    break;
  }
}

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const ElgaValueSet = require('../models/ElgaValueSet');
const logger = require('../utils/logger');

/**
 * Liest CSV und parst Daten
 */
const parseCSV = (csvPath) => {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 4) {
    throw new Error('CSV-Datei zu kurz oder ungültig');
  }
  
  // Zeile 0: Header für Metadaten
  // Zeile 1: Metadaten-Werte (im CSV-Format mit Semikolon als Separator)
  const metaHeader = lines[0].split(';').map(h => h.replace(/"/g, '').trim());
  const metaValues = lines[1].split(';').map(v => v.replace(/^"|"$/g, '').trim());
  
  // Metadaten extrahieren
  const metadata = {};
  metaHeader.forEach((key, index) => {
    if (metaValues[index]) {
      metadata[key] = metaValues[index];
    }
  });
  
  // OID aus identifier extrahieren (Spalte 9 in der CSV)
  if (metadata.identifier) {
    // Prüfe ob identifier eine OID ist
    if (/^\d+\.\d+\.\d+\.\d+(?:\.\d+)*$/.test(metadata.identifier.trim())) {
      metadata.oid = metadata.identifier.trim();
    }
  }
  
  // Fallback: Bekannte OID für Dokumentenklassen
  if (!metadata.oid) {
    metadata.oid = '1.2.40.0.34.10.39';
  }
  
  // Zeile 3: Header für Codes
  // Zeile 4+: Code-Daten
  const codeHeader = lines[3].split(';').map(h => h.replace(/"/g, '').trim());
  const codes = [];
  
  for (let i = 4; i < lines.length; i++) {
    const values = lines[i].split(';').map(v => v.replace(/^"|"$/g, '').trim());
    
    if (values.length < codeHeader.length) continue;
    
    const codeObj = {};
    codeHeader.forEach((key, index) => {
      codeObj[key] = values[index] || '';
    });
    
    // Nur wenn Code vorhanden ist
    if (codeObj.code) {
      codes.push({
        code: codeObj.code,
        system: codeObj.system || 'http://loinc.org',
        display: codeObj.display || '',
        version: codeObj.version || '',
        // Designation extrahieren (kann mehrere geben)
        designation: codeObj.designation ? codeObj.designation.split('|').filter(d => d.trim()).map(d => {
          const parts = d.split('^');
          return {
            language: parts[0] || '',
            value: parts[parts.length - 1] || d,
            use: parts[1] || ''
          };
        }) : [],
        // Hierarchie-Information (parentByConceptOrder)
        parentOrder: codeObj.parentByConceptOrder || '',
        conceptOrder: codeObj.conceptOrder || ''
      });
    }
  }
  
  return {
    metadata,
    codes
  };
};

const main = async () => {
  try {
    await connectDB();
    logger.info('Starte Import von ELGA Dokumentenklassen...');
    
    // CSV-Datei Pfad
    const csvPath = path.join(__dirname, '../../../Downloads/ValueSet-elga-dokumentenklassen.1.propcsv.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV-Datei nicht gefunden: ${csvPath}`);
    }
    
    console.log(`Lese CSV-Datei: ${csvPath}\n`);
    
    // CSV parsen
    const { metadata, codes } = parseCSV(csvPath);
    
    console.log('Metadaten:');
    console.log(`  Title: ${metadata.title || 'ELGA_Dokumentenklassen'}`);
    console.log(`  Version: ${metadata.version || 'unknown'}`);
    console.log(`  OID: ${metadata.identifier || 'unknown'}`);
    console.log(`  URL: ${metadata.url || 'unknown'}`);
    console.log(`  Codes gefunden: ${codes.length}\n`);
    
    // Valueset-Daten vorbereiten
    const title = metadata.title || 'ELGA_Dokumentenklassen';
    const version = metadata.version || 'unknown';
    const oid = metadata.oid || metadata.identifier || '1.2.40.0.34.10.39';
    const url = metadata.url || `https://termgit.elga.gv.at/ValueSet/${metadata.id || 'elga-dokumentenklassen'}`;
    const description = metadata.description || 'ELGA Dokumentenklassen und LOINC-Codes für CDA und XDS-Metadaten';
    
    // Kategorie bestimmen
    const category = 'dokumentenklassen';
    
    // Rohdaten speichern
    const rawData = {
      source: 'CSV-Import',
      csvFile: path.basename(csvPath),
      metadata: metadata,
      codes: codes,
      importedAt: new Date().toISOString()
    };
    
    // Prüfe ob bereits vorhanden
    const existing = await ElgaValueSet.findOne({ 
      $or: [
        { url: url },
        { oid: oid }
      ]
    });
    
    if (existing) {
      console.log('Aktualisiere existierendes Valueset...');
      existing.title = title;
      existing.version = version;
      existing.description = description;
      existing.oid = oid;
      existing.url = url;
      existing.codes = codes.map(c => ({
        code: c.code,
        system: c.system,
        display: c.display,
        version: c.version
      }));
      existing.rawData = rawData;
      existing.category = category;
      existing.lastUpdated = new Date();
      
      await existing.save();
      console.log(`✅ Valueset aktualisiert: ${title} (${version})`);
      console.log(`   OID: ${oid}`);
      console.log(`   Codes: ${codes.length}`);
    } else {
      console.log('Erstelle neues Valueset...');
      await ElgaValueSet.create({
        title: title,
        version: version,
        url: url,
        oid: oid,
        description: description,
        codes: codes.map(c => ({
          code: c.code,
          system: c.system,
          display: c.display,
          version: c.version
        })),
        rawData: rawData,
        category: category,
        sourceUrl: 'https://termgit.elga.gv.at/valuesets.html'
      });
      console.log(`✅ Valueset importiert: ${title} (${version})`);
      console.log(`   OID: ${oid}`);
      console.log(`   Codes: ${codes.length}`);
    }
    
    // Zeige einige Beispiel-Codes
    console.log('\nBeispiel-Codes:');
    codes.slice(0, 5).forEach((code, index) => {
      console.log(`  ${index + 1}. ${code.code} - ${code.display}`);
      if (code.designation && code.designation.length > 0) {
        const deDesignation = code.designation.find(d => d.language === 'de-AT');
        if (deDesignation) {
          console.log(`     DE: ${deDesignation.value}`);
        }
      }
    });
    
    console.log(`\n✅ Import abgeschlossen!`);
    logger.info(`ELGA Dokumentenklassen erfolgreich importiert: ${title} (${version}), ${codes.length} Codes`);
    
    process.exit(0);
  } catch (error) {
    logger.error(`Fehler beim Import: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = { main, parseCSV };

