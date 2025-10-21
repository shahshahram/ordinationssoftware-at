const mongoose = require('mongoose');
const Icd10Catalog = require('../models/Icd10Catalog');
require('dotenv').config();

// Sample ICD-10 data for testing
const sampleIcd10Data = [
  // Kapitel I - Krankheiten des Kreislaufsystems
  {
    code: 'I10',
    title: 'Essentielle (primäre) Hypertonie',
    longTitle: 'Essentielle (primäre) Hypertonie',
    chapter: 'I',
    synonyms: ['Bluthochdruck', 'arterielle Hypertonie', 'Hypertonie'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: null,
    isActive: true,
    sortOrder: 1
  },
  {
    code: 'I10.0',
    title: 'Benigne essentielle Hypertonie',
    longTitle: 'Benigne essentielle Hypertonie',
    chapter: 'I',
    synonyms: ['benigne Hypertonie', 'milde Hypertonie'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: 'I10',
    isActive: true,
    sortOrder: 2
  },
  {
    code: 'I10.1',
    title: 'Maligne essentielle Hypertonie',
    longTitle: 'Maligne essentielle Hypertonie',
    chapter: 'I',
    synonyms: ['maligne Hypertonie', 'schwere Hypertonie'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: 'I10',
    isActive: true,
    sortOrder: 3
  },
  {
    code: 'I20',
    title: 'Angina pectoris',
    longTitle: 'Angina pectoris',
    chapter: 'I',
    synonyms: ['Brustschmerz', 'Herzschmerz', 'Koronarsyndrom'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: null,
    isActive: true,
    sortOrder: 4
  },
  {
    code: 'I20.0',
    title: 'Instabile Angina pectoris',
    longTitle: 'Instabile Angina pectoris',
    chapter: 'I',
    synonyms: ['instabile Angina', 'akutes Koronarsyndrom'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: 'I20',
    isActive: true,
    sortOrder: 5
  },
  {
    code: 'I21',
    title: 'ST-Hebungsinfarkt (STEMI)',
    longTitle: 'ST-Hebungsinfarkt (STEMI)',
    chapter: 'I',
    synonyms: ['Herzinfarkt', 'Myokardinfarkt', 'STEMI'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: null,
    isActive: true,
    sortOrder: 6
  },

  // Kapitel E - Endokrine, Ernährungs- und Stoffwechselkrankheiten
  {
    code: 'E10',
    title: 'Diabetes mellitus, Typ 1',
    longTitle: 'Diabetes mellitus, Typ 1',
    chapter: 'E',
    synonyms: ['Typ-1-Diabetes', 'juveniler Diabetes', 'Insulin-abhängiger Diabetes'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: null,
    isActive: true,
    sortOrder: 7
  },
  {
    code: 'E11',
    title: 'Diabetes mellitus, Typ 2',
    longTitle: 'Diabetes mellitus, Typ 2',
    chapter: 'E',
    synonyms: ['Typ-2-Diabetes', 'Altersdiabetes', 'nicht-insulin-abhängiger Diabetes'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: null,
    isActive: true,
    sortOrder: 8
  },
  {
    code: 'E11.0',
    title: 'Diabetes mellitus, Typ 2, ohne Komplikationen',
    longTitle: 'Diabetes mellitus, Typ 2, ohne Komplikationen',
    chapter: 'E',
    synonyms: ['unkomplizierter Typ-2-Diabetes'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: 'E11',
    isActive: true,
    sortOrder: 9
  },
  {
    code: 'E11.1',
    title: 'Diabetes mellitus, Typ 2, mit Ketoazidose',
    longTitle: 'Diabetes mellitus, Typ 2, mit Ketoazidose',
    chapter: 'E',
    synonyms: ['Typ-2-Diabetes mit Ketoazidose'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: 'E11',
    isActive: true,
    sortOrder: 10
  },

  // Kapitel F - Psychische und Verhaltensstörungen
  {
    code: 'F32',
    title: 'Depressive Episode',
    longTitle: 'Depressive Episode',
    chapter: 'F',
    synonyms: ['Depression', 'depressive Störung', 'Melancholie'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: null,
    isActive: true,
    sortOrder: 11
  },
  {
    code: 'F32.0',
    title: 'Leichte depressive Episode',
    longTitle: 'Leichte depressive Episode',
    chapter: 'F',
    synonyms: ['leichte Depression'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: 'F32',
    isActive: true,
    sortOrder: 12
  },
  {
    code: 'F32.1',
    title: 'Mittelschwere depressive Episode',
    longTitle: 'Mittelschwere depressive Episode',
    chapter: 'F',
    synonyms: ['mittelschwere Depression'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: 'F32',
    isActive: true,
    sortOrder: 13
  },
  {
    code: 'F32.2',
    title: 'Schwere depressive Episode ohne psychotische Symptome',
    longTitle: 'Schwere depressive Episode ohne psychotische Symptome',
    chapter: 'F',
    synonyms: ['schwere Depression'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: 'F32',
    isActive: true,
    sortOrder: 14
  },
  {
    code: 'F41',
    title: 'Andere Angststörungen',
    longTitle: 'Andere Angststörungen',
    chapter: 'F',
    synonyms: ['Angststörung', 'Angst', 'Panikstörung'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: null,
    isActive: true,
    sortOrder: 15
  },

  // Kapitel M - Krankheiten des Muskel-Skelett-Systems
  {
    code: 'M25',
    title: 'Sonstige Gelenkkrankheiten',
    longTitle: 'Sonstige Gelenkkrankheiten, anderenorts nicht klassifiziert',
    chapter: 'M',
    synonyms: ['Gelenkschmerzen', 'Gelenkprobleme'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: false, // Sammelcode
    parentCode: null,
    isActive: true,
    sortOrder: 16
  },
  {
    code: 'M25.5',
    title: 'Gelenkschmerz',
    longTitle: 'Gelenkschmerz',
    chapter: 'M',
    synonyms: ['Arthralgie', 'Gelenkschmerzen'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: 'M25',
    isActive: true,
    sortOrder: 17
  },
  {
    code: 'M79',
    title: 'Sonstige Krankheiten des Weichteilgewebes',
    longTitle: 'Sonstige Krankheiten des Weichteilgewebes, anderenorts nicht klassifiziert',
    chapter: 'M',
    synonyms: ['Weichteilrheuma', 'Fibromyalgie'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: false, // Sammelcode
    parentCode: null,
    isActive: true,
    sortOrder: 18
  },

  // Kapitel R - Symptome und abnorme klinische und Laborbefunde
  {
    code: 'R50',
    title: 'Fieber unbekannter Ursache',
    longTitle: 'Fieber unbekannter Ursache',
    chapter: 'R',
    synonyms: ['Fieber', 'Pyrexie', 'Temperaturerhöhung'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: null,
    isActive: true,
    sortOrder: 19
  },
  {
    code: 'R06',
    title: 'Abnormitäten der Atmung',
    longTitle: 'Abnormitäten der Atmung',
    chapter: 'R',
    synonyms: ['Atemnot', 'Dyspnoe', 'Atemstörung'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: false, // Sammelcode
    parentCode: null,
    isActive: true,
    sortOrder: 20
  },
  {
    code: 'R06.0',
    title: 'Dyspnoe',
    longTitle: 'Dyspnoe',
    chapter: 'R',
    synonyms: ['Atemnot', 'Kurzatmigkeit'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: 'R06',
    isActive: true,
    sortOrder: 21
  },

  // Kapitel Z - Faktoren, die den Gesundheitszustand beeinflussen
  {
    code: 'Z00',
    title: 'Allgemeine Untersuchung und Verlaufskontrolle',
    longTitle: 'Allgemeine Untersuchung und Verlaufskontrolle von Personen ohne Beschwerden oder angegebene Diagnose',
    chapter: 'Z',
    synonyms: ['Vorsorgeuntersuchung', 'Check-up', 'Gesundheitsuntersuchung'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: null,
    isActive: true,
    sortOrder: 22
  },
  {
    code: 'Z01',
    title: 'Untersuchung und Beobachtung aus anderen Gründen',
    longTitle: 'Untersuchung und Beobachtung aus anderen Gründen',
    chapter: 'Z',
    synonyms: ['Nachsorge', 'Kontrolle', 'Follow-up'],
    language: 'de',
    validFrom: new Date('2025-01-01'),
    validTo: null,
    releaseYear: 2025,
    isBillable: true,
    parentCode: null,
    isActive: true,
    sortOrder: 23
  }
];

async function importIcd10Data() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('MongoDB verbunden');

    // Clear existing data for the current year
    const currentYear = new Date().getFullYear();
    await Icd10Catalog.deleteMany({ releaseYear: currentYear });
    console.log(`Bestehende ICD-10 Daten für Jahr ${currentYear} gelöscht`);

    // Insert sample data
    const insertedData = await Icd10Catalog.insertMany(sampleIcd10Data);
    console.log(`${insertedData.length} ICD-10 Codes importiert`);

    // Drop existing text index if it exists
    try {
      await Icd10Catalog.collection.dropIndex('code_text_title_text_longTitle_text_synonyms_text');
    } catch (error) {
      // Index doesn't exist, continue
    }

    // Create indexes
    await Icd10Catalog.collection.createIndex({ code: 1, releaseYear: 1 }, { unique: true });
    await Icd10Catalog.collection.createIndex({ 
      code: 'text', 
      title: 'text', 
      longTitle: 'text', 
      synonyms: 'text' 
    }, { default_language: 'german' });
    await Icd10Catalog.collection.createIndex({ releaseYear: 1, isActive: 1, isBillable: 1 });
    console.log('Indizes erstellt');

    // Display summary
    const totalCodes = await Icd10Catalog.countDocuments({ releaseYear: currentYear });
    const billableCodes = await Icd10Catalog.countDocuments({ releaseYear: currentYear, isBillable: true });
    const chapterCounts = await Icd10Catalog.aggregate([
      { $match: { releaseYear: currentYear } },
      { $group: { _id: '$chapter', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    console.log('\n=== Import-Zusammenfassung ===');
    console.log(`Jahr: ${currentYear}`);
    console.log(`Gesamt Codes: ${totalCodes}`);
    console.log(`Abrechenbare Codes: ${billableCodes}`);
    console.log(`Sammelcodes: ${totalCodes - billableCodes}`);
    console.log('\nKapitel-Verteilung:');
    chapterCounts.forEach(chapter => {
      console.log(`  ${chapter._id}: ${chapter.count} Codes`);
    });

    console.log('\nICD-10 Testdaten erfolgreich importiert!');
    
  } catch (error) {
    console.error('Fehler beim Importieren der ICD-10 Daten:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Verbindung geschlossen');
  }
}

// Run the import
if (require.main === module) {
  importIcd10Data();
}

module.exports = importIcd10Data;
