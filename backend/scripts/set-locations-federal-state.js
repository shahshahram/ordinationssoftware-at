/**
 * Script zum automatischen Setzen von federalState für Locations
 * Setzt federalState basierend auf Stadt, PLZ oder State-Feld
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Location = require('../models/Location');

const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

// Mapping: Stadt/PLZ/State → federalState
const CITY_TO_STATE = {
  'wien': 'wien',
  'vienna': 'wien',
  'linz': 'oberoesterreich',
  'salzburg': 'salzburg',
  'graz': 'steiermark',
  'innsbruck': 'tirol',
  'klagenfurt': 'kaernten',
  'dornbirn': 'vorarlberg',
  'eisenstadt': 'burgenland',
  'st. pölten': 'niederoesterreich',
  'sankt pölten': 'niederoesterreich',
  'st.wolfgang': 'salzburg',
  'st. wolfgang': 'salzburg'
};

// PLZ-Bereiche → federalState
const PLZ_TO_STATE = {
  // Wien: 1000-1299
  'wien': { min: 1000, max: 1299, state: 'wien' },
  // Oberösterreich: 4000-4999
  'oberoesterreich': { min: 4000, max: 4999, state: 'oberoesterreich' },
  // Salzburg: 5000-5999
  'salzburg': { min: 5000, max: 5999, state: 'salzburg' },
  // Steiermark: 8000-8999
  'steiermark': { min: 8000, max: 8999, state: 'steiermark' },
  // Tirol: 6000-6999
  'tirol': { min: 6000, max: 6999, state: 'tirol' },
  // Kärnten: 9000-9999
  'kaernten': { min: 9000, max: 9999, state: 'kaernten' },
  // Vorarlberg: 6000-6999 (überschneidet sich mit Tirol, aber Vorarlberg ist kleiner)
  'vorarlberg': { min: 6900, max: 6999, state: 'vorarlberg' },
  // Burgenland: 7000-7999
  'burgenland': { min: 7000, max: 7999, state: 'burgenland' },
  // Niederösterreich: 2000-3999
  'niederoesterreich': { min: 2000, max: 3999, state: 'niederoesterreich' }
};

/**
 * Ermittelt federalState basierend auf Stadt, PLZ oder State
 */
function determineFederalState(location) {
  // 1. Prüfe State-Feld
  if (location.state) {
    const stateLower = location.state.toLowerCase().trim();
    if (stateLower === 'wien' || stateLower === 'vienna') return 'wien';
    if (stateLower === 'salzburg') return 'salzburg';
    if (stateLower === 'oberösterreich' || stateLower === 'oberoesterreich' || stateLower === 'oö') return 'oberoesterreich';
    if (stateLower === 'niederösterreich' || stateLower === 'niederoesterreich' || stateLower === 'nö') return 'niederoesterreich';
    if (stateLower === 'steiermark' || stateLower === 'stmk') return 'steiermark';
    if (stateLower === 'tirol') return 'tirol';
    if (stateLower === 'kärnten' || stateLower === 'kaernten' || stateLower === 'k') return 'kaernten';
    if (stateLower === 'vorarlberg' || stateLower === 'vbg') return 'vorarlberg';
    if (stateLower === 'burgenland' || stateLower === 'bgld') return 'burgenland';
  }
  
  // 2. Prüfe Stadt
  if (location.city) {
    const cityLower = location.city.toLowerCase().trim();
    if (CITY_TO_STATE[cityLower]) {
      return CITY_TO_STATE[cityLower];
    }
  }
  
  // 3. Prüfe PLZ
  if (location.postal_code) {
    const plz = parseInt(location.postal_code);
    if (!isNaN(plz)) {
      for (const [key, range] of Object.entries(PLZ_TO_STATE)) {
        if (plz >= range.min && plz <= range.max) {
          return range.state;
        }
      }
    }
  }
  
  return null;
}

async function setLocationsFederalState(dryRun = true) {
  try {
    console.log('=== Setze federalState für Locations ===');
    console.log(`Modus: ${dryRun ? 'DRY RUN (keine Änderungen)' : 'LIVE (Änderungen werden gespeichert)'}`);
    console.log('');

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ MongoDB verbunden');
    console.log('');

    // Lade alle Locations ohne federalState
    const locations = await Location.find({ 
      $or: [
        { federalState: { $exists: false } },
        { federalState: null },
        { federalState: '' }
      ]
    }).select('name code city postal_code state federalState is_active');
    
    console.log(`Locations ohne federalState: ${locations.length}`);
    console.log('');

    if (locations.length === 0) {
      console.log('✓ Alle Locations haben bereits ein federalState gesetzt!');
      await mongoose.connection.close();
      return;
    }

    const updates = [];
    const skipped = [];

    for (const loc of locations) {
      const determinedState = determineFederalState(loc);
      
      if (determinedState) {
        updates.push({
          location: loc,
          federalState: determinedState
        });
        console.log(`✓ ${loc.name} (${loc.code || 'kein Code'}):`);
        console.log(`  Stadt: ${loc.city || 'N/A'}, PLZ: ${loc.postal_code || 'N/A'}, State: ${loc.state || 'N/A'}`);
        console.log(`  → federalState: ${determinedState}`);
        console.log('');
      } else {
        skipped.push(loc);
        console.log(`⚠ ${loc.name} (${loc.code || 'kein Code'}):`);
        console.log(`  Stadt: ${loc.city || 'N/A'}, PLZ: ${loc.postal_code || 'N/A'}, State: ${loc.state || 'N/A'}`);
        console.log(`  → Konnte federalState nicht automatisch ermitteln`);
        console.log('');
      }
    }

    console.log('=== Zusammenfassung ===');
    console.log(`✓ Automatisch ermittelt: ${updates.length}`);
    console.log(`⚠ Nicht ermittelt (manuell setzen): ${skipped.length}`);
    console.log('');

    if (updates.length > 0) {
      if (dryRun) {
        console.log('DRY RUN: Folgende Änderungen würden durchgeführt:');
        updates.forEach(({ location, federalState }) => {
          console.log(`  - ${location.name}: ${federalState}`);
        });
        console.log('');
        console.log('Um die Änderungen zu speichern, führe das Script mit --apply aus:');
        console.log('  node scripts/set-locations-federal-state.js --apply');
      } else {
        console.log('Speichere Änderungen...');
        for (const { location, federalState } of updates) {
          await Location.findByIdAndUpdate(location._id, { federalState });
          console.log(`  ✓ ${location.name}: ${federalState} gesetzt`);
        }
        console.log('');
        console.log(`✓ ${updates.length} Location(s) aktualisiert`);
      }
    }

    if (skipped.length > 0) {
      console.log('');
      console.log('⚠ Folgende Locations benötigen manuelle Eingabe:');
      skipped.forEach(loc => {
        console.log(`  - ${loc.name} (${loc.code || 'kein Code'})`);
        console.log(`    Stadt: ${loc.city || 'N/A'}, PLZ: ${loc.postal_code || 'N/A'}, State: ${loc.state || 'N/A'}`);
      });
    }

    await mongoose.connection.close();
    console.log('');
    console.log('✓ Abgeschlossen');
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
  const dryRun = !process.argv.includes('--apply');
  setLocationsFederalState(dryRun)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fataler Fehler:', error);
      process.exit(1);
    });
}

module.exports = setLocationsFederalState;
