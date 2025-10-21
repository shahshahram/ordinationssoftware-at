const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const Icd10Catalog = require('../models/Icd10Catalog');

// MongoDB Verbindung
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB verbunden');
  } catch (error) {
    console.error('MongoDB Verbindungsfehler:', error);
    process.exit(1);
  }
};

// Österreichischen ICD-10 Katalog importieren
const importAustrianIcd10 = async (filePath, year = 2025) => {
  try {
    console.log(`📥 Importiere österreichischen ICD-10 Katalog ${year}...`);
    
    // Excel-Datei lesen
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // In JSON konvertieren
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`📊 Gefunden: ${data.length} Zeilen`);
    
    // Header-Zeile überspringen und Daten verarbeiten
    const records = [];
    const codeMap = new Map(); // Für Duplikat-Behandlung
    let processed = 0;
    let errors = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Leere Zeilen überspringen
      if (!row || row.length < 2 || !row[0] || !row[1]) {
        continue;
      }
      
      try {
        const bezeichnung = row[0]?.toString().trim();
        const code = row[1]?.toString().trim();
        const kennz = row[2]?.toString().trim();
        const icd10 = row[3]?.toString().trim();
        
        // Code validieren
        if (!code || !bezeichnung) {
          continue;
        }
        
        // Kennz. interpretieren
        let isBillable = true;
        let codeType = 'standard';
        
        if (kennz === '#') {
          isBillable = true;
          codeType = 'billable';
        } else if (kennz === '+') {
          isBillable = true;
          codeType = 'additional';
        } else if (kennz === '!') {
          isBillable = false;
          codeType = 'exclusion';
        } else if (kennz === '*') {
          isBillable = true;
          codeType = 'mortality';
        } else {
          // Standard: meist abrechenbar
          isBillable = true;
          codeType = 'standard';
        }
        
        // Kapitel extrahieren
        const chapter = code.charAt(0);
        
        // Parent Code bestimmen (für Unterkategorien)
        let parentCode = '';
        if (code.includes('.')) {
          parentCode = code.split('.')[0];
        }
        
        // Level bestimmen
        let level = 1;
        if (code.includes('.')) {
          level = 2;
          if (code.split('.')[1].length > 1) {
            level = 3;
          }
        }
        
        // Duplikat-Behandlung: Wenn Code bereits existiert, Synonyme hinzufügen
        if (codeMap.has(code)) {
          const existingRecord = codeMap.get(code);
          // Synonym hinzufügen, wenn Bezeichnung anders ist
          if (existingRecord.title !== bezeichnung) {
            existingRecord.synonyms.push(bezeichnung);
            existingRecord.searchText += ` ${bezeichnung}`.toLowerCase();
          }
          // Kennz. und andere Felder aktualisieren falls nötig
          if (kennz && !existingRecord.kennz) {
            existingRecord.kennz = kennz;
            existingRecord.isBillable = isBillable;
            existingRecord.codeType = codeType;
          }
        } else {
          const record = {
            code: code,
            title: bezeichnung,
            longTitle: bezeichnung, // Österreichischer Katalog hat nur einen Titel
            chapter: chapter,
            synonyms: [], // Keine Synonyme im österreichischen Katalog
            language: 'de',
            validFrom: new Date(`${year}-01-01`),
            validTo: new Date(`${year}-12-31`),
            releaseYear: year,
            isBillable: isBillable,
            parentCode: parentCode,
            searchText: `${code} ${bezeichnung}`.toLowerCase(),
            isActive: true,
            sortOrder: processed,
            level: level,
            chapterName: getChapterName(chapter),
            codeType: codeType,
            kennz: kennz || '',
            icd10: icd10 || '',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          codeMap.set(code, record);
          records.push(record);
        }
        
        processed++;
        
        if (processed % 10000 === 0) {
          console.log(`📈 Verarbeitet: ${processed} Einträge...`);
        }
        
      } catch (error) {
        errors.push({
          row: i + 1,
          error: error.message,
          data: row
        });
      }
    }
    
    console.log(`✅ Verarbeitung abgeschlossen: ${processed} gültige Einträge`);
    console.log(`❌ Fehler: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('Erste 5 Fehler:');
      errors.slice(0, 5).forEach(err => {
        console.log(`  Zeile ${err.row}: ${err.error}`);
      });
    }
    
    // Alte Einträge für das Jahr löschen
    console.log(`🗑️ Lösche alte Einträge für Jahr ${year}...`);
    await Icd10Catalog.deleteMany({ releaseYear: year });
    
    // Neue Einträge in Batches einfügen
    console.log(`💾 Speichere ${records.length} Einträge in Datenbank...`);
    const batchSize = 1000;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await Icd10Catalog.insertMany(batch);
      console.log(`📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)} gespeichert`);
    }
    
    // Text-Index erstellen
    console.log('🔍 Erstelle Text-Index für Suche...');
    try {
      await Icd10Catalog.collection.dropIndex('searchText_text');
    } catch (e) {
      // Index existiert nicht, das ist OK
    }
    
    await Icd10Catalog.collection.createIndex(
      { searchText: 'text' },
      { 
        name: 'searchText_text',
        weights: { 
          code: 10, 
          title: 5, 
          longTitle: 3 
        }
      }
    );
    
    console.log('✅ Text-Index erstellt');
    
    // Statistiken
    const stats = await Icd10Catalog.aggregate([
      { $match: { releaseYear: year } },
      {
        $group: {
          _id: '$chapter',
          count: { $sum: 1 },
          billable: { $sum: { $cond: ['$isBillable', 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n📊 Import-Statistiken:');
    console.log('Kapitel | Anzahl | Abrechenbar');
    console.log('--------|--------|------------');
    stats.forEach(stat => {
      console.log(`${stat._id.padEnd(7)} | ${stat.count.toString().padStart(6)} | ${stat.billable.toString().padStart(10)}`);
    });
    
    const total = await Icd10Catalog.countDocuments({ releaseYear: year });
    const billable = await Icd10Catalog.countDocuments({ releaseYear: year, isBillable: true });
    
    console.log(`\n🎯 Gesamt: ${total} Codes`);
    console.log(`💰 Abrechenbar: ${billable} Codes (${((billable/total)*100).toFixed(1)}%)`);
    
    console.log(`\n✅ Österreichischer ICD-10 Katalog ${year} erfolgreich importiert!`);
    
  } catch (error) {
    console.error('❌ Import-Fehler:', error);
    throw error;
  }
};

// Kapitel-Namen
const getChapterName = (chapter) => {
  const chapters = {
    'A': 'Bestimmte infektiöse und parasitäre Krankheiten',
    'B': 'Neubildungen',
    'C': 'Krankheiten des Blutes und der blutbildenden Organe',
    'D': 'Endokrine, Ernährungs- und Stoffwechselkrankheiten',
    'E': 'Psychische und Verhaltensstörungen',
    'F': 'Krankheiten des Nervensystems',
    'G': 'Krankheiten des Auges und der Augenanhangsgebilde',
    'H': 'Krankheiten des Ohres und des Warzenfortsatzes',
    'I': 'Krankheiten des Kreislaufsystems',
    'J': 'Krankheiten des Atmungssystems',
    'K': 'Krankheiten des Verdauungssystems',
    'L': 'Krankheiten der Haut und der Unterhaut',
    'M': 'Krankheiten des Muskel-Skelett-Systems und des Bindegewebes',
    'N': 'Krankheiten des Urogenitalsystems',
    'O': 'Schwangerschaft, Geburt und Wochenbett',
    'P': 'Bestimmte Zustände, die ihren Ursprung in der Perinatalperiode haben',
    'Q': 'Angeborene Fehlbildungen, Deformitäten und Chromosomenanomalien',
    'R': 'Symptome und abnorme klinische und Laborbefunde',
    'S': 'Verletzungen, Vergiftungen und bestimmte andere Folgen äußerer Ursachen',
    'T': 'Äußere Ursachen von Morbidität und Mortalität',
    'U': 'Codes für besondere Zwecke',
    'V': 'Kontakt mit Gesundheitsdiensten',
    'W': 'Faktoren, die den Gesundheitszustand beeinflussen',
    'X': 'Kodes für besondere Zwecke',
    'Y': 'Äußere Ursachen von Morbidität und Mortalität',
    'Z': 'Faktoren, die den Gesundheitszustand beeinflussen'
  };
  return chapters[chapter] || 'Unbekanntes Kapitel';
};

// Hauptfunktion
const main = async () => {
  try {
    await connectDB();
    
    const filePath = process.argv[2];
    const year = parseInt(process.argv[3]) || 2025;
    
    if (!filePath) {
      console.error('❌ Bitte geben Sie den Pfad zur Excel-Datei an:');
      console.error('node importAustrianIcd10.js /pfad/zur/datei.xlsx [jahr]');
      process.exit(1);
    }
    
    await importAustrianIcd10(filePath, year);
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

if (require.main === module) {
  main();
}

module.exports = { importAustrianIcd10 };
