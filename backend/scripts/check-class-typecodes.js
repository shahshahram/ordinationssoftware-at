#!/usr/bin/env node

/**
 * Prüft ob ClassCodes und TypeCodes erfolgreich importiert wurden
 */

// Lade .env aus verschiedenen möglichen Pfaden
const path = require('path');
const dotenv = require('dotenv');

const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend/.env')
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    break;
  }
}

const mongoose = require('mongoose');
const fs = require('fs');
const connectDB = require('../config/db');
const ElgaValueSet = require('../models/ElgaValueSet');
const logger = require('../utils/logger');

const main = async () => {
  try {
    await connectDB();
    
    console.log('\n=== PRÜFUNG: ClassCodes und TypeCodes ===\n');
    
    // Suche nach ClassCode Valuesets
    const classCodes = await ElgaValueSet.find({
      $or: [
        { title: { $regex: /classcode|class\.code|classcode/i } },
        { category: { $regex: /classcode/i } },
        { description: { $regex: /classcode|class\.code/i } },
        { oid: { $regex: /classcode/i } }
      ]
    }).select('title version oid category description codes').lean();
    
    // Suche nach TypeCode Valuesets
    const typeCodes = await ElgaValueSet.find({
      $or: [
        { title: { $regex: /typecode|type\.code|typecode/i } },
        { category: { $regex: /typecode/i } },
        { description: { $regex: /typecode|type\.code/i } },
        { oid: { $regex: /typecode/i } }
      ]
    }).select('title version oid category description codes').lean();
    
    // Suche nach FormatCode (auch wichtig für ELGA-Dokumente)
    const formatCodes = await ElgaValueSet.find({
      $or: [
        { title: { $regex: /formatcode|format\.code/i } },
        { category: { $regex: /formatcode/i } },
        { description: { $regex: /formatcode|format\.code/i } }
      ]
    }).select('title version oid category description codes').lean();
    
    // Prüfe auch in der Problem-Liste
    const problemFile = path.join(__dirname, '../../docs/problem_vs_01092025.txt');
    let classCodeFailed = 0;
    let typeCodeFailed = 0;
    let formatCodeFailed = 0;
    
    if (fs.existsSync(problemFile)) {
      const content = fs.readFileSync(problemFile, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach(line => {
        const lower = line.toLowerCase();
        if (lower.includes('classcode') || lower.includes('class.code')) {
          classCodeFailed++;
        }
        if (lower.includes('typecode') || lower.includes('type.code')) {
          typeCodeFailed++;
        }
        if (lower.includes('formatcode') || lower.includes('format.code')) {
          formatCodeFailed++;
        }
      });
    }
    
    console.log('📊 CLASSCODE VALUESETS:');
    console.log(`   Erfolgreich importiert: ${classCodes.length}`);
    if (classCodes.length > 0) {
      classCodes.forEach(vs => {
        console.log(`   ✅ ${vs.title} (${vs.version})`);
        console.log(`      OID: ${vs.oid} | Kategorie: ${vs.category || 'none'} | Codes: ${vs.codes?.length || 0}`);
      });
    } else {
      console.log('   ❌ Keine ClassCode Valuesets gefunden!');
    }
    if (classCodeFailed > 0) {
      console.log(`   ⚠️  ${classCodeFailed} Erwähnungen in Fehlerliste gefunden`);
    }
    
    console.log('\n📊 TYPECODE VALUESETS:');
    console.log(`   Erfolgreich importiert: ${typeCodes.length}`);
    if (typeCodes.length > 0) {
      typeCodes.forEach(vs => {
        console.log(`   ✅ ${vs.title} (${vs.version})`);
        console.log(`      OID: ${vs.oid} | Kategorie: ${vs.category || 'none'} | Codes: ${vs.codes?.length || 0}`);
      });
    } else {
      console.log('   ❌ Keine TypeCode Valuesets gefunden!');
    }
    if (typeCodeFailed > 0) {
      console.log(`   ⚠️  ${typeCodeFailed} Erwähnungen in Fehlerliste gefunden`);
    }
    
    console.log('\n📊 FORMATCODE VALUESETS:');
    console.log(`   Erfolgreich importiert: ${formatCodes.length}`);
    if (formatCodes.length > 0) {
      formatCodes.forEach(vs => {
        console.log(`   ✅ ${vs.title} (${vs.version})`);
        console.log(`      OID: ${vs.oid} | Kategorie: ${vs.category || 'none'} | Codes: ${vs.codes?.length || 0}`);
      });
    } else {
      console.log('   ❌ Keine FormatCode Valuesets gefunden!');
    }
    if (formatCodeFailed > 0) {
      console.log(`   ⚠️  ${formatCodeFailed} Erwähnungen in Fehlerliste gefunden`);
    }
    
    // Suche auch nach ELGA-spezifischen Dokumentenklassen
    const docClasses = await ElgaValueSet.find({
      $or: [
        { title: { $regex: /dokumentenklasse|document.*class/i } },
        { description: { $regex: /dokumentenklasse|document.*class/i } }
      ]
    }).select('title version oid category codes').lean();
    
    console.log('\n📊 DOKUMENTENKLASSEN:');
    console.log(`   Erfolgreich importiert: ${docClasses.length}`);
    if (docClasses.length > 0) {
      docClasses.forEach(vs => {
        console.log(`   ✅ ${vs.title} (${vs.version})`);
        console.log(`      OID: ${vs.oid} | Codes: ${vs.codes?.length || 0}`);
      });
    }
    
    // Zusammenfassung
    console.log('\n=== ZUSAMMENFASSUNG ===\n');
    const allFound = classCodes.length + typeCodes.length + formatCodes.length;
    console.log(`Total ClassCode/TypeCode/FormatCode Valuesets: ${allFound}`);
    console.log(`ClassCodes: ${classCodes.length}`);
    console.log(`TypeCodes: ${typeCodes.length}`);
    console.log(`FormatCodes: ${formatCodes.length}`);
    console.log(`Dokumentenklassen: ${docClasses.length}`);
    
    if (allFound === 0) {
      console.log('\n⚠️  WARNUNG: Keine ClassCode/TypeCode/FormatCode Valuesets gefunden!');
      console.log('   Diese sind kritisch für ELGA-Dokumente und sollten importiert werden.');
    }
    
    process.exit(0);
  } catch (error) {
    logger.error(`Fehler: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = { main };



