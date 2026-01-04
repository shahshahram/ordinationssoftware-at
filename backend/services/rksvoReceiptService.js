// RKSVO Beleg-Service
// Verwaltet automatische Belege: Startbeleg, Monatsbeleg, Jahresbeleg

const cron = require('node-cron');
const crypto = require('crypto');
const CashRegister = require('../models/CashRegister');
const ReceiptChain = require('../models/ReceiptChain');
const rksvoEnhanced = require('../utils/rksvo-enhanced');
const QRCode = require('qrcode');

class RKSVOReceiptService {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Startet automatische Beleg-Generierung (Cron-Jobs)
   */
  start() {
    // Monatsbeleg: Letzter Tag des Monats um 23:59
    cron.schedule('59 23 28-31 * *', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Prüfe ob morgen der 1. des Monats ist
      if (tomorrow.getDate() === 1) {
        await this.generateMonthlyReceipt(today);
      }
    });
    
    console.log('✅ RKSVO Beleg-Service gestartet');
  }

  /**
   * Erstellt Startbeleg (bei TSE-Initialisierung)
   */
  async createStartReceipt(cashRegisterId, userId) {
    const cashRegister = await CashRegister.findById(cashRegisterId);
    if (!cashRegister) {
      throw new Error('Registrierkasse nicht gefunden');
    }

    if (cashRegister.tse.initialized) {
      throw new Error('TSE ist bereits initialisiert. Startbeleg kann nur einmal erstellt werden.');
    }

    // Prüfe ob bereits ein Startbeleg existiert
    const existingStartReceipt = await ReceiptChain.findOne({
      cashBoxId: cashRegister.cashBoxId,
      receiptType: 'start'
    });

    if (existingStartReceipt) {
      throw new Error('Startbeleg existiert bereits');
    }

    // Generiere TSE-Signatur für Startbeleg
    const tseSignature = {
      tseSerial: cashRegister.tse.serialNumber || `TSE-${Date.now()}`,
      signatureCounter: 0,
      signature: crypto.randomBytes(32).toString('hex'),
      timestamp: new Date().toISOString(),
      signatureAlgorithm: 'SHA256',
      publicKey: cashRegister.tse.publicKey
    };

    // QR-Code für Startbeleg
    const qrData = {
      _: 'S', // Startbeleg
      M: cashRegister.cashBoxId,
      T: tseSignature.timestamp,
      B: '0', // Nullbetrag
      C: 'EUR',
      S: tseSignature.signature
    };
    const qrCodeData = Buffer.from(JSON.stringify(qrData)).toString('base64');

    // Erstelle ReceiptChain-Eintrag
    const receiptChainEntry = await rksvoEnhanced.createReceiptChainEntry({
      receiptType: 'start',
      amount: 0,
      timestamp: new Date(),
      tseSignature,
      qrCodeData,
      paymentMethod: null,
      isCashTransaction: false,
      createdBy: userId
    }, cashRegister, null);

    // Markiere TSE als initialisiert
    cashRegister.tse.initialized = true;
    cashRegister.tse.initializedAt = new Date();
    await cashRegister.save();

    return receiptChainEntry;
  }

  /**
   * Generiert Monatsbeleg (Nullbeleg am Monatsende)
   */
  async generateMonthlyReceipt(date = new Date()) {
    if (this.isRunning) {
      console.log('⏳ Monatsbeleg-Generierung läuft bereits');
      return;
    }

    this.isRunning = true;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    try {
      console.log(`📅 Generiere Monatsbeleg für ${month}/${year}...`);

      // Finde alle aktiven Registrierkassen
      const cashRegisters = await CashRegister.find({ isActive: true });

      for (const cashRegister of cashRegisters) {
        // Prüfe ob Monatsbeleg bereits existiert
        const existingMonthlyReceipt = await ReceiptChain.findOne({
          cashBoxId: cashRegister.cashBoxId,
          receiptType: 'monthly',
          'period.year': year,
          'period.month': month
        });

        if (existingMonthlyReceipt) {
          console.log(`ℹ️ Monatsbeleg für ${cashRegister.cashBoxId} (${month}/${year}) existiert bereits`);
          continue;
        }

        // Hole letzten Beleg für Verkettung
        const lastReceipt = await ReceiptChain.findOne({
          cashBoxId: cashRegister.cashBoxId
        }).sort({ receiptNumber: -1 });

        // Generiere TSE-Signatur
        const tseSignature = await rksvoEnhanced.generateTSESignatureEnhanced(
          { invoiceNumber: `MONTHLY-${year}-${month}`, totalAmount: 0 },
          cashRegister,
          lastReceipt
        );

        // QR-Code
        const qrData = {
          _: 'M', // Monatsbeleg
          M: cashRegister.cashBoxId,
          T: tseSignature.timestamp,
          B: '0',
          C: 'EUR',
          S: tseSignature.signature,
          P: lastReceipt ? lastReceipt.receiptHash : null
        };
        const qrCodeData = Buffer.from(JSON.stringify(qrData)).toString('base64');

        // Erstelle ReceiptChain-Eintrag
        await rksvoEnhanced.createReceiptChainEntry({
          receiptType: 'monthly',
          amount: 0,
          timestamp: new Date(),
          tseSignature,
          qrCodeData,
          paymentMethod: null,
          isCashTransaction: false,
          period: { year, month },
          createdBy: cashRegister.createdBy
        }, cashRegister, null);

        console.log(`✅ Monatsbeleg für ${cashRegister.cashBoxId} (${month}/${year}) erstellt`);
      }
    } catch (error) {
      console.error('❌ Fehler bei Monatsbeleg-Generierung:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Generiert Jahresbeleg (Dezember-Monatsbeleg)
   */
  async generateYearlyReceipt(year = new Date().getFullYear()) {
    const december = 12;
    
    // Jahresbeleg ist der Monatsbeleg für Dezember
    const decemberDate = new Date(year, 11, 31); // 31. Dezember
    await this.generateMonthlyReceipt(decemberDate);
    
    console.log(`✅ Jahresbeleg für ${year} generiert (Dezember-Monatsbeleg)`);
  }

  /**
   * Erstellt Hausbesuch-Beleg (Paragon mit Nacherfassung)
   */
  async createHouseCallReceipt(manualReceiptData, cashRegisterId, userId) {
    const cashRegister = await CashRegister.findById(cashRegisterId);
    if (!cashRegister) {
      throw new Error('Registrierkasse nicht gefunden');
    }

    // Hole letzten Beleg für Verkettung
    const lastReceipt = await ReceiptChain.findOne({
      cashBoxId: cashRegister.cashBoxId
    }).sort({ receiptNumber: -1 });

    // Generiere TSE-Signatur
    const tseSignature = await rksvoEnhanced.generateTSESignatureEnhanced(
      { 
        invoiceNumber: manualReceiptData.receiptNumber || `HOUSECALL-${Date.now()}`,
        totalAmount: manualReceiptData.amount
      },
      cashRegister,
      lastReceipt
    );

    // QR-Code
    const qrData = {
      _: 'H', // Hausbesuch
      M: cashRegister.cashBoxId,
      T: tseSignature.timestamp,
      B: manualReceiptData.amount.toString(),
      C: 'EUR',
      S: tseSignature.signature,
      P: lastReceipt ? lastReceipt.receiptHash : null
    };
    const qrCodeData = Buffer.from(JSON.stringify(qrData)).toString('base64');

    // Erstelle ReceiptChain-Eintrag
    const receiptChainEntry = await rksvoEnhanced.createReceiptChainEntry({
      receiptType: 'hausbesuch',
      amount: manualReceiptData.amount,
      timestamp: manualReceiptData.date || new Date(),
      tseSignature,
      qrCodeData,
      paymentMethod: manualReceiptData.paymentMethod || 'cash',
      isCashTransaction: true, // Hausbesuche sind immer Barzahlung
      houseCall: {
        isHouseCall: true,
        manualReceiptNumber: manualReceiptData.manualReceiptNumber,
        enteredAt: new Date()
      },
      createdBy: userId
    }, cashRegister, null);

    return receiptChainEntry;
  }
}

module.exports = new RKSVOReceiptService();

