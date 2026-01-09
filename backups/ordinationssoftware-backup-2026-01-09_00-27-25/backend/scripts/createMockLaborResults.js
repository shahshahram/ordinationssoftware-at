const mongoose = require('mongoose');
const LaborResult = require('../models/LaborResult');
const LaborProvider = require('../models/LaborProvider');
const Patient = require('../models/Patient');
require('dotenv').config();

/**
 * Script zum Erstellen von Mockup-Laborwerten für Test-Patienten
 */
async function createMockLaborResults() {
  try {
    // MongoDB verbinden
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB verbunden');

    // Patient "Test Checkin" finden (Priorität) - verschiedene Schreibweisen
    let patient = await Patient.findOne({
      $or: [
        { firstName: { $regex: /^test$/i }, lastName: { $regex: /^checkin$/i } },
        { firstName: 'Test', lastName: 'Checkin' },
        { firstName: 'Checkin', lastName: 'Test' },
        { firstName: { $regex: /test/i }, lastName: { $regex: /checkin/i } }
      ]
    });

    if (!patient) {
      console.log('❌ Patient "Test Checkin" nicht gefunden. Suche nach "Test Patient"...');
      patient = await Patient.findOne({
        $or: [
          { firstName: { $regex: /^test$/i }, lastName: { $regex: /^patient$/i } },
          { firstName: 'Test', lastName: 'Patient' }
        ]
      });
    }

    if (!patient) {
      console.log('❌ Kein Test-Patient gefunden. Suche nach allen Patienten...');
      const allPatients = await Patient.find().limit(20);
      console.log('Verfügbare Patienten:');
      allPatients.forEach(p => console.log(`  - ${p.firstName} ${p.lastName} (ID: ${p._id})`));
      
      // Verwende den ersten Patienten als Fallback
      if (allPatients.length > 0) {
        patient = allPatients[0];
        console.log(`\n⚠️ Verwende Fallback-Patient: ${patient.firstName} ${patient.lastName} (ID: ${patient._id})`);
      } else {
        console.log('❌ Keine Patienten gefunden. Bitte erstellen Sie zuerst einen Patienten.');
        process.exit(1);
      }
    }

    console.log(`\n✅ Patient gefunden: ${patient.firstName} ${patient.lastName} (ID: ${patient._id})`);
    await createLaborResultsForPatient(patient._id);

    await mongoose.connection.close();
    console.log('✅ Mockup-Laborwerte erfolgreich erstellt');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

async function createLaborResultsForPatient(patientId) {
  // Labor-Provider erstellen oder finden
  let provider = await LaborProvider.findOne({ code: 'MOCK_LAB' });
  if (!provider) {
    provider = new LaborProvider({
      name: 'Mock Laboratorium',
      code: 'MOCK_LAB',
      description: 'Mockup-Labor für Testzwecke',
      integration: {
        protocol: 'manual'
      },
      isActive: true,
      createdBy: new mongoose.Types.ObjectId() // Dummy User ID
    });
    await provider.save();
    console.log('✅ Mock Labor-Provider erstellt');
  }

  // Lösche alte Laborwerte für diesen Patienten (für Testzwecke)
  await LaborResult.deleteMany({ patientId });
  console.log('🗑️ Alte Laborwerte für diesen Patienten gelöscht');

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Laborwert 1: Aktuell (vor 1 Woche) - mit kritischen Werten
  const result1 = new LaborResult({
    patientId: patientId,
    providerId: provider._id,
    externalId: 'LAB-001',
    orderNumber: 'ORD-2024-001',
    collectionDate: oneWeekAgo,
    analysisDate: oneWeekAgo,
    resultDate: oneWeekAgo,
    receivedAt: oneWeekAgo,
    status: 'final',
    results: [
      {
        loincCode: '2339-0',
        externalCode: 'GLU',
        testName: 'Glucose (Nüchtern)',
        value: 7.8, // KRITISCH - erhöht (Normal: 3.9-5.6 mmol/L)
        unit: 'mmol/L',
        referenceRange: { low: 3.9, high: 5.6, text: '3.9 - 5.6' },
        interpretation: 'high',
        isCritical: true,
        comment: 'Kritisch erhöht - Diabetes-Verdacht'
      },
      {
        loincCode: '2093-3',
        externalCode: 'CHOL',
        testName: 'Gesamt-Cholesterin',
        value: 6.2, // ERHÖHT (Normal: < 5.2 mmol/L)
        unit: 'mmol/L',
        referenceRange: { low: 0, high: 5.2, text: '< 5.2' },
        interpretation: 'high',
        isCritical: false
      },
      {
        loincCode: '2085-9',
        externalCode: 'HDL',
        testName: 'HDL-Cholesterin',
        value: 0.8, // NIEDRIG (Normal: > 1.0 mmol/L)
        unit: 'mmol/L',
        referenceRange: { low: 1.0, high: null, text: '> 1.0' },
        interpretation: 'low',
        isCritical: false
      },
      {
        loincCode: '2089-1',
        externalCode: 'LDL',
        testName: 'LDL-Cholesterin',
        value: 4.5, // ERHÖHT (Normal: < 3.0 mmol/L)
        unit: 'mmol/L',
        referenceRange: { low: 0, high: 3.0, text: '< 3.0' },
        interpretation: 'high',
        isCritical: false
      },
      {
        loincCode: '2571-8',
        externalCode: 'TRIG',
        testName: 'Triglyceride',
        value: 2.8, // ERHÖHT (Normal: < 1.7 mmol/L)
        unit: 'mmol/L',
        referenceRange: { low: 0, high: 1.7, text: '< 1.7' },
        interpretation: 'high',
        isCritical: false
      },
      {
        loincCode: '789-8',
        externalCode: 'RBC',
        testName: 'Erythrozyten',
        value: 4.2, // NORMAL
        unit: 'T/L',
        referenceRange: { low: 4.0, high: 5.5, text: '4.0 - 5.5' },
        interpretation: 'normal',
        isCritical: false
      },
      {
        loincCode: '718-7',
        externalCode: 'HGB',
        testName: 'Hämoglobin',
        value: 12.5, // NIEDRIG (Normal: 13.5-17.5 g/dL)
        unit: 'g/dL',
        referenceRange: { low: 13.5, high: 17.5, text: '13.5 - 17.5' },
        interpretation: 'low',
        isCritical: false
      },
      {
        loincCode: '777-3',
        externalCode: 'HCT',
        testName: 'Hämatokrit',
        value: 38.5, // NORMAL
        unit: '%',
        referenceRange: { low: 36.0, high: 50.0, text: '36.0 - 50.0' },
        interpretation: 'normal',
        isCritical: false
      },
      {
        loincCode: '6690-2',
        externalCode: 'WBC',
        testName: 'Leukozyten',
        value: 11.5, // ERHÖHT (Normal: 4.0-10.0 G/L)
        unit: 'G/L',
        referenceRange: { low: 4.0, high: 10.0, text: '4.0 - 10.0' },
        interpretation: 'high',
        isCritical: false
      },
      {
        loincCode: '777-3',
        externalCode: 'PLT',
        testName: 'Thrombozyten',
        value: 450, // ERHÖHT (Normal: 150-400 G/L)
        unit: 'G/L',
        referenceRange: { low: 150, high: 400, text: '150 - 400' },
        interpretation: 'high',
        isCritical: false
      },
      {
        loincCode: '2160-0',
        externalCode: 'CREA',
        testName: 'Kreatinin',
        value: 1.8, // KRITISCH ERHÖHT (Normal: 0.7-1.3 mg/dL)
        unit: 'mg/dL',
        referenceRange: { low: 0.7, high: 1.3, text: '0.7 - 1.3' },
        interpretation: 'critical',
        isCritical: true,
        comment: 'Kritisch erhöht - Nierenfunktion beeinträchtigt'
      },
      {
        loincCode: '33914-3',
        externalCode: 'EGFR',
        testName: 'eGFR (geschätzte GFR)',
        value: 35, // KRITISCH NIEDRIG (Normal: > 60 ml/min/1.73m²)
        unit: 'ml/min/1.73m²',
        referenceRange: { low: 60, high: null, text: '> 60' },
        interpretation: 'critical',
        isCritical: true,
        comment: 'Kritisch niedrig - Niereninsuffizienz Stadium 3'
      },
      {
        loincCode: '2951-2',
        externalCode: 'NA',
        testName: 'Natrium',
        value: 135, // NIEDRIG (Normal: 136-145 mmol/L)
        unit: 'mmol/L',
        referenceRange: { low: 136, high: 145, text: '136 - 145' },
        interpretation: 'low',
        isCritical: false
      },
      {
        loincCode: '2823-3',
        externalCode: 'K',
        testName: 'Kalium',
        value: 5.8, // KRITISCH ERHÖHT (Normal: 3.5-5.0 mmol/L)
        unit: 'mmol/L',
        referenceRange: { low: 3.5, high: 5.0, text: '3.5 - 5.0' },
        interpretation: 'critical',
        isCritical: true,
        comment: 'Kritisch erhöht - Hyperkaliämie, sofortige Behandlung erforderlich'
      },
      {
        loincCode: '33914-3',
        externalCode: 'TSH',
        testName: 'TSH (Thyreoidea-stimulierendes Hormon)',
        value: 0.1, // KRITISCH NIEDRIG (Normal: 0.4-4.0 mU/L)
        unit: 'mU/L',
        referenceRange: { low: 0.4, high: 4.0, text: '0.4 - 4.0' },
        interpretation: 'critical',
        isCritical: true,
        comment: 'Kritisch niedrig - Hyperthyreose-Verdacht'
      },
      {
        loincCode: '1742-6',
        externalCode: 'ALT',
        testName: 'ALT (Alanin-Aminotransferase)',
        value: 85, // ERHÖHT (Normal: < 40 U/L)
        unit: 'U/L',
        referenceRange: { low: 0, high: 40, text: '< 40' },
        interpretation: 'high',
        isCritical: false
      },
      {
        loincCode: '1975-2',
        externalCode: 'AST',
        testName: 'AST (Aspartat-Aminotransferase)',
        value: 72, // ERHÖHT (Normal: < 40 U/L)
        unit: 'U/L',
        referenceRange: { low: 0, high: 40, text: '< 40' },
        interpretation: 'high',
        isCritical: false
      },
      {
        loincCode: '2324-2',
        externalCode: 'GGT',
        testName: 'GGT (Gamma-Glutamyltransferase)',
        value: 95, // ERHÖHT (Normal: < 60 U/L)
        unit: 'U/L',
        referenceRange: { low: 0, high: 60, text: '< 60' },
        interpretation: 'high',
        isCritical: false
      },
      {
        loincCode: '1751-7',
        externalCode: 'ALB',
        testName: 'Albumin',
        value: 3.2, // NIEDRIG (Normal: 3.5-5.0 g/dL)
        unit: 'g/dL',
        referenceRange: { low: 3.5, high: 5.0, text: '3.5 - 5.0' },
        interpretation: 'low',
        isCritical: false
      },
      {
        loincCode: '1978-6',
        externalCode: 'CRP',
        testName: 'CRP (C-reaktives Protein)',
        value: 45, // ERHÖHT (Normal: < 3 mg/L)
        unit: 'mg/L',
        referenceRange: { low: 0, high: 3, text: '< 3' },
        interpretation: 'high',
        isCritical: false
      }
    ],
    interpretation: 'Mehrere pathologische Befunde: Hyperglykämie, Hyperkaliämie, Niereninsuffizienz, erhöhte Leberwerte. Dringende ärztliche Kontrolle empfohlen.',
    laboratoryComment: 'Kritische Werte: Glucose, Kreatinin, eGFR, Kalium, TSH. Bitte umgehende ärztliche Kontrolle.',
    metadata: {
      sourceFormat: 'json',
      mappingVersion: '1.0'
    },
    processingStatus: 'mapped'
  });

  // Laborwert 2: Vor 2 Wochen - teilweise verbessert
  const result2 = new LaborResult({
    patientId: patientId,
    providerId: provider._id,
    externalId: 'LAB-002',
    orderNumber: 'ORD-2024-002',
    collectionDate: twoWeeksAgo,
    analysisDate: twoWeeksAgo,
    resultDate: twoWeeksAgo,
    receivedAt: twoWeeksAgo,
    status: 'final',
    results: [
      {
        loincCode: '2339-0',
        externalCode: 'GLU',
        testName: 'Glucose (Nüchtern)',
        value: 6.8, // ERHÖHT
        unit: 'mmol/L',
        referenceRange: { low: 3.9, high: 5.6, text: '3.9 - 5.6' },
        interpretation: 'high',
        isCritical: false
      },
      {
        loincCode: '2093-3',
        externalCode: 'CHOL',
        testName: 'Gesamt-Cholesterin',
        value: 5.8,
        unit: 'mmol/L',
        referenceRange: { low: 0, high: 5.2, text: '< 5.2' },
        interpretation: 'high',
        isCritical: false
      },
      {
        loincCode: '2160-0',
        externalCode: 'CREA',
        testName: 'Kreatinin',
        value: 1.5,
        unit: 'mg/dL',
        referenceRange: { low: 0.7, high: 1.3, text: '0.7 - 1.3' },
        interpretation: 'high',
        isCritical: false
      },
      {
        loincCode: '2823-3',
        externalCode: 'K',
        testName: 'Kalium',
        value: 4.8, // ERHÖHT aber nicht kritisch
        unit: 'mmol/L',
        referenceRange: { low: 3.5, high: 5.0, text: '3.5 - 5.0' },
        interpretation: 'high',
        isCritical: false
      }
    ],
    interpretation: 'Leicht verbesserte Werte im Vergleich zu vorheriger Untersuchung.',
    metadata: {
      sourceFormat: 'json',
      mappingVersion: '1.0'
    },
    processingStatus: 'mapped'
  });

  // Laborwert 3: Vor 1 Monat - Baseline
  const result3 = new LaborResult({
    patientId: patientId,
    providerId: provider._id,
    externalId: 'LAB-003',
    orderNumber: 'ORD-2024-003',
    collectionDate: oneMonthAgo,
    analysisDate: oneMonthAgo,
    resultDate: oneMonthAgo,
    receivedAt: oneMonthAgo,
    status: 'final',
    results: [
      {
        loincCode: '2339-0',
        externalCode: 'GLU',
        testName: 'Glucose (Nüchtern)',
        value: 5.2, // NORMAL
        unit: 'mmol/L',
        referenceRange: { low: 3.9, high: 5.6, text: '3.9 - 5.6' },
        interpretation: 'normal',
        isCritical: false
      },
      {
        loincCode: '2093-3',
        externalCode: 'CHOL',
        testName: 'Gesamt-Cholesterin',
        value: 4.8,
        unit: 'mmol/L',
        referenceRange: { low: 0, high: 5.2, text: '< 5.2' },
        interpretation: 'normal',
        isCritical: false
      },
      {
        loincCode: '2160-0',
        externalCode: 'CREA',
        testName: 'Kreatinin',
        value: 1.0,
        unit: 'mg/dL',
        referenceRange: { low: 0.7, high: 1.3, text: '0.7 - 1.3' },
        interpretation: 'normal',
        isCritical: false
      }
    ],
    interpretation: 'Alle Werte im Normbereich.',
    metadata: {
      sourceFormat: 'json',
      mappingVersion: '1.0'
    },
    processingStatus: 'mapped'
  });

  await result1.save();
  await result2.save();
  await result3.save();

  console.log(`✅ 3 Laborwerte für Patient erstellt:`);
  console.log(`   - ${result1.results.length} Tests (vor 1 Woche) - mit kritischen Werten`);
  console.log(`   - ${result2.results.length} Tests (vor 2 Wochen)`);
  console.log(`   - ${result3.results.length} Tests (vor 1 Monat)`);
  console.log(`   - Gesamt: ${result1.results.length + result2.results.length + result3.results.length} Test-Ergebnisse`);
}

// Script ausführen
if (require.main === module) {
  createMockLaborResults();
}

module.exports = { createMockLaborResults };

