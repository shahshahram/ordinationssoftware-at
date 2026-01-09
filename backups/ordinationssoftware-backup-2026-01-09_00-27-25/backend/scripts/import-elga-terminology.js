#!/usr/bin/env node

/**
 * ELGA Terminology Import Script
 * 
 * Importiert Valuesets und CodeSystems von:
 * - https://termgit.elga.gv.at/valuesets.html
 * - https://termgit.elga.gv.at/codesystems.html
 * 
 * WICHTIG: Daten werden unverändert übernommen - keine Modifikation!
 */

// Lade .env aus verschiedenen möglichen Pfaden
const path = require('path');
const dotenv = require('dotenv');

// Versuche verschiedene Pfade
const envPaths = [
  path.join(__dirname, '../../.env'),           // Root
  path.join(__dirname, '../.env'),             // Backend
  path.join(process.cwd(), '.env'),            // Aktuelles Verzeichnis
  path.join(process.cwd(), 'backend/.env')      // Backend relativ
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    break;
  }
}
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');

// Lade Models erst nach DB-Verbindung
let ElgaValueSet, ElgaCodeSystem, logger, connectDB;

// Initialisiere Logger und DB-Verbindung
const initialize = async () => {
  // Logger laden
  logger = require('../utils/logger');
  
  // DB-Verbindung laden
  connectDB = require('../config/db');
  
  // Warte auf DB-Verbindung
  await connectDB();
  
  // Models erst nach erfolgreicher Verbindung laden
  ElgaValueSet = require('../models/ElgaValueSet');
  ElgaCodeSystem = require('../models/ElgaCodeSystem');
  
  // Sicherstellen dass Verbindung bereit ist
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB-Verbindung nicht bereit');
  }
};

// Statistics
const stats = {
  valuesets: { total: 0, imported: 0, updated: 0, errors: 0 },
  codesystems: { total: 0, imported: 0, updated: 0, errors: 0 }
};

/**
 * Extrahiert Daten aus HTML-Tabelle
 */
const parseTableRow = ($, row, baseUrl) => {
  const cells = $(row).find('td');
  if (cells.length < 3) return null;

  const titleCell = $(cells[0]);
  const link = titleCell.find('a');
  
  if (link.length === 0) return null;

  const title = titleCell.text().trim();
  if (!title) return null;
  
  const detailUrl = link.attr('href');
  if (!detailUrl) return null;
  
  const fullUrl = detailUrl.startsWith('http') ? detailUrl : `${baseUrl}${detailUrl}`;
  
  // Version extrahieren (z.B. "2.0.0" oder "1.2.0+20240820")
  const versionText = titleCell.text().match(/(\d+\.\d+\.\d+(?:\+\d{8})?)/);
  const version = versionText ? versionText[1] : 'unknown';
  
  // URL und OID aus zweiter Spalte
  const urlOidCell = $(cells[1]);
  let urlText = '';
  if (urlOidCell.find('a').length > 0) {
    const href = urlOidCell.find('a').attr('href');
    urlText = href || urlOidCell.text().trim();
  } else {
    urlText = urlOidCell.text().trim();
  }
  
  if (!urlText) urlText = fullUrl; // Fallback
  
  // OID extrahieren (letzte Zahl in URL oder separater OID)
  let oid = 'unknown';
  const oidMatch = urlText.match(/(\d+\.\d+\.\d+\.\d+(?:\.\d+)*)/);
  if (oidMatch) {
    oid = oidMatch[1];
  } else {
    const parts = urlText.split('/');
    if (parts.length > 0) {
      const lastPart = parts[parts.length - 1];
      const oidInPart = lastPart.match(/(\d+\.\d+\.\d+\.\d+(?:\.\d+)*)/);
      if (oidInPart) {
        oid = oidInPart[1];
      } else {
        oid = lastPart || 'unknown';
      }
    }
  }

  const description = cells.length > 2 ? $(cells[2]).text().trim() : '';

  // Sicherstellen, dass title nicht leer ist nach Bereinigung
  const cleanedTitle = title.replace(/\s*\(\d+\.\d+\.\d+(?:\+\d{8})?\)\s*$/, '').trim();
  if (!cleanedTitle) return null;

  return {
    title: cleanedTitle,
    version,
    detailUrl: fullUrl,
    url: urlText,
    oid: oid || 'unknown',
    description: description || ''
  };
};

/**
 * Lädt Detail-Seite eines Valuesets/CodeSystems
 */
const fetchDetailPage = async (url) => {
  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ELGA-Terminology-Importer/1.0)'
      }
    });
    return response.data;
  } catch (error) {
    logger.warn(`Fehler beim Laden von ${url}: ${error.message}`);
    return null;
  }
};

/**
 * Extrahiert Codes aus Detail-Seite (HTML oder JSON)
 */
const extractCodesFromDetail = async (html, isCodeSystem = false) => {
  const codes = [];
  
  try {
    // Versuche FHIR JSON zu finden
    const jsonMatch = html.match(/<script[^>]*>[\s\S]*?"resourceType"\s*:\s*"(ValueSet|CodeSystem)"[\s\S]*?<\/script>/);
    if (jsonMatch) {
      // JSON im Script-Tag extrahieren
      const jsonStr = jsonMatch[0].replace(/<script[^>]*>|<\/script>/g, '').trim();
      try {
        const resource = JSON.parse(jsonStr);
        if (isCodeSystem && resource.resourceType === 'CodeSystem' && resource.concept) {
          resource.concept.forEach(concept => {
            codes.push({
              code: concept.code,
              display: concept.display,
              definition: concept.definition,
              designation: concept.designation || []
            });
          });
        } else if (!isCodeSystem && resource.resourceType === 'ValueSet' && resource.compose) {
          // ValueSet: Codes aus includes extrahieren
          if (resource.compose.include) {
            resource.compose.include.forEach(include => {
              if (include.concept) {
                include.concept.forEach(concept => {
                  codes.push({
                    code: concept.code,
                    system: include.system,
                    display: concept.display,
                    version: include.version
                  });
                });
              }
            });
          }
        }
      } catch (e) {
        logger.debug(`JSON-Parsing fehlgeschlagen: ${e.message}`);
      }
    }
    
    // Fallback: HTML-Tabelle parsen
    const $ = cheerio.load(html);
    const table = $('table');
    if (table.length > 0) {
      table.find('tr').each((i, row) => {
        if (i === 0) return; // Header überspringen
        const cells = $(row).find('td');
        if (cells.length >= 2) {
          const code = $(cells[0]).text().trim();
          const display = $(cells[1]).text().trim();
          if (code) {
            codes.push({
              code: code,
              display: display || '',
              system: $(cells[2]).text().trim() || ''
            });
          }
        }
      });
    }
  } catch (error) {
    logger.debug(`Fehler beim Extrahieren der Codes: ${error.message}`);
  }
  
  return codes;
};

/**
 * Erweiterte Kategorisierung basierend auf Titel, OID und Beschreibung
 * Erstellt dynamisch Kategorien statt alles in "other" zu werfen
 */
const determineCategory = (title, oid, description) => {
  // Null/undefined Checks
  if (!title) return 'other';
  
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const titleUpper = (title || '').toUpperCase();
  const oidStr = (oid || '').toString();
  
  // Basis-Kategorien (CDA-spezifisch)
  if (titleLower.includes('classcode') || descLower.includes('classcode')) {
    return 'classcode';
  }
  if (titleLower.includes('typecode') || descLower.includes('typecode')) {
    return 'typecode';
  }
  if (titleLower.includes('formatcode') || descLower.includes('formatcode')) {
    return 'formatcode';
  }
  
  // HL7 v3 Standards
  if (titleLower.includes('v3-') || titleLower.startsWith('entitycode') ||
      titleLower.startsWith('participationtype') || titleLower.startsWith('routeofadministration') ||
      titleLower.startsWith('targetawareness') || oidStr.startsWith('2.16.840.1.113883.5.')) {
    return 'hl7-v3';
  }
  
  // Digital Green Certificate (COVID-Zertifikate)
  if (titleLower.startsWith('dgc_') || titleUpper.startsWith('DGC_') ||
      titleLower.includes('digital green certificate') || titleLower.includes('covid') ||
      oidStr.includes('1.2.40.0.34.6.0.10.54') || oidStr.includes('1.2.40.0.34.6.0.10.56') ||
      oidStr.includes('1.2.40.0.34.6.0.10.58') || oidStr.includes('1.2.40.0.34.6.0.10.60')) {
    return 'dgc';
  }
  
  // e-Impfpass
  if (titleLower.startsWith('eimpf_') || titleUpper.startsWith('EIMPF_') ||
      titleLower.includes('e-impfpass') || titleLower.includes('impfpass') ||
      oidStr.includes('1.2.40.0.34.6.0.10.80')) {
    return 'eimpf';
  }
  
  // ELGA-spezifisch
  if (titleLower.startsWith('elga_') || titleUpper.startsWith('ELGA_') ||
      oidStr.startsWith('1.2.40.0.34.10.') || oidStr.startsWith('1.2.40.0.34.5.')) {
    // ELGA Medikation
    if (titleLower.includes('medikation') || titleLower.includes('medication')) {
      return 'elga-medikation';
    }
    // ELGA Audit
    if (titleLower.includes('audit') || titleLower.includes('roleid')) {
      return 'elga-audit';
    }
    // ELGA Problemkatalog
    if (titleLower.includes('problem') || titleLower.includes('katalog')) {
      return 'elga-problem';
    }
    // ELGA Sections
    if (titleLower.includes('section') || oidStr.includes('1.2.40.0.34.5.40')) {
      return 'elga-sections';
    }
    // ELGA Fachärzte
    if (titleLower.includes('fachaerzte') || titleLower.includes('facharzt') ||
        oidStr.includes('1.2.40.0.34.5.160')) {
      return 'elga-fachaerzte';
    }
    // Generic ELGA
    return 'elga';
  }
  
  // APPC (Anatomie/Prozeduren)
  if (titleLower.startsWith('appc_') || titleUpper.startsWith('APPC_') ||
      titleLower.includes('anatomie') || titleLower.includes('anatomie') ||
      oidStr.includes('1.2.40.0.34.10.65')) {
    return 'appc';
  }
  
  // Diätologie
  if (titleLower.startsWith('diaetologie') || titleLower.includes('diaetologie') ||
      titleLower.includes('ernaehrungsproblem') || titleLower.includes('nutrition') ||
      oidStr.includes('1.2.40.0.34.6.0.10.101')) {
    return 'diaetologie';
  }
  
  // Seltene Krankheiten
  if (titleLower.includes('orphanet') || titleLower.includes('rare disease') ||
      titleLower.includes('seltene krankheit') || titleLower.includes('snomed_rare')) {
    return 'rare-diseases';
  }
  
  // Zeit/Einheiten
  if (titleLower.includes('zeiteinheit') || titleLower.includes('time unit') ||
      titleLower.includes('ucum') || titleLower === 'zeiteinheiten') {
    return 'units-time';
  }
  
  // LOINC
  if (titleLower.includes('loinc') || oidStr.startsWith('2.16.840.1.113883.6.1')) {
    return 'loinc';
  }
  
  // SNOMED CT
  if (titleLower.includes('snomed') || oidStr.startsWith('2.16.840.1.113883.6.96')) {
    return 'snomed-ct';
  }
  
  // ICD-10
  if (titleLower.includes('icd-10') || titleLower.includes('icd10') ||
      oidStr.includes('1.2.40.0.34.5.171')) {
    return 'icd-10';
  }
  
  // Labor
  if (titleLower.includes('labor') || titleLower.includes('laboratory') ||
      descLower.includes('labor') || descLower.includes('lab')) {
    return 'labor';
  }
  
  // Medikation (allgemein)
  if (titleLower.includes('medikation') || titleLower.includes('medication') ||
      titleLower.includes('arznei') || titleLower.includes('drug')) {
    return 'medication';
  }
  
  // Befund
  if (titleLower.includes('befund') || titleLower.includes('finding') ||
      titleLower.includes('result') || titleLower.includes('diagnostic')) {
    return 'befund';
  }
  
  // Prozedur
  if (titleLower.includes('prozedur') || titleLower.includes('procedure') ||
      titleLower.includes('intervention')) {
    return 'prozedur';
  }
  
  // Diagnose
  if (titleLower.includes('diagnose') || titleLower.includes('diagnosis') ||
      titleLower.includes('disease') || titleLower.includes('condition')) {
    return 'diagnose';
  }
  
  // Organisation/Institution
  if (titleLower.includes('organisation') || titleLower.includes('organization') ||
      titleLower.includes('institution') || titleLower.includes('facility')) {
    return 'organisation';
  }
  
  // Person/Rolle
  if (titleLower.includes('role') || titleLower.includes('rolle') ||
      titleLower.includes('person') || titleLower.includes('participant')) {
    return 'rolle';
  }
  
  // 1450 Telefondienst
  if (titleLower.includes('1450') || titleLower.includes('bpos') ||
      oidStr.includes('1.2.40.0.34.6.0.10.101')) {
    return '1450-service';
  }
  
  // Wenn keine passende Kategorie gefunden, erstelle eine basierend auf Präfix
  // Extrahiere Präfix aus Titel (z.B. "ELGA_AuditRoleID" -> "elga-audit")
  const prefixMatch = title.match(/^([A-Z_]+)/);
  if (prefixMatch) {
    const prefix = prefixMatch[1].toLowerCase().replace(/_/g, '-');
    // Vermeide zu generische Präfixe
    if (prefix.length > 3 && !['the', 'and', 'for'].includes(prefix)) {
      return prefix;
    }
  }
  
  // Letzter Fallback: Erstelle Kategorie aus ersten Wörtern des Titels
  const words = titleLower.split(/[\s_-]+/).slice(0, 2).join('-');
  if (words.length > 3) {
    return words;
  }
  
  // Absoluter Fallback
  return 'other';
};

/**
 * Importiert Valuesets
 */
const importValueSets = async () => {
  logger.info('Starte Import von ELGA Valuesets...');
  
  try {
    const url = 'https://termgit.elga.gv.at/valuesets.html';
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ELGA-Terminology-Importer/1.0)'
      }
    });
    
    const $ = cheerio.load(response.data);
    const table = $('table');
    const rows = table.find('tbody tr');
    
    stats.valuesets.total = rows.length;
    logger.info(`Gefunden: ${stats.valuesets.total} Valuesets`);
    console.log(`\n📊 Importiere ${stats.valuesets.total} Valuesets...\n`);
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const data = parseTableRow($, row, 'https://termgit.elga.gv.at/');
      
      // Progress anzeigen
      const progress = ((i + 1) / rows.length * 100).toFixed(1);
      process.stdout.write(`\r${'='.repeat(Math.floor((i + 1) / rows.length * 30))}${' '.repeat(30 - Math.floor((i + 1) / rows.length * 30))} ${progress}% (${i + 1}/${rows.length})`);
      
      if (!data) {
        stats.valuesets.errors++;
        continue;
      }
      
      try {
        // Detail-Seite laden
        const detailHtml = await fetchDetailPage(data.detailUrl);
        const codes = detailHtml ? await extractCodesFromDetail(detailHtml, false) : [];
        
        // Kategorie bestimmen
        const category = determineCategory(data.title, data.oid, data.description);
        
        // Rohdaten speichern (unverändert)
        const rawData = {
          html: detailHtml || '',
          tableData: data,
          codes: codes
        };
        
        // In DB speichern oder aktualisieren
        const existing = await ElgaValueSet.findOne({ url: data.url });
        
        if (existing) {
          existing.title = data.title;
          existing.version = data.version;
          existing.description = data.description;
          existing.oid = data.oid;
          existing.codes = codes;
          existing.rawData = rawData;
          existing.lastUpdated = new Date();
          existing.category = category;
          await existing.save();
          stats.valuesets.updated++;
          logger.debug(`Aktualisiert: ${data.title} (${data.version})`);
        } else {
          await ElgaValueSet.create({
            title: data.title,
            version: data.version,
            url: data.url,
            oid: data.oid,
            description: data.description,
            codes: codes,
            rawData: rawData,
            category: category,
            sourceUrl: url
          });
          stats.valuesets.imported++;
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        stats.valuesets.errors++;
        logger.error(`Fehler bei ${data.title}: ${error.message}`);
      }
    }
    
    console.log(`\n\n✅ Valuesets Import abgeschlossen: ${stats.valuesets.imported} neu, ${stats.valuesets.updated} aktualisiert, ${stats.valuesets.errors} Fehler`);
    logger.info(`Valuesets Import abgeschlossen: ${stats.valuesets.imported} neu, ${stats.valuesets.updated} aktualisiert, ${stats.valuesets.errors} Fehler`);
  } catch (error) {
    logger.error(`Fehler beim Valueset-Import: ${error.message}`);
    throw error;
  }
};

/**
 * Importiert CodeSystems
 */
const importCodeSystems = async () => {
  logger.info('Starte Import von ELGA CodeSystems...');
  
  try {
    const url = 'https://termgit.elga.gv.at/codesystems.html';
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ELGA-Terminology-Importer/1.0)'
      }
    });
    
    const $ = cheerio.load(response.data);
    const table = $('table');
    const rows = table.find('tbody tr');
    
    stats.codesystems.total = rows.length;
    logger.info(`Gefunden: ${stats.codesystems.total} CodeSystems`);
    console.log(`\n📊 Importiere ${stats.codesystems.total} CodeSystems...\n`);
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const data = parseTableRow($, row, 'https://termgit.elga.gv.at/');
      
      // Progress anzeigen
      const progress = ((i + 1) / rows.length * 100).toFixed(1);
      process.stdout.write(`\r${'='.repeat(Math.floor((i + 1) / rows.length * 30))}${' '.repeat(30 - Math.floor((i + 1) / rows.length * 30))} ${progress}% (${i + 1}/${rows.length})`);
      
      if (!data) {
        stats.codesystems.errors++;
        continue;
      }
      
      try {
        // Detail-Seite laden
        const detailHtml = await fetchDetailPage(data.detailUrl);
        const concepts = detailHtml ? await extractCodesFromDetail(detailHtml, true) : [];
        
        // Kategorie bestimmen
        const category = determineCategory(data.title, data.oid, data.description);
        
        // Rohdaten speichern (unverändert)
        const rawData = {
          html: detailHtml || '',
          tableData: data,
          concepts: concepts
        };
        
        // In DB speichern oder aktualisieren
        const existing = await ElgaCodeSystem.findOne({ url: data.url });
        
        if (existing) {
          existing.title = data.title;
          existing.version = data.version;
          existing.description = data.description;
          existing.oid = data.oid;
          existing.concepts = concepts;
          existing.rawData = rawData;
          existing.lastUpdated = new Date();
          existing.category = category;
          await existing.save();
          stats.codesystems.updated++;
          logger.debug(`Aktualisiert: ${data.title} (${data.version})`);
        } else {
          await ElgaCodeSystem.create({
            title: data.title,
            version: data.version,
            url: data.url,
            oid: data.oid,
            description: data.description,
            concepts: concepts,
            rawData: rawData,
            category: category,
            sourceUrl: url
          });
          stats.codesystems.imported++;
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        stats.codesystems.errors++;
        logger.error(`Fehler bei ${data.title}: ${error.message}`);
      }
    }
    
    console.log(`\n\n✅ CodeSystems Import abgeschlossen: ${stats.codesystems.imported} neu, ${stats.codesystems.updated} aktualisiert, ${stats.codesystems.errors} Fehler`);
    logger.info(`CodeSystems Import abgeschlossen: ${stats.codesystems.imported} neu, ${stats.codesystems.updated} aktualisiert, ${stats.codesystems.errors} Fehler`);
  } catch (error) {
    logger.error(`Fehler beim CodeSystem-Import: ${error.message}`);
    throw error;
  }
};

/**
 * Hauptfunktion
 */
const main = async () => {
  try {
    // Initialisiere DB-Verbindung und Models
    await initialize();
    logger.info('Datenbankverbindung hergestellt und Models geladen');
    
    // Importiere Valuesets
    await importValueSets();
    
    // Importiere CodeSystems
    await importCodeSystems();
    
    // Statistik ausgeben
    console.log('\n=== Import Statistik ===');
    console.log('Valuesets:');
    console.log(`  Total gefunden: ${stats.valuesets.total}`);
    console.log(`  Neu importiert: ${stats.valuesets.imported}`);
    console.log(`  Aktualisiert: ${stats.valuesets.updated}`);
    console.log(`  Fehler: ${stats.valuesets.errors}`);
    console.log('\nCodeSystems:');
    console.log(`  Total gefunden: ${stats.codesystems.total}`);
    console.log(`  Neu importiert: ${stats.codesystems.imported}`);
    console.log(`  Aktualisiert: ${stats.codesystems.updated}`);
    console.log(`  Fehler: ${stats.codesystems.errors}`);
    
    logger.info('Import abgeschlossen');
    process.exit(0);
  } catch (error) {
    logger.error(`Fehler beim Import: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

// Script ausführen
if (require.main === module) {
  main();
}

module.exports = { importValueSets, importCodeSystems };

