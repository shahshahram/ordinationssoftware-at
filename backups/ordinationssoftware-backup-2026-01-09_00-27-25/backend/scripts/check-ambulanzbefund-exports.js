/**
 * Script zum Prüfen von Ambulanzbefund-Exporten
 * Zeigt finalisierte/exportierte Ambulanzbefunde und deren XDS Einträge
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Ambulanzbefund = require('../models/Ambulanzbefund');
const XdsDocumentEntry = require('../models/XdsDocumentEntry');
const Location = require('../models/Location');
const Patient = require('../models/Patient');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/ordinationssoftware';
    await mongoose.connect(mongoURI);
    console.log('MongoDB verbunden');
  } catch (error) {
    console.error('Fehler bei MongoDB-Verbindung:', error);
    process.exit(1);
  }
};

const checkExports = async () => {
  try {
    console.log('\n=== Finalisierte/Exportierte Ambulanzbefunde ===\n');
    
    const ambefunde = await Ambulanzbefund.find({
      status: { $in: ['finalized', 'exported'] }
    })
      .populate('patientId', 'firstName lastName')
      .populate('locationId', 'name xdsRegistry')
      .populate('formTemplateId', 'code name elgaIlReference')
      .sort({ finalizedAt: -1 })
      .limit(10);

    if (ambefunde.length === 0) {
      console.log('Keine finalisierten oder exportierten Ambulanzbefunde gefunden.');
      return;
    }

    for (const amb of ambefunde) {
      console.log(`\n📄 Ambulanzbefund: ${amb.documentNumber}`);
      console.log(`   Status: ${amb.status}`);
      console.log(`   Patient: ${amb.patientId?.firstName} ${amb.patientId?.lastName}`);
      console.log(`   Location: ${amb.locationId?.name || amb.locationId?._id}`);
      console.log(`   Template: ${amb.formTemplateId?.code || amb.formTemplateId?._id}`);
      
      if (amb.locationId?.xdsRegistry) {
        console.log(`   XDS Registry: ${amb.locationId.xdsRegistry.enabled ? '✅ aktiviert' : '❌ nicht aktiviert'}`);
      } else {
        console.log(`   XDS Registry: ❌ nicht konfiguriert`);
      }
      
      if (amb.formTemplateId?.elgaIlReference) {
        const ref = amb.formTemplateId.elgaIlReference;
        console.log(`   ELGA IL Referenz:`);
        console.log(`     - formatCode: ${ref.formatCode ? '✅' : '❌'}`);
        console.log(`     - classCode: ${ref.classCode ? '✅' : '❌'}`);
        console.log(`     - typeCode: ${ref.typeCode ? '✅' : '❌'}`);
      } else {
        console.log(`   ELGA IL Referenz: ❌ nicht vorhanden`);
      }
      
      if (amb.cdaExport?.exported) {
        console.log(`   ✅ Exportiert: ${amb.cdaExport.exportedAt}`);
        console.log(`   XDS Entry ID: ${amb.cdaExport.xdsDocumentEntryId}`);
        
        // Prüfe ob XDS Entry existiert
        if (amb.cdaExport.xdsDocumentEntryId) {
          const xdsEntry = await XdsDocumentEntry.findById(amb.cdaExport.xdsDocumentEntryId);
          if (xdsEntry) {
            console.log(`   ✅ XDS Entry gefunden:`);
            console.log(`      - Titel: ${xdsEntry.title}`);
            console.log(`      - Source: ${xdsEntry.source}`);
            console.log(`      - Status: ${xdsEntry.availabilityStatus}`);
            console.log(`      - Location: ${xdsEntry.locationId}`);
          } else {
            console.log(`   ❌ XDS Entry nicht gefunden (ID: ${amb.cdaExport.xdsDocumentEntryId})`);
          }
        }
      } else {
        console.log(`   ❌ Nicht exportiert`);
        if (amb.status === 'finalized') {
          console.log(`   ⚠️  Status ist 'finalized' aber nicht exportiert - möglicher Export-Fehler`);
        }
      }
    }

    // Prüfe XDS Einträge mit source='ambulanzbefund'
    console.log('\n\n=== XDS Dokumente mit source="ambulanzbefund" ===\n');
    
    const xdsDocs = await XdsDocumentEntry.find({
      source: 'ambulanzbefund'
    })
      .populate('locationId', 'name')
      .sort({ creationTime: -1 })
      .limit(10);

    if (xdsDocs.length === 0) {
      console.log('Keine XDS Dokumente mit source="ambulanzbefund" gefunden.');
    } else {
      console.log(`Gefunden: ${xdsDocs.length} Dokumente\n`);
      for (const doc of xdsDocs) {
        console.log(`📦 XDS Entry: ${doc._id}`);
        console.log(`   Titel: ${doc.title}`);
        console.log(`   Location: ${doc.locationId?.name || doc.locationId}`);
        console.log(`   Patient: ${doc.patientId}`);
        console.log(`   Source: ${doc.source}`);
        console.log(`   Status: ${doc.availabilityStatus}`);
        console.log(`   Erstellt: ${doc.creationTime}`);
      }
    }

  } catch (error) {
    console.error('Fehler beim Prüfen:', error);
  }
};

const main = async () => {
  await connectDB();
  await checkExports();
  await mongoose.connection.close();
  console.log('\nFertig.');
};

main();

