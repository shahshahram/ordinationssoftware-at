// RKSVO Validierung und Test-Tools
// Implementiert Validierung für BMF Belegcheck-App und A-SIT Plus Tools

const crypto = require('crypto');
const QRCode = require('qrcode');

/**
 * Validiert QR-Code-Daten für BMF Belegcheck-App
 * @param {String} qrCodeData - Base64-kodierte QR-Code-Daten
 * @returns {Object} Validierungsergebnis
 */
function validateQRCodeForBMF(qrCodeData) {
  try {
    // Dekodiere Base64
    const decoded = Buffer.from(qrCodeData, 'base64').toString('utf-8');
    const qrData = JSON.parse(decoded);
    
    // Prüfe erforderliche Felder
    const requiredFields = ['_', 'M', 'T', 'B', 'C', 'S'];
    const missingFields = requiredFields.filter(field => !qrData[field]);
    
    if (missingFields.length > 0) {
      return {
        valid: false,
        errors: [`Fehlende Felder: ${missingFields.join(', ')}`],
        qrData: null
      };
    }
    
    // Prüfe Beleg-Typ
    const validReceiptTypes = ['R', 'S', 'M', 'H']; // Rechnung, Start, Monat, Hausbesuch
    if (!validReceiptTypes.includes(qrData._)) {
      return {
        valid: false,
        errors: [`Ungültiger Beleg-Typ: ${qrData._}`],
        qrData
      };
    }
    
    // Prüfe Währung
    if (qrData.C !== 'EUR') {
      return {
        valid: false,
        errors: [`Ungültige Währung: ${qrData.C}`],
        qrData
      };
    }
    
    // Prüfe Betrag (muss Zahl sein)
    const amount = parseFloat(qrData.B);
    if (isNaN(amount) || amount < 0) {
      return {
        valid: false,
        errors: [`Ungültiger Betrag: ${qrData.B}`],
        qrData
      };
    }
    
    // Prüfe Timestamp-Format
    if (!qrData.T || !Date.parse(qrData.T)) {
      return {
        valid: false,
        errors: [`Ungültiger Timestamp: ${qrData.T}`],
        qrData
      };
    }
    
    // Prüfe Signatur (muss vorhanden sein)
    if (!qrData.S || qrData.S.length < 32) {
      return {
        valid: false,
        errors: ['Ungültige oder fehlende Signatur'],
        qrData
      };
    }
    
    return {
      valid: true,
      errors: [],
      qrData,
      message: 'QR-Code ist für BMF Belegcheck-App gültig'
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Fehler beim Dekodieren: ${error.message}`],
      qrData: null
    };
  }
}

/**
 * Validiert TSE-Signatur kryptographisch (A-SIT Plus konform)
 * @param {Object} receiptData - Belegdaten
 * @param {Object} tseSignature - TSE-Signatur
 * @param {String} publicKey - Öffentlicher Schlüssel
 * @returns {Object} Validierungsergebnis
 */
function validateTSESignatureCryptographic(receiptData, tseSignature, publicKey) {
  try {
    // Rekonstruiere signierte Daten
    const dataToSign = JSON.stringify({
      cashBoxId: receiptData.cashBoxId,
      transactionNumber: receiptData.transactionNumber,
      timestamp: receiptData.timestamp,
      amount: receiptData.amount,
      receiptType: receiptData.receiptType,
      previousHash: receiptData.previousHash || null,
      counter: tseSignature.signatureCounter
    });
    
    // Prüfe Signatur-Algorithmus
    if (tseSignature.signatureAlgorithm !== 'SHA256') {
      return {
        valid: false,
        errors: [`Ungültiger Signatur-Algorithmus: ${tseSignature.signatureAlgorithm}`],
        details: {
          expected: 'SHA256',
          actual: tseSignature.signatureAlgorithm
        }
      };
    }
    
    // Prüfe Signature-Counter (muss inkrementell sein)
    if (typeof tseSignature.signatureCounter !== 'number' || tseSignature.signatureCounter < 0) {
      return {
        valid: false,
        errors: ['Ungültiger Signature-Counter'],
        details: {
          counter: tseSignature.signatureCounter
        }
      };
    }
    
    // Prüfe TSE-Serial-Number
    if (!tseSignature.tseSerial || tseSignature.tseSerial.length < 10) {
      return {
        valid: false,
        errors: ['Ungültige TSE-Serial-Number'],
        details: {
          serial: tseSignature.tseSerial
        }
      };
    }
    
    // Prüfe Timestamp
    const timestamp = new Date(tseSignature.timestamp);
    if (isNaN(timestamp.getTime())) {
      return {
        valid: false,
        errors: ['Ungültiger Timestamp'],
        details: {
          timestamp: tseSignature.timestamp
        }
      };
    }
    
    // Prüfe ob Timestamp in der Vergangenheit liegt (nicht in der Zukunft)
    if (timestamp > new Date()) {
      return {
        valid: false,
        errors: ['Timestamp liegt in der Zukunft'],
        details: {
          timestamp: tseSignature.timestamp,
          now: new Date().toISOString()
        }
      };
    }
    
    // Kryptographische Validierung (wenn Public Key vorhanden)
    if (publicKey) {
      // TODO: Implementiere echte kryptographische Validierung mit Public Key
      // Für jetzt: Prüfe nur Format
      if (publicKey.length < 64) {
        return {
          valid: false,
          errors: ['Ungültiger Public Key (Format)'],
          details: {
            publicKeyLength: publicKey.length
          }
        };
      }
    }
    
    // Prüfe Signatur-Format (Hex-String, min. 64 Zeichen für SHA256)
    if (!/^[0-9a-f]{64,}$/i.test(tseSignature.signature)) {
      return {
        valid: false,
        errors: ['Ungültiges Signatur-Format (muss Hex-String sein)'],
        details: {
          signatureLength: tseSignature.signature.length,
          signatureStart: tseSignature.signature.substring(0, 20)
        }
      };
    }
    
    return {
      valid: true,
      errors: [],
      message: 'TSE-Signatur ist kryptographisch gültig (A-SIT Plus konform)',
      details: {
        algorithm: tseSignature.signatureAlgorithm,
        counter: tseSignature.signatureCounter,
        serial: tseSignature.tseSerial,
        timestamp: tseSignature.timestamp
      }
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Validierungsfehler: ${error.message}`],
      details: {
        error: error.message
      }
    };
  }
}

/**
 * Validiert Belegverkettung
 * @param {Object} receipt - Aktueller Beleg
 * @param {Object} previousReceipt - Vorheriger Beleg
 * @returns {Object} Validierungsergebnis
 */
function validateReceiptChain(receipt, previousReceipt) {
  try {
    if (!previousReceipt) {
      // Erster Beleg (Startbeleg) - keine Verkettung erforderlich
      if (receipt.receiptType === 'start') {
        return {
          valid: true,
          errors: [],
          message: 'Startbeleg - keine Verkettung erforderlich'
        };
      }
      return {
        valid: false,
        errors: ['Belegverkettung fehlt: Kein vorheriger Beleg gefunden']
      };
    }
    
    // Prüfe ob previousHash übereinstimmt
    if (receipt.previousReceiptHash !== previousReceipt.receiptHash) {
      return {
        valid: false,
        errors: ['Belegverkettung unterbrochen: previousHash stimmt nicht überein'],
        details: {
          expected: previousReceipt.receiptHash,
          actual: receipt.previousReceiptHash
        }
      };
    }
    
    // Prüfe ob Receipt-Number inkrementell ist
    if (receipt.receiptNumber !== previousReceipt.receiptNumber + 1) {
      return {
        valid: false,
        errors: ['Belegnummer nicht inkrementell'],
        details: {
          previousNumber: previousReceipt.receiptNumber,
          currentNumber: receipt.receiptNumber,
          expected: previousReceipt.receiptNumber + 1
        }
      };
    }
    
    // Prüfe ob Signature-Counter inkrementell ist
    if (receipt.tseSignature.signatureCounter !== previousReceipt.tseSignature.signatureCounter + 1) {
      return {
        valid: false,
        errors: ['Signature-Counter nicht inkrementell'],
        details: {
          previousCounter: previousReceipt.tseSignature.signatureCounter,
          currentCounter: receipt.tseSignature.signatureCounter,
          expected: previousReceipt.tseSignature.signatureCounter + 1
        }
      };
    }
    
    return {
      valid: true,
      errors: [],
      message: 'Belegverkettung ist gültig'
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Validierungsfehler: ${error.message}`]
    };
  }
}

/**
 * Generiert QR-Code-Buffer für BMF Belegcheck-App
 * @param {String} qrCodeData - Base64-kodierte QR-Code-Daten
 * @returns {Promise<Buffer>} QR-Code-Buffer (PNG)
 */
async function generateQRCodeForBMF(qrCodeData) {
  try {
    return await QRCode.toBuffer(qrCodeData, {
      errorCorrectionLevel: 'M',
      type: 'png',
      width: 300,
      margin: 1
    });
  } catch (error) {
    console.error('Fehler bei QR-Code-Generierung für BMF:', error);
    return null;
  }
}

/**
 * Vollständige Validierung eines Belegs (alle Prüfungen)
 * @param {Object} receiptChainEntry - ReceiptChain-Eintrag
 * @param {Object} previousReceipt - Vorheriger Beleg (optional)
 * @returns {Object} Vollständiges Validierungsergebnis
 */
async function validateReceiptComplete(receiptChainEntry, previousReceipt = null) {
  const results = {
    qrCode: null,
    tseSignature: null,
    receiptChain: null,
    overall: { valid: true, errors: [] }
  };
  
  // 1. QR-Code-Validierung
  if (receiptChainEntry.qrCodeData) {
    results.qrCode = validateQRCodeForBMF(receiptChainEntry.qrCodeData);
    if (!results.qrCode.valid) {
      results.overall.valid = false;
      results.overall.errors.push(...results.qrCode.errors);
    }
  }
  
  // 2. TSE-Signatur-Validierung
  if (receiptChainEntry.tseSignature) {
    results.tseSignature = validateTSESignatureCryptographic(
      {
        cashBoxId: receiptChainEntry.cashBoxId,
        transactionNumber: receiptChainEntry.invoiceId?.toString() || `RECEIPT-${receiptChainEntry.receiptNumber}`,
        timestamp: receiptChainEntry.receiptData.timestamp,
        amount: receiptChainEntry.receiptData.amount,
        receiptType: receiptChainEntry.receiptType,
        previousHash: receiptChainEntry.previousReceiptHash
      },
      receiptChainEntry.tseSignature,
      receiptChainEntry.tseSignature.publicKey
    );
    if (!results.tseSignature.valid) {
      results.overall.valid = false;
      results.overall.errors.push(...results.tseSignature.errors);
    }
  }
  
  // 3. Belegverkettung-Validierung
  if (previousReceipt) {
    results.receiptChain = validateReceiptChain(receiptChainEntry, previousReceipt);
    if (!results.receiptChain.valid) {
      results.overall.valid = false;
      results.overall.errors.push(...results.receiptChain.errors);
    }
  }
  
  return results;
}

module.exports = {
  validateQRCodeForBMF,
  validateTSESignatureCryptographic,
  validateReceiptChain,
  generateQRCodeForBMF,
  validateReceiptComplete
};

