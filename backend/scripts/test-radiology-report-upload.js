#!/usr/bin/env node

/**
 * Test-Skript für Radiologie-Befund-Webhook-Schnittstelle
 * 
 * Verwendung:
 *   node scripts/test-radiology-report-upload.js <file> <provider-code> <api-key> <format> [patient-id]
 * 
 * Formate: fhir, hl7-cda, dicom-sr, pdf, text, json
 * 
 * Beispiel:
 *   node scripts/test-radiology-report-upload.js report.pdf RADIOLOGIE_WIEN abc123xyz pdf
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Konfiguration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5001';
const ENDPOINT = `${API_BASE_URL}/api/radiology-reports/receive`;

// Farben für Console-Output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.blue}→${colors.reset} ${msg}`)
};

async function testReportUpload(filePath, providerCode, apiKey, format, patientId = null, patientMatching = null) {
  try {
    // 1. Prüfe ob Datei existiert
    log.step(`Prüfe Datei: ${filePath}`);
    if (!fs.existsSync(filePath)) {
      log.error(`Datei nicht gefunden: ${filePath}`);
      process.exit(1);
    }

    const fileStats = fs.statSync(filePath);
    log.info(`Dateigröße: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

    // 2. Erstelle FormData
    log.step('Erstelle FormData...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('providerCode', providerCode);
    formData.append('apiKey', apiKey);
    formData.append('format', format);
    
    if (patientId) {
      formData.append('patientId', patientId);
      log.info(`Patient-ID: ${patientId}`);
    }
    
    if (patientMatching) {
      formData.append('patientMatching', patientMatching);
      log.info(`Patient-Matching: ${patientMatching}`);
    }

    // 3. Sende Request
    log.step(`Sende Befund an ${ENDPOINT}...`);
    log.info(`Provider-Code: ${providerCode}`);
    log.info(`Format: ${format}`);
    
    const startTime = Date.now();
    
    const response = await axios.post(ENDPOINT, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // 4. Zeige Ergebnis
    if (response.data.success) {
      log.success('Befund erfolgreich hochgeladen!');
      log.info(`Dauer: ${duration}s`);
      console.log('\n📋 Antwort vom Server:');
      console.log(JSON.stringify(response.data, null, 2));
      
      if (response.data.data) {
        console.log('\n📊 Details:');
        if (response.data.data.documentId) {
          console.log(`  Document ID: ${response.data.data.documentId}`);
        }
        if (response.data.data.patientId) {
          console.log(`  Patient ID: ${response.data.data.patientId}`);
        }
      }
      
      return true;
    } else {
      log.error('Upload fehlgeschlagen');
      console.log('\n❌ Fehler vom Server:');
      console.log(JSON.stringify(response.data, null, 2));
      return false;
    }

  } catch (error) {
    log.error('Fehler beim Upload:');
    
    if (error.response) {
      console.log(`\nStatus: ${error.response.status} ${error.response.statusText}`);
      console.log('Antwort:');
      console.log(JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      log.error('Keine Antwort vom Server');
      log.warning('Prüfe ob der Backend-Server läuft');
    } else {
      console.error('Fehler:', error.message);
    }
    
    return false;
  }
}

// Hauptfunktion
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  Radiologie-Befund Webhook Test-Tool');
  console.log('='.repeat(60) + '\n');

  // Parse Argumente
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.log('Verwendung:');
    console.log('  node scripts/test-radiology-report-upload.js <file> <provider-code> <api-key> <format> [patient-id] [patient-matching]');
    console.log('\nFormate: fhir, hl7-cda, dicom-sr, pdf, text, json');
    console.log('\nBeispiel:');
    console.log('  node scripts/test-radiology-report-upload.js report.pdf RADIOLOGIE_WIEN abc123xyz pdf');
    console.log('  node scripts/test-radiology-report-upload.js report.json RADIOLOGIE_WIEN abc123xyz json 507f1f77bcf86cd799439011');
    console.log('\nUmgebungsvariablen:');
    console.log('  API_URL - Backend-URL (Standard: http://localhost:5001)');
    process.exit(1);
  }

  const [file, providerCode, apiKey, format, patientId, patientMatching] = args;

  // Validiere Format
  const validFormats = ['fhir', 'hl7-cda', 'dicom-sr', 'pdf', 'text', 'json'];
  if (!validFormats.includes(format.toLowerCase())) {
    log.error(`Ungültiges Format: ${format}`);
    log.info(`Gültige Formate: ${validFormats.join(', ')}`);
    process.exit(1);
  }

  const success = await testReportUpload(
    file,
    providerCode,
    apiKey,
    format.toLowerCase(),
    patientId || null,
    patientMatching || null
  );

  console.log('\n' + '='.repeat(60));
  process.exit(success ? 0 : 1);
}

// Führe Skript aus
if (require.main === module) {
  main().catch(error => {
    log.error('Unerwarteter Fehler:');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { testReportUpload };









