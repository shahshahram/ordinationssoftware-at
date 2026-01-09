#!/usr/bin/env node

/**
 * Analysiert Import-Fehler und zeigt häufige Probleme
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const logger = require('../utils/logger');

const analyzeErrors = async () => {
  try {
    await connectDB();
    
    // Test: Versuche einige fehlgeschlagene Einträge zu importieren
    const axios = require('axios');
    const cheerio = require('cheerio');
    
    const url = 'https://termgit.elga.gv.at/valuesets.html';
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const table = $('table');
    const rows = table.find('tbody tr');
    
    console.log('\n=== Fehler-Analyse ===\n');
    console.log(`Total gefunden: ${rows.length} Valuesets\n`);
    
    const errors = {
      missingData: [],
      parsingErrors: [],
      validationErrors: []
    };
    
    // Analysiere erste 10 Einträge detailliert
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const row = rows[i];
      const cells = $(row).find('td');
      
      if (cells.length < 3) {
        errors.missingData.push(`Zeile ${i + 1}: Zu wenige Spalten`);
        continue;
      }
      
      const titleCell = $(cells[0]);
      const link = titleCell.find('a');
      
      if (link.length === 0) {
        errors.missingData.push(`Zeile ${i + 1}: Kein Link gefunden`);
        continue;
      }
      
      const title = titleCell.text().trim();
      const detailUrl = link.attr('href');
      
      if (!detailUrl) {
        errors.missingData.push(`Zeile ${i + 1}: Keine URL`);
        continue;
      }
      
      const urlOidCell = $(cells[1]);
      let urlText = '';
      if (urlOidCell.find('a').length > 0) {
        urlText = urlOidCell.find('a').attr('href') || urlOidCell.text().trim();
      } else {
        urlText = urlOidCell.text().trim();
      }
      
      const oidMatch = urlText.match(/(\d+\.\d+\.\d+\.\d+(?:\.\d+)*)/);
      const oid = oidMatch ? oidMatch[1] : 'unknown';
      
      console.log(`\n${i + 1}. ${title}`);
      console.log(`   URL: ${urlText}`);
      console.log(`   OID: ${oid}`);
      console.log(`   Detail: ${detailUrl}`);
    }
    
    console.log('\n=== Zusammenfassung ===\n');
    console.log('Analysiere weitere Details...\n');
    
    process.exit(0);
  } catch (error) {
    logger.error(`Fehler bei Analyse: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

if (require.main === module) {
  analyzeErrors();
}

module.exports = { analyzeErrors };



