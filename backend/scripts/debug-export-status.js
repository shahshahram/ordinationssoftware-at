/**
 * Script zum Debuggen des Ambulanzbefund-Export-Status
 * Prüft alle finalisierten Ambulanzbefunde und ihre Export-Bedingungen
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Ambulanzbefund = require('../models/Ambulanzbefund');
const Location = require('../models/Location');
const AmbulanzbefundFormTemplate = require('../models/AmbulanzbefundFormTemplate');
const XdsDocumentEntry = require('../models/XdsDocumentEntry');

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

const checkExportStatus = async () => {
  try {
    console.log('=== FINALISIERTE AMBULANZBEFUNDE PRÜFEN ===\n');
    
    const ambefunde = await Ambulanzbefund.find({
      status: { $in: ['finalized', 'exported'] }
    })
      .populate('locationId')
      .populate('formTemplateId')
      .sort({ finalizedAt: -1 });

    if (ambefunde.length === 0) {
      console.log('⚠️  Keine finalisierten oder exportierten Ambulanzbefunde gefunden.\n');
      return;
    }

    console.log(`📊 Gefunden: ${ambefunde.length} finalisierte/exportierte Ambulanzbefunde\n`);

    for (const amb of ambefunde) {
      console.log(`\n📄 Ambulanzbefund: ${amb.documentNumber}`);
      console.log(`   Status: ${amb.status}`);
      const patientId = typeof amb.patientId === 'object' ? amb.patientId?._id : amb.patientId;
      console.log(`   Patient ID: ${patientId || 'N/A'}`);
      
      // Location prüfen
      const locationId = typeof amb.locationId === 'object' 
        ? amb.locationId?._id 
        : amb.locationId;
      
      const location = typeof amb.locationId === 'object' 
        ? amb.locationId 
        : await Location.findById(locationId);
      
      if (location) {
        console.log(`   Location: ${location.name} (${location._id})`);
        if (location.xdsRegistry) {
          console.log(`   XDS Registry: ${location.xdsRegistry.enabled ? '✅ aktiviert' : '❌ nicht aktiviert'}`);
          if (!location.xdsRegistry.enabled) {
            console.log(`   ⚠️  Grund: XDS Registry nicht aktiviert - Export wird übersprungen`);
          }
        } else {
          console.log(`   XDS Registry: ❌ nicht konfiguriert - Export wird übersprungen`);
        }
      } else {
        console.log(`   Location: ❌ nicht gefunden (${locationId})`);
      }
      
      // Template prüfen
      const template = typeof amb.formTemplateId === 'object' 
        ? amb.formTemplateId 
        : await AmbulanzbefundFormTemplate.findById(amb.formTemplateId);
      
      if (template) {
        console.log(`   Template: ${template.code} (${template.name})`);
        if (template.elgaIlReference) {
          const ref = template.elgaIlReference;
          const hasFormatCode = !!ref.formatCode;
          const hasClassCode = !!ref.classCode;
          const hasTypeCode = !!ref.typeCode;
          
          console.log(`   ELGA IL Referenz:`);
          console.log(`     - formatCode: ${hasFormatCode ? '✅' : '❌'}`);
          console.log(`     - classCode: ${hasClassCode ? '✅' : '❌'}`);
          console.log(`     - typeCode: ${hasTypeCode ? '✅' : '❌'}`);
          
          if (!hasFormatCode || !hasClassCode || !hasTypeCode) {
            console.log(`   ⚠️  Grund: Unvollständige ELGA IL Referenz - Export wird übersprungen`);
          }
        } else {
          console.log(`   ELGA IL Referenz: ❌ nicht vorhanden - Export wird übersprungen`);
        }
      } else {
        console.log(`   Template: ❌ nicht gefunden`);
      }
      
      // Export-Status prüfen
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
          console.log(`   ⚠️  Status ist 'finalized' aber nicht exportiert`);
          console.log(`   🔍 Mögliche Gründe:`);
          console.log(`      1. Template hat keine vollständige ELGA IL Referenz`);
          console.log(`      2. XDS Registry für Location nicht aktiviert`);
          console.log(`      3. Export-Fehler beim Finalisieren (siehe Backend-Logs)`);
        }
      }
    }

    // Prüfe XDS Einträge mit source='ambulanzbefund'
    console.log('\n\n=== XDS DOKUMENTE MIT source="ambulanzbefund" ===\n');
    
    const xdsDocs = await XdsDocumentEntry.find({
      source: 'ambulanzbefund'
    })
      .populate('locationId', 'name')
      .sort({ creationTime: -1 });

    if (xdsDocs.length === 0) {
      console.log('⚠️  Keine XDS Dokumente mit source="ambulanzbefund" gefunden.');
    } else {
      console.log(`✅ Gefunden: ${xdsDocs.length} Dokumente\n`);
      for (const doc of xdsDocs) {
        console.log(`📦 XDS Entry: ${doc._id}`);
        console.log(`   Titel: ${doc.title}`);
        console.log(`   Location: ${doc.locationId?.name || doc.locationId}`);
        console.log(`   Patient: ${doc.patientId}`);
        console.log(`   Source: ${doc.source}`);
        console.log(`   Status: ${doc.availabilityStatus}`);
        console.log(`   Erstellt: ${doc.creationTime}`);
        console.log('');
      }
    }

  } catch (error) {
    console.error('❌ Fehler beim Prüfen:', error);
    console.error(error.stack);
  }
};

const main = async () => {
  await connectDB();
  await checkExportStatus();
  await mongoose.connection.close();
  console.log('\n✅ Fertig.');
};

main();

