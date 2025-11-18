/**
 * Skript zum Aktualisieren aller Ambulanzbefunde ohne patientModel
 * Setzt patientModel basierend auf der vorhandenen patientId automatisch
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Ambulanzbefund = require('../models/Ambulanzbefund');
const Patient = require('../models/Patient');
const PatientExtended = require('../models/PatientExtended');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/ordinationssoftware';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB verbunden\n');
  } catch (error) {
    console.error('❌ Fehler bei MongoDB-Verbindung:', error);
    process.exit(1);
  }
};

const fixAmbulanzbefunde = async () => {
  try {
    console.log('=== AMBULANZBEFUNDE OHNE patientModel AKTUALISIEREN ===\n');

    // Finde alle Ambulanzbefunde ohne patientModel
    const ambefundeOhneModel = await Ambulanzbefund.find({
      $or: [
        { patientModel: { $exists: false } },
        { patientModel: null }
      ],
      patientId: { $ne: null } // Nur welche mit patientId
    }).lean();

    if (ambefundeOhneModel.length === 0) {
      console.log('✅ Alle Ambulanzbefunde haben bereits ein patientModel.\n');
      return;
    }

    console.log(`📊 Gefunden: ${ambefundeOhneModel.length} Ambulanzbefunde ohne patientModel\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const amb of ambefundeOhneModel) {
      const patientId = amb.patientId ? amb.patientId.toString() : null;
      
      if (!patientId) {
        console.log(`⚠️  Ambulanzbefund ${amb.documentNumber || amb._id}: patientId ist null - übersprungen`);
        skipped++;
        continue;
      }

      try {
        // Prüfe zuerst PatientExtended
        const patientInExtended = await PatientExtended.findById(patientId).lean();
        
        let patientModel;
        if (patientInExtended) {
          patientModel = 'PatientExtended';
        } else {
          // Dann Patient
          const patientInBasic = await Patient.findById(patientId).lean();
          if (patientInBasic) {
            patientModel = 'Patient';
          } else {
            console.log(`❌ Ambulanzbefund ${amb.documentNumber || amb._id}: Patient ${patientId} nicht gefunden (weder in Patient noch PatientExtended)`);
            errors++;
            continue;
          }
        }

        // Aktualisiere den Ambulanzbefund
        await Ambulanzbefund.findByIdAndUpdate(
          amb._id,
          { patientModel },
          { runValidators: false }
        );

        console.log(`✅ ${amb.documentNumber || amb._id}: patientModel auf "${patientModel}" gesetzt`);
        updated++;
      } catch (error) {
        console.error(`❌ Fehler bei Ambulanzbefund ${amb.documentNumber || amb._id}:`, error.message);
        errors++;
      }
    }

    console.log(`\n=== ZUSAMMENFASSUNG ===`);
    console.log(`✅ Aktualisiert: ${updated}`);
    console.log(`⚠️  Übersprungen: ${skipped}`);
    console.log(`❌ Fehler: ${errors}`);
    console.log(`\n✅ Fertig.\n`);

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
  }
};

connectDB().then(fixAmbulanzbefunde);



