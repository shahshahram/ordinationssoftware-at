#!/usr/bin/env node

/**
 * Test-Skript für DICOM-Webhook-Schnittstelle
 * 
 * Verwendung:
 *   node scripts/test-dicom-upload.js <dicom-file> <provider-code> <api-key> [patient-id]
 * 
 * Beispiel:
 *   node scripts/test-dicom-upload.js test.dcm RADIOLOGIE_WIEN abc123xyz
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Konfiguration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5001';
const ENDPOINT = `${API_BASE_URL}/api/dicom/receive`;

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

async function testDicomUpload(dicomFilePath, providerCode, apiKey, patientId = null, patientMatching = null) {
  try {
    // 1. Prüfe ob DICOM-Datei existiert
    log.step(`Prüfe DICOM-Datei: ${dicomFilePath}`);
    if (!fs.existsSync(dicomFilePath)) {
      log.error(`DICOM-Datei nicht gefunden: ${dicomFilePath}`);
      process.exit(1);
    }

    const fileStats = fs.statSync(dicomFilePath);
    log.info(`Dateigröße: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

    // 2. Erstelle FormData
    log.step('Erstelle FormData...');
    const formData = new FormData();
    formData.append('dicomFile', fs.createReadStream(dicomFilePath));
    formData.append('providerCode', providerCode);
    formData.append('apiKey', apiKey);
    
    if (patientId) {
      formData.append('patientId', patientId);
      log.info(`Patient-ID: ${patientId}`);
    }
    
    if (patientMatching) {
      formData.append('patientMatching', patientMatching);
      log.info(`Patient-Matching: ${patientMatching}`);
    }

    // 3. Sende Request
    log.step(`Sende DICOM-Datei an ${ENDPOINT}...`);
    log.info(`Provider-Code: ${providerCode}`);
    
    const startTime = Date.now();
    
    const response = await axios.post(ENDPOINT, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000 // 60 Sekunden Timeout
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // 4. Zeige Ergebnis
    if (response.data.success) {
      log.success('DICOM-Datei erfolgreich hochgeladen!');
      log.info(`Dauer: ${duration}s`);
      console.log('\n📋 Antwort vom Server:');
      console.log(JSON.stringify(response.data, null, 2));
      
      if (response.data.data) {
        console.log('\n📊 Details:');
        if (response.data.data.studyId) {
          console.log(`  Study ID: ${response.data.data.studyId}`);
        }
        if (response.data.data.studyInstanceUID) {
          console.log(`  Study Instance UID: ${response.data.data.studyInstanceUID}`);
        }
        if (response.data.data.patientName) {
          console.log(`  Patient: ${response.data.data.patientName}`);
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
      // Server hat geantwortet, aber mit Fehler
      console.log(`\nStatus: ${error.response.status} ${error.response.statusText}`);
      console.log('Antwort:');
      console.log(JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // Request wurde gesendet, aber keine Antwort erhalten
      log.error('Keine Antwort vom Server');
      log.warning('Prüfe ob der Backend-Server läuft');
    } else {
      // Fehler beim Setup des Requests
      console.error('Fehler:', error.message);
    }
    
    return false;
  }
}

// Hauptfunktion
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  DICOM Webhook Test-Tool');
  console.log('='.repeat(60) + '\n');

  // Parse Argumente
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Verwendung:');
    console.log('  node scripts/test-dicom-upload.js <dicom-file> <provider-code> <api-key> [patient-id] [patient-matching]');
    console.log('\nBeispiel:');
    console.log('  node scripts/test-dicom-upload.js test.dcm RADIOLOGIE_WIEN abc123xyz');
    console.log('  node scripts/test-dicom-upload.js test.dcm RADIOLOGIE_WIEN abc123xyz 507f1f77bcf86cd799439011 name-dob');
    console.log('\nUmgebungsvariablen:');
    console.log('  API_URL - Backend-URL (Standard: http://localhost:5001)');
    process.exit(1);
  }

  const [dicomFile, providerCode, apiKey, patientId, patientMatching] = args;

  const success = await testDicomUpload(
    dicomFile,
    providerCode,
    apiKey,
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

module.exports = { testDicomUpload };









