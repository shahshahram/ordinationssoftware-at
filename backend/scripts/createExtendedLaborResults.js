const mongoose = require('mongoose');
const LaborResult = require('../models/LaborResult');
const LaborProvider = require('../models/LaborProvider');
const Patient = require('../models/PatientExtended');
require('dotenv').config();

/**
 * Script zum Erstellen von umfangreichen Mockup-Laborwerten für "Test Checkin"
 * Erstellt Laborwerte für verschiedene Zeiträume mit vielen Parametern
 */
async function createExtendedLaborResults() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware');
    console.log('✅ MongoDB verbunden');

    // Direkt nach "Test Checkin" suchen
    const patientId = new mongoose.Types.ObjectId('68fb5144e32dc46c47c72c14');
    const patient = await Patient.findById(patientId);

    if (!patient) {
      console.log('❌ Patient mit ID 68fb5144e32dc46c47c72c14 nicht gefunden');
      process.exit(1);
    }

    console.log(`✅ Patient gefunden: ${patient.firstName} ${patient.lastName} (ID: ${patient._id})`);
    await createLaborResultsForPatient(patient._id);

    await mongoose.connection.close();
    console.log('✅ Erweiterte Mockup-Laborwerte erfolgreich erstellt');
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
  
  // Erstelle Laborwerte für verschiedene Zeiträume
  const timePoints = [
    { days: 0, label: 'Heute' },
    { days: 3, label: 'Vor 3 Tagen' },
    { days: 7, label: 'Vor 1 Woche' },
    { days: 14, label: 'Vor 2 Wochen' },
    { days: 21, label: 'Vor 3 Wochen' },
    { days: 30, label: 'Vor 1 Monat' },
    { days: 60, label: 'Vor 2 Monaten' },
    { days: 90, label: 'Vor 3 Monaten' },
    { days: 120, label: 'Vor 4 Monaten' },
    { days: 180, label: 'Vor 6 Monaten' }
  ];

  const allResults = [];

  for (const timePoint of timePoints) {
    const resultDate = new Date(now.getTime() - timePoint.days * 24 * 60 * 60 * 1000);
    
    // Generiere verschiedene Werte basierend auf Zeitpunkt (Trends simulieren)
    const progressFactor = 1 - (timePoint.days / 180); // 0 (vor 6 Monaten) bis 1 (heute)
    
    const results = [
      // Blutzucker
      {
        loincCode: '2339-0',
        externalCode: 'GLU',
        testName: 'Glucose (Nüchtern)',
        value: Math.round((4.5 + progressFactor * 3.3) * 10) / 10, // 4.5 bis 7.8
        unit: 'mmol/L',
        referenceRange: { low: 3.9, high: 5.6, text: '3.9 - 5.6' },
        interpretation: progressFactor > 0.6 ? 'high' : 'normal',
        isCritical: progressFactor > 0.7,
        comment: progressFactor > 0.7 ? 'Kritisch erhöht - Diabetes-Verdacht' : undefined
      },
      // HbA1c
      {
        loincCode: '4548-4',
        externalCode: 'HBA1C',
        testName: 'HbA1c',
        value: Math.round((5.0 + progressFactor * 1.5) * 10) / 10, // 5.0 bis 6.5
        unit: '%',
        referenceRange: { low: 4.0, high: 5.7, text: '4.0 - 5.7' },
        interpretation: progressFactor > 0.5 ? 'high' : 'normal',
        isCritical: false
      },
      // Kreatinin
      {
        loincCode: '2160-0',
        externalCode: 'CREA',
        testName: 'Kreatinin',
        value: Math.round((0.9 + progressFactor * 0.9) * 10) / 10, // 0.9 bis 1.8
        unit: 'mg/dL',
        referenceRange: { low: 0.7, high: 1.3, text: '0.7 - 1.3' },
        interpretation: progressFactor > 0.5 ? 'high' : 'normal',
        isCritical: progressFactor > 0.7,
        comment: progressFactor > 0.7 ? 'Kritisch erhöht - Nierenfunktion beeinträchtigt' : undefined
      },
      // eGFR
      {
        loincCode: '33914-3',
        externalCode: 'EGFR',
        testName: 'eGFR (geschätzte GFR)',
        value: Math.round(75 - progressFactor * 40), // 75 bis 35
        unit: 'ml/min/1.73m²',
        referenceRange: { low: 60, high: null, text: '> 60' },
        interpretation: progressFactor > 0.5 ? 'low' : 'normal',
        isCritical: progressFactor > 0.6,
        comment: progressFactor > 0.6 ? 'Kritisch niedrig - Niereninsuffizienz Stadium 3' : undefined
      },
      // Kalium
      {
        loincCode: '2823-3',
        externalCode: 'K',
        testName: 'Kalium',
        value: Math.round((4.0 + progressFactor * 1.8) * 10) / 10, // 4.0 bis 5.8
        unit: 'mmol/L',
        referenceRange: { low: 3.5, high: 5.0, text: '3.5 - 5.0' },
        interpretation: progressFactor > 0.5 ? 'high' : 'normal',
        isCritical: progressFactor > 0.7,
        comment: progressFactor > 0.7 ? 'Kritisch erhöht - Hyperkaliämie' : undefined
      },
      // Natrium
      {
        loincCode: '2951-2',
        externalCode: 'NA',
        testName: 'Natrium',
        value: Math.round(140 - progressFactor * 5), // 140 bis 135
        unit: 'mmol/L',
        referenceRange: { low: 136, high: 145, text: '136 - 145' },
        interpretation: progressFactor > 0.4 ? 'low' : 'normal',
        isCritical: false
      },
      // Cholesterin
      {
        loincCode: '2093-3',
        externalCode: 'CHOL',
        testName: 'Gesamt-Cholesterin',
        value: Math.round((4.5 + progressFactor * 1.7) * 10) / 10, // 4.5 bis 6.2
        unit: 'mmol/L',
        referenceRange: { low: 0, high: 5.2, text: '< 5.2' },
        interpretation: progressFactor > 0.3 ? 'high' : 'normal',
        isCritical: false
      },
      // HDL
      {
        loincCode: '2085-9',
        externalCode: 'HDL',
        testName: 'HDL-Cholesterin',
        value: Math.round((1.2 - progressFactor * 0.4) * 10) / 10, // 1.2 bis 0.8
        unit: 'mmol/L',
        referenceRange: { low: 1.0, high: null, text: '> 1.0' },
        interpretation: progressFactor > 0.5 ? 'low' : 'normal',
        isCritical: false
      },
      // LDL
      {
        loincCode: '2089-1',
        externalCode: 'LDL',
        testName: 'LDL-Cholesterin',
        value: Math.round((2.5 + progressFactor * 2.0) * 10) / 10, // 2.5 bis 4.5
        unit: 'mmol/L',
        referenceRange: { low: 0, high: 3.0, text: '< 3.0' },
        interpretation: progressFactor > 0.3 ? 'high' : 'normal',
        isCritical: false
      },
      // Triglyceride
      {
        loincCode: '2571-8',
        externalCode: 'TRIG',
        testName: 'Triglyceride',
        value: Math.round((1.2 + progressFactor * 1.6) * 10) / 10, // 1.2 bis 2.8
        unit: 'mmol/L',
        referenceRange: { low: 0, high: 1.7, text: '< 1.7' },
        interpretation: progressFactor > 0.3 ? 'high' : 'normal',
        isCritical: false
      },
      // Erythrozyten
      {
        loincCode: '789-8',
        externalCode: 'RBC',
        testName: 'Erythrozyten',
        value: Math.round((4.8 - progressFactor * 0.6) * 10) / 10, // 4.8 bis 4.2
        unit: 'T/L',
        referenceRange: { low: 4.0, high: 5.5, text: '4.0 - 5.5' },
        interpretation: 'normal',
        isCritical: false
      },
      // Hämoglobin
      {
        loincCode: '718-7',
        externalCode: 'HGB',
        testName: 'Hämoglobin',
        value: Math.round((14.5 - progressFactor * 2.0) * 10) / 10, // 14.5 bis 12.5
        unit: 'g/dL',
        referenceRange: { low: 13.5, high: 17.5, text: '13.5 - 17.5' },
        interpretation: progressFactor > 0.5 ? 'low' : 'normal',
        isCritical: false
      },
      // Hämatokrit
      {
        loincCode: '777-3',
        externalCode: 'HCT',
        testName: 'Hämatokrit',
        value: Math.round((45.0 - progressFactor * 6.5) * 10) / 10, // 45.0 bis 38.5
        unit: '%',
        referenceRange: { low: 36.0, high: 50.0, text: '36.0 - 50.0' },
        interpretation: 'normal',
        isCritical: false
      },
      // Leukozyten
      {
        loincCode: '6690-2',
        externalCode: 'WBC',
        testName: 'Leukozyten',
        value: Math.round((7.0 + progressFactor * 4.5) * 10) / 10, // 7.0 bis 11.5
        unit: 'G/L',
        referenceRange: { low: 4.0, high: 10.0, text: '4.0 - 10.0' },
        interpretation: progressFactor > 0.4 ? 'high' : 'normal',
        isCritical: false
      },
      // Thrombozyten
      {
        loincCode: '777-3',
        externalCode: 'PLT',
        testName: 'Thrombozyten',
        value: Math.round(300 + progressFactor * 150), // 300 bis 450
        unit: 'G/L',
        referenceRange: { low: 150, high: 400, text: '150 - 400' },
        interpretation: progressFactor > 0.5 ? 'high' : 'normal',
        isCritical: false
      },
      // TSH
      {
        loincCode: '33914-3',
        externalCode: 'TSH',
        testName: 'TSH (Thyreoidea-stimulierendes Hormon)',
        value: Math.round((2.0 - progressFactor * 1.9) * 10) / 10, // 2.0 bis 0.1
        unit: 'mU/L',
        referenceRange: { low: 0.4, high: 4.0, text: '0.4 - 4.0' },
        interpretation: progressFactor > 0.8 ? 'low' : 'normal',
        isCritical: progressFactor > 0.9,
        comment: progressFactor > 0.9 ? 'Kritisch niedrig - Hyperthyreose-Verdacht' : undefined
      },
      // T3
      {
        loincCode: '3053-3',
        externalCode: 'T3',
        testName: 'T3 (Triiodthyronin)',
        value: Math.round((1.5 + progressFactor * 0.8) * 10) / 10, // 1.5 bis 2.3
        unit: 'nmol/L',
        referenceRange: { low: 1.2, high: 2.2, text: '1.2 - 2.2' },
        interpretation: progressFactor > 0.6 ? 'high' : 'normal',
        isCritical: false
      },
      // T4
      {
        loincCode: '3055-8',
        externalCode: 'T4',
        testName: 'T4 (Thyroxin)',
        value: Math.round((90 + progressFactor * 30) * 10) / 10, // 90 bis 120
        unit: 'nmol/L',
        referenceRange: { low: 70, high: 140, text: '70 - 140' },
        interpretation: 'normal',
        isCritical: false
      },
      // ALT
      {
        loincCode: '1742-6',
        externalCode: 'ALT',
        testName: 'ALT (Alanin-Aminotransferase)',
        value: Math.round(25 + progressFactor * 60), // 25 bis 85
        unit: 'U/L',
        referenceRange: { low: 0, high: 40, text: '< 40' },
        interpretation: progressFactor > 0.25 ? 'high' : 'normal',
        isCritical: false
      },
      // AST
      {
        loincCode: '1975-2',
        externalCode: 'AST',
        testName: 'AST (Aspartat-Aminotransferase)',
        value: Math.round(20 + progressFactor * 52), // 20 bis 72
        unit: 'U/L',
        referenceRange: { low: 0, high: 40, text: '< 40' },
        interpretation: progressFactor > 0.35 ? 'high' : 'normal',
        isCritical: false
      },
      // GGT
      {
        loincCode: '2324-2',
        externalCode: 'GGT',
        testName: 'GGT (Gamma-Glutamyltransferase)',
        value: Math.round(30 + progressFactor * 65), // 30 bis 95
        unit: 'U/L',
        referenceRange: { low: 0, high: 60, text: '< 60' },
        interpretation: progressFactor > 0.45 ? 'high' : 'normal',
        isCritical: false
      },
      // Bilirubin gesamt
      {
        loincCode: '1975-2',
        externalCode: 'BILT',
        testName: 'Bilirubin gesamt',
        value: Math.round((0.8 + progressFactor * 0.7) * 10) / 10, // 0.8 bis 1.5
        unit: 'mg/dL',
        referenceRange: { low: 0.2, high: 1.2, text: '0.2 - 1.2' },
        interpretation: progressFactor > 0.5 ? 'high' : 'normal',
        isCritical: false
      },
      // Albumin
      {
        loincCode: '1751-7',
        externalCode: 'ALB',
        testName: 'Albumin',
        value: Math.round((4.2 - progressFactor * 1.0) * 10) / 10, // 4.2 bis 3.2
        unit: 'g/dL',
        referenceRange: { low: 3.5, high: 5.0, text: '3.5 - 5.0' },
        interpretation: progressFactor > 0.5 ? 'low' : 'normal',
        isCritical: false
      },
      // CRP
      {
        loincCode: '1978-6',
        externalCode: 'CRP',
        testName: 'CRP (C-reaktives Protein)',
        value: Math.round(2 + progressFactor * 43), // 2 bis 45
        unit: 'mg/L',
        referenceRange: { low: 0, high: 3, text: '< 3' },
        interpretation: progressFactor > 0.05 ? 'high' : 'normal',
        isCritical: false
      },
      // Ferritin
      {
        loincCode: '2276-4',
        externalCode: 'FERR',
        testName: 'Ferritin',
        value: Math.round(80 - progressFactor * 30), // 80 bis 50
        unit: 'ng/mL',
        referenceRange: { low: 15, high: 200, text: '15 - 200' },
        interpretation: 'normal',
        isCritical: false
      },
      // Vitamin B12
      {
        loincCode: '2132-9',
        externalCode: 'B12',
        testName: 'Vitamin B12',
        value: Math.round(350 - progressFactor * 100), // 350 bis 250
        unit: 'pg/mL',
        referenceRange: { low: 200, high: 900, text: '200 - 900' },
        interpretation: 'normal',
        isCritical: false
      },
      // Folsäure
      {
        loincCode: '2284-8',
        externalCode: 'FOL',
        testName: 'Folsäure',
        value: Math.round((8.5 - progressFactor * 2.0) * 10) / 10, // 8.5 bis 6.5
        unit: 'ng/mL',
        referenceRange: { low: 3.0, high: 17.0, text: '3.0 - 17.0' },
        interpretation: 'normal',
        isCritical: false
      },
      // Harnsäure
      {
        loincCode: '3084-1',
        externalCode: 'UA',
        testName: 'Harnsäure',
        value: Math.round((4.5 + progressFactor * 1.5) * 10) / 10, // 4.5 bis 6.0
        unit: 'mg/dL',
        referenceRange: { low: 3.5, high: 7.0, text: '3.5 - 7.0' },
        interpretation: 'normal',
        isCritical: false
      },
      // Phosphat
      {
        loincCode: '2777-1',
        externalCode: 'PHOS',
        testName: 'Phosphat',
        value: Math.round((3.5 - progressFactor * 0.3) * 10) / 10, // 3.5 bis 3.2
        unit: 'mg/dL',
        referenceRange: { low: 2.5, high: 4.5, text: '2.5 - 4.5' },
        interpretation: 'normal',
        isCritical: false
      },
      // Calcium
      {
        loincCode: '17861-6',
        externalCode: 'CA',
        testName: 'Calcium',
        value: Math.round((9.8 - progressFactor * 0.5) * 10) / 10, // 9.8 bis 9.3
        unit: 'mg/dL',
        referenceRange: { low: 8.5, high: 10.5, text: '8.5 - 10.5' },
        interpretation: 'normal',
        isCritical: false
      },
      // Magnesium
      {
        loincCode: '19123-9',
        externalCode: 'MG',
        testName: 'Magnesium',
        value: Math.round((2.1 - progressFactor * 0.2) * 10) / 10, // 2.1 bis 1.9
        unit: 'mg/dL',
        referenceRange: { low: 1.7, high: 2.2, text: '1.7 - 2.2' },
        interpretation: 'normal',
        isCritical: false
      },
      // Mikrobiologie - Urinkultur
      {
        loincCode: '630-4',
        externalCode: 'URCULT',
        testName: 'Urinkultur',
        value: progressFactor > 0.3 ? 'E. coli > 10^5 KBE/ml' : 'Kein Wachstum',
        unit: '',
        referenceRange: { text: 'Kein Wachstum' },
        interpretation: progressFactor > 0.3 ? 'abnormal' : 'normal',
        isCritical: progressFactor > 0.5,
        comment: progressFactor > 0.5 ? 'Signifikante Bakteriurie - E. coli nachgewiesen' : undefined
      },
      // Mikrobiologie - Blutkultur
      {
        loincCode: '600-7',
        externalCode: 'BLCULT',
        testName: 'Blutkultur',
        value: progressFactor > 0.6 ? 'Staphylococcus aureus' : 'Kein Wachstum',
        unit: '',
        referenceRange: { text: 'Kein Wachstum' },
        interpretation: progressFactor > 0.6 ? 'abnormal' : 'normal',
        isCritical: progressFactor > 0.6,
        comment: progressFactor > 0.6 ? 'Bakteriämie - Staphylococcus aureus nachgewiesen' : undefined
      },
      // Mikrobiologie - Antibiogramm (Resistenztest)
      {
        loincCode: '29576-6',
        externalCode: 'ABG',
        testName: 'Antibiogramm (E. coli)',
        value: progressFactor > 0.3 ? 'Ampicillin: R, Ciprofloxacin: S, Ceftriaxon: S' : 'Nicht durchgeführt',
        unit: '',
        referenceRange: { text: 'S = Sensibel, R = Resistent' },
        interpretation: progressFactor > 0.3 ? 'abnormal' : 'normal',
        isCritical: false
      },
      // Mikrobiologie - PCR (z.B. für Viren)
      {
        loincCode: '68947-0',
        externalCode: 'PCR_COVID',
        testName: 'SARS-CoV-2 PCR',
        value: progressFactor < 0.2 ? 'Positiv' : 'Negativ',
        unit: '',
        referenceRange: { text: 'Negativ' },
        interpretation: progressFactor < 0.2 ? 'abnormal' : 'normal',
        isCritical: progressFactor < 0.2,
        comment: progressFactor < 0.2 ? 'SARS-CoV-2 nachgewiesen' : undefined
      },
      // Mikrobiologie - Antigen-Test
      {
        loincCode: '94558-4',
        externalCode: 'AG_STREP',
        testName: 'Streptokokken-Antigen (Schnelltest)',
        value: progressFactor > 0.4 && progressFactor < 0.7 ? 'Positiv' : 'Negativ',
        unit: '',
        referenceRange: { text: 'Negativ' },
        interpretation: (progressFactor > 0.4 && progressFactor < 0.7) ? 'abnormal' : 'normal',
        isCritical: false
      }
    ];

    // Zufällige Variationen hinzufügen (realistischer)
    const variedResults = results.map(test => {
      const variation = (Math.random() - 0.5) * 0.1; // ±5% Variation
      const newValue = typeof test.value === 'number' ? test.value * (1 + variation) : test.value;
      return {
        ...test,
        value: typeof newValue === 'number' ? Math.round(newValue * 10) / 10 : newValue
      };
    });

    const criticalCount = variedResults.filter(r => r.isCritical).length;
    const hasCritical = criticalCount > 0;

    const result = new LaborResult({
      patientId: patientId,
      providerId: provider._id,
      externalId: `LAB-${timePoint.days}-${Date.now()}`,
      orderNumber: `ORD-2024-${String(timePoint.days).padStart(3, '0')}`,
      collectionDate: resultDate,
      analysisDate: resultDate,
      resultDate: resultDate,
      receivedAt: resultDate,
      status: 'final',
      results: variedResults,
      interpretation: hasCritical 
        ? `Mehrere pathologische Befunde. ${criticalCount} kritische Werte.`
        : 'Mehrere Werte außerhalb des Referenzbereichs.',
      laboratoryComment: hasCritical 
        ? `Kritische Werte vorhanden. Bitte umgehende ärztliche Kontrolle.`
        : undefined,
      metadata: {
        sourceFormat: 'json',
        mappingVersion: '1.0'
      },
      processingStatus: 'mapped'
    });

    allResults.push(result);
    console.log(`✅ ${timePoint.label}: ${variedResults.length} Tests, ${criticalCount} kritisch`);
  }

  // Alle Ergebnisse speichern
  await LaborResult.insertMany(allResults);
  console.log(`\n✅ Gesamt: ${allResults.length} Laborwerte mit ${allResults.reduce((sum, r) => sum + r.results.length, 0)} Test-Ergebnissen erstellt`);
}

if (require.main === module) {
  createExtendedLaborResults();
}

module.exports = { createExtendedLaborResults };

