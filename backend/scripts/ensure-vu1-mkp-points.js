/**
 * Einmalige Migration: VU1 und MKP-Leistungen auf points = 1 setzen
 *
 * Damit die Preisberechnung (1 × Pauschalpreis) mathematisch sauber aufgeht,
 * müssen VU1 (Vorsorgeuntersuchung) und MKP (Mutter-Kind-Pass) im ServiceCatalog
 * das Feld ogk.points = 1 haben.
 *
 * Usage: node backend/scripts/ensure-vu1-mkp-points.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ServiceCatalog = require('../models/ServiceCatalog');

const run = async () => {
  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoURI) {
    console.error('Fehler: MONGODB_URI bzw. MONGO_URI in .env fehlt.');
    process.exit(1);
  }

  await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 30000 });
  console.log('✓ MongoDB verbunden\n');

  // Alle ServiceCatalog-Dokumente mit khoCode VU1 oder MKP (case-insensitive) auf points = 1 setzen
  const res = await ServiceCatalog.updateMany(
    { 'ogk.khoCode': { $in: [/^VU1$/i, /^MKP$/i] } },
    { $set: { 'ogk.points': 1 } }
  );
  const totalModified = res.modifiedCount;
  if (totalModified > 0) {
    console.log(`  ${totalModified} Leistung(en) auf ogk.points = 1 gesetzt.`);
  }

  const countVU1 = await ServiceCatalog.countDocuments({
    $or: [{ 'ogk.khoCode': 'VU1' }, { 'ogk.khoCode': 'vu1' }]
  });
  const countMKP = await ServiceCatalog.countDocuments({
    $or: [{ 'ogk.khoCode': 'MKP' }, { 'ogk.khoCode': 'mkp' }]
  });

  console.log('\n✓ Prüfung abgeschlossen.');
  console.log(`  VU1-Leistungen in DB: ${countVU1}`);
  console.log(`  MKP-Leistungen in DB: ${countMKP}`);
  if (totalModified > 0) {
    console.log(`  Geändert (points = 1): ${totalModified}`);
  } else {
    console.log('  Keine Anpassung nötig (bereits points = 1 oder keine Treffer).');
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
