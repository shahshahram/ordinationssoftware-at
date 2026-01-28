/**
 * Migration-Script: EBM → KHO für alle Services
 *
 * 1. Kopiert EBM-Daten zu KHO-Daten (ebmCode → khoCode, ebmPrice → khoPrice, etc.)
 * 2. Für österreichische Services (location.country === 'austria' oder kein Standort):
 *    EBM-Felder werden ENTFERNT – nur KHO bleibt.
 * 3. Für deutsche Services: EBM-Felder bleiben erhalten.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ServiceCatalog = require('../models/ServiceCatalog');
const Location = require('../models/Location'); // Wichtig: Location-Model importieren für populate

async function migrateEbmToKho() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware');

    console.log('✅ Verbunden zur Datenbank');

    // Alle Services mit EBM-Daten (mit oder ohne KHO)
    const servicesToMigrate = await ServiceCatalog.find({
      'ogk.ebmCode': { $exists: true, $ne: null, $ne: '' }
    })
      .populate('location_id', 'country')
      .lean(); // Use lean() for faster retrieval if not modifying here directly

    console.log(`📊 Gefunden: ${servicesToMigrate.length} Services mit EBM-Daten`);

    let migratedCount = 0;
    let ebmRemovedCount = 0;
    const errors = [];

    for (const doc of servicesToMigrate) {
      try {
        // Re-fetch mit populate, um location_id richtig zu bekommen
        const service = await ServiceCatalog.findById(doc._id).populate('location_id', 'country');
        if (!service || !service.ogk) continue;

        const location = service.location_id && typeof service.location_id === 'object'
          ? service.location_id
          : null;
        const country = location?.country || 'austria'; // Default to austria if no location or country
        const isAustria = country === 'austria';

        // 1) EBM → KHO kopieren (wenn noch kein KHO)
        if (service.ogk.ebmCode && (!service.ogk.khoCode || service.ogk.khoCode.trim() === '')) {
          service.ogk.khoCode = service.ogk.ebmCode;
        }
        if (service.ogk.ebmPrice != null && (service.ogk.khoPrice == null || service.ogk.khoPrice === 0)) {
          service.ogk.khoPrice = service.ogk.ebmPrice;
        }
        if (service.ogk.ebmGroup && !service.ogk.khoGroup) {
          service.ogk.khoGroup = service.ogk.ebmGroup;
        }
        if (service.ogk.ebmSubGroup && !service.ogk.khoSubGroup) {
          service.ogk.khoSubGroup = service.ogk.ebmSubGroup;
        }

        // 2) Für Österreich: EBM-Felder entfernen (nur KHO behalten)
        if (isAustria) {
          service.ogk.ebmCode = undefined;
          service.ogk.ebmPrice = undefined;
          service.ogk.ebmGroup = undefined;
          service.ogk.ebmSubGroup = undefined;
          ebmRemovedCount++;
        }

        await service.save();
        migratedCount++;
        console.log(`✅ ${service.code} – KHO gesetzt${isAustria ? ', EBM entfernt' : ''}`);
      } catch (error) {
        errors.push({ serviceCode: doc.code, error: error.message });
        console.error(`❌ Fehler bei ${doc.code}:`, error.message);
      }
    }

    console.log('\n📈 Migration abgeschlossen:');
    console.log(`   ✅ Bearbeitet: ${migratedCount} Services`);
    console.log(`   🗑️  EBM-Felder entfernt (Österreich): ${ebmRemovedCount} Services`);
    console.log(`   ❌ Fehler: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Fehler-Details:');
      errors.forEach(err => console.log(`   - ${err.serviceCode}: ${err.error}`));
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

// Führe Migration aus
if (require.main === module) {
  migrateEbmToKho();
}

module.exports = migrateEbmToKho;
