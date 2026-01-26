/**
 * Script zum Prüfen und Setzen von federalState für Locations
 * Prüft alle Locations und zeigt an, welche kein federalState haben
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Location = require('../models/Location');

const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function checkLocations() {
  try {
    console.log('=== Prüfe Locations auf federalState ===');
    console.log('');

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ MongoDB verbunden');
    console.log('');

    // Lade alle Locations
    const locations = await Location.find({}).select('name code city postal_code state federalState is_active');
    
    console.log(`Gesamt Locations: ${locations.length}`);
    console.log('');

    const locationsWithoutState = [];
    const locationsWithState = [];

    locations.forEach(loc => {
      if (!loc.federalState) {
        locationsWithoutState.push(loc);
      } else {
        locationsWithState.push(loc);
      }
    });

    console.log(`✓ Locations MIT federalState: ${locationsWithState.length}`);
    locationsWithState.forEach(loc => {
      console.log(`  - ${loc.name} (${loc.code || 'kein Code'}): ${loc.federalState}`);
    });
    console.log('');

    console.log(`⚠ Locations OHNE federalState: ${locationsWithoutState.length}`);
    if (locationsWithoutState.length > 0) {
      locationsWithoutState.forEach(loc => {
        console.log(`  - ${loc.name} (${loc.code || 'kein Code'})`);
        console.log(`    Stadt: ${loc.city || 'N/A'}, PLZ: ${loc.postal_code || 'N/A'}, State: ${loc.state || 'N/A'}`);
        console.log(`    Aktiv: ${loc.is_active ? 'Ja' : 'Nein'}`);
        console.log('');
      });
    }

    console.log('');
    console.log('=== Empfehlung ===');
    if (locationsWithoutState.length > 0) {
      console.log(`⚠ ${locationsWithoutState.length} Location(s) haben kein federalState gesetzt.`);
      console.log('Diese sollten ein federalState bekommen, damit die Punktwert-Berechnung korrekt funktioniert.');
      console.log('');
      console.log('Mögliche Werte:');
      console.log('  - burgenland');
      console.log('  - kaernten');
      console.log('  - niederoesterreich');
      console.log('  - oberoesterreich');
      console.log('  - salzburg');
      console.log('  - steiermark');
      console.log('  - tirol');
      console.log('  - vorarlberg');
      console.log('  - wien');
    } else {
      console.log('✓ Alle Locations haben ein federalState gesetzt!');
    }

    await mongoose.connection.close();
    console.log('');
    console.log('✓ Prüfung abgeschlossen');
  } catch (error) {
    console.error('Fehler:', error.message);
    console.error(error.stack);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

if (require.main === module) {
  checkLocations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fataler Fehler:', error);
      process.exit(1);
    });
}

module.exports = checkLocations;
