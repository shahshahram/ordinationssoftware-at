const mongoose = require('mongoose');
const LaborResult = require('../models/LaborResult');
const Patient = require('../models/PatientExtended');
require('dotenv').config();

async function checkLaborResults() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware');
    console.log('✅ MongoDB verbunden');

    // Finde alle Laborwerte
    const allResults = await LaborResult.find().lean();
    console.log(`\n📊 Gesamt: ${allResults.length} Laborwerte gefunden\n`);

    // Finde Patienten mit "Test" im Namen
    const testPatients = await Patient.find({
      $or: [
        { firstName: { $regex: /test/i } },
        { lastName: { $regex: /test/i } }
      ]
    }).lean();

    console.log(`\n👥 Test-Patienten gefunden: ${testPatients.length}`);
    testPatients.forEach(p => {
      console.log(`  - ${p.firstName} ${p.lastName} (ID: ${p._id})`);
    });

    // Prüfe Laborwerte für jeden Test-Patienten
    for (const patient of testPatients) {
      const patientResults = allResults.filter(r => 
        r.patientId && r.patientId.toString() === patient._id.toString()
      );
      
      console.log(`\n📋 Laborwerte für ${patient.firstName} ${patient.lastName}:`);
      console.log(`   Anzahl: ${patientResults.length}`);
      
      patientResults.forEach((result, idx) => {
        const criticalCount = (result.results || []).filter(r => r.isCritical).length || 0;
        console.log(`   ${idx + 1}. ${new Date(result.resultDate).toLocaleDateString('de-DE')} - ${(result.results || []).length || 0} Tests, ${criticalCount} kritisch`);
      });
    }

    // Zeige alle Laborwerte mit Patient-Info
    console.log(`\n\n🔍 Alle Laborwerte im Detail:\n`);
    for (const result of allResults) {
      const patient = await Patient.findById(result.patientId).lean();
      const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unbekannt';
      const criticalCount = (result.results || []).filter(r => r.isCritical).length || 0;
      
      console.log(`ID: ${result._id}`);
      console.log(`Patient: ${patientName} (${result.patientId})`);
      console.log(`Datum: ${new Date(result.resultDate).toLocaleDateString('de-DE')}`);
      console.log(`Tests: ${result.results?.length || 0}, Kritisch: ${criticalCount}`);
      console.log(`---`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

checkLaborResults();

