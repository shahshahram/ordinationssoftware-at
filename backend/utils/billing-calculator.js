// Berechnungsutilities für Österreichische Abrechnungen

const SELBSTBEHALT_RATES = {
  STANDARD: { rate: 0.10, max: 2850 }, // 10%, max 28,50€
  EXTENDED: { rate: 0.20, max: 34300 } // 20%, max 343,00€
};

/**
 * Berechnet den Selbstbehalt für einen Service
 * @param {Object} service - ServiceCatalog Eintrag
 * @param {Object} patient - Patient Object
 * @param {Number} grossAmount - Bruttobetrag in Cent
 * @returns {Number} Selbstbehalt in Cent
 */
function calculateCopay(service, patient, grossAmount) {
  // Prüfen ob Patient selbstbehaltbefreit
  if (patient.exemptFromCopay) {
    return 0;
  }
  
  // Service-spezifischer Selbstbehalt
  if (service.copay && service.copay.applicable) {
    if (service.copay.exempt) {
      return 0;
    }
    
    // Prozentsatz-basiert
    if (service.copay.percentage > 0) {
      const copay = Math.min(
        grossAmount * (service.copay.percentage / 100),
        service.copay.maxAmount || Infinity
      );
      return Math.round(copay);
    }
    
    // Festbetrag
    if (service.copay.amount) {
      return service.copay.amount;
    }
  }
  
  // Standard-Selbstbehalt für Österreich (10%)
  const standardCopay = Math.min(
    grossAmount * SELBSTBEHALT_RATES.STANDARD.rate,
    SELBSTBEHALT_RATES.STANDARD.max
  );
  
  return Math.round(standardCopay);
}

/**
 * Prüft Versicherungsdeckung für einen Patienten
 * @param {Object} patient - Patient Object
 * @param {Object} service - ServiceCatalog Eintrag
 * @returns {Object} Versicherungsdeckung
 */
function checkInsuranceCoverage(patient, service) {
  const coverage = {
    hasInsurance: !!patient.insuranceNumber,
    insuranceType: patient.insuranceProvider || 'none',
    canBillAsKassenarzt: false,
    canBillAsWahlarzt: false,
    warning: null
  };
  
  // ÖGK-Versicherung
  if (patient.insuranceProvider && patient.insuranceProvider.includes('ÖGK')) {
    coverage.hasInsurance = true;
    coverage.canBillAsKassenarzt = service.billingType === 'kassenarzt' || service.billingType === 'both';
    coverage.canBillAsWahlarzt = service.billingType === 'wahlarzt' || service.billingType === 'both';
  }
  
  // Private Versicherungen (PRIVATpatient, etc.)
  if (patient.insuranceProvider === 'Privatversicherung') {
    coverage.hasInsurance = true;
    coverage.canBillAsWahlarzt = service.billingType === 'wahlarzt' || service.billingType === 'privat' || service.billingType === 'both';
  }
  
  // Selbstzahler
  if (!patient.insuranceNumber || patient.insuranceProvider === 'Selbstzahler') {
    coverage.hasInsurance = false;
    coverage.canBillAsWahlarzt = false;
    coverage.canBillAsKassenarzt = false;
    coverage.warning = 'Patient hat keine Versicherung';
  }
  
  return coverage;
}

/**
 * Berechnet die Abrechnung für einen Service
 * @param {Object} patient - Patient Object
 * @param {Object} service - ServiceCatalog Eintrag
 * @param {String} billingType - 'kassenarzt', 'wahlarzt', oder 'privat'
 * @returns {Object} Berechnungsdetails
 */
function calculateBilling(patient, service, billingType) {
  const coverage = checkInsuranceCoverage(patient, service);
  
  const result = {
    billingType,
    grossAmount: 0,
    copay: 0,
    insuranceAmount: 0,
    patientAmount: 0,
    reimbursement: 0,
    warnings: [],
    coverage
  };
  
  switch(billingType) {
    case 'kassenarzt':
      if (!coverage.canBillAsKassenarzt) {
        result.warnings.push('Patient hat keine ÖGK-Versicherung oder Service ist nicht als Kassenarzt abrechenbar');
      }
      result.grossAmount = service.ogk?.ebmPrice || 0;
      result.copay = calculateCopay(service, patient, result.grossAmount);
      result.insuranceAmount = result.grossAmount - result.copay;
      result.patientAmount = result.copay;
      break;
      
    case 'wahlarzt':
      if (!coverage.canBillAsWahlarzt) {
        result.warnings.push('Patient hat keine Versicherung oder Service ist nicht als Wahlarzt abrechenbar');
      }
      result.grossAmount = service.wahlarzt?.price || service.private?.price || 0;
      result.copay = calculateCopay(service, patient, result.grossAmount);
      
      // Erstattungsbetrag berechnen
      const reimbursementRate = service.wahlarzt?.reimbursementRate || 0.80;
      result.reimbursement = Math.round(result.grossAmount * reimbursementRate);
      
      // Patient zahlt Differenz + Selbstbehalt
      result.patientAmount = result.grossAmount - result.reimbursement + result.copay;
      result.insuranceAmount = result.reimbursement;
      break;
      
    case 'privat':
      result.grossAmount = service.private?.price || 0;
      result.copay = 0;
      result.patientAmount = result.grossAmount;
      break;
      
    default:
      result.warnings.push(`Unbekannter billingType: ${billingType}`);
  }
  
  return result;
}

/**
 * Generiert eine Rechnungsnummer
 * @param {String} prefix - Prefix für Rechnungsnummer (z.B. '2025')
 * @returns {String} Rechnungsnummer
 */
function generateInvoiceNumber(prefix = null) {
  const year = prefix || new Date().getFullYear();
  const randomPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `${year}-${randomPart}`;
}

/**
 * Formatiert Betrag in Euro
 * @param {Number} amountInCents - Betrag in Cent
 * @returns {String} Formatierter Betrag (z.B. "12,50 €")
 */
function formatAmount(amountInCents) {
  const euros = (amountInCents / 100).toFixed(2);
  return `${euros.replace('.', ',')} €`;
}

/**
 * Rundet Betrag für Abrechnung
 * @param {Number} amount - Betrag in Cent
 * @returns {Number} Gerundeter Betrag in Cent
 */
function roundAmount(amount) {
  return Math.round(amount);
}

module.exports = {
  calculateCopay,
  checkInsuranceCoverage,
  calculateBilling,
  generateInvoiceNumber,
  formatAmount,
  roundAmount,
  SELBSTBEHALT_RATES
};







