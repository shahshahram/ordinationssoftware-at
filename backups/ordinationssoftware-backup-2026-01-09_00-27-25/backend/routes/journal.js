const express = require('express');
const mongoose = require('mongoose');
const InvoiceJournal = require('../models/InvoiceJournal');
const ReceiptChain = require('../models/ReceiptChain');
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const { format } = require('date-fns');
const ExcelJS = require('exceljs');
const { startOfDay, endOfDay, parseDateString } = require('../utils/timezone');
const router = express.Router();

// CSV-Export ohne csv-stringify (manuell)
function generateCSV(rows, headers) {
  const csvRows = [];
  
  // Header
  csvRows.push(headers.map(h => `"${h}"`).join(','));
  
  // Data rows
  rows.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] || '';
      // Escape quotes and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  });
  
  return csvRows.join('\n');
}

// @route   GET /api/journal/invoices
// @desc    Get invoice journal entries with date filters
// @access  Private
router.get('/invoices', auth, checkPermission('billing.read'), async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      date, 
      month, 
      year, 
      locationId, 
      billingType, 
      status,
      format: exportFormat 
    } = req.query;

    // Datumsfilter aufbauen
    const dateFilter = {};
    
    if (date) {
      // Einzelner Tag
      const start = startOfDay(parseDateString(date));
      const end = endOfDay(parseDateString(date));
      dateFilter.invoiceDate = { $gte: start, $lte: end };
    } else if (month && year) {
      // Monat
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      dateFilter.invoiceDate = { $gte: start, $lte: end };
    } else if (year) {
      // Jahr
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      dateFilter.invoiceDate = { $gte: start, $lte: end };
    } else if (startDate || endDate) {
      // Freier Datumsbereich
      dateFilter.invoiceDate = {};
      if (startDate) {
        const start = startOfDay(parseDateString(startDate));
        dateFilter.invoiceDate.$gte = start;
      }
      if (endDate) {
        const end = endOfDay(parseDateString(endDate));
        dateFilter.invoiceDate.$lte = end;
      }
    }
    // Wenn kein Datumsfilter gesetzt ist, werden alle Einträge angezeigt (kein Filter)

    // Weitere Filter
    const filter = { ...dateFilter };
    if (locationId) filter.locationId = locationId;
    if (billingType) filter.billingType = billingType;
    if (status) filter.status = status;

    // Debug-Logging für Filter
    console.log('[Journal] Filter für Rechnungsjournal:', JSON.stringify(filter, null, 2));

    const journalEntries = await InvoiceJournal.find(filter)
      .populate('invoiceId', 'invoiceNumber')
      .populate('locationId', 'name code')
      .populate('createdBy', 'firstName lastName email')
      .populate('receiptChainId', 'receiptNumber receiptHash')
      .sort({ invoiceDate: -1, createdAt: -1 });

    // Wenn Export-Format angegeben, exportiere direkt
    if (exportFormat) {
      return handleExport(res, journalEntries, exportFormat, 'invoices');
    }

    res.json({
      success: true,
      data: journalEntries,
      count: journalEntries.length,
      filter: {
        startDate,
        endDate,
        date,
        month,
        year,
        locationId,
        billingType,
        status
      }
    });
  } catch (error) {
    console.error('Error fetching invoice journal:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Rechnungsjournals',
      error: error.message
    });
  }
});

// @route   GET /api/journal/receipts
// @desc    Get cash register journal entries (ReceiptChain) with date filters
// @access  Private
router.get('/receipts', auth, checkPermission('billing.read'), async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      date, 
      month, 
      year, 
      cashBoxId,
      receiptType,
      format: exportFormat 
    } = req.query;

    // Datumsfilter aufbauen
    const dateFilter = {};
    
    if (date) {
      // Einzelner Tag
      const start = startOfDay(parseDateString(date));
      const end = endOfDay(parseDateString(date));
      dateFilter['receiptData.timestamp'] = { $gte: start, $lte: end };
    } else if (month && year) {
      // Monat
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      dateFilter['receiptData.timestamp'] = { $gte: start, $lte: end };
    } else if (year) {
      // Jahr
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      dateFilter['receiptData.timestamp'] = { $gte: start, $lte: end };
    } else if (startDate || endDate) {
      // Freier Datumsbereich
      dateFilter['receiptData.timestamp'] = {};
      if (startDate) {
        const start = startOfDay(parseDateString(startDate));
        dateFilter['receiptData.timestamp'].$gte = start;
      }
      if (endDate) {
        const end = endOfDay(parseDateString(endDate));
        dateFilter['receiptData.timestamp'].$lte = end;
      }
    }

    // Weitere Filter
    const filter = { ...dateFilter };
    if (cashBoxId) filter.cashBoxId = cashBoxId;
    if (receiptType) filter.receiptType = receiptType;

    const receiptEntries = await ReceiptChain.find(filter)
      .populate('invoiceId', 'invoiceNumber totalAmount')
      .populate('createdBy', 'firstName lastName email')
      .sort({ 'receiptData.timestamp': -1, receiptNumber: -1 });

    // Wenn Export-Format angegeben, exportiere direkt
    if (exportFormat) {
      return handleExport(res, receiptEntries, exportFormat, 'receipts');
    }

    res.json({
      success: true,
      data: receiptEntries,
      count: receiptEntries.length,
      filter: {
        startDate,
        endDate,
        date,
        month,
        year,
        cashBoxId,
        receiptType
      }
    });
  } catch (error) {
    console.error('Error fetching receipt journal:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Registrierkassa-Journals',
      error: error.message
    });
  }
});

// Export-Funktion
async function handleExport(res, data, format, type) {
  try {
    switch (format.toLowerCase()) {
      case 'csv':
        return exportCSV(res, data, type);
      case 'excel':
      case 'xlsx':
        return await exportExcel(res, data, type);
      case 'json':
        return exportJSON(res, data, type);
      case 'pdf':
        return await exportPDF(res, data, type);
      default:
        return res.status(400).json({
          success: false,
          message: `Unbekanntes Export-Format: ${format}. Unterstützt: csv, excel, xlsx, json, pdf`
        });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Export',
      error: error.message
    });
  }
}

// CSV Export
function exportCSV(res, data, type) {
  let csvData;
  let filename;
  let headers;
  let rows;

  if (type === 'invoices') {
    headers = ['Rechnungsnummer', 'Datum', 'Patient', 'Betrag', 'Status', 'Abrechnungstyp', 'Zahlungsart', 'Standort', 'Erstellt am', 'Hash'];
    rows = data.map(entry => ({
      'Rechnungsnummer': entry.invoiceNumber,
      'Datum': format(new Date(entry.invoiceDate), 'dd.MM.yyyy'),
      'Patient': entry.patient?.name || '',
      'Betrag': (entry.totalAmount / 100).toFixed(2),
      'Status': entry.status,
      'Abrechnungstyp': entry.billingType,
      'Zahlungsart': entry.paymentMethod || '',
      'Standort': entry.locationId?.name || '',
      'Erstellt am': format(new Date(entry.createdAt), 'dd.MM.yyyy HH:mm'),
      'Hash': entry.journalHash
    }));
    filename = `rechnungsjournal_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  } else {
    headers = ['Belegnummer', 'Belegtyp', 'Datum', 'Betrag', 'Zahlungsart', 'Kassennummer', 'TSE-Seriennummer', 'Signatur-Zähler', 'Beleg-Hash', 'Rechnungsnummer'];
    rows = data.map(entry => ({
      'Belegnummer': entry.receiptNumber,
      'Belegtyp': entry.receiptType,
      'Datum': format(new Date(entry.receiptData.timestamp), 'dd.MM.yyyy HH:mm'),
      'Betrag': (entry.receiptData.amount / 100).toFixed(2),
      'Zahlungsart': entry.paymentMethod || '',
      'Kassennummer': entry.cashBoxId,
      'TSE-Seriennummer': entry.tseSignature?.tseSerial || '',
      'Signatur-Zähler': entry.tseSignature?.signatureCounter || '',
      'Beleg-Hash': entry.receiptHash,
      'Rechnungsnummer': entry.invoiceId?.invoiceNumber || ''
    }));
    filename = `registrierkassa_journal_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  }

  csvData = generateCSV(rows, headers);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\ufeff' + csvData); // BOM für Excel-Kompatibilität
}

// Excel Export
async function exportExcel(res, data, type) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(type === 'invoices' ? 'Rechnungsjournal' : 'Registrierkassa-Journal');

  if (type === 'invoices') {
    worksheet.columns = [
      { header: 'Rechnungsnummer', key: 'invoiceNumber', width: 15 },
      { header: 'Datum', key: 'date', width: 12 },
      { header: 'Patient', key: 'patient', width: 25 },
      { header: 'Betrag (€)', key: 'amount', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Abrechnungstyp', key: 'billingType', width: 15 },
      { header: 'Zahlungsart', key: 'paymentMethod', width: 12 },
      { header: 'Standort', key: 'location', width: 20 },
      { header: 'Erstellt am', key: 'createdAt', width: 18 },
      { header: 'Hash', key: 'hash', width: 40 }
    ];

    data.forEach(entry => {
      worksheet.addRow({
        invoiceNumber: entry.invoiceNumber,
        date: format(new Date(entry.invoiceDate), 'dd.MM.yyyy'),
        patient: entry.patient?.name || '',
        amount: (entry.totalAmount / 100).toFixed(2),
        status: entry.status,
        billingType: entry.billingType,
        paymentMethod: entry.paymentMethod || '',
        location: entry.locationId?.name || '',
        createdAt: format(new Date(entry.createdAt), 'dd.MM.yyyy HH:mm'),
        hash: entry.journalHash
      });
    });
  } else {
    worksheet.columns = [
      { header: 'Belegnummer', key: 'receiptNumber', width: 12 },
      { header: 'Belegtyp', key: 'receiptType', width: 12 },
      { header: 'Datum', key: 'date', width: 18 },
      { header: 'Betrag (€)', key: 'amount', width: 12 },
      { header: 'Zahlungsart', key: 'paymentMethod', width: 12 },
      { header: 'Kassennummer', key: 'cashBoxId', width: 15 },
      { header: 'TSE-Seriennummer', key: 'tseSerial', width: 20 },
      { header: 'Signatur-Zähler', key: 'signatureCounter', width: 15 },
      { header: 'Beleg-Hash', key: 'receiptHash', width: 40 },
      { header: 'Rechnungsnummer', key: 'invoiceNumber', width: 15 }
    ];

    data.forEach(entry => {
      worksheet.addRow({
        receiptNumber: entry.receiptNumber,
        receiptType: entry.receiptType,
        date: format(new Date(entry.receiptData.timestamp), 'dd.MM.yyyy HH:mm'),
        amount: (entry.receiptData.amount / 100).toFixed(2),
        paymentMethod: entry.paymentMethod || '',
        cashBoxId: entry.cashBoxId,
        tseSerial: entry.tseSignature?.tseSerial || '',
        signatureCounter: entry.tseSignature?.signatureCounter || '',
        receiptHash: entry.receiptHash,
        invoiceNumber: entry.invoiceId?.invoiceNumber || ''
      });
    });
  }

  // Styling
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  const filename = `${type === 'invoices' ? 'rechnungsjournal' : 'registrierkassa_journal'}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  await workbook.xlsx.write(res);
  res.end();
}

// JSON Export
function exportJSON(res, data, type) {
  const filename = `${type === 'invoices' ? 'rechnungsjournal' : 'registrierkassa_journal'}_${format(new Date(), 'yyyy-MM-dd')}.json`;
  
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.json({
    exportDate: new Date().toISOString(),
    type: type === 'invoices' ? 'Rechnungsjournal' : 'Registrierkassa-Journal',
    count: data.length,
    data: data
  });
}

// PDF Export (vereinfacht - könnte mit pdfkit erweitert werden)
async function exportPDF(res, data, type) {
  // Für PDF würde man normalerweise pdfkit oder puppeteer verwenden
  // Hier als Fallback: JSON mit PDF-Header (kann später erweitert werden)
  res.status(501).json({
    success: false,
    message: 'PDF-Export wird noch nicht unterstützt. Bitte verwenden Sie CSV oder Excel.',
    supportedFormats: ['csv', 'excel', 'xlsx', 'json']
  });
}

module.exports = router;

