// Versicherungs-spezifische Abrechnungs-Routes
// Für SVS, BVAEB, KFA, PVA

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const insuranceXMLGenerator = require('../utils/insurance-xml-generator');
const fs = require('fs').promises;
const path = require('path');

/**
 * GET /api/insurance-billing/export/:invoiceId
 * Exportiert Rechnung als XML für spezifische Versicherung
 */
router.get('/export/:invoiceId', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId)
      .populate('patient.id')
      .populate('createdBy');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }

    if (invoice.billingType !== 'kassenarzt') {
      return res.status(400).json({
        success: false,
        message: 'Nur Kassenarzt-Rechnungen können exportiert werden'
      });
    }

    const patient = invoice.patient?.id || invoice.patient;
    const insuranceProvider = patient?.insuranceProvider || 'ÖGK (Österreichische Gesundheitskasse)';
    
    // Prüfe ob Versicherung unterstützt wird
    const normalizedProvider = insuranceXMLGenerator.normalizeProvider(insuranceProvider);
    if (!normalizedProvider || normalizedProvider === 'ÖGK') {
      return res.status(400).json({
        success: false,
        message: 'ÖGK-Export sollte über /api/ogk-billing/export verwendet werden'
      });
    }

    const doctor = invoice.doctor || {};
    const xml = insuranceXMLGenerator.generateXML([invoice], doctor, insuranceProvider);
    
    // Setze Export-Flag
    invoice.insuranceBilling = invoice.insuranceBilling || {};
    invoice.insuranceBilling.xmlExported = true;
    invoice.insuranceBilling.xmlExportDate = new Date();
    invoice.insuranceBilling.insuranceProvider = normalizedProvider;
    await invoice.save();
    
    const filename = `${normalizedProvider}_${invoice.invoiceNumber}_${Date.now()}.xml`;
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xml);
  } catch (error) {
    console.error('Error exporting insurance XML:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Exportieren der XML-Datei',
      error: error.message
    });
  }
});

/**
 * POST /api/insurance-billing/export/batch
 * Exportiert mehrere Rechnungen als XML
 */
router.post('/export/batch', auth, async (req, res) => {
  try {
    const { invoiceIds, insuranceProvider } = req.body;
    
    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Mindestens eine Rechnungs-ID ist erforderlich'
      });
    }

    if (!insuranceProvider) {
      return res.status(400).json({
        success: false,
        message: 'Versicherungsanbieter ist erforderlich'
      });
    }

    const normalizedProvider = insuranceXMLGenerator.normalizeProvider(insuranceProvider);
    if (!normalizedProvider || normalizedProvider === 'ÖGK') {
      return res.status(400).json({
        success: false,
        message: 'ÖGK-Export sollte über /api/ogk-billing/export verwendet werden'
      });
    }

    const invoices = await Invoice.find({
      _id: { $in: invoiceIds },
      billingType: 'kassenarzt'
    })
      .populate('patient.id')
      .populate('createdBy');

    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Keine Kassenarzt-Rechnungen gefunden'
      });
    }

    const doctor = invoices[0].doctor || {};
    const xml = insuranceXMLGenerator.generateXML(invoices, doctor, insuranceProvider);
    
    // Setze Export-Flags
    await Invoice.updateMany(
      { _id: { $in: invoices.map(inv => inv._id) } },
      {
        $set: {
          'insuranceBilling.xmlExported': true,
          'insuranceBilling.xmlExportDate': new Date(),
          'insuranceBilling.insuranceProvider': normalizedProvider
        }
      }
    );
    
    const filename = `${normalizedProvider}_Batch_${Date.now()}.xml`;
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xml);
  } catch (error) {
    console.error('Error exporting insurance XML batch:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Exportieren der XML-Datei',
      error: error.message
    });
  }
});

/**
 * GET /api/insurance-billing/supported
 * Gibt unterstützte Versicherungen zurück
 */
router.get('/supported', auth, async (req, res) => {
  res.json({
    success: true,
    data: {
      supported: ['SVS', 'BVAEB', 'KFA', 'PVA', 'ÖGK'],
      descriptions: {
        'SVS': 'Sozialversicherung der Selbständigen',
        'BVAEB': 'Versicherungsanstalt für Eisenbahnen und Bergbau',
        'KFA': 'Krankenfürsorgeanstalt der Bediensteten der Stadt Wien',
        'PVA': 'Pensionsversicherungsanstalt',
        'ÖGK': 'Österreichische Gesundheitskasse'
      }
    }
  });
});

module.exports = router;



