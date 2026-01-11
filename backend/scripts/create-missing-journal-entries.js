/**
 * Script: Erstelle fehlende Journal-Einträge für bestehende Rechnungen
 * 
 * Dieses Script durchsucht alle Rechnungen und erstellt Journal-Einträge
 * für Rechnungen, die noch keinen Journal-Eintrag haben.
 * 
 * Usage: node backend/scripts/create-missing-journal-entries.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const InvoiceJournal = require('../models/InvoiceJournal');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware';

const createMissingJournalEntries = async () => {
  try {
    console.log('🔌 Verbinde mit MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Verbunden mit MongoDB');

    // Finde alle Rechnungen
    console.log('📋 Lade alle Rechnungen...');
    const invoices = await Invoice.find({}).lean();
    console.log(`✅ ${invoices.length} Rechnungen gefunden`);

    // Finde alle bestehenden Journal-Einträge
    console.log('📋 Lade bestehende Journal-Einträge...');
    const existingJournalEntries = await InvoiceJournal.find({}).select('invoiceId').lean();
    const existingInvoiceIds = new Set(existingJournalEntries.map(e => e.invoiceId?.toString()));
    console.log(`✅ ${existingJournalEntries.length} bestehende Journal-Einträge gefunden`);

    // Filtere Rechnungen ohne Journal-Eintrag
    const invoicesWithoutJournal = invoices.filter(inv => {
      const invoiceId = inv._id?.toString();
      return invoiceId && !existingInvoiceIds.has(invoiceId);
    });

    console.log(`\n📊 Statistiken:`);
    console.log(`   - Gesamt Rechnungen: ${invoices.length}`);
    console.log(`   - Bestehende Journal-Einträge: ${existingJournalEntries.length}`);
    console.log(`   - Rechnungen ohne Journal-Eintrag: ${invoicesWithoutJournal.length}`);

    if (invoicesWithoutJournal.length === 0) {
      console.log('\n✅ Alle Rechnungen haben bereits Journal-Einträge!');
      await mongoose.disconnect();
      return;
    }

    console.log(`\n🔄 Erstelle Journal-Einträge für ${invoicesWithoutJournal.length} Rechnungen...`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < invoicesWithoutJournal.length; i++) {
      const invoice = invoicesWithoutJournal[i];
      const invoiceNumber = invoice.invoiceNumber || invoice._id;
      
      try {
        // Populate patient falls nötig
        let populatedInvoice = invoice;
        if (invoice.patient && typeof invoice.patient === 'object' && invoice.patient._id) {
          // Patient ist bereits populated
        } else if (invoice.patient && typeof invoice.patient === 'string') {
          // Patient ist nur eine ID, muss populated werden
          populatedInvoice = await Invoice.findById(invoice._id).populate('patient').lean();
        }

        // Erstelle Journal-Eintrag
        await InvoiceJournal.createFromInvoice(
          populatedInvoice || invoice,
          'created',
          invoice.createdBy || null,
          {
            originalStatus: invoice.status,
            changeReason: 'Nachträgliche Erstellung durch Script'
          }
        );

        successCount++;
        if ((i + 1) % 10 === 0) {
          console.log(`   ✅ ${i + 1}/${invoicesWithoutJournal.length} verarbeitet...`);
        }
      } catch (error) {
        errorCount++;
        const errorMsg = `Fehler bei Rechnung ${invoiceNumber}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}`);
        
        // Logge detaillierte Fehlerinformationen
        if (error.message.includes('Validierungsfehler')) {
          console.error(`      Details:`, {
            invoiceNumber: invoice.invoiceNumber,
            hasInvoiceDate: !!invoice.invoiceDate,
            hasTotalAmount: invoice.totalAmount !== undefined,
            hasPatient: !!invoice.patient,
            hasBillingType: !!invoice.billingType,
            hasStatus: !!invoice.status
          });
        }
      }
    }

    console.log(`\n📊 Zusammenfassung:`);
    console.log(`   ✅ Erfolgreich erstellt: ${successCount}`);
    console.log(`   ❌ Fehler: ${errorCount}`);

    if (errors.length > 0) {
      console.log(`\n⚠️  Fehlerdetails:`);
      errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
      if (errors.length > 10) {
        console.log(`   ... und ${errors.length - 10} weitere Fehler`);
      }
    }

    console.log('\n✅ Script abgeschlossen!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Fataler Fehler:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Führe Script aus
if (require.main === module) {
  createMissingJournalEntries();
}

module.exports = createMissingJournalEntries;
