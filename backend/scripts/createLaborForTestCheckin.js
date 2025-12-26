const mongoose = require('mongoose');
const LaborResult = require('../models/LaborResult');
const LaborProvider = require('../models/LaborProvider');
const Patient = require('../models/PatientExtended');
require('dotenv').config();

/**
 * Script zum Erstellen von Mockup-Laborwerten für "Test Checkin"
 */
async function createLaborForTestCheckin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware');
    console.log('✅ MongoDB verbunden');

    // Direkt nach "Test Checkin" suchen
    const patientId = new mongoose.Types.ObjectId('68fb5144e32dc46c47c72c14');
    const patient = await Patient.findById(patientId);

    if (!patient) {
      console.log('❌ Patient mit ID 68fb5144e32dc46c47c72c14 nicht gefunden');
      // Suche alternativ
      const altPatient = await Patient.findOne({
        firstName: { $regex: /test/i },
        lastName: { $regex: /checkin/i }
      });
      if (altPatient) {
        console.log(`✅ Alternativer Patient gefunden: ${altPatient.firstName} ${altPatient.lastName} (ID: ${altPatient._id})`);
        await createLaborResultsForPatient(altPatient._id);
      } else {
        console.log('❌ Kein Patient gefunden');
        process.exit(1);
      }
    } else {
      console.log(`✅ Patient gefunden: ${patient.firstName} ${patient.lastName} (ID: ${patient._id})`);
      await createLaborResultsForPatient(patient._id);
    }

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
      createdBy: new mongoose.Types.ObjectId()
    });
    await provider.save();
    console.log('✅ Mock Labor-Provider erstellt');
  }

  // Lösche alte Laborwerte für diesen Patienten
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
        value: 7.8,
        unit: 'mmol/L',
        referenceRange: { low: 3.9, high: 5.6, text: '3.9 - 5.6' },
        interpretation: 'high',
        isCritical: true,
        comment: 'Kritisch erhöht - Diabetes-Verdacht'
      },
      {
        loincCode: '2160-0',
        externalCode: 'CREA',
        testName: 'Kreatinin',
        value: 1.8,
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
        value: 35,
        unit: 'ml/min/1.73m²',
        referenceRange: { low: 60, high: null, text: '> 60' },
        interpretation: 'critical',
        isCritical: true,
        comment: 'Kritisch niedrig - Niereninsuffizienz Stadium 3'
      },
      {
        loincCode: '2823-3',
        externalCode: 'K',
        testName: 'Kalium',
        value: 5.8,
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
        value: 0.1,
        unit: 'mU/L',
        referenceRange: { low: 0.4, high: 4.0, text: '0.4 - 4.0' },
        interpretation: 'critical',
        isCritical: true,
        comment: 'Kritisch niedrig - Hyperthyreose-Verdacht'
      },
      {
        loincCode: '2093-3',
        externalCode: 'CHOL',
        testName: 'Gesamt-Cholesterin',
        value: 6.2,
        unit: 'mmol/L',
        referenceRange: { low: 0, high: 5.2, text: '< 5.2' },
        interpretation: 'high',
        isCritical: false
      },
      {
        loincCode: '2085-9',
        externalCode: 'HDL',
        testName: 'HDL-Cholesterin',
        value: 0.8,
        unit: 'mmol/L',
        referenceRange: { low: 1.0, high: null, text: '> 1.0' },
        interpretation: 'low',
        isCritical: false
      },
      {
        loincCode: '789-8',
        externalCode: 'RBC',
        testName: 'Erythrozyten',
        value: 4.2,
        unit: 'T/L',
        referenceRange: { low: 4.0, high: 5.5, text: '4.0 - 5.5' },
        interpretation: 'normal',
        isCritical: false
      },
      {
        loincCode: '718-7',
        externalCode: 'HGB',
        testName: 'Hämoglobin',
        value: 12.5,
        unit: 'g/dL',
        referenceRange: { low: 13.5, high: 17.5, text: '13.5 - 17.5' },
        interpretation: 'low',
        isCritical: false
      },
      {
        loincCode: '6690-2',
        externalCode: 'WBC',
        testName: 'Leukozyten',
        value: 11.5,
        unit: 'G/L',
        referenceRange: { low: 4.0, high: 10.0, text: '4.0 - 10.0' },
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

  await result1.save();
  console.log(`✅ Laborwert erstellt: ${result1.results.length} Tests (vor 1 Woche) - ${result1.results.filter(r => r.isCritical).length} kritisch`);
}

if (require.main === module) {
  createLaborForTestCheckin();
}

module.exports = { createLaborForTestCheckin };























