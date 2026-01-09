#!/usr/bin/env node

/**
 * Listet alle nicht erfolgreich importierten CodeSystems auf
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
const ElgaCodeSystem = require('../models/ElgaCodeSystem');
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
    logger.info('Analysiere fehlgeschlagene CodeSystems...');
    
    // Lade alle CodeSystems von der ELGA-Seite
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
    
    console.log(`Gefunden: ${rows.length} CodeSystems auf ELGA-Seite\n`);
    
    const allCodeSystems = [];
    const failedCodeSystems = [];
    
    // Parse alle CodeSystems
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const data = parseTableRow($, row, 'https://termgit.elga.gv.at/');
      
      if (data) {
        allCodeSystems.push({ ...data, rowNumber: i + 1 });
        
        // Prüfe ob in DB vorhanden
        const existing = await ElgaCodeSystem.findOne({ url: data.url });
        
        if (!existing) {
          failedCodeSystems.push({
            ...data,
            rowNumber: i + 1,
            reason: 'Nicht in Datenbank gefunden (Import fehlgeschlagen)'
          });
        }
      } else {
        // CodeSystem konnte nicht geparst werden
        const titleCell = $(row).find('td').first();
        const title = titleCell.text().trim() || 'Unbekannt';
        const link = titleCell.find('a');
        const detailUrl = link.length > 0 ? link.attr('href') : '';
        
        failedCodeSystems.push({
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
    failedCodeSystems.sort((a, b) => a.rowNumber - b.rowNumber);
    
    // Erstelle Ausgabedatei
    const outputPath = path.join(__dirname, '../../docs/problem_cs_01092025.txt');
    let output = `========================================\n`;
    output += `NICHT ERFOLGREICH IMPORTIERTE CODESYSTEMS\n`;
    output += `========================================\n\n`;
    output += `Erstellt am: ${new Date().toLocaleString('de-DE')}\n`;
    output += `Total CodeSystems auf ELGA-Seite: ${rows.length}\n`;
    const successful = rows.length - failedCodeSystems.length;
    output += `Erfolgreich importiert: ${successful}\n`;
    output += `Fehlgeschlagen: ${failedCodeSystems.length}\n\n`;
    output += `========================================\n\n`;
    
    if (failedCodeSystems.length === 0) {
      output += `✅ Alle CodeSystems wurden erfolgreich importiert!\n`;
    } else {
      output += `FEHLGESCHLAGENE CODESYSTEMS:\n\n`;
      
      failedCodeSystems.forEach((cs, index) => {
        output += `${index + 1}. ${cs.title}\n`;
        output += `   Version: ${cs.version}\n`;
        output += `   OID: ${cs.oid}\n`;
        output += `   URL: ${cs.url}\n`;
        output += `   Detail-URL: ${cs.detailUrl}\n`;
        output += `   Zeile: ${cs.rowNumber}\n`;
        output += `   Grund: ${cs.reason}\n`;
        if (cs.description) {
          output += `   Beschreibung: ${cs.description.substring(0, 100)}${cs.description.length > 100 ? '...' : ''}\n`;
        }
        output += `\n`;
      });
    }
    
    fs.writeFileSync(outputPath, output, 'utf8');
    
    console.log(`\n✅ Datei erstellt: ${outputPath}`);
    console.log(`\nZusammenfassung:`);
    console.log(`  Total gefunden: ${rows.length}`);
    console.log(`  Erfolgreich: ${successful}`);
    console.log(`  Fehlgeschlagen: ${failedCodeSystems.length}`);
    
    logger.info(`Liste der fehlgeschlagenen CodeSystems gespeichert: ${outputPath}`);
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



