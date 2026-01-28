/**
 * Script: Aktualisiere alle Locations mit country: 'austria'
 * 
 * Setzt für alle bestehenden Locations das country-Feld auf 'austria',
 * falls es noch nicht gesetzt ist.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Location = require('../models/Location');

async function updateLocationsCountry() {
  try {
    // Verbinde zur Datenbank
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Verbunden zur Datenbank');
    
    // Finde alle Locations ohne country-Feld oder mit ungültigem Wert
    const locationsToUpdate = await Location.find({
      $or: [
        { country: { $exists: false } },
        { country: null },
        { country: { $nin: ['austria', 'germany'] } }
      ]
    });
    
    console.log(`📊 Gefunden: ${locationsToUpdate.length} Locations zum Aktualisieren`);
    
    if (locationsToUpdate.length === 0) {
      console.log('✅ Alle Locations haben bereits ein gültiges country-Feld');
      await mongoose.connection.close();
      process.exit(0);
    }
    
    let updatedCount = 0;
    const errors = [];
    
    // Aktualisiere jede Location
    for (const location of locationsToUpdate) {
      try {
        location.country = 'austria'; // Default: Österreich
        await location.save();
        
        updatedCount++;
        console.log(`✅ Aktualisiert: ${location.name} (${location.code || 'kein Code'}) - country: austria`);
      } catch (error) {
        errors.push({
          locationId: location._id,
          locationName: location.name,
          error: error.message
        });
        console.error(`❌ Fehler bei ${location.name}:`, error.message);
      }
    }
    
    // Zusammenfassung
    console.log('\n📈 Aktualisierung abgeschlossen:');
    console.log(`   ✅ Aktualisiert: ${updatedCount} Locations`);
    console.log(`   ❌ Fehler: ${errors.length} Locations`);
    
    if (errors.length > 0) {
      console.log('\n❌ Fehler-Details:');
      errors.forEach(err => {
        console.log(`   - ${err.locationName} (${err.locationId}): ${err.error}`);
      });
    }
    
    // Prüfe ob alle Locations jetzt country haben
    const locationsWithoutCountry = await Location.find({
      $or: [
        { country: { $exists: false } },
        { country: null },
        { country: { $nin: ['austria', 'germany'] } }
      ]
    });
    
    if (locationsWithoutCountry.length > 0) {
      console.log(`\n⚠️  Warnung: ${locationsWithoutCountry.length} Locations haben noch kein gültiges country-Feld`);
    } else {
      console.log('\n✅ Alle Locations haben jetzt ein gültiges country-Feld');
    }
    
    // Zeige Verteilung
    const austriaCount = await Location.countDocuments({ country: 'austria' });
    const germanyCount = await Location.countDocuments({ country: 'germany' });
    const totalCount = await Location.countDocuments();
    
    console.log('\n📊 Verteilung:');
    console.log(`   🇦🇹 Österreich: ${austriaCount} Locations`);
    console.log(`   🇩🇪 Deutschland: ${germanyCount} Locations`);
    console.log(`   📍 Gesamt: ${totalCount} Locations`);
    
    // Schließe Datenbankverbindung
    await mongoose.connection.close();
    console.log('\n✅ Datenbankverbindung geschlossen');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fataler Fehler:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Führe Aktualisierung aus
if (require.main === module) {
  updateLocationsCountry();
}

module.exports = updateLocationsCountry;
