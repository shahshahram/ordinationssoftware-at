/**
 * Script: Entferne alle EBM-Daten aus dem ServiceCatalog
 * 
 * Entfernt EBM-Felder (ebmCode, ebmPrice, ebmGroup, ebmSubGroup) aus allen Services.
 * Services mit nur EBM-Daten (kein KHO) können optional gelöscht werden.
 * 
 * Usage: node backend/scripts/remove-ebm-from-services.js [--delete-services-without-kho]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ServiceCatalog = require('../models/ServiceCatalog');

async function removeEbmFromServices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware');

    console.log('✅ Verbunden zur Datenbank');

    const deleteServicesWithoutKho = process.argv.includes('--delete-services-without-kho');

    // Finde alle Services mit EBM-Daten
    const servicesWithEbm = await ServiceCatalog.find({
      $or: [
        { 'ogk.ebmCode': { $exists: true, $ne: null, $ne: '' } },
        { 'ogk.ebmPrice': { $exists: true, $ne: null, $ne: 0 } },
        { 'ogk.ebmGroup': { $exists: true, $ne: null, $ne: '' } },
        { 'ogk.ebmSubGroup': { $exists: true, $ne: null, $ne: '' } }
      ]
    }).lean();

    console.log(`📊 Gefunden: ${servicesWithEbm.length} Services mit EBM-Daten`);

    let ebmFieldsRemovedCount = 0;
    let servicesDeletedCount = 0;
    const errors = [];

    for (const doc of servicesWithEbm) {
      try {
        const service = await ServiceCatalog.findById(doc._id);
        if (!service || !service.ogk) continue;

        const hasKhoCode = service.ogk.khoCode && service.ogk.khoCode.trim() !== '';
        const hasKhoPrice = service.ogk.khoPrice != null && service.ogk.khoPrice !== 0;
        const hasKho = hasKhoCode || hasKhoPrice;

        // Wenn Service nur EBM hat (kein KHO) und Löschung gewünscht
        if (!hasKho && deleteServicesWithoutKho) {
          await ServiceCatalog.findByIdAndDelete(service._id);
          servicesDeletedCount++;
          console.log(`🗑️  ${service.code} – Service gelöscht (nur EBM, kein KHO)`);
          continue;
        }

        // EBM-Felder entfernen
        let updated = false;
        if (service.ogk.ebmCode !== undefined) {
          service.ogk.ebmCode = undefined;
          updated = true;
        }
        if (service.ogk.ebmPrice !== undefined) {
          service.ogk.ebmPrice = undefined;
          updated = true;
        }
        if (service.ogk.ebmGroup !== undefined) {
          service.ogk.ebmGroup = undefined;
          updated = true;
        }
        if (service.ogk.ebmSubGroup !== undefined) {
          service.ogk.ebmSubGroup = undefined;
          updated = true;
        }

        if (updated) {
          await service.save();
          ebmFieldsRemovedCount++;
          console.log(`✅ ${service.code} – EBM-Felder entfernt${!hasKho ? ' (kein KHO vorhanden)' : ''}`);
        }
      } catch (error) {
        errors.push({ serviceCode: doc.code, error: error.message });
        console.error(`❌ Fehler bei ${doc.code}:`, error.message);
      }
    }

    console.log('\n📈 Bereinigung abgeschlossen:');
    console.log(`   ✅ EBM-Felder entfernt: ${ebmFieldsRemovedCount} Services`);
    if (deleteServicesWithoutKho) {
      console.log(`   🗑️  Services gelöscht (nur EBM, kein KHO): ${servicesDeletedCount} Services`);
    } else {
      console.log(`   ℹ️  Services mit nur EBM (kein KHO) wurden behalten`);
      console.log(`   💡 Tipp: Verwende --delete-services-without-kho um diese zu löschen`);
    }
    if (errors.length > 0) {
      console.log(`   ❌ Fehler: ${errors.length} Services`);
      errors.forEach(e => console.log(`      - ${e.serviceCode}: ${e.error}`));
    }

    await mongoose.connection.close();
    console.log('\n✅ Datenbankverbindung geschlossen');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fataler Fehler:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Führe Bereinigung aus
if (require.main === module) {
  removeEbmFromServices();
}

module.exports = removeEbmFromServices;
