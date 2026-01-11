/**
 * Script: Teste Journal-Filter mit mehreren Status
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const InvoiceJournal = require('../models/InvoiceJournal');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware';

const testJournalFilter = async () => {
  try {
    console.log('🔌 Verbinde mit MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Verbunden mit MongoDB\n');

    // Test 1: Einzelner Status "sent"
    console.log('Test 1: Status = "sent"');
    const sentFilter = { status: 'sent' };
    const sentResults = await InvoiceJournal.find(sentFilter).countDocuments();
    console.log(`   Filter: ${JSON.stringify(sentFilter)}`);
    console.log(`   Ergebnisse: ${sentResults}\n`);

    // Test 2: Einzelner Status "overdue"
    console.log('Test 2: Status = "overdue"');
    const overdueFilter = { status: 'overdue' };
    const overdueResults = await InvoiceJournal.find(overdueFilter).countDocuments();
    console.log(`   Filter: ${JSON.stringify(overdueFilter)}`);
    console.log(`   Ergebnisse: ${overdueResults}\n`);

    // Test 3: Mehrere Status mit $in
    console.log('Test 3: Status = { $in: ["sent", "overdue"] }');
    const multiFilter = { status: { $in: ['sent', 'overdue'] } };
    const multiResults = await InvoiceJournal.find(multiFilter).countDocuments();
    console.log(`   Filter: ${JSON.stringify(multiFilter)}`);
    console.log(`   Ergebnisse: ${multiResults}\n`);

    // Test 4: Simuliere die Backend-Logik
    console.log('Test 4: Simuliere Backend-Logik mit "sent,overdue"');
    const status = 'sent,overdue';
    const statuses = status.split(',').map(s => s.trim()).filter(s => s);
    console.log(`   Status-Parameter: "${status}"`);
    console.log(`   Statuses nach Split: ${JSON.stringify(statuses)}`);
    
    let filter = {};
    if (statuses.length > 1) {
      filter.status = { $in: statuses };
    } else {
      filter.status = statuses[0] || status;
    }
    console.log(`   Filter: ${JSON.stringify(filter, null, 2)}`);
    const simulatedResults = await InvoiceJournal.find(filter).countDocuments();
    console.log(`   Ergebnisse: ${simulatedResults}\n`);

    // Test 5: Zeige einige Beispiele
    console.log('Test 5: Zeige Beispiele der gefilterten Einträge');
    const examples = await InvoiceJournal.find({ status: { $in: ['sent', 'overdue'] } })
      .select('invoiceNumber status invoiceDate')
      .limit(10)
      .lean();
    examples.forEach(entry => {
      console.log(`   - ${entry.invoiceNumber}: ${entry.status} (${entry.invoiceDate})`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Fehler:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

if (require.main === module) {
  testJournalFilter();
}

module.exports = testJournalFilter;
