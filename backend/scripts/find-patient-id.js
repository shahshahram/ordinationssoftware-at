/**
 * Hilfsskript: Findet Patient-IDs
 * 
 * Verwendung:
 * node backend/scripts/find-patient-id.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const PatientExtended = require('../models/PatientExtended');
const Patient = require('../models/Patient');

async function findPatients() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware';
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Verbunden mit MongoDB\n');
    
    // Suche in PatientExtended
    const patientsExtended = await PatientExtended.find().limit(10).select('_id firstName lastName dateOfBirth');
    
    // Suche in Patient
    const patients = await Patient.find().limit(10).select('_id firstName lastName dateOfBirth');
    
    console.log('📋 Verfügbare Patienten:\n');
    
    if (patientsExtended.length > 0) {
      console.log('PatientExtended:');
      patientsExtended.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.firstName} ${p.lastName}`);
        console.log(`     ID: ${p._id}`);
        console.log(`     Geburtsdatum: ${p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('de-DE') : 'N/A'}`);
        console.log('');
      });
    }
    
    if (patients.length > 0) {
      console.log('Patient:');
      patients.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.firstName} ${p.lastName}`);
        console.log(`     ID: ${p._id}`);
        console.log(`     Geburtsdatum: ${p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('de-DE') : 'N/A'}`);
        console.log('');
      });
    }
    
    if (patientsExtended.length === 0 && patients.length === 0) {
      console.log('⚠️  Keine Patienten gefunden. Bitte erstellen Sie zuerst einen Patienten in der Software.');
    } else {
      console.log('\n💡 Kopieren Sie eine Patient-ID und verwenden Sie sie im Laborsystem-Simulator:');
      console.log('   node backend/scripts/simulateLaborSystem.js [PATIENT_ID]');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  }
}

findPatients();












