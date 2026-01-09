const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const ServiceCatalog = require('../models/ServiceCatalog');
const ServiceCategory = require('../models/ServiceCategory');
const User = require('../models/User');

/**
 * Migrationsskript: Extrahiert alle verwendeten Kategorien aus Services
 * und erstellt sie in der ServiceCategories-Tabelle
 */
async function migrateServiceCategories() {
  try {
    // MongoDB URI prüfen
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware';
    if (!process.env.MONGODB_URI) {
      console.log('⚠️  MONGODB_URI nicht in .env gefunden, verwende Fallback:', mongoUri);
    }
    
    // MongoDB verbinden
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB verbunden');

    // Admin-User finden
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ Kein Admin-User gefunden!');
      process.exit(1);
    }
    console.log(`✅ Admin-User gefunden: ${adminUser.email}`);

    // Alle Services laden
    const services = await ServiceCatalog.find({}).select('category').lean();
    console.log(`\n📋 ${services.length} Services gefunden`);

    // Eindeutige Kategorien extrahieren
    const uniqueCategories = new Set();
    services.forEach(service => {
      if (service.category && service.category.trim() !== '') {
        uniqueCategories.add(service.category.trim());
      }
    });

    console.log(`\n📊 ${uniqueCategories.size} eindeutige Kategorien gefunden:`);
    Array.from(uniqueCategories).sort().forEach(cat => {
      console.log(`   - ${cat}`);
    });

    // Bestehende Kategorien laden
    const existingCategories = await ServiceCategory.find({}).select('name').lean();
    const existingCategoryNames = new Set(existingCategories.map(cat => cat.name));
    console.log(`\n📋 ${existingCategoryNames.size} bestehende Kategorien in ServiceCategories gefunden`);

    // Neue Kategorien erstellen
    const newCategories = [];
    const skippedCategories = [];

    for (const categoryName of Array.from(uniqueCategories).sort()) {
      // Prüfe ob Kategorie bereits existiert
      if (existingCategoryNames.has(categoryName)) {
        skippedCategories.push(categoryName);
        console.log(`⏭️  Kategorie "${categoryName}" existiert bereits, überspringe`);
        continue;
      }

      // Generiere Code aus Name
      let code = generateCodeFromName(categoryName);
      
      // Prüfe ob Code bereits existiert
      const existingWithCode = await ServiceCategory.findOne({ code });
      if (existingWithCode) {
        // Code existiert bereits, füge Suffix hinzu
        let counter = 1;
        let uniqueCode = `${code}-${counter}`;
        while (await ServiceCategory.findOne({ code: uniqueCode })) {
          counter++;
          uniqueCode = `${code}-${counter}`;
        }
        code = uniqueCode;
      }

      // Bestimme Farbe basierend auf Kategoriename
      const colorHex = getColorForCategory(categoryName);

      // Erstelle neue Kategorie
      const newCategory = new ServiceCategory({
        name: categoryName,
        code: code,
        color_hex: colorHex,
        is_active: true,
        sort_order: newCategories.length,
        visible_to_roles: [],
        description: `Automatisch migriert aus ServiceCatalog`,
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      });

      try {
        await newCategory.save();
        newCategories.push(newCategory);
        console.log(`✅ Kategorie erstellt: "${categoryName}" (Code: ${code}, Farbe: ${colorHex})`);
      } catch (error) {
        if (error.code === 11000) {
          // Duplikat (Name oder Code)
          console.log(`⚠️  Kategorie "${categoryName}" konnte nicht erstellt werden (Duplikat):`, error.message);
        } else {
          console.error(`❌ Fehler beim Erstellen der Kategorie "${categoryName}":`, error.message);
        }
      }
    }

    // Zusammenfassung
    console.log(`\n📊 Migrations-Zusammenfassung:`);
    console.log(`   ✅ ${newCategories.length} neue Kategorien erstellt`);
    console.log(`   ⏭️  ${skippedCategories.length} Kategorien übersprungen (existieren bereits)`);
    console.log(`   📋 Gesamt: ${uniqueCategories.size} eindeutige Kategorien gefunden`);

    if (newCategories.length > 0) {
      console.log(`\n✅ Neue Kategorien:`);
      newCategories.forEach(cat => {
        console.log(`   - ${cat.name} (${cat.code})`);
      });
    }

    if (skippedCategories.length > 0) {
      console.log(`\n⏭️  Bereits vorhandene Kategorien:`);
      skippedCategories.forEach(cat => {
        console.log(`   - ${cat}`);
      });
    }

    console.log(`\n✅ Migration abgeschlossen!`);

  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ MongoDB-Verbindung geschlossen');
  }
}

/**
 * Generiert einen Code aus einem Kategorienamen
 */
function generateCodeFromName(name) {
  // Entferne Sonderzeichen und konvertiere zu Großbuchstaben
  let code = name
    .toUpperCase()
    .replace(/[ÄÖÜ]/g, (match) => {
      const map = { 'Ä': 'AE', 'Ö': 'OE', 'Ü': 'UE' };
      return map[match];
    })
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 10); // Maximal 10 Zeichen

  // Falls Code zu kurz, füge Zahlen hinzu
  if (code.length < 3) {
    code = code.padEnd(3, 'X');
  }

  return code;
}

/**
 * Bestimmt eine Farbe für eine Kategorie basierend auf dem Namen
 */
function getColorForCategory(categoryName) {
  const nameLower = categoryName.toLowerCase();
  
  // Farb-Mapping basierend auf Kategorienamen
  const colorMap = {
    'konsultation': '#2563EB',      // Blau
    'konsultationen': '#2563EB',
    'untersuchung': '#DC2626',      // Rot
    'untersuchungen': '#DC2626',
    'impfung': '#059669',           // Grün
    'impfungen': '#059669',
    'behandlung': '#7C3AED',       // Lila
    'behandlungen': '#7C3AED',
    'diagnostik': '#EA580C',       // Orange
    'therapie': '#0891B2',          // Cyan
    'chirurgie': '#BE185D',         // Pink
    'notfall': '#DC2626',           // Rot
    'notfallbehandlung': '#DC2626',
    'notfallbehandlungen': '#DC2626',
    'vorsorge': '#10B981',          // Emerald
    'labor': '#65A30D',              // Lime
    'beratung': '#3B82F6',          // Blue
    'kosmetik': '#EC4899',          // Pink
    'sportmedizin': '#F59E0B',      // Amber
    'arbeitsmedizin': '#0EA5E9'     // Sky
  };

  // Prüfe exakte Übereinstimmungen
  if (colorMap[nameLower]) {
    return colorMap[nameLower];
  }

  // Prüfe Teilübereinstimmungen
  for (const [key, color] of Object.entries(colorMap)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return color;
    }
  }

  // Standard-Farben basierend auf ersten Buchstaben
  const defaultColors = [
    '#2563EB', '#DC2626', '#059669', '#7C3AED', '#EA580C',
    '#0891B2', '#BE185D', '#10B981', '#65A30D', '#3B82F6',
    '#EC4899', '#F59E0B', '#0EA5E9', '#8B5CF6', '#6366F1'
  ];
  
  const firstChar = nameLower.charCodeAt(0) || 0;
  const colorIndex = firstChar % defaultColors.length;
  return defaultColors[colorIndex];
}

// Skript ausführen
if (require.main === module) {
  migrateServiceCategories()
    .then(() => {
      console.log('\n✅ Migration erfolgreich abgeschlossen!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration fehlgeschlagen:', error);
      process.exit(1);
    });
}

module.exports = { migrateServiceCategories };

