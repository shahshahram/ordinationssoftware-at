/**
 * Script: Teste Journal-Filter mit locationId
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const InvoiceJournal = require('../models/InvoiceJournal');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware';

const testLocationFilter = async () => {
  try {
    console.log('🔌 Verbinde mit MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Verbunden mit MongoDB\n');

    const locationId = '68f415c6207f7d04d1f16612';

    // Test 1: Nur locationId
    console.log(`Test 1: locationId = "${locationId}"`);
    const locationFilter = { locationId: locationId };
    const locationResults = await InvoiceJournal.find(locationFilter).countDocuments();
    console.log(`   Ergebnisse: ${locationResults}\n`);

    // Test 2: locationId + Status "sent,overdue"
    console.log(`Test 2: locationId = "${locationId}" + Status "sent,overdue"`);
    const status = 'sent,overdue';
    const statuses = status.split(',').map(s => s.trim()).filter(s => s);
    const combinedFilter = {
      locationId: locationId,
      status: { $in: statuses }
    };
    console.log(`   Filter: ${JSON.stringify(combinedFilter, null, 2)}`);
    const combinedResults = await InvoiceJournal.find(combinedFilter).countDocuments();
    console.log(`   Ergebnisse: ${combinedResults}\n`);

    // Test 3: Alle locationIds in Journal-Einträgen
    console.log('Test 3: Alle locationIds in Journal-Einträgen');
    const allEntries = await InvoiceJournal.find({}).select('locationId status').lean();
    const locationStatusMap = {};
    allEntries.forEach(entry => {
      const locId = entry.locationId ? entry.locationId.toString() : 'null';
      const status = entry.status || 'unbekannt';
      if (!locationStatusMap[locId]) {
        locationStatusMap[locId] = {};
      }
      locationStatusMap[locId][status] = (locationStatusMap[locId][status] || 0) + 1;
    });
    
    Object.entries(locationStatusMap).forEach(([locId, statuses]) => {
      console.log(`   locationId: ${locId}`);
      Object.entries(statuses).forEach(([status, count]) => {
        console.log(`     - ${status}: ${count}`);
      });
    });

    // Test 4: Zeige Einträge ohne locationId
    console.log('\nTest 4: Einträge ohne locationId (null)');
    const nullLocationEntries = await InvoiceJournal.find({ locationId: null }).select('invoiceNumber status').limit(10).lean();
    console.log(`   Anzahl: ${nullLocationEntries.length}`);
    nullLocationEntries.forEach(entry => {
      console.log(`   - ${entry.invoiceNumber}: ${entry.status}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Fehler:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

if (require.main === module) {
  testLocationFilter();
}

module.exports = testLocationFilter;
