// Erweiterte Abrechnungsberichte

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const Reimbursement = require('../models/Reimbursement');
const PatientExtended = require('../models/PatientExtended');

// GET /api/billing-reports/summary - Zusammenfassung
router.get('/summary', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.invoiceDate = {};
      if (startDate) dateFilter.invoiceDate.$gte = new Date(startDate);
      if (endDate) dateFilter.invoiceDate.$lte = new Date(endDate);
    }
    
    // Aggregation für Zusammenfassung
    const summary = await Invoice.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$billingType',
          count: { $sum: 1 },
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
    
    // Status-Übersicht
    const statusSummary = await Invoice.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    // Gesamtstatistik
    const totalStats = await Invoice.aggregate([
      { $match: dateFilter },
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
        byBillingType: summary,
        byStatus: statusSummary,
        totals: totalStats[0] || {
          totalInvoices: 0,
          totalAmount: 0,
          totalCopay: 0,
          totalInsuranceAmount: 0
        },
        period: {
          startDate: startDate || null,
          endDate: endDate || null
        }
      }
    });
  } catch (error) {
    console.error('Error generating billing summary:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren der Zusammenfassung',
      error: error.message
    });
  }
});

// GET /api/billing-reports/by-insurance - Nach Versicherung
router.get('/by-insurance', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.invoiceDate = {};
      if (startDate) dateFilter.invoiceDate.$gte = new Date(startDate);
      if (endDate) dateFilter.invoiceDate.$lte = new Date(endDate);
    }
    
    const invoices = await Invoice.find(dateFilter)
      .populate('patient.id', 'insuranceProvider insuranceNumber')
      .select('patient totalAmount billingType invoiceDate');
    
    const byInsurance = {};
    invoices.forEach(invoice => {
      const provider = invoice.patient?.id?.insuranceProvider || 'Unbekannt';
      if (!byInsurance[provider]) {
        byInsurance[provider] = {
          provider,
          count: 0,
          totalAmount: 0,
          byBillingType: {}
        };
      }
      byInsurance[provider].count++;
      byInsurance[provider].totalAmount += invoice.totalAmount || 0;
      
      const billingType = invoice.billingType || 'unknown';
      if (!byInsurance[provider].byBillingType[billingType]) {
        byInsurance[provider].byBillingType[billingType] = { count: 0, totalAmount: 0 };
      }
      byInsurance[provider].byBillingType[billingType].count++;
      byInsurance[provider].byBillingType[billingType].totalAmount += invoice.totalAmount || 0;
    });
    
    res.json({
      success: true,
      data: Object.values(byInsurance)
    });
  } catch (error) {
    console.error('Error generating insurance report:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren des Versicherungsberichts',
      error: error.message
    });
  }
});

// GET /api/billing-reports/reimbursements - Erstattungsübersicht
router.get('/reimbursements', auth, async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.submittedDate = {};
      if (startDate) filter.submittedDate.$gte = new Date(startDate);
      if (endDate) filter.submittedDate.$lte = new Date(endDate);
    }
    if (status) filter.status = status;
    
    const reimbursements = await Reimbursement.find(filter)
      .populate('patientId', 'firstName lastName insuranceProvider')
      .populate('invoiceId', 'invoiceNumber invoiceDate totalAmount')
      .sort({ submittedDate: -1 });
    
    const stats = await Reimbursement.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRequested: { $sum: '$requestedReimbursement' },
          totalApproved: { $sum: '$approvedReimbursement' },
          totalRejected: { $sum: '$rejectedAmount' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        reimbursements,
        statistics: stats,
        totals: {
          totalRequested: reimbursements.reduce((sum, r) => sum + (r.requestedReimbursement || 0), 0),
          totalApproved: reimbursements.reduce((sum, r) => sum + (r.approvedReimbursement || 0), 0),
          totalPending: reimbursements.filter(r => r.status === 'pending' || r.status === 'submitted').length
        }
      }
    });
  } catch (error) {
    console.error('Error generating reimbursement report:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren der Erstattungsübersicht',
      error: error.message
    });
  }
});

// GET /api/billing-reports/monthly - Monatliche Übersicht
router.get('/monthly', auth, async (req, res) => {
  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Jahr und Monat sind erforderlich (YYYY, MM)'
      });
    }
    
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    
    const invoices = await Invoice.find({
      invoiceDate: {
        $gte: startDate,
        $lte: endDate
      }
    })
      .populate('patient.id', 'insuranceProvider')
      .select('billingType totalAmount status invoiceDate patient services');
    
    const dailyStats = {};
    invoices.forEach(invoice => {
      const day = new Date(invoice.invoiceDate).getDate();
      if (!dailyStats[day]) {
        dailyStats[day] = {
          date: new Date(parseInt(year), parseInt(month) - 1, day),
          count: 0,
          totalAmount: 0,
          byBillingType: {}
        };
      }
      dailyStats[day].count++;
      dailyStats[day].totalAmount += invoice.totalAmount || 0;
      
      const billingType = invoice.billingType || 'unknown';
      if (!dailyStats[day].byBillingType[billingType]) {
        dailyStats[day].byBillingType[billingType] = { count: 0, totalAmount: 0 };
      }
      dailyStats[day].byBillingType[billingType].count++;
      dailyStats[day].byBillingType[billingType].totalAmount += invoice.totalAmount || 0;
    });
    
    res.json({
      success: true,
      data: {
        period: { year: parseInt(year), month: parseInt(month) },
        daily: Object.values(dailyStats).sort((a, b) => a.date - b.date),
        totals: {
          totalInvoices: invoices.length,
          totalAmount: invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
        }
      }
    });
  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren des Monatsberichts',
      error: error.message
    });
  }
});

// GET /api/billing-reports/export/excel - Excel-Export
router.get('/export/excel', auth, async (req, res) => {
  try {
    const { startDate, endDate, billingType, status } = req.query;
    const ExcelJS = require('exceljs');
    
    const filter = {};
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }
    if (billingType) filter.billingType = billingType;
    if (status) filter.status = status;
    
    const invoices = await Invoice.find(filter)
      .populate('patient.id', 'firstName lastName insuranceProvider')
      .populate('createdBy', 'firstName lastName')
      .sort({ invoiceDate: -1 });
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Abrechnungen');
    
    // Header
    worksheet.columns = [
      { header: 'Rechnungsnummer', key: 'invoiceNumber', width: 20 },
      { header: 'Datum', key: 'invoiceDate', width: 12 },
      { header: 'Patient', key: 'patientName', width: 30 },
      { header: 'Versicherung', key: 'insurance', width: 30 },
      { header: 'Abrechnungstyp', key: 'billingType', width: 15 },
      { header: 'Gesamtbetrag', key: 'totalAmount', width: 15 },
      { header: 'Selbstbehalt', key: 'copay', width: 15 },
      { header: 'Versicherungsanteil', key: 'insuranceAmount', width: 18 },
      { header: 'Status', key: 'status', width: 12 }
    ];
    
    // Daten
    invoices.forEach(invoice => {
      const copay = invoice.services?.reduce((sum, s) => sum + (s.copay || 0), 0) || 0;
      const insuranceAmount = (invoice.totalAmount || 0) - copay;
      
      worksheet.addRow({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: new Date(invoice.invoiceDate).toLocaleDateString('de-DE'),
        patientName: invoice.patient?.id ? `${invoice.patient.id.firstName} ${invoice.patient.id.lastName}` : 'Unbekannt',
        insurance: invoice.patient?.id?.insuranceProvider || 'Unbekannt',
        billingType: invoice.billingType,
        totalAmount: (invoice.totalAmount || 0) / 100,
        copay: copay / 100,
        insuranceAmount: insuranceAmount / 100,
        status: invoice.status
      });
    });
    
    // Formatierung
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Beträge formatieren
    ['totalAmount', 'copay', 'insuranceAmount'].forEach(key => {
      worksheet.getColumn(key).numFmt = '#,##0.00 "€"';
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Abrechnungen_${Date.now()}.xlsx"`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Excel-Export',
      error: error.message
    });
  }
});

module.exports = router;












