#!/usr/bin/env node

/**
 * Aktualisiert ELGA Dokumentenklassen Valueset mit Hierarchie-Informationen aus XML
 * Quelle: ValueSet-elga-dokumentenklassen.1.svsextelga.xml
 */

// Lade .env aus verschiedenen möglichen Pfaden
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

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
 * Parst XML-Datei und extrahiert Concepts mit Hierarchie-Informationen
 */
const parseXML = (xmlPath) => {
  const content = fs.readFileSync(xmlPath, 'utf8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: true,
    trimValues: true
  });
  
  const json = parser.parse(content);
  const valueSet = json.valueSet;
  
  if (!valueSet || !valueSet.conceptList || !valueSet.conceptList.concept) {
    throw new Error('Ungültige XML-Struktur: conceptList nicht gefunden');
  }
  
  // Konvertiere zu Array falls nur ein Element
  const concepts = Array.isArray(valueSet.conceptList.concept) 
    ? valueSet.conceptList.concept 
    : [valueSet.conceptList.concept];
  
  // Extrahiere Metadaten
  const metadata = {
    title: valueSet['@_displayName'] || valueSet['@_name'] || 'ELGA_Dokumentenklassen',
    version: valueSet['@_version'] || 'unknown',
    oid: valueSet['@_id'] || '1.2.40.0.34.10.39',
    url: valueSet['@_website'] || 'https://termgit.elga.gv.at/ValueSet/elga-dokumentenklassen',
    description: valueSet['@_description'] || valueSet['@_beschreibung'] || '',
    descriptionDe: valueSet['@_beschreibung'] || valueSet['@_description'] || '',
    effectiveDate: valueSet['@_effectiveDate'],
    lastChangeDate: valueSet['@_last_change_date'],
    statusCode: valueSet['@_statusCode']
  };
  
  // Verarbeite Concepts und erstelle Hierarchie-Map
  const conceptsByCode = new Map();
  const level0Codes = []; // ClassCodes (level 0)
  
  concepts.forEach(concept => {
    const code = concept['@_code'];
    const level = parseInt(concept['@_level'] || '0');
    const orderNumber = parseInt(concept['@_orderNumber'] || '0');
    
    conceptsByCode.set(code, {
      code,
      system: concept['@_codeSystem'] || '2.16.840.1.113883.6.1', // LOINC
      display: concept['@_displayName'] || '',
      version: concept['@_codeSystem'] || '2.16.840.1.113883.6.1',
      level,
      orderNumber,
      type: concept['@_type'] || '',
      deutsch: concept['@_deutsch'] || '',
      hinweise: concept['@_hinweise'] || '',
      concept_beschreibung: concept['@_concept_beschreibung'] || '',
      parentCode: null // Wird später gesetzt
    });
    
    if (level === 0) {
      level0Codes.push(code);
    }
  });
  
  // Erstelle Hierarchie: Finde Parent für level 1 Codes
  // Ein level 1 Code gehört zu dem letzten level 0 Code, der vor ihm in orderNumber kommt
  // Sortiere alle Concepts nach orderNumber für korrekte Parent-Zuordnung
  const sortedConcepts = Array.from(conceptsByCode.values())
    .sort((a, b) => a.orderNumber - b.orderNumber);
  
  let currentParent = null;
  
  sortedConcepts.forEach(concept => {
    // Wenn level 0, wird dieser zum neuen Parent
    if (concept.level === 0) {
      currentParent = concept.code;
    }
    // Wenn level 1, weise dem aktuellen Parent zu
    else if (concept.level === 1 && currentParent) {
      concept.parentCode = currentParent;
    }
  });
  
  return {
    metadata,
    concepts: Array.from(conceptsByCode.values()).sort((a, b) => a.orderNumber - b.orderNumber)
  };
};

const main = async () => {
  try {
    await connectDB();
    logger.info('Starte Update von ELGA Dokumentenklassen mit Hierarchie-Informationen...');
    
    // XML-Datei Pfad
    const xmlPath = path.join(__dirname, '../../../Downloads/ValueSet-elga-dokumentenklassen.1.svsextelga.xml');
    
    if (!fs.existsSync(xmlPath)) {
      throw new Error(`XML-Datei nicht gefunden: ${xmlPath}`);
    }
    
    console.log(`Lese XML-Datei: ${xmlPath}\n`);
    
    // XML parsen
    const { metadata, concepts } = parseXML(xmlPath);
    
    console.log('Metadaten aus XML:');
    console.log(`  Title: ${metadata.title}`);
    console.log(`  Version: ${metadata.version}`);
    console.log(`  OID: ${metadata.oid}`);
    console.log(`  Codes gefunden: ${concepts.length}\n`);
    
    // Finde existierendes Valueset
    const existing = await ElgaValueSet.findOne({ 
      $or: [
        { url: { $regex: 'dokumentenklassen', $options: 'i' } },
        { oid: metadata.oid },
        { title: { $regex: 'dokumentenklassen', $options: 'i' } },
        { category: 'dokumentenklassen' }
      ]
    });
    
    if (!existing) {
      throw new Error('ELGA Dokumentenklassen Valueset nicht in Datenbank gefunden. Bitte zuerst CSV-Import ausführen.');
    }
    
    console.log(`Gefundenes Valueset: ${existing.title} (${existing.version})`);
    console.log(`Aktuelle Codes: ${existing.codes.length}`);
    console.log(`Neue Codes mit Hierarchie: ${concepts.length}\n`);
    
    // Erstelle Code-Map für schnelle Suche
    const existingCodesMap = new Map();
    existing.codes.forEach(code => {
      existingCodesMap.set(code.code, code);
    });
    
    // Aktualisiere Codes mit Hierarchie-Informationen
    const updatedCodes = concepts.map(concept => {
      const existingCode = existingCodesMap.get(concept.code);
      
      // Behalte vorhandene Daten, füge Hierarchie hinzu
      return {
        code: concept.code,
        system: concept.system || existingCode?.system || '2.16.840.1.113883.6.1',
        display: concept.display || existingCode?.display || concept.deutsch || '',
        version: concept.version || existingCode?.version,
        level: concept.level,
        orderNumber: concept.orderNumber,
        parentCode: concept.parentCode,
        type: concept.type,
        deutsch: concept.deutsch,
        hinweise: concept.hinweise,
        concept_beschreibung: concept.concept_beschreibung
      };
    });
    
    // Statistiken
    const classCodes = updatedCodes.filter(c => c.level === 0).length;
    const typeCodes = updatedCodes.filter(c => c.level === 1).length;
    const withParent = updatedCodes.filter(c => c.parentCode).length;
    
    console.log('Hierarchie-Statistik:');
    console.log(`  ClassCodes (level 0): ${classCodes}`);
    console.log(`  TypeCodes (level 1): ${typeCodes}`);
    console.log(`  Mit Parent-Beziehung: ${withParent}\n`);
    
    // Aktualisiere Valueset
    existing.codes = updatedCodes;
    existing.version = metadata.version || existing.version;
    existing.description = metadata.description || existing.description;
    existing.descriptionDe = metadata.descriptionDe || existing.descriptionDe;
    existing.oid = metadata.oid || existing.oid;
    existing.lastUpdated = new Date();
    
    // Erweitere rawData
    if (!existing.rawData) {
      existing.rawData = {};
    }
    existing.rawData.xmlSource = {
      file: path.basename(xmlPath),
      importedAt: new Date().toISOString(),
      metadata: metadata,
      hierarchy: {
        classCodes: classCodes,
        typeCodes: typeCodes,
        totalRelationships: withParent
      }
    };
    
    await existing.save();
    
    console.log('✅ Valueset aktualisiert mit Hierarchie-Informationen!');
    console.log(`   Title: ${existing.title}`);
    console.log(`   Version: ${existing.version}`);
    console.log(`   OID: ${existing.oid}`);
    console.log(`   Total Codes: ${updatedCodes.length}`);
    console.log(`   ClassCodes: ${classCodes}`);
    console.log(`   TypeCodes: ${typeCodes}\n`);
    
    // Zeige Beispiel-Hierarchie
    console.log('Beispiel-Hierarchie:');
    const exampleClassCode = updatedCodes.find(c => c.level === 0);
    if (exampleClassCode) {
      console.log(`  ClassCode: ${exampleClassCode.code} - ${exampleClassCode.display || exampleClassCode.deutsch}`);
      const relatedTypeCodes = updatedCodes.filter(c => c.parentCode === exampleClassCode.code);
      if (relatedTypeCodes.length > 0) {
        console.log(`    TypeCodes (${relatedTypeCodes.length}):`);
        relatedTypeCodes.slice(0, 3).forEach(tc => {
          console.log(`      - ${tc.code} - ${tc.display || tc.deutsch}`);
        });
        if (relatedTypeCodes.length > 3) {
          console.log(`      ... und ${relatedTypeCodes.length - 3} weitere`);
        }
      }
    }
    
    console.log(`\n✅ Update abgeschlossen!`);
    logger.info(`ELGA Dokumentenklassen erfolgreich aktualisiert: ${existing.title} (${existing.version}), ${updatedCodes.length} Codes mit Hierarchie`);
    
    process.exit(0);
  } catch (error) {
    logger.error(`Fehler beim Update: ${error.message}`);
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = { parseXML };

