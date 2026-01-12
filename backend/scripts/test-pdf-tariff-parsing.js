/**
 * Test-Skript für PDF-Tarif-Parsing
 * Verwendet ein lokales PDF direkt zum Testen
 */

const path = require('path');
const ogkTariffDownloader = require('../services/ogkTariffDownloader');

async function testPDFParsing(pdfPath) {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('  PDF-Tarif-Parsing Test');
    console.log('='.repeat(60) + '\n');
    
    console.log(`📄 PDF-Datei: ${pdfPath}`);
    
    // Prüfe ob Datei existiert
    const fs = require('fs');
    if (!fs.existsSync(pdfPath)) {
      console.error(`❌ Datei nicht gefunden: ${pdfPath}`);
      process.exit(1);
    }
    
    console.log('✅ Datei gefunden\n');
    console.log('🔄 Starte PDF-Parsing...\n');
    
    // Parse PDF
    const tariffs = await ogkTariffDownloader.parsePDF(pdfPath);
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Parsing abgeschlossen: ${tariffs.length} Tarife gefunden\n`);
    
    // Zeige erste 10 Tarife als Beispiel
    if (tariffs.length > 0) {
      console.log('📋 Erste 10 Tarife:');
      console.log('-'.repeat(60));
      tariffs.slice(0, 10).forEach((tariff, index) => {
        const price = tariff.kho?.khoPrice || tariff.kho?.price || 0;
        const priceEuro = (price / 100).toFixed(2);
        console.log(`${index + 1}. Code: ${tariff.code} | Name: ${tariff.name} | Preis: €${priceEuro} | Abschnitt: ${tariff.kho?.category || 'N/A'}`);
      });
      console.log('-'.repeat(60));
      
      if (tariffs.length > 10) {
        console.log(`\n... und ${tariffs.length - 10} weitere Tarife\n`);
      }
      
      // Statistiken
      console.log('\n📊 Statistiken:');
      console.log(`   Gesamt: ${tariffs.length} Tarife`);
      const withPrice = tariffs.filter(t => (t.kho?.khoPrice || t.kho?.price || 0) > 0).length;
      console.log(`   Mit Preis: ${withPrice} Tarife`);
      const withCategory = tariffs.filter(t => t.kho?.category).length;
      console.log(`   Mit Kategorie: ${withCategory} Tarife`);
      const ooe = tariffs.filter(t => t.kho?.federalState === 'oberoesterreich').length;
      console.log(`   OÖ-spezifisch: ${ooe} Tarife`);
      
      // Gruppiere nach Abschnitten
      const sections = {};
      tariffs.forEach(t => {
        const section = t.kho?.category || 'Unbekannt';
        sections[section] = (sections[section] || 0) + 1;
      });
      
      console.log('\n📁 Tarife nach Abschnitten:');
      Object.entries(sections)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([section, count]) => {
          console.log(`   ${section}: ${count} Tarife`);
        });
    } else {
      console.log('⚠️  Keine Tarife gefunden!');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test abgeschlossen\n');
    
    return tariffs;
  } catch (error) {
    console.error('\n❌ Fehler beim Parsing:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Hauptfunktion
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Verwendung:');
    console.log('  node scripts/test-pdf-tariff-parsing.js <pdf-path>');
    console.log('\nBeispiel:');
    console.log('  node scripts/test-pdf-tariff-parsing.js ~/Downloads/Honorarordnung_2024__Tarif_2023_.pdf');
    process.exit(1);
  }
  
  const pdfPath = path.resolve(args[0]);
  await testPDFParsing(pdfPath);
}

// Führe Skript aus
if (require.main === module) {
  main().catch(error => {
    console.error('Fataler Fehler:', error);
    process.exit(1);
  });
}

module.exports = { testPDFParsing };
