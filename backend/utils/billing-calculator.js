// Berechnungsutilities für Österreichische Abrechnungen

// Helper-Funktion: Gibt Preis direkt zurück (alle Preise sind bereits in Euro)
// KEINE Konvertierung mehr nötig - alle Preise sind bereits in Euro!
const toEuro = (value) => {
  if (!value && value !== 0) return 0;
  // Alle Preise sind bereits in Euro - keine Konvertierung mehr!
  return value;
};

/**
 * Berechnet Netto-Preis aus Brutto-Preis
 * @param {Number} bruttoPrice - Brutto-Preis in Euro
 * @param {Number} taxRate - Umsatzsteuer in Prozent (z.B. 20 für 20%)
 * @returns {Number} Netto-Preis in Euro
 */
function calculateNettoFromBrutto(bruttoPrice, taxRate) {
  if (!bruttoPrice || bruttoPrice === 0) return 0;
  if (!taxRate || taxRate === 0) return bruttoPrice;
  return bruttoPrice / (1 + taxRate / 100);
}

/**
 * Berechnet Brutto-Preis aus Netto-Preis
 * @param {Number} nettoPrice - Netto-Preis in Euro
 * @param {Number} taxRate - Umsatzsteuer in Prozent (z.B. 20 für 20%)
 * @returns {Number} Brutto-Preis in Euro
 */
function calculateBruttoFromNetto(nettoPrice, taxRate) {
  if (!nettoPrice || nettoPrice === 0) return 0;
  if (!taxRate || taxRate === 0) return nettoPrice;
  return nettoPrice * (1 + taxRate / 100);
}

/**
 * Gibt den korrekten Preis zurück (Netto oder Brutto) basierend auf priceType
 * @param {Object} priceData - { price: Number, priceType: 'netto'|'brutto' }
 * @param {Number} taxRate - Umsatzsteuer in Prozent
 * @param {String} returnType - 'netto' oder 'brutto' (was zurückgegeben werden soll)
 * @returns {Number} Preis in Euro
 */
function getPriceByType(priceData, taxRate, returnType = 'netto') {
  if (!priceData || !priceData.price || priceData.price === 0) return 0;
  if (!taxRate || taxRate === 0) return priceData.price; // Keine USt = Netto = Brutto
  
  const inputPrice = priceData.price;
  const inputType = priceData.priceType || 'netto';
  
  // Wenn Input-Typ und gewünschter Typ gleich sind, direkt zurückgeben
  if (inputType === returnType) {
    return inputPrice;
  }
  
  // Umrechnen
  if (inputType === 'brutto' && returnType === 'netto') {
    return calculateNettoFromBrutto(inputPrice, taxRate);
  } else if (inputType === 'netto' && returnType === 'brutto') {
    return calculateBruttoFromNetto(inputPrice, taxRate);
  }
  
  return inputPrice;
}

const SELBSTBEHALT_RATES = {
  STANDARD: { rate: 0.10, max: 28.50 }, // 10%, max 28,50€ (jetzt in Euro)
  EXTENDED: { rate: 0.20, max: 343.00 } // 20%, max 343,00€ (jetzt in Euro)
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
      return { rate: 0.20, max: 343.00, applicable: true }; // Jetzt in Euro
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
      return { rate: 0.20, max: 343.00, applicable: true }; // Jetzt in Euro
    }
    return { rate: 0.10, max: 28.50, applicable: true }; // Jetzt in Euro
  }
  
  // Privat: Kein Selbstbehalt
  if (billingType === 'privat') {
    return { rate: 0, max: 0, applicable: false };
  }
  
  // Standard: 10%
  return { rate: 0.10, max: 28.50, applicable: true }; // Jetzt in Euro
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
      // copay.maxAmount ist jetzt in Euro (oder in Cent für Backward Compatibility)
      const maxAmountInEuro = toEuro(service.copay.maxAmount || Infinity);
      const copay = Math.min(
        grossAmount * (service.copay.percentage / 100),
        maxAmountInEuro
      );
      return copay; // Bereits in Euro
    }
    
    // Festbetrag
    if (service.copay.amount) {
      // copay.amount ist jetzt in Euro (oder in Cent für Backward Compatibility)
      return toEuro(service.copay.amount);
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
 * @returns {Object} Berechnungsdetails (alle Beträge in Euro)
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
      // khoPrice ist jetzt in Euro (oder ebmPrice für Backward Compatibility)
      result.grossAmount = toEuro(service.ogk?.khoPrice || service.ogk?.ebmPrice || 0);
      result.ebmCode = service.ogk?.khoCode || service.ogk?.ebmCode || null; // Unterstützt beide Felder
      result.copay = calculateCopay(service, patient, result.grossAmount, 'kassenarzt');
      result.insuranceAmount = result.grossAmount - result.copay;
      result.patientAmount = result.copay;
      break;
      
    case 'wahlarzt':
      if (!coverage.canBillAsWahlarzt) {
        result.warnings.push('Patient hat keine Versicherung oder Service ist nicht als Wahlarzt abrechenbar');
      }
      // Preise sind jetzt in Euro - berücksichtige Netto/Brutto
      const wahlarztTaxRate = service.taxRate !== null && service.taxRate !== undefined ? service.taxRate : 20;
      let wahlarztPrice = 0;
      if (service.wahlarzt?.price) {
        // Umrechnen zu Brutto (grossAmount ist immer Brutto)
        wahlarztPrice = getPriceByType(
          { price: service.wahlarzt.price, priceType: service.wahlarzt.priceType || 'netto' },
          wahlarztTaxRate,
          'brutto'
        );
      }
      if (!wahlarztPrice && service.private?.price) {
        // Fallback auf private Preis
        const privateTaxRate = service.taxRate !== null && service.taxRate !== undefined ? service.taxRate : 20;
        wahlarztPrice = getPriceByType(
          { price: service.private.price, priceType: service.private.priceType || 'netto' },
          privateTaxRate,
          'brutto'
        );
      }
      result.grossAmount = wahlarztPrice || 0;
      result.goaeCode = service.wahlarzt?.goaeCode || null;
      result.goaeMultiplier = service.wahlarzt?.goaeMultiplier || 1.0;
      result.copay = calculateCopay(service, patient, result.grossAmount, 'wahlarzt');
      
      // Erstattungsbetrag berechnen - prüfe billingGroup und Zusatzversicherung
      let reimbursementRate = service.wahlarzt?.reimbursementRate || 0.80;
      
      // NEU: billingGroup-basierte RefundRate-Logik
      // Grundleistung = 100% Erstattung, sonst 80%
      const billingGroup = service.ogk?.billingGroup || service.billingGroup;
      if (billingGroup === 'Grundleistung') {
        reimbursementRate = 1.0; // 100% Erstattung für Grundleistungen
      } else {
        reimbursementRate = service.wahlarzt?.reimbursementRate || 0.80; // Standard: 80%
      }
      
      // Zusatzversicherung hat Vorrang (falls vorhanden)
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
      if (!coverage.canBillAsPrivate) {
        result.warnings.push('Service ist nicht für Privatabrechnung verfügbar');
      }
      // Preise sind jetzt in Euro - berücksichtige Netto/Brutto
      const privatTaxRate = service.taxRate !== null && service.taxRate !== undefined ? service.taxRate : 20;
      let privatPrice = 0;
      if (service.private?.price) {
        // Umrechnen zu Brutto (grossAmount ist immer Brutto)
        privatPrice = getPriceByType(
          { price: service.private.price, priceType: service.private.priceType || 'netto' },
          privatTaxRate,
          'brutto'
        );
      }
      result.grossAmount = privatPrice || 0;
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

/**
 * Berechnet die voraussichtliche Erstattung für Wahlarzt-Leistungen
 * @param {Array} services - Array von Service-Objekten
 * @param {Object} patient - Patient-Objekt
 * @returns {Promise<Object>} { totalRefund: number, serviceRefunds: Array, warnings: Array }
 */
async function calculateRefund(services, patient, locationId = null) {
  const serviceRefunds = [];
  const warnings = [];
  let totalRefund = 0;
  
  try {
    const ServiceCatalog = require('../models/ServiceCatalog');
    const Location = require('../models/Location');
    const federalStateConfig = require('./federal-state-config');
    
    // Lade Bundesland und Arzt-Specialty aus Location für dynamische Punktwert-Berechnung
    let federalState = null;
    let doctorSpecialty = null;
    if (locationId) {
      const location = await Location.findById(locationId).select('federalState owner.specialty');
      if (location && location.federalState) {
        federalState = location.federalState;
        doctorSpecialty = location.owner?.specialty || null;
      }
    }
    
    // Fallback: Versuche erste aktive Location MIT federalState zu finden
    if (!federalState) {
      const firstActiveLocation = await Location.findOne({ 
        is_active: true, 
        federalState: { $exists: true, $ne: null } 
      }).select('federalState owner.specialty').sort({ createdAt: 1 });
      if (firstActiveLocation && firstActiveLocation.federalState) {
        federalState = firstActiveLocation.federalState;
        doctorSpecialty = firstActiveLocation.owner?.specialty || null;
      }
    }
    
    // Letzter Fallback: Verwende OÖ als Default
    if (!federalState) {
      console.warn('[Billing Calculator] Kein Bundesland gefunden, verwende Default: oberoesterreich');
      federalState = 'oberoesterreich';
    }
    
    for (const service of services) {
      const serviceCode = service.serviceCode;
      const grossAmount = service.unitPrice || 0;
      
      // Lade Service-Details
      const serviceDoc = await ServiceCatalog.findOne({ code: serviceCode });
      if (!serviceDoc) {
        warnings.push(`Service ${serviceCode} nicht gefunden`);
        continue;
      }
      
      // Prüfe ob Service als Wahlarzt abrechenbar ist
      if (serviceDoc.billingType !== 'wahlarzt' && serviceDoc.billingType !== 'both') {
        warnings.push(`Service ${serviceCode} ist nicht als Wahlarzt abrechenbar`);
        continue;
      }
      
      // Berechne Kassenarzt-Preis: Wenn nur points vorhanden, berechne aus Punktwert
      let kassenarztPrice = toEuro(serviceDoc.ogk?.khoPrice || serviceDoc.ogk?.ebmPrice || 0);
      
      // NEU: Wenn kein khoPrice vorhanden, aber points, berechne dynamisch mit 3-stufigem Prioritätssystem
      if ((!kassenarztPrice || kassenarztPrice === 0) && serviceDoc.ogk?.points && federalState) {
        // Verwende neue getPointValue() Funktion mit Prioritätssystem
        const servicePointValue = federalStateConfig.getPointValue(federalState, {
          khoCode: serviceDoc.ogk?.khoCode,
          doctorSpecialty: doctorSpecialty,
          serviceSpecialty: serviceDoc.specialty,
          billingGroup: serviceDoc.ogk?.billingGroup,
          service: serviceDoc.ogk
        });
        
        if (servicePointValue) {
          kassenarztPrice = Math.round((serviceDoc.ogk.points * servicePointValue) * 100) / 100;
        } else {
          // Fallback auf gespeicherten pointValue oder Default
          const fallbackPointValue = serviceDoc.ogk.pointValue || federalStateConfig.getPointValueForState(federalState) || 0.53;
          kassenarztPrice = Math.round((serviceDoc.ogk.points * fallbackPointValue) * 100) / 100;
        }
      }
      
      // NEU: billingGroup-basierte RefundRate-Logik
      let refundRate = serviceDoc.wahlarzt?.reimbursementRate || 0.80; // Standard: 80%
      const billingGroup = serviceDoc.ogk?.billingGroup;
      if (billingGroup === 'Grundleistung') {
        refundRate = 1.0; // 100% Erstattung für Grundleistungen
      }
      
      const refund = kassenarztPrice * refundRate;
      
      serviceRefunds.push({
        serviceCode: serviceCode,
        serviceName: serviceDoc.name,
        grossAmount: grossAmount,
        kassenarztPrice: kassenarztPrice,
        refundRate: refundRate,
        refund: refund
      });
      
      totalRefund += refund;
    }
    
    return {
      totalRefund: totalRefund,
      serviceRefunds: serviceRefunds,
      warnings: warnings
    };
  } catch (error) {
    console.error('[Billing Calculator] Fehler bei Erstattungsberechnung:', error);
    throw error;
  }
}

module.exports = {
  calculateNettoFromBrutto,
  calculateBruttoFromNetto,
  getPriceByType,
  calculateCopay,
  checkInsuranceCoverage,
  calculateBilling,
  generateInvoiceNumber,
  formatAmount,
  roundAmount,
  getInsuranceCopayRule,
  calculateRefund,
  SELBSTBEHALT_RATES
};







