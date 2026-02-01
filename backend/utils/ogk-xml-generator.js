// ÖGK XML-Generator für Kassenabrechnung (ELA / AbrechnungOnline)
// Verwendet fast-xml-parser und fieldEncryption für VSNR

const { XMLBuilder } = require('fast-xml-parser');
const { decryptField, isEncrypted } = require('./fieldEncryption');

const generateELA = (invoices, doctor) => {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true
  });

  const xmlData = {
    'n1:AbrechnungOnline': {
      '@_xmlns:n1': 'http://www.elda.at/schema/abrechnung/v3',
      'n1:Absender': {
        'n1:VPNR': doctor.chamberNumber || '123456'
      },
      'n1:Scheine': {
        'n1:Schein': (invoices || []).map((inv) => {
          let vsnr = inv.patient?.insuranceNumber || inv.patient?.socialSecurityNumber;
          try {
            if (vsnr && isEncrypted(vsnr)) vsnr = decryptField(vsnr);
          } catch (e) {}
          return {
            'n1:RefNr': inv.invoiceNumber,
            'n1:Patient': { 'n1:VSNR': vsnr || '' },
            'n1:Positionen': {
              'n1:Pos': (inv.services || []).map((svc) => ({
                'n1:Code': svc.serviceCode || '',
                'n1:Tag': new Date(svc.date || new Date()).getDate(),
                'n1:Preis': Number(svc.totalPrice || svc.unitPrice || 0).toFixed(2)
              }))
            }
          };
        })
      }
    }
  };

  return builder.build(xmlData);
};

/**
 * Für Kompatibilität mit billing.js: Berechnet Summen über Rechnungen.
 */
const calculateTotals = (invoices) => {
  if (!invoices || !Array.isArray(invoices)) {
    return { totalAmount: 0, totalCopay: 0, totalInsuranceAmount: 0, totalServices: 0, count: 0 };
  }
  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalCopay = invoices.reduce(
    (sum, inv) => sum + (inv.services?.reduce((s, svc) => s + (svc.copay || 0), 0) || 0),
    0
  );
  return {
    totalAmount,
    totalCopay,
    totalInsuranceAmount: totalAmount - totalCopay,
    totalServices: invoices.reduce((sum, inv) => sum + (inv.services?.length || 0), 0),
    count: invoices.length
  };
};

/**
 * Für Kompatibilität mit ogkAutoSubmitService und ogk-billing: Turnus = ELA mit allen Rechnungen.
 */
const generateTurnusAbrechnung = (invoices, doctor, billingPeriod) => {
  return generateELA(invoices || [], doctor);
};

module.exports = {
  generateELA,
  calculateTotals,
  generateTurnusAbrechnung
};
