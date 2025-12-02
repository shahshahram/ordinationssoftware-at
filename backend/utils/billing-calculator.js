// Berechnungsutilities für Österreichische Abrechnungen

const SELBSTBEHALT_RATES = {
  STANDARD: { rate: 0.10, max: 2850 }, // 10%, max 28,50€
  EXTENDED: { rate: 0.20, max: 34300 } // 20%, max 343,00€
};

/**
 * Versicherungsspezifische Selbstbehalt-Regeln
 * @param {String} insuranceProvider - Versicherungsanbieter
 * @param {String} billingType - Abrechnungstyp (kassenarzt, wahlarzt, privat)
 * @returns {Object} Selbstbehalt-Regel { rate: number, max: number, applicable: boolean }
 */
function getInsuranceCopayRule(insuranceProvider, billingType) {
  // Kein Selbstbehalt bei Kassenarzt-Abrechnung für die meisten Kassen
  if (billingType === 'kassenarzt') {
    // SVS hat 20% Selbstbehalt auch bei Kassenarzt
    if (insuranceProvider && insuranceProvider.includes('SVS')) {
      return { rate: 0.20, max: 34300, applicable: true };
    }
    // ÖGK, BVAEB, KFA, PVA: Kein Selbstbehalt beim Kassenarzt
    const noCopayInsurances = ['ÖGK', 'BVAEB', 'KFA', 'PVA', 'VAEB', 'BVA', 'AUVA', 'GKK', 'VA'];
    if (noCopayInsurances.some(ins => insuranceProvider && insuranceProvider.includes(ins))) {
      return { rate: 0, max: 0, applicable: false };
    }
  }
  
  // Wahlarzt: Standard-Selbstbehalt (10%)
  if (billingType === 'wahlarzt') {
    // SVS hat 20% Selbstbehalt auch bei Wahlarzt
    if (insuranceProvider && insuranceProvider.includes('SVS')) {
      return { rate: 0.20, max: 34300, applicable: true };
    }
    return { rate: 0.10, max: 2850, applicable: true };
  }
  
  // Privat: Kein Selbstbehalt
  if (billingType === 'privat') {
    return { rate: 0, max: 0, applicable: false };
  }
  
  // Standard: 10%
  return { rate: 0.10, max: 2850, applicable: true };
}

/**
 * Berechnet den Selbstbehalt für einen Service
 * @param {Object} service - ServiceCatalog Eintrag
 * @param {Object} patient - Patient Object
 * @param {Number} grossAmount - Bruttobetrag in Cent
 * @param {String} billingType - Abrechnungstyp (kassenarzt, wahlarzt, privat)
 * @returns {Number} Selbstbehalt in Cent
 */
function calculateCopay(service, patient, grossAmount, billingType = 'kassenarzt') {
  // Prüfen ob Patient selbstbehaltbefreit
  if (patient.exemptFromCopay) {
    return 0;
  }
  
  // Service-spezifischer Selbstbehalt (hat Vorrang)
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
  
  // Versicherungsspezifische Selbstbehalt-Regel
  const insuranceProvider = patient.insuranceProvider || '';
  const copayRule = getInsuranceCopayRule(insuranceProvider, billingType);
  
  if (!copayRule.applicable) {
    return 0;
  }
  
  // Berechne Selbstbehalt basierend auf Versicherungsregel
  const copay = Math.min(
    grossAmount * copayRule.rate,
    copayRule.max
  );
  
  return Math.round(copay);
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
    canBillAsSonderklasse: false,
    hasHospitalInsurance: false,
    hasPrivateDoctorInsurance: false,
    warning: null,
    additionalInsurances: {}
  };
  
  // Gesetzliche Versicherungen (ÖGK, SVS, BVAEB, etc.)
  const gesetzlicheVersicherungen = [
    'ÖGK', 'SVS', 'BVAEB', 'KFA', 'VAEB', 'BVA', 'PVA', 'AUVA', 'GKK', 'VA'
  ];
  
  const isGesetzlichVersichert = gesetzlicheVersicherungen.some(v => 
    patient.insuranceProvider && patient.insuranceProvider.includes(v)
  );
  
  if (isGesetzlichVersichert) {
    coverage.hasInsurance = true;
    coverage.canBillAsKassenarzt = service.billingType === 'kassenarzt' || service.billingType === 'both';
    coverage.canBillAsWahlarzt = service.billingType === 'wahlarzt' || service.billingType === 'both';
  }
  
  // Private Versicherungen
  if (patient.insuranceProvider === 'Privatversicherung') {
    coverage.hasInsurance = true;
    coverage.canBillAsWahlarzt = service.billingType === 'wahlarzt' || service.billingType === 'privat' || service.billingType === 'both';
  }
  
  // Zusatzversicherungen prüfen
  if (patient.additionalInsurances) {
    // Krankenhaus-Zusatzversicherung (Sonderklasse)
    if (patient.additionalInsurances.hospitalInsurance?.hasInsurance) {
      const hospitalIns = patient.additionalInsurances.hospitalInsurance;
      const now = new Date();
      const validFrom = hospitalIns.validFrom ? new Date(hospitalIns.validFrom) : null;
      const validUntil = hospitalIns.validUntil ? new Date(hospitalIns.validUntil) : null;
      
      if ((!validFrom || validFrom <= now) && (!validUntil || validUntil >= now)) {
        coverage.hasHospitalInsurance = true;
        coverage.canBillAsSonderklasse = true;
        coverage.additionalInsurances.hospitalInsurance = {
          insuranceCompany: hospitalIns.insuranceCompany,
          policyNumber: hospitalIns.policyNumber,
          coverageType: hospitalIns.coverageType,
          reimbursementRate: hospitalIns.reimbursementRate || 100,
          maxDailyRate: hospitalIns.maxDailyRate
        };
      }
    }
    
    // Privatarzt-/Wahlarzt-Zusatzversicherung
    if (patient.additionalInsurances.privateDoctorInsurance?.hasInsurance) {
      const privateIns = patient.additionalInsurances.privateDoctorInsurance;
      const now = new Date();
      const validFrom = privateIns.validFrom ? new Date(privateIns.validFrom) : null;
      const validUntil = privateIns.validUntil ? new Date(privateIns.validUntil) : null;
      
      if ((!validFrom || validFrom <= now) && (!validUntil || validUntil >= now)) {
        coverage.hasPrivateDoctorInsurance = true;
        coverage.canBillAsWahlarzt = true;
        coverage.additionalInsurances.privateDoctorInsurance = {
          insuranceCompany: privateIns.insuranceCompany,
          policyNumber: privateIns.policyNumber,
          reimbursementRate: privateIns.reimbursementRate || 80,
          maxReimbursementPerYear: privateIns.maxReimbursementPerYear,
          deductible: privateIns.deductible || 0
        };
      }
    }
  }
  
  // Selbstzahler
  if (!patient.insuranceNumber || patient.insuranceProvider === 'Selbstzahler') {
    coverage.hasInsurance = false;
    coverage.canBillAsWahlarzt = false;
    coverage.canBillAsKassenarzt = false;
    coverage.canBillAsSonderklasse = false;
    coverage.warning = 'Patient hat keine Versicherung';
  }
  
  return coverage;
}

/**
 * Berechnet die Abrechnung für einen Service
 * @param {Object} patient - Patient Object
 * @param {Object} service - ServiceCatalog Eintrag
 * @param {String} billingType - 'kassenarzt', 'wahlarzt', 'privat', 'sonderklasse'
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
    coverage,
    goaeCode: null,
    goaeMultiplier: null,
    ebmCode: null
  };
  
  switch(billingType) {
    case 'kassenarzt':
      if (!coverage.canBillAsKassenarzt) {
        result.warnings.push('Patient hat keine gesetzliche Versicherung oder Service ist nicht als Kassenarzt abrechenbar');
      }
      result.grossAmount = service.ogk?.ebmPrice || 0;
      result.ebmCode = service.ogk?.ebmCode || null;
      result.copay = calculateCopay(service, patient, result.grossAmount, 'kassenarzt');
      result.insuranceAmount = result.grossAmount - result.copay;
      result.patientAmount = result.copay;
      break;
      
    case 'wahlarzt':
      if (!coverage.canBillAsWahlarzt) {
        result.warnings.push('Patient hat keine Versicherung oder Service ist nicht als Wahlarzt abrechenbar');
      }
      result.grossAmount = service.wahlarzt?.price || service.private?.price || 0;
      result.goaeCode = service.wahlarzt?.goaeCode || null;
      result.goaeMultiplier = service.wahlarzt?.goaeMultiplier || 1.0;
      result.copay = calculateCopay(service, patient, result.grossAmount, 'wahlarzt');
      
      // Erstattungsbetrag berechnen - prüfe Zusatzversicherung
      let reimbursementRate = service.wahlarzt?.reimbursementRate || 0.80;
      if (coverage.hasPrivateDoctorInsurance && coverage.additionalInsurances.privateDoctorInsurance) {
        const privateIns = coverage.additionalInsurances.privateDoctorInsurance;
        reimbursementRate = privateIns.reimbursementRate / 100;
        // Prüfe Selbstbehalt der Zusatzversicherung
        if (privateIns.deductible > 0) {
          result.copay = Math.max(result.copay, privateIns.deductible);
        }
      }
      
      result.reimbursement = Math.round(result.grossAmount * reimbursementRate);
      
      // Max. Erstattung prüfen (falls vorhanden)
      if (coverage.hasPrivateDoctorInsurance && coverage.additionalInsurances.privateDoctorInsurance.maxReimbursementPerYear) {
        const maxReimbursement = coverage.additionalInsurances.privateDoctorInsurance.maxReimbursementPerYear;
        if (result.reimbursement > maxReimbursement) {
          result.warnings.push(`Erstattung überschreitet jährliches Maximum von ${formatAmount(maxReimbursement)}`);
          result.reimbursement = maxReimbursement;
        }
      }
      
      // Patient zahlt Differenz + Selbstbehalt
      result.patientAmount = result.grossAmount - result.reimbursement + result.copay;
      result.insuranceAmount = result.reimbursement;
      break;
      
    case 'sonderklasse':
      if (!coverage.canBillAsSonderklasse && !coverage.hasHospitalInsurance) {
        result.warnings.push('Patient hat keine Sonderklasse-Versicherung');
      }
      
      // Sonderklasse-Abrechnung (normalerweise im Krankenhaus)
      // Hier wird der Service-Preis als Basis genommen, aber Sonderklasse-Tarife sind höher
      const basePrice = service.private?.price || service.wahlarzt?.price || 0;
      const sonderklasseMultiplier = 1.5; // Beispiel: 50% Aufschlag für Sonderklasse
      result.grossAmount = Math.round(basePrice * sonderklasseMultiplier);
      
      if (coverage.hasHospitalInsurance && coverage.additionalInsurances.hospitalInsurance) {
        const hospitalIns = coverage.additionalInsurances.hospitalInsurance;
        const reimbursementRate = hospitalIns.reimbursementRate / 100;
        result.reimbursement = Math.round(result.grossAmount * reimbursementRate);
        
        // Max. Tagespauschale prüfen
        if (hospitalIns.maxDailyRate && result.grossAmount > hospitalIns.maxDailyRate) {
          result.warnings.push(`Tagespauschale überschreitet Maximum von ${formatAmount(hospitalIns.maxDailyRate)}`);
          result.grossAmount = hospitalIns.maxDailyRate;
          result.reimbursement = Math.round(hospitalIns.maxDailyRate * reimbursementRate);
        }
        
        result.patientAmount = result.grossAmount - result.reimbursement;
        result.insuranceAmount = result.reimbursement;
      } else {
        // Keine Versicherung - Patient zahlt voll
        result.patientAmount = result.grossAmount;
        result.insuranceAmount = 0;
      }
      result.copay = 0; // Sonderklasse hat normalerweise keinen Selbstbehalt
      break;
      
    case 'privat':
      result.grossAmount = service.private?.price || 0;
      result.copay = 0;
      result.patientAmount = result.grossAmount;
      result.insuranceAmount = 0;
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
  getInsuranceCopayRule,
  SELBSTBEHALT_RATES
};







