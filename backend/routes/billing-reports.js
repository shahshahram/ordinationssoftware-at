// Erweiterte Abrechnungsberichte

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const Reimbursement = require('../models/Reimbursement');
const PatientExtended = require('../models/PatientExtended');
const ServiceCatalog = require('../models/ServiceCatalog');
const Appointment = require('../models/Appointment');
const ServiceBooking = require('../models/ServiceBooking');

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

// GET /api/billing-reports/patient-analysis - Patient-spezifische Auswertungen
router.get('/patient-analysis', auth, async (req, res) => {
  try {
    const { startDate, endDate, patientId, groupBy } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.invoiceDate = {};
      if (startDate) dateFilter.invoiceDate.$gte = new Date(startDate);
      if (endDate) dateFilter.invoiceDate.$lte = new Date(endDate);
    }
    if (patientId) {
      dateFilter['patient.id'] = patientId;
    }
    
    // Lade Rechnungen mit Patientendaten
    const invoices = await Invoice.find(dateFilter)
      .populate('patient.id', 'firstName lastName insuranceProvider')
      .select('patient invoiceDate totalAmount services billingType status')
      .sort({ invoiceDate: 1 });
    
    // Gruppiere nach Patient
    const patientStats = {};
    invoices.forEach(invoice => {
      const patientId = invoice.patient?.id?._id?.toString() || 'unknown';
      const patientName = invoice.patient?.id 
        ? `${invoice.patient.id.firstName} ${invoice.patient.id.lastName}`
        : invoice.patient?.name || 'Unbekannt';
      
      if (!patientStats[patientId]) {
        patientStats[patientId] = {
          patientId,
          patientName,
          totalInvoices: 0,
          totalAmount: 0,
          invoices: [],
          byBillingType: {},
          byMonth: {},
          services: {}
        };
      }
      
      patientStats[patientId].totalInvoices++;
      patientStats[patientId].totalAmount += invoice.totalAmount || 0;
      patientStats[patientId].invoices.push({
        invoiceDate: invoice.invoiceDate,
        totalAmount: invoice.totalAmount,
        billingType: invoice.billingType,
        status: invoice.status
      });
      
      // Gruppiere nach Abrechnungstyp
      const billingType = invoice.billingType || 'unknown';
      if (!patientStats[patientId].byBillingType[billingType]) {
        patientStats[patientId].byBillingType[billingType] = { count: 0, totalAmount: 0 };
      }
      patientStats[patientId].byBillingType[billingType].count++;
      patientStats[patientId].byBillingType[billingType].totalAmount += invoice.totalAmount || 0;
      
      // Gruppiere nach Monat
      const monthKey = invoice.invoiceDate ? 
        `${invoice.invoiceDate.getFullYear()}-${String(invoice.invoiceDate.getMonth() + 1).padStart(2, '0')}` : 
        'unknown';
      if (!patientStats[patientId].byMonth[monthKey]) {
        patientStats[patientId].byMonth[monthKey] = { count: 0, totalAmount: 0 };
      }
      patientStats[patientId].byMonth[monthKey].count++;
      patientStats[patientId].byMonth[monthKey].totalAmount += invoice.totalAmount || 0;
      
      // Analysiere Services
      if (invoice.services && Array.isArray(invoice.services)) {
        invoice.services.forEach(service => {
          const serviceKey = service.serviceCode || service.description || 'unknown';
          if (!patientStats[patientId].services[serviceKey]) {
            patientStats[patientId].services[serviceKey] = {
              serviceCode: service.serviceCode,
              description: service.description,
              count: 0,
              totalAmount: 0,
              category: service.category
            };
          }
          patientStats[patientId].services[serviceKey].count += service.quantity || 1;
          patientStats[patientId].services[serviceKey].totalAmount += service.totalPrice || 0;
        });
      }
    });
    
    // Konvertiere zu Array und sortiere nach Gesamtbetrag
    const result = Object.values(patientStats).map(stat => ({
      ...stat,
      services: Object.values(stat.services),
      byMonth: Object.entries(stat.byMonth).map(([month, data]) => ({
        month,
        ...data
      })).sort((a, b) => a.month.localeCompare(b.month))
    })).sort((a, b) => b.totalAmount - a.totalAmount);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error generating patient analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren der Patient-Analyse',
      error: error.message
    });
  }
});

// GET /api/billing-reports/service-analysis - Leistungsauswertungen
router.get('/service-analysis', auth, async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.invoiceDate = {};
      if (startDate) dateFilter.invoiceDate.$gte = new Date(startDate);
      if (endDate) dateFilter.invoiceDate.$lte = new Date(endDate);
    }
    
    // Lade alle Rechnungen
    const invoices = await Invoice.find(dateFilter)
      .select('invoiceDate services totalAmount billingType')
      .sort({ invoiceDate: 1 });
    
    // Analysiere Services
    const serviceStats = {};
    invoices.forEach(invoice => {
      if (invoice.services && Array.isArray(invoice.services)) {
        invoice.services.forEach(service => {
          const serviceKey = service.serviceCode || service.description || 'unknown';
          
          if (!serviceStats[serviceKey]) {
            serviceStats[serviceKey] = {
              serviceCode: service.serviceCode,
              description: service.description,
              category: service.category || 'Unbekannt',
              count: 0,
              totalQuantity: 0,
              totalAmount: 0,
              averagePrice: 0,
              byMonth: {},
              byBillingType: {},
              invoices: []
            };
          }
          
          serviceStats[serviceKey].count++;
          serviceStats[serviceKey].totalQuantity += service.quantity || 1;
          serviceStats[serviceKey].totalAmount += service.totalPrice || 0;
          
          // Gruppiere nach Monat
          const monthKey = invoice.invoiceDate ? 
            `${invoice.invoiceDate.getFullYear()}-${String(invoice.invoiceDate.getMonth() + 1).padStart(2, '0')}` : 
            'unknown';
          if (!serviceStats[serviceKey].byMonth[monthKey]) {
            serviceStats[serviceKey].byMonth[monthKey] = { count: 0, totalAmount: 0 };
          }
          serviceStats[serviceKey].byMonth[monthKey].count++;
          serviceStats[serviceKey].byMonth[monthKey].totalAmount += service.totalPrice || 0;
          
          // Gruppiere nach Abrechnungstyp
          const billingType = invoice.billingType || 'unknown';
          if (!serviceStats[serviceKey].byBillingType[billingType]) {
            serviceStats[serviceKey].byBillingType[billingType] = { count: 0, totalAmount: 0 };
          }
          serviceStats[serviceKey].byBillingType[billingType].count++;
          serviceStats[serviceKey].byBillingType[billingType].totalAmount += service.totalPrice || 0;
        });
      }
    });
    
    // Berechne Durchschnittspreise und konvertiere zu Array
    const result = Object.values(serviceStats).map(stat => ({
      ...stat,
      averagePrice: stat.totalQuantity > 0 ? stat.totalAmount / stat.totalQuantity : 0,
      byMonth: Object.entries(stat.byMonth).map(([month, data]) => ({
        month,
        ...data
      })).sort((a, b) => a.month.localeCompare(b.month)),
      byBillingType: Object.entries(stat.byBillingType).map(([type, data]) => ({
        type,
        ...data
      }))
    })).sort((a, b) => b.totalAmount - a.totalAmount);
    
    // Filter nach Kategorie falls angegeben
    const filteredResult = category 
      ? result.filter(stat => stat.category === category)
      : result;
    
    res.json({
      success: true,
      data: filteredResult
    });
  } catch (error) {
    console.error('Error generating service analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren der Leistungsanalyse',
      error: error.message
    });
  }
});

// GET /api/billing-reports/trends - Trend-Analysen
router.get('/trends', auth, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.invoiceDate = {};
      if (startDate) dateFilter.invoiceDate.$gte = new Date(startDate);
      if (endDate) dateFilter.invoiceDate.$lte = new Date(endDate);
    }
    
    const invoices = await Invoice.find(dateFilter)
      .select('invoiceDate totalAmount billingType status services')
      .sort({ invoiceDate: 1 });
    
    const trends = {};
    
    invoices.forEach(invoice => {
      let periodKey;
      if (groupBy === 'day') {
        periodKey = invoice.invoiceDate ? 
          invoice.invoiceDate.toISOString().split('T')[0] : 
          'unknown';
      } else if (groupBy === 'week') {
        if (invoice.invoiceDate) {
          const date = new Date(invoice.invoiceDate);
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          periodKey = weekStart.toISOString().split('T')[0];
        } else {
          periodKey = 'unknown';
        }
      } else if (groupBy === 'year') {
        periodKey = invoice.invoiceDate ? 
          `${invoice.invoiceDate.getFullYear()}` : 
          'unknown';
      } else { // month (default)
        periodKey = invoice.invoiceDate ? 
          `${invoice.invoiceDate.getFullYear()}-${String(invoice.invoiceDate.getMonth() + 1).padStart(2, '0')}` : 
          'unknown';
      }
      
      if (!trends[periodKey]) {
        trends[periodKey] = {
          period: periodKey,
          totalInvoices: 0,
          totalAmount: 0,
          byBillingType: {},
          byStatus: {},
          averageInvoiceAmount: 0
        };
      }
      
      trends[periodKey].totalInvoices++;
      trends[periodKey].totalAmount += invoice.totalAmount || 0;
      
      // Gruppiere nach Abrechnungstyp
      const billingType = invoice.billingType || 'unknown';
      if (!trends[periodKey].byBillingType[billingType]) {
        trends[periodKey].byBillingType[billingType] = { count: 0, totalAmount: 0 };
      }
      trends[periodKey].byBillingType[billingType].count++;
      trends[periodKey].byBillingType[billingType].totalAmount += invoice.totalAmount || 0;
      
      // Gruppiere nach Status
      const status = invoice.status || 'unknown';
      if (!trends[periodKey].byStatus[status]) {
        trends[periodKey].byStatus[status] = { count: 0, totalAmount: 0 };
      }
      trends[periodKey].byStatus[status].count++;
      trends[periodKey].byStatus[status].totalAmount += invoice.totalAmount || 0;
    });
    
    // Berechne Durchschnitte und konvertiere zu Array
    const result = Object.values(trends).map(trend => ({
      ...trend,
      averageInvoiceAmount: trend.totalInvoices > 0 ? trend.totalAmount / trend.totalInvoices : 0,
      byBillingType: Object.entries(trend.byBillingType).map(([type, data]) => ({
        type,
        ...data
      })),
      byStatus: Object.entries(trend.byStatus).map(([status, data]) => ({
        status,
        ...data
      }))
    })).sort((a, b) => a.period.localeCompare(b.period));
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error generating trends:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren der Trend-Analyse',
      error: error.message
    });
  }
});

// GET /api/billing-reports/profitability - Profitabilitäts-Analyse
router.get('/profitability', auth, async (req, res) => {
  try {
    const { startDate, endDate, minCount = 1 } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.invoiceDate = {};
      if (startDate) dateFilter.invoiceDate.$gte = new Date(startDate);
      if (endDate) dateFilter.invoiceDate.$lte = new Date(endDate);
    }
    
    const invoices = await Invoice.find(dateFilter)
      .select('invoiceDate services totalAmount billingType')
      .sort({ invoiceDate: 1 });
    
    // Analysiere Services für Profitabilität
    const serviceStats = {};
    invoices.forEach(invoice => {
      if (invoice.services && Array.isArray(invoice.services)) {
        invoice.services.forEach(service => {
          const serviceKey = service.serviceCode || service.description || 'unknown';
          
          if (!serviceStats[serviceKey]) {
            serviceStats[serviceKey] = {
              serviceCode: service.serviceCode,
              description: service.description,
              category: service.category || 'Unbekannt',
              count: 0,
              totalQuantity: 0,
              totalAmount: 0,
              averagePrice: 0,
              minPrice: Infinity,
              maxPrice: 0,
              revenuePerInvoice: 0
            };
          }
          
          serviceStats[serviceKey].count++;
          serviceStats[serviceKey].totalQuantity += service.quantity || 1;
          serviceStats[serviceKey].totalAmount += service.totalPrice || 0;
          
          const unitPrice = service.unitPrice || 0;
          if (unitPrice < serviceStats[serviceKey].minPrice) {
            serviceStats[serviceKey].minPrice = unitPrice;
          }
          if (unitPrice > serviceStats[serviceKey].maxPrice) {
            serviceStats[serviceKey].maxPrice = unitPrice;
          }
        });
      }
    });
    
    // Berechne Metriken und konvertiere zu Array
    const result = Object.values(serviceStats)
      .filter(stat => stat.count >= parseInt(minCount))
      .map(stat => ({
        ...stat,
        averagePrice: stat.totalQuantity > 0 ? stat.totalAmount / stat.totalQuantity : 0,
        revenuePerInvoice: stat.count > 0 ? stat.totalAmount / stat.count : 0,
        minPrice: stat.minPrice === Infinity ? 0 : stat.minPrice,
        profitabilityScore: stat.count * stat.totalAmount // Einfacher Score: Häufigkeit * Umsatz
      }))
      .sort((a, b) => b.profitabilityScore - a.profitabilityScore);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error generating profitability analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren der Profitabilitäts-Analyse',
      error: error.message
    });
  }
});

// GET /api/billing-reports/efficiency - Effizienz-Analyse (Zeit-Ertrags-Verhältnis)
router.get('/efficiency', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.invoiceDate = {};
      if (startDate) dateFilter.invoiceDate.$gte = new Date(startDate);
      if (endDate) dateFilter.invoiceDate.$lte = new Date(endDate);
    }
    
    // Lade Rechnungen mit Services
    const invoices = await Invoice.find(dateFilter)
      .select('invoiceDate services totalAmount billingType')
      .sort({ invoiceDate: 1 });
    
    // Lade ServiceCatalog für Dauer-Informationen
    const serviceCatalogMap = {};
    const serviceCodes = new Set();
    invoices.forEach(invoice => {
      if (invoice.services && Array.isArray(invoice.services)) {
        invoice.services.forEach(service => {
          if (service.serviceCode) {
            serviceCodes.add(service.serviceCode);
          }
        });
      }
    });
    
    const services = await ServiceCatalog.find({ 
      code: { $in: Array.from(serviceCodes) } 
    }).select('code base_duration_min buffer_before_min buffer_after_min name');
    
    services.forEach(service => {
      serviceCatalogMap[service.code] = {
        duration: service.base_duration_min || 0,
        totalDuration: (service.base_duration_min || 0) + 
                      (service.buffer_before_min || 0) + 
                      (service.buffer_after_min || 0),
        name: service.name
      };
    });
    
    // Analysiere Services mit Zeit-Ertrags-Verhältnis
    const efficiencyStats = {};
    invoices.forEach(invoice => {
      if (invoice.services && Array.isArray(invoice.services)) {
        invoice.services.forEach(service => {
          const serviceCode = service.serviceCode || 'unknown';
          const serviceInfo = serviceCatalogMap[serviceCode] || { duration: 0, totalDuration: 0, name: service.description || 'Unbekannt' };
          const duration = serviceInfo.totalDuration || serviceInfo.duration || 0;
          const revenue = service.totalPrice || 0;
          
          if (!efficiencyStats[serviceCode]) {
            efficiencyStats[serviceCode] = {
              serviceCode,
              description: service.description || serviceInfo.name,
              category: service.category || 'Unbekannt',
              count: 0,
              totalQuantity: 0,
              totalRevenue: 0,
              totalDuration: 0,
              revenuePerMinute: 0,
              averageDuration: 0,
              averageRevenue: 0
            };
          }
          
          efficiencyStats[serviceCode].count++;
          efficiencyStats[serviceCode].totalQuantity += service.quantity || 1;
          efficiencyStats[serviceCode].totalRevenue += revenue;
          efficiencyStats[serviceCode].totalDuration += duration * (service.quantity || 1);
        });
      }
    });
    
    // Berechne Metriken
    const result = Object.values(efficiencyStats).map(stat => {
      const totalMinutes = stat.totalDuration;
      const revenuePerMinute = totalMinutes > 0 ? stat.totalRevenue / totalMinutes : 0;
      const averageDuration = stat.count > 0 ? stat.totalDuration / stat.count : 0;
      const averageRevenue = stat.count > 0 ? stat.totalRevenue / stat.count : 0;
      
      return {
        ...stat,
        revenuePerMinute: revenuePerMinute / 100, // In Euro
        averageDuration,
        averageRevenue: averageRevenue / 100, // In Euro
        efficiencyScore: revenuePerMinute * stat.count // Score: Umsatz/Min * Häufigkeit
      };
    }).sort((a, b) => b.efficiencyScore - a.efficiencyScore);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error generating efficiency analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren der Effizienz-Analyse',
      error: error.message
    });
  }
});

// GET /api/billing-reports/no-show - No-Show-Analyse
router.get('/no-show', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.startTime = {};
      if (startDate) dateFilter.startTime.$gte = new Date(startDate);
      if (endDate) dateFilter.startTime.$lte = new Date(endDate);
    }
    
    // Lade Appointments
    const appointments = await Appointment.find(dateFilter)
      .populate('service', 'name price_cents base_duration_min')
      .select('startTime endTime status service serviceCode type')
      .sort({ startTime: 1 });
    
    // Lade ServiceBookings
    const serviceBookings = await ServiceBooking.find({
      ...dateFilter,
      status: { $in: ['no_show', 'cancelled'] }
    })
      .populate('service_id', 'name price_cents base_duration_min')
      .select('start_time end_time status service_id billing_amount_cents')
      .sort({ start_time: 1 });
    
    // Analysiere No-Shows
    const noShowAppointments = appointments.filter(apt => apt.status === 'abgesagt');
    const noShowBookings = serviceBookings.filter(booking => booking.status === 'no_show');
    
    // Berechne verlorenen Umsatz
    let lostRevenue = 0;
    const noShowDetails = [];
    
    noShowAppointments.forEach(apt => {
      const service = apt.service;
      const price = service?.price_cents || 0;
      lostRevenue += price;
      noShowDetails.push({
        date: apt.startTime,
        type: 'appointment',
        serviceName: service?.name || apt.type || 'Unbekannt',
        lostRevenue: price,
        duration: service?.base_duration_min || 0
      });
    });
    
    noShowBookings.forEach(booking => {
      const service = booking.service_id;
      const price = booking.billing_amount_cents || service?.price_cents || 0;
      lostRevenue += price;
      noShowDetails.push({
        date: booking.start_time,
        type: 'service_booking',
        serviceName: service?.name || 'Unbekannt',
        lostRevenue: price,
        duration: service?.base_duration_min || 0
      });
    });
    
    // Gruppiere nach Monat
    const byMonth = {};
    noShowDetails.forEach(detail => {
      const monthKey = detail.date ? 
        `${detail.date.getFullYear()}-${String(detail.date.getMonth() + 1).padStart(2, '0')}` : 
        'unknown';
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { month: monthKey, count: 0, lostRevenue: 0 };
      }
      byMonth[monthKey].count++;
      byMonth[monthKey].lostRevenue += detail.lostRevenue;
    });
    
    // Gesamtstatistik
    const totalAppointments = appointments.length;
    const totalBookings = serviceBookings.length;
    const totalScheduled = totalAppointments + totalBookings;
    const totalNoShows = noShowAppointments.length + noShowBookings.length;
    const noShowRate = totalScheduled > 0 ? (totalNoShows / totalScheduled) * 100 : 0;
    
    res.json({
      success: true,
      data: {
        summary: {
          totalScheduled,
          totalNoShows,
          noShowRate: noShowRate.toFixed(2),
          lostRevenue: lostRevenue / 100, // In Euro
          lostRevenueCents: lostRevenue
        },
        byMonth: Object.values(byMonth).map(month => ({
          ...month,
          lostRevenue: month.lostRevenue / 100 // In Euro
        })).sort((a, b) => a.month.localeCompare(b.month)),
        details: noShowDetails.map(detail => ({
          ...detail,
          lostRevenue: detail.lostRevenue / 100 // In Euro
        })).sort((a, b) => new Date(b.date) - new Date(a.date))
      }
    });
  } catch (error) {
    console.error('Error generating no-show analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren der No-Show-Analyse',
      error: error.message
    });
  }
});

// GET /api/billing-reports/billing-optimizer - Abrechnungs-Optimierer
router.get('/billing-optimizer', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.invoiceDate = {};
      if (startDate) dateFilter.invoiceDate.$gte = new Date(startDate);
      if (endDate) dateFilter.invoiceDate.$lte = new Date(endDate);
    }
    
    // Lade Rechnungen
    const invoices = await Invoice.find(dateFilter)
      .populate('patient.id', 'firstName lastName')
      .select('invoiceNumber invoiceDate patient services')
      .sort({ invoiceDate: -1 });
    
    // Lade alle verfügbaren Services für Vergleich
    const allServices = await ServiceCatalog.find({ is_active: true })
      .select('code name price_cents category');
    
    const serviceMap = {};
    allServices.forEach(service => {
      serviceMap[service.code] = {
        name: service.name,
        price: service.price_cents,
        category: service.category
      };
    });
    
    // Analysiere fehlende Codierungen
    const missingCodes = [];
    const potentialRevenue = [];
    
    invoices.forEach(invoice => {
      if (invoice.services && Array.isArray(invoice.services)) {
        invoice.services.forEach(service => {
          // Prüfe, ob Service-Code fehlt
          if (!service.serviceCode && service.description) {
            // Versuche, passenden Service zu finden
            const matchingService = allServices.find(s => 
              s.name.toLowerCase().includes(service.description.toLowerCase()) ||
              service.description.toLowerCase().includes(s.name.toLowerCase())
            );
            
            if (matchingService) {
              missingCodes.push({
                invoiceNumber: invoice.invoiceNumber,
                invoiceDate: invoice.invoiceDate,
                patientName: invoice.patient?.id 
                  ? `${invoice.patient.id.firstName} ${invoice.patient.id.lastName}`
                  : invoice.patient?.name || 'Unbekannt',
                description: service.description,
                suggestedCode: matchingService.code,
                suggestedService: matchingService.name,
                potentialRevenue: matchingService.price_cents || 0
              });
              
              potentialRevenue.push(matchingService.price_cents || 0);
            }
          }
        });
      }
    });
    
    const totalPotentialRevenue = potentialRevenue.reduce((sum, price) => sum + price, 0);
    
    res.json({
      success: true,
      data: {
        summary: {
          totalInvoices: invoices.length,
          invoicesWithMissingCodes: new Set(missingCodes.map(m => m.invoiceNumber)).size,
          totalMissingCodes: missingCodes.length,
          potentialRevenue: totalPotentialRevenue / 100, // In Euro
          potentialRevenueCents: totalPotentialRevenue
        },
        missingCodes: missingCodes.map(code => ({
          ...code,
          potentialRevenue: code.potentialRevenue / 100 // In Euro
        }))
      }
    });
  } catch (error) {
    console.error('Error generating billing optimizer:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren des Abrechnungs-Optimierers',
      error: error.message
    });
  }
});

// GET /api/billing-reports/bi-dashboard - Business Intelligence Dashboard KPIs
router.get('/bi-dashboard', auth, async (req, res) => {
  try {
    const { startDate, endDate, targetHourlyRate } = req.query;
    console.log('🔍 BI-Dashboard Request:', { startDate, endDate, targetHourlyRate });
    
    // Lade SystemSettings (einmalig)
    const SystemSettings = require('../models/SystemSettings');
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.invoiceDate = {};
      if (startDate) dateFilter.invoiceDate.$gte = new Date(startDate);
      if (endDate) dateFilter.invoiceDate.$lte = new Date(endDate);
    }
    
    // 1. UMSATZ PRO ZEITSTUNDE (Hourly Rate)
    console.log('📊 Loading invoices...');
    const invoices = await Invoice.find(dateFilter).lean();
    console.log(`✅ Loaded ${invoices.length} invoices`);
    
    // Lade alle ServiceCatalog-Einträge für die ServiceCodes
    const serviceCodes = new Set();
    invoices.forEach(invoice => {
      if (invoice.services && Array.isArray(invoice.services)) {
        invoice.services.forEach(service => {
          if (service.serviceCode) {
            serviceCodes.add(service.serviceCode);
          }
        });
      }
    });
    
    console.log(`📋 Found ${serviceCodes.size} unique service codes`);
    
    const serviceCatalogMap = {};
    if (serviceCodes.size > 0) {
      const services = await ServiceCatalog.find({ 
        code: { $in: Array.from(serviceCodes) } 
      }).select('code name base_duration_min buffer_before_min buffer_after_min costs').lean();
      
      console.log(`✅ Loaded ${services.length} services from catalog`);
      
      services.forEach(service => {
        serviceCatalogMap[service.code] = service;
      });
    }
    
    const hourlyRateStats = {
      totalRevenue: 0,
      totalMinutes: 0,
      hourlyRate: 0,
      byService: []
    };
    
    const serviceStats = {};
    
    invoices.forEach(invoice => {
      if (invoice.services && Array.isArray(invoice.services)) {
        invoice.services.forEach(service => {
          const serviceCode = service.serviceCode || 'unknown';
          const serviceData = serviceCatalogMap[serviceCode];
          
          const duration = serviceData 
            ? (serviceData.base_duration_min || 0) + (serviceData.buffer_before_min || 0) + (serviceData.buffer_after_min || 0)
            : 30; // Fallback
          
          // Revenue ist in Cent, umrechnen in Euro
          const revenue = (service.totalPrice || 0) / 100;
          const quantity = service.quantity || 1;
          
          hourlyRateStats.totalRevenue += revenue;
          hourlyRateStats.totalMinutes += duration * quantity;
          
          if (!serviceStats[serviceCode]) {
            serviceStats[serviceCode] = {
              serviceCode,
              name: service.description || serviceData?.name || 'Unbekannt',
              totalRevenue: 0,
              totalMinutes: 0,
              count: 0
            };
          }
          
          serviceStats[serviceCode].totalRevenue += revenue;
          serviceStats[serviceCode].totalMinutes += duration * quantity;
          serviceStats[serviceCode].count += quantity;
        });
      }
    });
    
    // Alle Werte sind jetzt in Euro
    hourlyRateStats.hourlyRate = hourlyRateStats.totalMinutes > 0 
      ? (hourlyRateStats.totalRevenue / hourlyRateStats.totalMinutes) * 60 
      : 0;
    
    hourlyRateStats.byService = Object.values(serviceStats).map(stat => ({
      ...stat,
      hourlyRate: stat.totalMinutes > 0 ? (stat.totalRevenue / stat.totalMinutes) * 60 : 0
    })).sort((a, b) => b.hourlyRate - a.hourlyRate);
    
    // 2. DECKUNGSBEITRAG PRO LEISTUNG (Profitability)
    const profitabilityStats = [];
    
    invoices.forEach(invoice => {
      if (invoice.services && Array.isArray(invoice.services)) {
        invoice.services.forEach(service => {
          const serviceCode = service.serviceCode || 'unknown';
          const serviceData = serviceCatalogMap[serviceCode];
          
          // Revenue ist in Cent, umrechnen in Euro
          const revenue = (service.totalPrice || 0) / 100;
          // Kosten sind jetzt in Euro
          const materialCosts = serviceData?.costs?.materialCosts || (serviceData?.costs?.materialCostsCents ? serviceData.costs.materialCostsCents / 100 : 0);
          const equipmentCosts = serviceData?.costs?.equipmentCosts || (serviceData?.costs?.equipmentCostsCents ? serviceData.costs.equipmentCostsCents / 100 : 0);
          const variableCosts = serviceData?.costs?.variableCosts || (serviceData?.costs?.variableCostsCents ? serviceData.costs.variableCostsCents / 100 : 0);
          const fixedCosts = serviceData?.costs?.fixedCosts || (serviceData?.costs?.fixedCostsCents ? serviceData.costs.fixedCostsCents / 100 : 0);
          
          const totalCosts = materialCosts + equipmentCosts + variableCosts + fixedCosts;
          const contributionMargin = revenue - totalCosts;
          const marginPercentage = revenue > 0 ? (contributionMargin / revenue) * 100 : 0;
          
          const duration = serviceData 
            ? (serviceData.base_duration_min || 0) + (serviceData.buffer_before_min || 0) + (serviceData.buffer_after_min || 0)
            : 30;
          
          profitabilityStats.push({
            serviceCode,
            name: service.description || serviceData?.name || 'Unbekannt',
            revenue,
            totalCosts,
            contributionMargin,
            marginPercentage,
            duration,
            hourlyRate: duration > 0 ? (revenue / duration) * 60 : 0
          });
        });
      }
    });
    
    // Gruppiere nach Service
    const profitabilityByService = {};
    profitabilityStats.forEach(stat => {
      if (!profitabilityByService[stat.serviceCode]) {
        profitabilityByService[stat.serviceCode] = {
          serviceCode: stat.serviceCode,
          name: stat.name,
          totalRevenue: 0,
          totalCosts: 0,
          totalContributionMargin: 0,
          totalDuration: 0,
          count: 0
        };
      }
      profitabilityByService[stat.serviceCode].totalRevenue += stat.revenue;
      profitabilityByService[stat.serviceCode].totalCosts += stat.totalCosts;
      profitabilityByService[stat.serviceCode].totalContributionMargin += stat.contributionMargin;
      profitabilityByService[stat.serviceCode].totalDuration += stat.duration;
      profitabilityByService[stat.serviceCode].count += 1;
    });
    
    const profitabilityMatrix = Object.values(profitabilityByService).map(stat => ({
      ...stat,
      averageContributionMargin: stat.count > 0 ? stat.totalContributionMargin / stat.count : 0,
      averageMarginPercentage: stat.totalRevenue > 0 ? (stat.totalContributionMargin / stat.totalRevenue) * 100 : 0,
      averageHourlyRate: stat.totalDuration > 0 ? (stat.totalRevenue / stat.totalDuration) * 60 : 0,
      averageDuration: stat.count > 0 ? stat.totalDuration / stat.count : 0
    }));
    
    // 3. NO-SHOW-RATE
    const appointmentFilter = {};
    if (startDate || endDate) {
      appointmentFilter.startTime = {};
      if (startDate) appointmentFilter.startTime.$gte = new Date(startDate);
      if (endDate) appointmentFilter.startTime.$lte = new Date(endDate);
    }
    
    const totalAppointments = await Appointment.countDocuments(appointmentFilter);
    const noShowAppointments = await Appointment.countDocuments({
      ...appointmentFilter,
      status: 'abgesagt'
    });
    
    const serviceBookings = await ServiceBooking.find({
      start_time: {
        ...(startDate ? { $gte: new Date(startDate) } : {}),
        ...(endDate ? { $lte: new Date(endDate) } : {})
      }
    }).lean();
    
    const totalServiceBookings = serviceBookings.length;
    const noShowServiceBookings = serviceBookings.filter(sb => 
      sb.status === 'no_show' || sb.status === 'cancelled'
    ).length;
    
    const totalScheduled = totalAppointments + totalServiceBookings;
    const totalNoShows = noShowAppointments + noShowServiceBookings;
    const noShowRate = totalScheduled > 0 ? (totalNoShows / totalScheduled) * 100 : 0;
    
    // Berechne verlorenen Umsatz durch No-Shows
    const noShowServiceBookingsLostRevenue = serviceBookings
      .filter(sb => sb.status === 'no_show' || sb.status === 'cancelled')
      .reduce((sum, sb) => sum + (sb.billing_amount_cents || 0), 0);
    
    const noShowAppointmentsList = await Appointment.find({
      ...appointmentFilter,
      status: 'abgesagt'
    }).populate('service', 'code price_cents wahlarzt private ogk').lean();
    
    const noShowServiceCodes = new Set();
    noShowAppointmentsList.forEach(apt => {
      if (apt.service) {
        if (typeof apt.service === 'object' && apt.service.code) {
          noShowServiceCodes.add(apt.service.code);
        } else if (typeof apt.service === 'string') {
          noShowServiceCodes.add(apt.serviceCode || apt.service);
        } else if (apt.serviceCode) {
          noShowServiceCodes.add(apt.serviceCode);
        }
      } else if (apt.serviceCode) {
        noShowServiceCodes.add(apt.serviceCode);
      }
    });
    
    const noShowServiceCatalogMap = {};
    if (noShowServiceCodes.size > 0) {
      const noShowServices = await ServiceCatalog.find({
        code: { $in: Array.from(noShowServiceCodes) }
      }).select('code price_cents wahlarzt private ogk').lean();
      
      noShowServices.forEach(service => {
        noShowServiceCatalogMap[service.code] = service;
      });
    }
    
    const noShowAppointmentsLostRevenue = noShowAppointmentsList.reduce((sum, apt) => {
      let serviceCode = null;
      if (apt.service && typeof apt.service === 'object' && apt.service.code) {
        serviceCode = apt.service.code;
      } else if (apt.serviceCode) {
        serviceCode = apt.serviceCode;
      }
      
      if (serviceCode) {
        const serviceData = noShowServiceCatalogMap[serviceCode];
        if (serviceData) {
          // price_cents ist in Cent, umrechnen in Euro
          const price = serviceData.price_cents ? serviceData.price_cents / 100 : 
                       serviceData.wahlarzt?.price ? serviceData.wahlarzt.price / 100 : 
                       serviceData.private?.price ? serviceData.private.price / 100 : 
                       serviceData.ogk?.ebmPrice ? serviceData.ogk.ebmPrice / 100 : 
                       0;
          return sum + price;
        }
      }
      return sum;
    }, 0);
    
    // noShowServiceBookingsLostRevenue ist in Cent, umrechnen in Euro
    const lostRevenueFromNoShows = (noShowServiceBookingsLostRevenue / 100) + noShowAppointmentsLostRevenue;
    
    // 4. PATIENTEN-AKQUISITIONSKOSTEN (CAC) vs. LIFETIME VALUE (LTV)
    const patientStats = await Invoice.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$patient.id',
          totalRevenue: { $sum: '$totalAmount' },
          invoiceCount: { $sum: 1 },
          firstInvoiceDate: { $min: '$invoiceDate' },
          lastInvoiceDate: { $max: '$invoiceDate' }
        }
      },
      {
        $group: {
          _id: null,
          totalPatients: { $sum: 1 },
          totalRevenue: { $sum: '$totalRevenue' },
          totalInvoices: { $sum: '$invoiceCount' },
          avgRevenuePerPatient: { $avg: '$totalRevenue' },
          avgInvoicesPerPatient: { $avg: '$invoiceCount' }
        }
      }
    ]);
    
    const ltvStats = patientStats[0] || {
      totalPatients: 0,
      totalRevenue: 0,
      totalInvoices: 0,
      avgRevenuePerPatient: 0,
      avgInvoicesPerPatient: 0
    };
    
    // totalRevenue ist in Cent, umrechnen in Euro
    const avgLTV = (ltvStats.avgRevenuePerPatient || 0) / 100;
    // CAC wird aus Systemeinstellungen geladen (in Euro)
    const customerAcquisitionCost = await SystemSettings.getSetting('billing', 'customerAcquisitionCost', 50);
    const defaultCAC = customerAcquisitionCost; // Bereits in Euro
    const ltvCacRatio = defaultCAC > 0 ? avgLTV / defaultCAC : 0;
    
    // 5. PERSONALKOSTENQUOTE
    const personnelCostsPercentage = await SystemSettings.getSetting('billing', 'personnelCostsPercentage', 25);
    // totalRevenue ist bereits in Euro
    const totalRevenue = hourlyRateStats.totalRevenue;
    const estimatedPersonnelCosts = totalRevenue * (personnelCostsPercentage / 100);
    const personnelCostsRatio = totalRevenue > 0 ? (estimatedPersonnelCosts / totalRevenue) * 100 : 0;
    
    // 6. FALLWERT (Umsatz pro Patient)
    // ltvStats.totalRevenue ist in Cent, umrechnen in Euro
    const totalRevenueForCaseValue = (ltvStats.totalRevenue || 0) / 100;
    const caseValue = ltvStats.totalPatients > 0 
      ? totalRevenueForCaseValue / ltvStats.totalPatients 
      : 0;
    
    // 7. VERLUST-MONITOR (No-Shows + ungenutzte Kapazitäten)
    // Lade Arbeitsstunden pro Tag aus Systemeinstellungen
    const workingHoursPerDay = await SystemSettings.getSetting('billing', 'workingHoursPerDay', 8);
    const workingDays = startDate && endDate 
      ? Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
      : 30; // Fallback: 30 Tage
    
    const totalAvailableSlots = workingHoursPerDay * 60 * workingDays; // Minuten
    const usedSlots = hourlyRateStats.totalMinutes;
    const unusedSlots = Math.max(0, totalAvailableSlots - usedSlots);
    const unusedCapacityPercentage = totalAvailableSlots > 0 
      ? (unusedSlots / totalAvailableSlots) * 100 
      : 0;
    
    // Alle Werte sind bereits in Euro
    const avgRevenuePerMinute = hourlyRateStats.totalMinutes > 0 
      ? hourlyRateStats.totalRevenue / hourlyRateStats.totalMinutes 
      : 0;
    const lostRevenueFromUnusedCapacity = unusedSlots * avgRevenuePerMinute;
    
    const totalLostRevenue = lostRevenueFromNoShows + lostRevenueFromUnusedCapacity;
    
    // Ziel-Stundensatz aus Systemeinstellungen oder Query-Parameter (für Flexibilität)
    // Bereits in Euro
    const targetHourlyRateFromSettings = await SystemSettings.getSetting('billing', 'targetHourlyRate', 150);
    const targetHourlyRateValue = targetHourlyRate ? parseFloat(targetHourlyRate) : targetHourlyRateFromSettings;
    
    console.log('✅ BI Dashboard data calculated successfully');
    console.log('📊 Summary:', {
      hourlyRate: hourlyRateStats.hourlyRate,
      totalRevenue: hourlyRateStats.totalRevenue,
      profitabilityServices: profitabilityMatrix.length,
      noShowRate: noShowRate,
      totalPatients: ltvStats.totalPatients
    });
    
    res.json({
      success: true,
      data: {
        // 1. Umsatz pro Zeitstunde (alle Werte in Euro)
        hourlyRate: {
          current: hourlyRateStats.hourlyRate,
          target: targetHourlyRateValue,
          percentage: targetHourlyRateValue > 0 ? (hourlyRateStats.hourlyRate / targetHourlyRateValue) * 100 : 0,
          totalRevenue: hourlyRateStats.totalRevenue,
          totalMinutes: hourlyRateStats.totalMinutes,
          byService: hourlyRateStats.byService.slice(0, 20) // Top 20
        },
        
        // 2. Deckungsbeitrag (Profitability Matrix)
        profitability: {
          matrix: profitabilityMatrix || [],
          summary: {
            totalRevenue: (profitabilityMatrix || []).reduce((sum, s) => sum + (s.totalRevenue || 0), 0),
            totalCosts: (profitabilityMatrix || []).reduce((sum, s) => sum + (s.totalCosts || 0), 0),
            totalContributionMargin: (profitabilityMatrix || []).reduce((sum, s) => sum + (s.totalContributionMargin || 0), 0),
            avgMarginPercentage: (profitabilityMatrix || []).length > 0
              ? (profitabilityMatrix || []).reduce((sum, s) => sum + (s.averageMarginPercentage || 0), 0) / (profitabilityMatrix || []).length
              : 0
          }
        },
        
        // 3. No-Show-Rate
        noShow: {
          rate: noShowRate,
          totalScheduled,
          totalNoShows,
          lostRevenue: lostRevenueFromNoShows
        },
        
        // 4. CAC vs. LTV (alle Werte in Euro)
        patientAcquisition: {
          avgLTV: avgLTV,
          defaultCAC: defaultCAC,
          ltvCacRatio: ltvCacRatio,
          totalPatients: ltvStats.totalPatients,
          avgInvoicesPerPatient: ltvStats.avgInvoicesPerPatient
        },
        
        // 5. Personalkostenquote (alle Werte in Euro)
        personnelCosts: {
          ratio: personnelCostsRatio,
          estimatedCosts: estimatedPersonnelCosts,
          totalRevenue: totalRevenue,
          benchmark: {
            min: 20,
            max: 30,
            current: personnelCostsRatio
          }
        },
        
        // 6. Fallwert (alle Werte in Euro)
        caseValue: {
          value: caseValue,
          totalPatients: ltvStats.totalPatients,
          totalRevenue: totalRevenueForCaseValue
        },
        
        // 7. Verlust-Monitor
        lossMonitor: {
          totalLostRevenue: totalLostRevenue,
          fromNoShows: lostRevenueFromNoShows,
          fromUnusedCapacity: lostRevenueFromUnusedCapacity,
          unusedCapacityPercentage: unusedCapacityPercentage,
          unusedSlots: unusedSlots,
          totalAvailableSlots: totalAvailableSlots
        }
      }
    });
  } catch (error) {
    console.error('❌ Error generating BI dashboard:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren des BI-Dashboards',
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

module.exports = router;

























