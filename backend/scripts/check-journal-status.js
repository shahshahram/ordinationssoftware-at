/**
 * Script: Prüfe Status-Werte in Journal-Einträgen
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const InvoiceJournal = require('../models/InvoiceJournal');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware';

const checkJournalStatus = async () => {
  try {
    console.log('🔌 Verbinde mit MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Verbunden mit MongoDB');

    // Finde alle Journal-Einträge
    const allEntries = await InvoiceJournal.find({}).select('status invoiceNumber').lean();
    console.log(`\n📊 Gesamt Journal-Einträge: ${allEntries.length}`);

    // Gruppiere nach Status
    const statusCounts = {};
    allEntries.forEach(entry => {
      const status = entry.status || 'unbekannt';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('\n📊 Status-Verteilung:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });

    // Prüfe spezifisch nach "sent" und "overdue"
    const sentEntries = await InvoiceJournal.find({ status: 'sent' }).countDocuments();
    const overdueEntries = await InvoiceJournal.find({ status: 'overdue' }).countDocuments();
    const sentOrOverdue = await InvoiceJournal.find({ status: { $in: ['sent', 'overdue'] } }).countDocuments();

    console.log('\n📊 Offene Rechnungen:');
    console.log(`   - Status "sent": ${sentEntries}`);
    console.log(`   - Status "overdue": ${overdueEntries}`);
    console.log(`   - Status "sent" ODER "overdue" (mit $in): ${sentOrOverdue}`);

    // Zeige einige Beispiele
    console.log('\n📋 Beispiele für "sent" Rechnungen:');
    const sentExamples = await InvoiceJournal.find({ status: 'sent' }).select('invoiceNumber status').limit(5).lean();
    sentExamples.forEach(entry => {
      console.log(`   - ${entry.invoiceNumber}: ${entry.status}`);
    });

    console.log('\n📋 Beispiele für "overdue" Rechnungen:');
    const overdueExamples = await InvoiceJournal.find({ status: 'overdue' }).select('invoiceNumber status').limit(5).lean();
    overdueExamples.forEach(entry => {
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
  checkJournalStatus();
}

module.exports = checkJournalStatus;
