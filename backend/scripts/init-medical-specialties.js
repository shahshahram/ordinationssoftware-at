const mongoose = require('mongoose');
require('dotenv').config();

const MedicalSpecialty = require('../models/MedicalSpecialty');

const defaultSpecialties = [
  { code: 'allgemeinmedizin', name: 'Allgemeinmedizin', category: 'innere_medizin', sortOrder: 1 },
  { code: 'chirurgie', name: 'Chirurgie', category: 'chirurgie', sortOrder: 2 },
  { code: 'aesthetische_plastische_chirurgie', name: 'Ästhetische und plastische Chirurgie', category: 'chirurgie', sortOrder: 3 },
  { code: 'dermatologie', name: 'Dermatologie', category: 'therapie', sortOrder: 4 },
  { code: 'gynaekologie', name: 'Gynäkologie', category: 'therapie', sortOrder: 5 },
  { code: 'orthopaedie', name: 'Orthopädie', category: 'chirurgie', sortOrder: 6 },
  { code: 'neurologie', name: 'Neurologie', category: 'innere_medizin', sortOrder: 7 },
  { code: 'kardiologie', name: 'Kardiologie', category: 'innere_medizin', sortOrder: 8 },
  { code: 'pneumologie', name: 'Pneumologie', category: 'innere_medizin', sortOrder: 9 },
  { code: 'gastroenterologie', name: 'Gastroenterologie', category: 'innere_medizin', sortOrder: 10 },
  { code: 'urologie', name: 'Urologie', category: 'chirurgie', sortOrder: 11 },
  { code: 'ophthalmologie', name: 'Ophthalmologie', category: 'therapie', sortOrder: 12 },
  { code: 'hno', name: 'HNO', category: 'chirurgie', sortOrder: 13 },
  { code: 'psychiatrie', name: 'Psychiatrie', category: 'therapie', sortOrder: 14 },
  { code: 'radiologie', name: 'Radiologie', category: 'diagnostik', sortOrder: 15 },
  { code: 'labor', name: 'Labor', category: 'diagnostik', sortOrder: 16 },
  { code: 'pathologie', name: 'Pathologie', category: 'diagnostik', sortOrder: 17 },
  { code: 'anästhesie', name: 'Anästhesie', category: 'chirurgie', sortOrder: 18 },
  { code: 'notfallmedizin', name: 'Notfallmedizin', category: 'sonstiges', sortOrder: 19 },
  { code: 'sportmedizin', name: 'Sportmedizin', category: 'therapie', sortOrder: 20 },
  { code: 'arbeitsmedizin', name: 'Arbeitsmedizin', category: 'sonstiges', sortOrder: 21 },
];

async function initMedicalSpecialties() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Verbunden mit MongoDB');

    let created = 0;
    let skipped = 0;

    for (const specialty of defaultSpecialties) {
      const existing = await MedicalSpecialty.findOne({ code: specialty.code });
      if (existing) {
        console.log(`⏭️  Fachrichtung bereits vorhanden: ${specialty.name}`);
        skipped++;
      } else {
        await MedicalSpecialty.create({
          ...specialty,
          isActive: true,
        });
        console.log(`✅ Fachrichtung erstellt: ${specialty.name}`);
        created++;
      }
    }

    console.log(`\n📊 Zusammenfassung:`);
    console.log(`   ✅ Erstellt: ${created}`);
    console.log(`   ⏭️  Übersprungen: ${skipped}`);
    console.log(`   📋 Gesamt: ${defaultSpecialties.length}`);

    await mongoose.connection.close();
    console.log('✅ Verbindung geschlossen');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

initMedicalSpecialties();

