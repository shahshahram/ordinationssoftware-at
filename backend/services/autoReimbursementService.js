// Automatische Erstattungsverarbeitung
// Erstellt und verwaltet Erstattungen für Wahlarzt- und Zusatzversicherungs-Abrechnungen

const Reimbursement = require('../models/Reimbursement');
const Invoice = require('../models/Invoice');
const PatientExtended = require('../models/PatientExtended');
const ServiceCatalog = require('../models/ServiceCatalog');
const billingCalculator = require('../utils/billing-calculator');
const notificationService = require('./notificationService');
const InternalMessage = require('../models/InternalMessage');

class AutoReimbursementService {
  constructor() {
    this.isProcessing = false;
  }

  /**
   * Verarbeitet alle ausstehenden Rechnungen und erstellt automatisch Erstattungen
   */
  async processPendingInvoices() {
    if (this.isProcessing) {
      console.log('⏳ Automatische Erstattungsverarbeitung läuft bereits');
      return;
    }

    this.isProcessing = true;
    console.log('🔄 Starte automatische Erstattungsverarbeitung...');

    try {
      // Finde alle Wahlarzt-Rechnungen ohne Erstattung
      const wahlarztInvoices = await Invoice.find({
        billingType: 'wahlarzt',
        status: { $in: ['paid', 'sent'] },
        $or: [
          { 'reimbursementId': { $exists: false } },
          { 'reimbursementId': null }
        ]
      })
        .populate('patient.id')
        .populate('createdBy');

      let created = 0;
      let errors = [];

      for (const invoice of wahlarztInvoices) {
        try {
          const reimbursement = await this.createReimbursementForInvoice(invoice);
          if (reimbursement) {
            created++;
            console.log(`✅ Erstattung erstellt für Rechnung ${invoice.invoiceNumber}`);
          }
        } catch (error) {
          console.error(`❌ Fehler bei Rechnung ${invoice.invoiceNumber}:`, error.message);
          errors.push({ invoiceId: invoice._id, error: error.message });
        }
      }

      console.log(`✅ Automatische Erstattungsverarbeitung abgeschlossen: ${created} Erstattungen erstellt, ${errors.length} Fehler`);

      return {
        success: true,
        created,
        errors,
        totalProcessed: wahlarztInvoices.length
      };
    } catch (error) {
      console.error('❌ Fehler bei automatischer Erstattungsverarbeitung:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Erstellt Erstattung für eine Rechnung
   */
  async createReimbursementForInvoice(invoice) {
    const patient = invoice.patient?.id || invoice.patient;
    if (!patient) {
      throw new Error('Patient nicht gefunden');
    }

    // Prüfe ob bereits Erstattung existiert
    const existing = await Reimbursement.findOne({ invoiceId: invoice._id });
    if (existing) {
      console.log(`ℹ️ Erstattung für Rechnung ${invoice.invoiceNumber} existiert bereits`);
      return existing;
    }

    // Lade vollständige Patientendaten
    const patientExtended = await PatientExtended.findById(patient._id || patient);
    if (!patientExtended) {
      throw new Error('PatientExtended nicht gefunden');
    }

    // Bestimme Versicherungsanbieter
    const insuranceProvider = patientExtended.insuranceProvider || 'ÖGK (Österreichische Gesundheitskasse)';
    
    // Berechne Erstattungsbetrag
    const reimbursementCalculation = this.calculateReimbursement(invoice, patientExtended);

    // Erstelle Erstattung
    const reimbursement = new Reimbursement({
      invoiceId: invoice._id,
      patientId: patientExtended._id,
      insuranceProvider: insuranceProvider,
      insuranceType: this.determineInsuranceType(patientExtended, invoice),
      insuranceCompany: this.extractInsuranceCompany(insuranceProvider),
      policyNumber: patientExtended.insuranceNumber || null,
      serviceDate: invoice.invoiceDate || new Date(),
      serviceDescription: invoice.services?.map(s => s.description).join(', ') || 'Wahlarzt-Leistung',
      serviceCode: invoice.services?.[0]?.serviceCode || null,
      goaeCode: invoice.services?.[0]?.goaeCode || null,
      khoCode: invoice.services?.[0]?.khoCode || null,
      totalAmount: invoice.totalAmount || 0,
      requestedReimbursement: reimbursementCalculation.requestedAmount,
      status: 'pending',
      createdBy: invoice.createdBy?._id || invoice.createdBy
    });

    await reimbursement.save();

    // Verknüpfe Erstattung mit Rechnung
    invoice.reimbursementId = reimbursement._id;
    await invoice.save();

    // Sende Benachrichtigung
    await this.notifyReimbursementCreated(reimbursement, invoice, patientExtended);

    return reimbursement;
  }

  /**
   * Berechnet Erstattungsbetrag für eine Rechnung
   */
  calculateReimbursement(invoice, patient) {
    let requestedAmount = 0;
    let reimbursementRate = 0.80; // Standard 80% für Wahlarzt

    // Prüfe Zusatzversicherung
    if (patient.additionalInsurances?.privateDoctorInsurance) {
      const privateIns = patient.additionalInsurances.privateDoctorInsurance;
      reimbursementRate = (privateIns.reimbursementRate || 80) / 100;
      
      // Prüfe Maximalbetrag
      if (privateIns.maxReimbursementPerYear) {
        // TODO: Berechne bereits verwendetes Budget
        const usedBudget = 0; // Placeholder
        const availableBudget = privateIns.maxReimbursementPerYear - usedBudget;
        requestedAmount = Math.min(invoice.totalAmount * reimbursementRate, availableBudget);
      } else {
        requestedAmount = invoice.totalAmount * reimbursementRate;
      }
    } else {
      // Standard-Erstattung (80% von ÖGK)
      requestedAmount = invoice.totalAmount * reimbursementRate;
    }

    return {
      requestedAmount: Math.round(requestedAmount),
      reimbursementRate: reimbursementRate * 100,
      patientAmount: invoice.totalAmount - Math.round(requestedAmount)
    };
  }

  /**
   * Bestimmt Versicherungstyp
   */
  determineInsuranceType(patient, invoice) {
    if (patient.additionalInsurances?.privateDoctorInsurance) {
      return 'zusatzversicherung_wahlarzt';
    }
    return 'hauptversicherung';
  }

  /**
   * Extrahiert Versicherungsunternehmen aus Provider-String
   */
  extractInsuranceCompany(provider) {
    if (!provider) return 'Unbekannt';
    if (provider.includes('ÖGK')) return 'ÖGK';
    if (provider.includes('SVS')) return 'SVS';
    if (provider.includes('BVAEB')) return 'BVAEB';
    if (provider.includes('KFA')) return 'KFA';
    if (provider.includes('PVA')) return 'PVA';
    return provider;
  }

  /**
   * Sendet Benachrichtigung über erstellte Erstattung
   */
  async notifyReimbursementCreated(reimbursement, invoice, patient) {
    try {
      const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
      const subject = `Erstattung erstellt: ${invoice.invoiceNumber}`;
      const message = `Für die Rechnung ${invoice.invoiceNumber} wurde automatisch eine Erstattung erstellt.\n\n` +
        `Patient: ${patientName}\n` +
        `Betrag: €${(reimbursement.requestedReimbursement / 100).toFixed(2)}\n` +
        `Status: ${this.getStatusLabel(reimbursement.status)}\n\n` +
        `Die Erstattung kann nun eingereicht werden.`;

      // Sende an Ersteller der Rechnung
      if (invoice.createdBy?._id || invoice.createdBy) {
        const systemUser = await require('../models/User').findOne({ 
          role: { $in: ['admin', 'super_admin'] }, 
          isActive: true 
        }).select('_id').lean();

        const notification = new InternalMessage({
          senderId: systemUser?._id || invoice.createdBy._id || invoice.createdBy,
          recipientId: invoice.createdBy._id || invoice.createdBy,
          subject: subject,
          message: message,
          priority: 'normal',
          status: 'sent',
          patientId: patient._id,
          relatedResource: {
            type: 'Reimbursement',
            id: reimbursement._id
          }
        });

        await notification.save();
        console.log(`✅ Benachrichtigung gesendet für Erstattung ${reimbursement._id}`);
      }
    } catch (error) {
      console.warn('⚠️ Fehler bei Benachrichtigung:', error);
      // Fehler nicht weiterwerfen, da Erstattung bereits erstellt wurde
    }
  }

  /**
   * Gibt Status-Label zurück
   */
  getStatusLabel(status) {
    const labels = {
      pending: 'Ausstehend',
      submitted: 'Eingereicht',
      approved: 'Genehmigt',
      partially_approved: 'Teilweise genehmigt',
      rejected: 'Abgelehnt',
      paid: 'Bezahlt',
      cancelled: 'Storniert'
    };
    return labels[status] || status;
  }

  /**
   * Automatische Einreichung von Erstattungen (falls konfiguriert)
   */
  async autoSubmitReimbursements() {
    console.log('🔄 Starte automatische Erstattungseinreichung...');

    try {
      // Finde alle ausstehenden Erstattungen, die automatisch eingereicht werden sollen
      const pendingReimbursements = await Reimbursement.find({
        status: 'pending',
        // TODO: Füge Feld hinzu für autoSubmit-Flag
      })
        .populate('invoiceId')
        .populate('patientId')
        .limit(50); // Batch-Verarbeitung

      let submitted = 0;
      let errors = [];

      for (const reimbursement of pendingReimbursements) {
        try {
          // Prüfe ob automatische Einreichung aktiviert ist
          // TODO: Implementiere Logik für automatische Einreichung
          // Für jetzt: Nur manuelle Einreichung
          console.log(`ℹ️ Automatische Einreichung für Erstattung ${reimbursement._id} noch nicht implementiert`);
        } catch (error) {
          console.error(`❌ Fehler bei Erstattung ${reimbursement._id}:`, error.message);
          errors.push({ reimbursementId: reimbursement._id, error: error.message });
        }
      }

      return {
        success: true,
        submitted,
        errors,
        totalProcessed: pendingReimbursements.length
      };
    } catch (error) {
      console.error('❌ Fehler bei automatischer Erstattungseinreichung:', error);
      throw error;
    }
  }
}

module.exports = new AutoReimbursementService();



