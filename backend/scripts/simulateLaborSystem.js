/**
 * Simuliert ein externes Laborsystem
 * Sendet Laborwerte an die Arztsoftware, als ob sie von einem echten Laborsystem kommen
 * 
 * Verwendung:
 * node backend/scripts/simulateLaborSystem.js [patientId] [providerCode]
 * 
 * Beispiel:
 * node backend/scripts/simulateLaborSystem.js 507f1f77bcf86cd799439011 LABOR1
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const http = require('http');
const https = require('https');
const { URL } = require('url');

// Konfiguration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5001';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware';

// Labor-Provider Model
const LaborProvider = require('../models/LaborProvider');
const PatientExtended = require('../models/PatientExtended');
const Patient = require('../models/Patient');

/**
 * Erstellt oder findet einen Labor-Provider
 */
async function getOrCreateProvider(providerCode = 'TESTLAB') {
  let provider = await LaborProvider.findOne({ code: providerCode });
  
  if (!provider) {
    // Erstelle einen Test-Provider
    const User = require('../models/User');
    const adminUser = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
    
    if (!adminUser) {
      throw new Error('Kein Admin-User gefunden. Bitte zuerst einen Admin erstellen.');
    }
    
    provider = new LaborProvider({
      name: `Test Labor ${providerCode}`,
      code: providerCode,
      description: 'Simuliertes Laborsystem für Tests',
      contact: {
        address: {
          street: 'Teststraße 1',
          city: 'Wien',
          postalCode: '1010',
          country: 'Österreich'
        },
        phone: '+43 1 2345678',
        email: 'test@labor.at'
      },
      integration: {
        protocol: 'rest',
        rest: {
          baseUrl: 'http://localhost:5001',
          webhookUrl: `${API_BASE_URL}/api/labor/receive`
        }
      },
      mapping: {
        profile: 'default',
        patientMatching: 'name-dob',
        autoMapCodes: true
      },
      isActive: true,
      createdBy: adminUser._id
    });
    
    await provider.save();
    console.log(`✅ Labor-Provider erstellt: ${provider.name} (${provider.code})`);
  }
  
  return provider;
}

/**
 * Erstellt FHIR-Formatierte Laborwerte
 */
function createFHIRLaborData(patientId, providerCode, results = null) {
  const now = new Date();
  const collectionDate = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 Stunden vorher
  
  // Standard-Laborwerte, falls keine angegeben
  const defaultResults = results || [
    {
      code: { coding: [{ code: '718-7', system: 'http://loinc.org', display: 'Hemoglobin' }], text: 'Hämoglobin' },
      valueQuantity: { value: 14.5, unit: 'g/dL' },
      referenceRange: [{ low: { value: 12.0 }, high: { value: 16.0 } }],
      interpretation: [{ coding: [{ code: 'N', display: 'Normal' }] }]
    },
    {
      code: { coding: [{ code: '6690-2', system: 'http://loinc.org', display: 'Leukocytes' }], text: 'Leukozyten' },
      valueQuantity: { value: 7.2, unit: '10*3/uL' },
      referenceRange: [{ low: { value: 4.0 }, high: { value: 11.0 } }],
      interpretation: [{ coding: [{ code: 'N', display: 'Normal' }] }]
    },
    {
      code: { coding: [{ code: '777-3', system: 'http://loinc.org', display: 'Platelets' }], text: 'Thrombozyten' },
      valueQuantity: { value: 250, unit: '10*3/uL' },
      referenceRange: [{ low: { value: 150 }, high: { value: 450 } }],
      interpretation: [{ coding: [{ code: 'N', display: 'Normal' }] }]
    },
    {
      code: { coding: [{ code: '33914-3', system: 'http://loinc.org', display: 'Glucose' }], text: 'Blutzucker' },
      valueQuantity: { value: 95, unit: 'mg/dL' },
      referenceRange: [{ low: { value: 70 }, high: { value: 100 } }],
      interpretation: [{ coding: [{ code: 'N', display: 'Normal' }] }]
    },
    {
      code: { coding: [{ code: '2160-0', system: 'http://loinc.org', display: 'Creatinine' }], text: 'Kreatinin' },
      valueQuantity: { value: 0.9, unit: 'mg/dL' },
      referenceRange: [{ low: { value: 0.6 }, high: { value: 1.2 } }],
      interpretation: [{ coding: [{ code: 'N', display: 'Normal' }] }]
    }
  ];
  
  const fhirReport = {
    resourceType: 'DiagnosticReport',
    id: `lab-${Date.now()}`,
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
        code: 'LAB',
        display: 'Laboratory'
      }]
    }],
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: '58410-2',
        display: 'Complete blood count (CBC) with differential panel'
      }],
      text: 'Blutbild'
    },
    subject: {
      reference: `Patient/${patientId}`,
      id: patientId
    },
    effectiveDateTime: collectionDate.toISOString(),
    issued: now.toISOString(),
    identifier: [{
      system: 'http://labor.test/order',
      value: `ORD-${Date.now()}`
    }],
    result: defaultResults.map((result, index) => ({
      resourceType: 'Observation',
      id: `obs-${Date.now()}-${index}`,
      status: 'final',
      code: result.code,
      subject: {
        reference: `Patient/${patientId}`,
        id: patientId
      },
      effectiveDateTime: collectionDate.toISOString(),
      valueQuantity: result.valueQuantity,
      referenceRange: result.referenceRange,
      interpretation: result.interpretation
    })),
    conclusion: 'Alle Werte im Normbereich',
    conclusionCode: [{
      coding: [{
        system: 'http://snomed.info/sct',
        code: '17621005',
        display: 'Normal'
      }],
      text: 'Normale Laborwerte'
    }]
  };
  
  return fhirReport;
}

/**
 * Erstellt HL7 v2.x formatierte Laborwerte
 */
function createHL7LaborData(patient, providerCode, results = null) {
  const now = new Date();
  const collectionDate = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  
  // HL7 Datum-Format: YYYYMMDDHHMMSS
  const formatHL7Date = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  };
  
  const orderNumber = `ORD${Date.now()}`;
  const patientName = `${patient.lastName}^${patient.firstName}`;
  const dob = formatHL7Date(new Date(patient.dateOfBirth || new Date('1980-01-01')));
  const collectionDateStr = formatHL7Date(collectionDate);
  const resultDateStr = formatHL7Date(now);
  
  // MSH Segment (Message Header)
  const msh = `MSH|^~\\&|${providerCode}|LAB|ORDINATION|SOFTWARE|${formatHL7Date(now)}||ORU^R01^ORU_R01|${orderNumber}|P|2.5\r`;
  
  // PID Segment (Patient Identification)
  const pid = `PID|1||${patient._id}||${patientName}||${dob}|M|||Street^City^PostalCode|||^||||||||||||||||||||||||||\r`;
  
  // OBR Segment (Observation Request)
  const obr = `OBR|1||${orderNumber}||CBC^Complete Blood Count^L|||${collectionDateStr}|||||||||||||||||||${resultDateStr}|||F\r`;
  
  // Standard-Ergebnisse
  const defaultResults = results || [
    { code: '718-7', name: 'HGB^Hemoglobin', value: '14.5', unit: 'g/dL', refLow: '12.0', refHigh: '16.0' },
    { code: '6690-2', name: 'WBC^White Blood Count', value: '7.2', unit: '10*3/uL', refLow: '4.0', refHigh: '11.0' },
    { code: '777-3', name: 'PLT^Platelets', value: '250', unit: '10*3/uL', refLow: '150', refHigh: '450' },
    { code: '33914-3', name: 'GLU^Glucose', value: '95', unit: 'mg/dL', refLow: '70', refHigh: '100' },
    { code: '2160-0', name: 'CREA^Creatinine', value: '0.9', unit: 'mg/dL', refLow: '0.6', refHigh: '1.2' }
  ];
  
  // OBX Segmente (Observation Results)
  const obxSegments = defaultResults.map((result, index) => {
    return `OBX|${index + 1}|NM|${result.code}^${result.name}^L||${result.value}|${result.unit}||${result.refLow}-${result.refHigh}||N|||${resultDateStr}\r`;
  }).join('');
  
  return msh + pid + obr + obxSegments;
}

/**
 * Sendet HTTP-Request (ohne axios)
 */
function makeRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = httpModule.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ data: parsed, status: res.statusCode });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.message || responseData}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

/**
 * Sendet Laborwerte an die API
 */
async function sendLaborResults(patientId, providerCode, format = 'fhir', customResults = null) {
  try {
    // Verbinde mit MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Verbunden mit MongoDB');
    
    // Hole oder erstelle Provider
    const provider = await getOrCreateProvider(providerCode);
    
    // Hole Patientendaten
    let patient = await PatientExtended.findById(patientId);
    if (!patient) {
      patient = await Patient.findById(patientId);
    }
    
    if (!patient) {
      throw new Error(`Patient mit ID ${patientId} nicht gefunden`);
    }
    
    console.log(`📋 Patient gefunden: ${patient.firstName} ${patient.lastName}`);
    
    // Erstelle Labor-Daten im gewählten Format
    let data;
    if (format.toLowerCase() === 'hl7' || format.toLowerCase() === 'hl7v2') {
      data = createHL7LaborData(patient, providerCode, customResults);
      console.log('📤 Sende HL7 v2.x Daten...');
    } else {
      data = createFHIRLaborData(patientId, providerCode, customResults);
      console.log('📤 Sende FHIR Daten...');
    }
    
    // Sende an API
    const response = await makeRequest(
      `${API_BASE_URL}/api/labor/receive`,
      'POST',
      {
        providerCode: providerCode,
        format: format.toLowerCase(),
        data: data
      }
    );
    
    if (response.data.success) {
      console.log('✅ Laborwerte erfolgreich gesendet!');
      console.log(`   - Order Number: ${response.data.data.orderNumber}`);
      console.log(`   - Anzahl Tests: ${response.data.data.resultCount}`);
      console.log(`   - Kritische Werte: ${response.data.data.hasCriticalValues ? 'Ja' : 'Nein'}`);
      console.log(`   - Labor Result ID: ${response.data.data.id}`);
    } else {
      console.error('❌ Fehler beim Senden:', response.data.message);
    }
    
    await mongoose.disconnect();
    return response.data;
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    if (error.response) {
      console.error('   API Response:', error.response.data);
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Hauptfunktion
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🔬 Laborsystem-Simulator
=======================

Simuliert ein externes Laborsystem und sendet Laborwerte an die Arztsoftware.

Verwendung:
  node backend/scripts/simulateLaborSystem.js [patientId] [providerCode] [format] [customResults]

Parameter:
  patientId      - ID des Patienten (erforderlich)
  providerCode   - Code des Labor-Providers (Standard: TESTLAB)
  format         - Format: 'fhir' oder 'hl7' (Standard: 'fhir')
  customResults  - JSON-Datei mit benutzerdefinierten Ergebnissen (optional)

Beispiele:
  # Standard FHIR-Format
  node backend/scripts/simulateLaborSystem.js 507f1f77bcf86cd799439011
  
  # Mit HL7 v2.x Format
  node backend/scripts/simulateLaborSystem.js 507f1f77bcf86cd799439011 TESTLAB hl7
  
  # Mit benutzerdefinierten Werten
  node backend/scripts/simulateLaborSystem.js 507f1f77bcf86cd799439011 TESTLAB fhir custom-results.json
    `);
    process.exit(0);
  }
  
  const patientId = args[0];
  const providerCode = args[1] || 'TESTLAB';
  const format = args[2] || 'fhir';
  const customResultsFile = args[3];
  
  let customResults = null;
  if (customResultsFile) {
    const fs = require('fs');
    const customResultsPath = path.join(__dirname, customResultsFile);
    if (fs.existsSync(customResultsPath)) {
      customResults = JSON.parse(fs.readFileSync(customResultsPath, 'utf8'));
      console.log(`📄 Lade benutzerdefinierte Ergebnisse aus ${customResultsFile}`);
    } else {
      console.warn(`⚠️  Datei ${customResultsFile} nicht gefunden. Verwende Standard-Werte.`);
    }
  }
  
  await sendLaborResults(patientId, providerCode, format, customResults);
}

// Führe Skript aus
if (require.main === module) {
  main();
}

module.exports = { sendLaborResults, createFHIRLaborData, createHL7LaborData };

