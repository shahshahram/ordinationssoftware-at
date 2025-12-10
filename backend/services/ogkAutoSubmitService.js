// Automatische ÖGK-Übermittlung Service
// Übermittelt Kassenarzt-Rechnungen automatisch an ÖGK

const cron = require('node-cron');
const Invoice = require('../models/Invoice');
const ogkXMLGenerator = require('../utils/ogk-xml-generator');
const elgaService = require('./elgaService');
const fs = require('fs').promises;
const path = require('path');

class OGKAutoSubmitService {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.submissionPath = process.env.OGK_SUBMISSION_PATH || './submissions/ogk';
  }

  /**
   * Startet automatische Übermittlung (täglich um 23:00 Uhr)
   */
  start() {
    // Täglich um 23:00 Uhr
    cron.schedule('0 23 * * *', async () => {
      await this.processPendingSubmissions();
    });
    
    // Optional: Auch manuell startbar
    console.log('✅ ÖGK Auto-Submit Service gestartet (täglich 23:00 Uhr)');
  }

  /**
   * Verarbeitet ausstehende Übermittlungen
   */
  async processPendingSubmissions() {
    if (this.isRunning) {
      console.log('⏳ ÖGK Auto-Submit läuft bereits');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starte ÖGK Auto-Submit...');

    try {
      // Finde alle ausstehenden Kassenarzt-Rechnungen des aktuellen Monats
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const pendingInvoices = await Invoice.find({
        billingType: 'kassenarzt',
        invoiceDate: {
          $gte: firstDayOfMonth,
          $lte: lastDayOfMonth
        },
        $or: [
          { 'ogkBilling.status': { $exists: false } },
          { 'ogkBilling.status': 'pending' },
          { 'ogkBilling.status': null }
        ],
        'ogkBilling.xmlExported': { $ne: true }
      })
        .populate('patient.id')
        .populate('createdBy');

      if (pendingInvoices.length === 0) {
        console.log('ℹ️ Keine ausstehenden Rechnungen gefunden');
        this.isRunning = false;
        this.lastRun = new Date();
        return;
      }

      console.log(`📋 ${pendingInvoices.length} ausstehende Rechnungen gefunden`);

      // Gruppiere nach Arzt
      const invoicesByDoctor = {};
      pendingInvoices.forEach(invoice => {
        const doctorKey = invoice.doctor?.name || 'unknown';
        if (!invoicesByDoctor[doctorKey]) {
          invoicesByDoctor[doctorKey] = [];
        }
        invoicesByDoctor[doctorKey].push(invoice);
      });

      // Verarbeite für jeden Arzt
      const results = [];
      for (const [doctorName, invoices] of Object.entries(invoicesByDoctor)) {
        try {
          const result = await this.submitForDoctor(doctorName, invoices);
          results.push(result);
        } catch (error) {
          console.error(`❌ Fehler bei Übermittlung für ${doctorName}:`, error);
          results.push({
            doctor: doctorName,
            success: false,
            error: error.message
          });
        }
      }

      this.lastRun = new Date();
      console.log(`✅ ÖGK Auto-Submit abgeschlossen: ${results.filter(r => r.success).length}/${results.length} erfolgreich`);

      return {
        success: true,
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      console.error('❌ Fehler bei ÖGK Auto-Submit:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Übermittelt Rechnungen für einen Arzt
   */
  async submitForDoctor(doctorName, invoices) {
    const doctor = invoices[0].doctor || {};
    const billingPeriod = this.getBillingPeriod(invoices[0].invoiceDate);
    
    // Generiere XML
    const xml = ogkXMLGenerator.generateTurnusAbrechnung(invoices, doctor, billingPeriod);
    
    // Speichere XML-Datei
    await this.saveXMLFile(xml, billingPeriod, doctorName);
    
    // Versuche Übermittlung über ELGA
    let submissionResult = null;
    try {
      // Übermittle erste Rechnung als Test (in Produktion: alle)
      submissionResult = await elgaService.submitBilling(invoices[0]);
    } catch (error) {
      console.warn('ELGA-Übermittlung fehlgeschlagen, speichere nur lokal:', error.message);
    }
    
    // Aktualisiere Rechnungen
    const updatePromises = invoices.map(invoice => {
      invoice.ogkBilling = invoice.ogkBilling || {};
      invoice.ogkBilling.billingPeriod = billingPeriod;
      invoice.ogkBilling.xmlExported = true;
      invoice.ogkBilling.xmlExportDate = new Date();
      invoice.ogkBilling.submissionDate = new Date();
      
      if (submissionResult && submissionResult.success) {
        invoice.ogkBilling.status = 'submitted';
        invoice.ogkBilling.referenceNumber = submissionResult.submissionId;
      } else {
        invoice.ogkBilling.status = 'pending';
      }
      
      return invoice.save();
    });
    
    await Promise.all(updatePromises);
    
    return {
      doctor: doctorName,
      success: true,
      invoicesCount: invoices.length,
      billingPeriod,
      submissionId: submissionResult?.submissionId,
      xmlSaved: true
    };
  }

  /**
   * Speichert XML-Datei
   */
  async saveXMLFile(xml, billingPeriod, doctorName) {
    try {
      // Erstelle Verzeichnis falls nicht vorhanden
      await fs.mkdir(this.submissionPath, { recursive: true });
      
      const filename = `OGK_Turnus_${billingPeriod}_${doctorName.replace(/\s+/g, '_')}_${Date.now()}.xml`;
      const filePath = path.join(this.submissionPath, filename);
      
      await fs.writeFile(filePath, xml, 'utf8');
      
      return filePath;
    } catch (error) {
      console.error('Fehler beim Speichern der XML-Datei:', error);
      throw error;
    }
  }

  /**
   * Ermittelt Abrechnungsperiode (YYYY-MM)
   */
  getBillingPeriod(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Manuelle Übermittlung auslösen
   */
  async manualSubmit(billingPeriod = null) {
    return await this.processPendingSubmissions();
  }

  /**
   * Status abrufen
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      submissionPath: this.submissionPath
    };
  }
}

module.exports = new OGKAutoSubmitService();









