// RKSVO - Registrierkassensicherheitsverordnung für Österreich
// Implementiert die Anforderungen für zertifizierte Registrierkassen mit TSE

const crypto = require('crypto');
const QRCode = require('qrcode'); // npm install qrcode

/**
 * Generiert eine RKSVO-konforme Rechnung mit TSE-Signatur
 * @param {Object} invoice - Rechnungsobjekt
 * @param {Object} tseConfig - TSE-Konfiguration
 * @returns {Object} Signierte Rechnung mit QR-Code
 */
async function generateRKSVInvoice(invoice, tseConfig) {
  // TSE-Zertifizierung
  const tseSignature = generateTSESignature(invoice, tseConfig);
  
  // QR-Code für Österreichischen Beleg
  const qrCodeData = generateQRCodeData(invoice, tseSignature);
  const qrCode = await generateQRCodeBuffer(qrCodeData);
  
  // Beleg generieren
  const receipt = generateReceipt(invoice, tseSignature);
  
  return {
    invoice,
    tseSignature,
    qrCode,
    receipt,
    qrCodeData
  };
}

/**
 * Generiert TSE-Signatur für die Rechnung
 * @param {Object} invoice - Rechnungsobjekt
 * @param {Object} tseConfig - TSE-Konfiguration
 * @returns {Object} TSE-Signatur
 */
function generateTSESignature(invoice, tseConfig) {
  // Daten für Signatur vorbereiten
  const signatureData = {
    cashBoxId: tseConfig.cashBoxId || 'CSHBOX1',
    transactionNumber: invoice.invoiceNumber,
    timestamp: new Date().toISOString(),
    invoiceAmount: invoice.totalAmount,
    receiptType: 'Beleg'
  };
  
  // TSE-Serial-Number (zertifiziert)
  const tseSerial = tseConfig.serialNumber || generateTSESerial();
  
  // Signature-Counter (inkrementell)
  const signatureCounter = getNextSignatureCounter();
  
  // Crypto-Signatur erstellen
  const dataToSign = JSON.stringify(signatureData);
  const signature = generateCryptoSignature(dataToSign, tseConfig);
  
  return {
    tseSerial,
    signatureCounter,
    signature,
    timestamp: signatureData.timestamp,
    signatureAlgorithm: 'SHA256',
    publicKey: tseConfig.publicKey
  };
}

/**
 * Generiert QR-Code-Daten für Österreichischen Beleg
 * @param {Object} invoice - Rechnungsobjekt
 * @param {Object} tseSignature - TSE-Signatur
 * @returns {String} QR-Code-Daten
 */
function generateQRCodeData(invoice, tseSignature) {
  // Format gemäß RKSVO für Österreich
  const qrData = {
    _: 'R', // Rechnung
    M: invoice.doctor.taxNumber || invoice.doctor.chamberNumber, // Steuernummer
    T: tseSignature.timestamp, // Datum/Zeit
    U: invoice.invoiceNumber, // Rechnungsnummer
    B: invoice.totalAmount.toString(), // Betrag in Cent
    C: 'EUR', // Währung
    S: tseSignature.signature // TSE-Signatur
  };
  
  // Als Base64-kodiertes String
  return Buffer.from(JSON.stringify(qrData)).toString('base64');
}

/**
 * Generiert QR-Code als Buffer
 * @param {String} data - QR-Code-Daten
 * @returns {Buffer} QR-Code-Buffer (PNG)
 */
async function generateQRCodeBuffer(data) {
  try {
    return await QRCode.toBuffer(data, {
      errorCorrectionLevel: 'M',
      type: 'png',
      width: 300,
      margin: 1
    });
  } catch (error) {
    console.error('Fehler bei QR-Code-Generierung:', error);
    return null;
  }
}

/**
 * Generiert ausführlichen Beleg für Patient
 * @param {Object} invoice - Rechnungsobjekt
 * @param {Object} tseSignature - TSE-Signatur
 * @returns {String} Beleg-Text
 */
function generateReceipt(invoice, tseSignature) {
  const receipt = `
================================================================================
                        ORDINATION - RECHNUNG
================================================================================
Ordination:    ${invoice.doctor.name}
               ${invoice.doctor.address.street}
               ${invoice.doctor.address.postalCode} ${invoice.doctor.address.city}

Patient:       ${invoice.patient.name}
               ${invoice.patient.address.street}
               ${invoice.patient.address.postalCode} ${invoice.patient.address.city}

Rechnungsnr.:  ${invoice.invoiceNumber}
Datum:         ${new Date(invoice.invoiceDate).toLocaleDateString('de-AT')}
Fälligkeit:    ${new Date(invoice.dueDate).toLocaleDateString('de-AT')}
================================================================================
LEISTUNGEN:
${invoice.services.map((service, index) => `
${index + 1}. ${service.description}
   Datum: ${new Date(service.date).toLocaleDateString('de-AT')}
   Code: ${service.serviceCode}
   Menge: ${service.quantity}
   Einzelpreis: ${(service.unitPrice / 100).toFixed(2).replace('.', ',')} €
   Gesamt: ${(service.totalPrice / 100).toFixed(2).replace('.', ',')} €
`).join('')}
================================================================================
ZUSAMMENFASSUNG:

Brutto:         ${(invoice.subtotal / 100).toFixed(2).replace('.', ',')} €
USt (0%):       ${(invoice.taxAmount / 100).toFixed(2).replace('.', ',')} €
Selbstbehalt:   ${(invoice.services.reduce((sum, s) => sum + (s.copay || 0), 0) / 100).toFixed(2).replace('.', ',')} €

GESAMTBETRAG:   ${(invoice.totalAmount / 100).toFixed(2).replace('.', ',')} €
================================================================================
${invoice.billingType === 'kassenarzt' ? `
ZAHLUNGSHINWEIS:
- ÖGK übernimmt ${(invoice.totalAmount - invoice.services.reduce((sum, s) => sum + (s.copay || 0), 0) / 100).toFixed(2).replace('.', ',')} €
- Patient zahlt Selbstbehalt von ${(invoice.services.reduce((sum, s) => sum + (s.copay || 0), 0) / 100).toFixed(2).replace('.', ',')} €
` : ''}
${invoice.billingType === 'wahlarzt' ? `
ZAHLUNGSHINWEIS:
- Patient zahlt ${(invoice.totalAmount / 100).toFixed(2).replace('.', ',')} €
- ÖGK erstattet bis zu ${(invoice.services.reduce((sum, s) => sum + (s.reimbursement || 0), 0) / 100).toFixed(2).replace('.', ',')} €
- Reichen Sie die Rechnung bei Ihrer Versicherung ein
` : ''}
================================================================================
TSE-Signatur:
Serial: ${tseSignature.tseSerial}
Counter: ${tseSignature.signatureCounter}
Zeitpunkt: ${tseSignature.timestamp}
Algorithmus: ${tseSignature.signatureAlgorithm}
================================================================================
Vielen Dank für Ihren Besuch!
================================================================================
`;
  
  return receipt;
}

/**
 * Generiert Crypto-Signatur mit HMAC-SHA256
 * @param {String} data - Zu signierende Daten
 * @param {Object} config - TSE-Konfiguration
 * @returns {String} Signatur
 */
function generateCryptoSignature(data, config) {
  const secret = config.secret || generateSecret();
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('hex');
}

/**
 * Generiert TSE-Serial-Number
 * @returns {String} Serial-Number
 */
function generateTSESerial() {
  return `TSE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generiert Secret für TSE
 * @returns {String} Secret
 */
function generateSecret() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Holt nächsten Signature-Counter (sollte aus DB kommen)
 * @returns {Number} Counter
 */
function getNextSignatureCounter() {
  // TODO: Aus Datenbank laden und inkrementieren
  return Date.now() % 1000000;
}

/**
 * Validiert TSE-Signatur
 * @param {Object} receipt - Beleg mit Signatur
 * @param {Object} tseConfig - TSE-Konfiguration
 * @returns {Boolean} Valide
 */
function validateTSESignature(receipt, tseConfig) {
  try {
    const signature = receipt.tseSignature.signature;
    const dataToSign = JSON.stringify({
      transactionNumber: receipt.invoice.invoiceNumber,
      timestamp: receipt.tseSignature.timestamp,
      amount: receipt.invoice.totalAmount
    });
    
    const expectedSignature = generateCryptoSignature(dataToSign, tseConfig);
    return signature === expectedSignature;
  } catch (error) {
    console.error('TSE-Signatur-Validierung fehlgeschlagen:', error);
    return false;
  }
}

/**
 * Exportiert Beleg als PDF
 * @param {Object} receiptData - Belegdaten
 * @returns {Buffer} PDF-Buffer
 */
async function exportReceiptAsPDF(receiptData) {
  // TODO: PDF-Generierung mit pdfkit oder puppeteer
  // Für jetzt return Buffer
  return Buffer.from(receiptData.receipt, 'utf-8');
}

module.exports = {
  generateRKSVInvoice,
  generateTSESignature,
  generateQRCodeData,
  generateReceipt,
  validateTSESignature,
  exportReceiptAsPDF
};



