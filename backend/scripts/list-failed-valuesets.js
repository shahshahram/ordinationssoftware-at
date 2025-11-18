#!/usr/bin/env node

/**
 * Listet alle nicht erfolgreich importierten Valuesets auf
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
const fs = require('fs');
const connectDB = require('../config/db');
const ElgaValueSet = require('../models/ElgaValueSet');
const logger = require('../utils/logger');

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
  
  // Version extrahieren
  const versionText = titleCell.text().match(/(\d+\.\d+\.\d+(?:\+\d{8})?)/);
  const version = versionText ? versionText[1] : 'unknown';
  
  // URL und OID
  const urlOidCell = $(cells[1]);
  let urlText = '';
  if (urlOidCell.find('a').length > 0) {
    const href = urlOidCell.find('a').attr('href');
    urlText = href || urlOidCell.text().trim();
  } else {
    urlText = urlOidCell.text().trim();
  }
  
  if (!urlText) urlText = fullUrl;
  
  // OID extrahieren
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

const main = async () => {
  try {
    await connectDB();
    logger.info('Analysiere fehlgeschlagene Valuesets...');
    
    // Lade alle Valuesets von der ELGA-Seite
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
    
    console.log(`Gefunden: ${rows.length} Valuesets auf ELGA-Seite\n`);
    
    const allValuesets = [];
    const failedValuesets = [];
    const parsedValuesets = [];
    
    // Parse alle Valuesets
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const data = parseTableRow($, row, 'https://termgit.elga.gv.at/');
      
      if (data) {
        allValuesets.push({ ...data, rowNumber: i + 1 });
        parsedValuesets.push(data.url);
        
        // Prüfe ob in DB vorhanden
        const existing = await ElgaValueSet.findOne({ url: data.url });
        
        if (!existing) {
          failedValuesets.push({
            ...data,
            rowNumber: i + 1,
            reason: 'Nicht in Datenbank gefunden (Import fehlgeschlagen)'
          });
        }
      } else {
        // Valueset konnte nicht geparst werden
        const titleCell = $(row).find('td').first();
        const title = titleCell.text().trim() || 'Unbekannt';
        const link = titleCell.find('a');
        const detailUrl = link.length > 0 ? link.attr('href') : '';
        
        failedValuesets.push({
          title: title,
          version: 'unknown',
          url: detailUrl || 'Nicht verfügbar',
          oid: 'unknown',
          detailUrl: detailUrl ? (detailUrl.startsWith('http') ? detailUrl : `https://termgit.elga.gv.at/${detailUrl}`) : 'Nicht verfügbar',
          rowNumber: i + 1,
          reason: 'Parsing fehlgeschlagen - Datenstruktur konnte nicht extrahiert werden',
          description: ''
        });
      }
    }
    
    // Sortiere nach Zeilennummer
    failedValuesets.sort((a, b) => a.rowNumber - b.rowNumber);
    
    // Erstelle Ausgabedatei
    const outputPath = path.join(__dirname, '../../docs/problem_vs_01092025.txt');
    let output = `========================================\n`;
    output += `NICHT ERFOLGREICH IMPORTIERTE VALUESETS\n`;
    output += `========================================\n\n`;
    output += `Erstellt am: ${new Date().toLocaleString('de-DE')}\n`;
    output += `Total Valuesets auf ELGA-Seite: ${rows.length}\n`;
    const successful = rows.length - failedValuesets.length;
    output += `Erfolgreich importiert: ${successful}\n`;
    output += `Fehlgeschlagen: ${failedValuesets.length}\n\n`;
    output += `========================================\n\n`;
    
    if (failedValuesets.length === 0) {
      output += `✅ Alle Valuesets wurden erfolgreich importiert!\n`;
    } else {
      output += `FEHLGESCHLAGENE VALUESETS:\n\n`;
      
      failedValuesets.forEach((vs, index) => {
        output += `${index + 1}. ${vs.title}\n`;
        output += `   Version: ${vs.version}\n`;
        output += `   OID: ${vs.oid}\n`;
        output += `   URL: ${vs.url}\n`;
        output += `   Detail-URL: ${vs.detailUrl}\n`;
        output += `   Zeile: ${vs.rowNumber}\n`;
        output += `   Grund: ${vs.reason}\n`;
        if (vs.description) {
          output += `   Beschreibung: ${vs.description.substring(0, 100)}${vs.description.length > 100 ? '...' : ''}\n`;
        }
        output += `\n`;
      });
    }
    
    fs.writeFileSync(outputPath, output, 'utf8');
    
    console.log(`\n✅ Datei erstellt: ${outputPath}`);
    console.log(`\nZusammenfassung:`);
    console.log(`  Total gefunden: ${rows.length}`);
    console.log(`  Erfolgreich: ${allValuesets.length - failedValuesets.length}`);
    console.log(`  Fehlgeschlagen: ${failedValuesets.length}`);
    
    logger.info(`Liste der fehlgeschlagenen Valuesets gespeichert: ${outputPath}`);
    process.exit(0);
  } catch (error) {
    logger.error(`Fehler: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = { main };

