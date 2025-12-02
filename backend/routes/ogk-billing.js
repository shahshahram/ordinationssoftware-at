// ÖGK-Abrechnung Routes (XML-Export, Turnusabrechnung)

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const ogkXMLGenerator = require('../utils/ogk-xml-generator');
const ogkAutoSubmitService = require('../services/ogkAutoSubmitService');
const fs = require('fs').promises;
const path = require('path');

// GET /api/ogk-billing/export/:invoiceId - Einzelne Rechnung als XML exportieren
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
        message: 'Nur Kassenarzt-Rechnungen können als ÖGK-XML exportiert werden'
      });
    }
    
    const doctor = invoice.doctor || {};
    const xml = ogkXMLGenerator.generateELA([invoice], doctor);
    
    // Setze XML-Export-Flag
    invoice.ogkBilling = invoice.ogkBilling || {};
    invoice.ogkBilling.xmlExported = true;
    invoice.ogkBilling.xmlExportDate = new Date();
    await invoice.save();
    
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="OGK_${invoice.invoiceNumber}_${Date.now()}.xml"`);
    res.send(xml);
  } catch (error) {
    console.error('Error exporting ÖGK XML:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Exportieren der XML-Datei',
      error: error.message
    });
  }
});

// POST /api/ogk-billing/export/batch - Mehrere Rechnungen als XML exportieren
router.post('/export/batch', [
  auth,
  express.json()
], async (req, res) => {
  try {
    const { invoiceIds, billingPeriod } = req.body;
    
    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Mindestens eine Rechnungs-ID ist erforderlich'
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
    let xml;
    
    if (billingPeriod) {
      // Turnusabrechnung
      xml = ogkXMLGenerator.generateTurnusAbrechnung(invoices, doctor, billingPeriod);
    } else {
      // Einzelleistungsauszug
      xml = ogkXMLGenerator.generateELA(invoices, doctor);
    }
    
    // Setze XML-Export-Flag für alle Rechnungen
    await Invoice.updateMany(
      { _id: { $in: invoices.map(inv => inv._id) } },
      {
        $set: {
          'ogkBilling.xmlExported': true,
          'ogkBilling.xmlExportDate': new Date(),
          'ogkBilling.billingPeriod': billingPeriod || null
        }
      }
    );
    
    res.setHeader('Content-Type', 'application/xml');
    const filename = billingPeriod 
      ? `OGK_Turnus_${billingPeriod}_${Date.now()}.xml`
      : `OGK_ELA_${Date.now()}.xml`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xml);
  } catch (error) {
    console.error('Error exporting ÖGK XML batch:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Exportieren der XML-Datei',
      error: error.message
    });
  }
});

// GET /api/ogk-billing/turnus/:period - Turnusabrechnung für einen Monat
router.get('/turnus/:period', auth, async (req, res) => {
  try {
    const { period } = req.params; // Format: YYYY-MM
    const periodMatch = /^(\d{4})-(\d{2})$/.exec(period);
    
    if (!periodMatch) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiges Periodenformat. Erwartet: YYYY-MM'
      });
    }
    
    const year = parseInt(periodMatch[1]);
    const month = parseInt(periodMatch[2]);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const invoices = await Invoice.find({
      billingType: 'kassenarzt',
      invoiceDate: {
        $gte: startDate,
        $lte: endDate
      },
      'ogkBilling.status': { $ne: 'paid' }
    })
      .populate('patient.id')
      .populate('createdBy')
      .sort({ invoiceDate: 1 });
    
    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Keine Rechnungen für diesen Zeitraum gefunden'
      });
    }
    
    const doctor = invoices[0].doctor || {};
    const xml = ogkXMLGenerator.generateTurnusAbrechnung(invoices, doctor, period);
    
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="OGK_Turnus_${period}_${Date.now()}.xml"`);
    res.send(xml);
  } catch (error) {
    console.error('Error generating turnus billing:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren der Turnusabrechnung',
      error: error.message
    });
  }
});

// GET /api/ogk-billing/stats/:period - Statistiken für einen Monat
router.get('/stats/:period', auth, async (req, res) => {
  try {
    const { period } = req.params; // Format: YYYY-MM
    const periodMatch = /^(\d{4})-(\d{2})$/.exec(period);
    
    if (!periodMatch) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiges Periodenformat. Erwartet: YYYY-MM'
      });
    }
    
    const year = parseInt(periodMatch[1]);
    const month = parseInt(periodMatch[2]);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const stats = await Invoice.aggregate([
      {
        $match: {
          billingType: 'kassenarzt',
          invoiceDate: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalCopay: {
            $sum: {
              $reduce: {
                input: '$services',
                initialValue: 0,
                in: { $add: ['$$value', { $ifNull: ['$$this.copay', 0] }] }
              }
            }
          },
          totalInsuranceAmount: {
            $sum: {
              $subtract: [
                '$totalAmount',
                {
                  $reduce: {
                    input: '$services',
                    initialValue: 0,
                    in: { $add: ['$$value', { $ifNull: ['$$this.copay', 0] }] }
                  }
                }
              ]
            }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        period,
        ...(stats[0] || {
          totalInvoices: 0,
          totalAmount: 0,
          totalCopay: 0,
          totalInsuranceAmount: 0
        })
      }
    });
  } catch (error) {
    console.error('Error fetching ÖGK stats:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Statistiken',
      error: error.message
    });
  }
});

// POST /api/ogk-billing/auto-submit - Manuelle Auslösung der automatischen Übermittlung
router.post('/auto-submit', auth, async (req, res) => {
  try {
    const result = await ogkAutoSubmitService.manualSubmit();
    
    res.json({
      success: true,
      message: 'Automatische Übermittlung ausgelöst',
      data: result
    });
  } catch (error) {
    console.error('Error triggering auto-submit:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der automatischen Übermittlung',
      error: error.message
    });
  }
});

// GET /api/ogk-billing/auto-submit/status - Status der automatischen Übermittlung
router.get('/auto-submit/status', auth, async (req, res) => {
  try {
    const status = ogkAutoSubmitService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error fetching auto-submit status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Status',
      error: error.message
    });
  }
});

module.exports = router;
