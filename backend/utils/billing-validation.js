/**
 * Validierungslogik für ÖGK-Abrechnungen
 * Prüft Plausibilität, Duplikate und Limitierungen
 */

const Invoice = require('../models/Invoice');
const ServiceCatalog = require('../models/ServiceCatalog');
const Tariff = require('../models/Tariff');

/**
 * Prüft ob eine Leistung am selben Tag bereits verrechnet wurde
 * @param {String} patientId - Patient-ID
 * @param {String} serviceCode - Service-Code (z.B. "001" für Ordination)
 * @param {Date} date - Datum der Leistung
 * @param {String} excludeInvoiceId - Rechnungs-ID die ausgeschlossen werden soll (für Updates)
 * @returns {Promise<Object>} { isDuplicate: boolean, existingInvoice: Object|null, message: string }
 */
async function checkDuplicateServiceOnSameDay(patientId, serviceCode, date, excludeInvoiceId = null) {
  try {
    // Konvertiere Datum zu Start und Ende des Tages
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Suche nach Rechnungen mit derselben Leistung am selben Tag
    const query = {
      'patient.id': patientId,
      'services.serviceCode': serviceCode,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['draft', 'sent', 'paid', 'overdue'] } // Nur aktive/bezahlte Rechnungen
    };
    
    // Schließe aktuelle Rechnung aus (für Updates)
    if (excludeInvoiceId) {
      query._id = { $ne: excludeInvoiceId };
    }
    
    const existingInvoice = await Invoice.findOne(query);
    
    if (existingInvoice) {
      const service = existingInvoice.services.find(s => s.serviceCode === serviceCode);
      return {
        isDuplicate: true,
        existingInvoice: existingInvoice,
        message: `Leistung ${serviceCode} wurde bereits am ${date.toLocaleDateString('de-DE')} verrechnet (Rechnung: ${existingInvoice.invoiceNumber})`
      };
    }
    
    return {
      isDuplicate: false,
      existingInvoice: null,
      message: null
    };
  } catch (error) {
    console.error('[Billing Validation] Fehler bei Duplikat-Prüfung:', error);
    throw error;
  }
}

/**
 * Prüft ob eine Leistung die Quartals-Limitierung überschreitet
 * @param {String} patientId - Patient-ID
 * @param {String} serviceCode - Service-Code
 * @param {Date} date - Datum der Leistung
 * @param {Object} limitation - Limitierungs-Objekt aus ServiceCatalog oder Tariff
 * @param {String} excludeInvoiceId - Rechnungs-ID die ausgeschlossen werden soll (für Updates)
 * @returns {Promise<Object>} { exceedsLimit: boolean, currentCount: number, maxAllowed: number, message: string }
 */
async function checkQuarterlyLimitation(patientId, serviceCode, date, limitation, excludeInvoiceId = null) {
  try {
    if (!limitation || (!limitation.maxPerQuarter && !limitation.maxPerPatient)) {
      // Keine Limitierung definiert
      return {
        exceedsLimit: false,
        currentCount: 0,
        maxAllowed: null,
        message: null
      };
    }
    
    // Bestimme Quartal des Datums
    const quarter = Math.floor(date.getMonth() / 3);
    const year = date.getFullYear();
    const quarterStart = new Date(year, quarter * 3, 1);
    const quarterEnd = new Date(year, (quarter + 1) * 3, 0, 23, 59, 59, 999);
    
    // Suche nach Rechnungen im selben Quartal
    const query = {
      'patient.id': patientId,
      'services.serviceCode': serviceCode,
      date: {
        $gte: quarterStart,
        $lte: quarterEnd
      },
      status: { $in: ['draft', 'sent', 'paid', 'overdue'] }
    };
    
    if (excludeInvoiceId) {
      query._id = { $ne: excludeInvoiceId };
    }
    
    const invoices = await Invoice.find(query);
    
    // Zähle wie oft die Leistung im Quartal verrechnet wurde
    let currentCount = 0;
    invoices.forEach(invoice => {
      const matchingServices = invoice.services.filter(s => s.serviceCode === serviceCode);
      currentCount += matchingServices.length;
    });
    
    // Prüfe Limitierung
    const maxAllowed = limitation.maxPerQuarter || limitation.maxPerPatient || null;
    
    if (maxAllowed && currentCount >= maxAllowed) {
      return {
        exceedsLimit: true,
        currentCount: currentCount,
        maxAllowed: maxAllowed,
        message: `Leistung ${serviceCode} wurde bereits ${currentCount} mal im Quartal ${quarter + 1}/${year} verrechnet. Maximum: ${maxAllowed}`
      };
    }
    
    return {
      exceedsLimit: false,
      currentCount: currentCount,
      maxAllowed: maxAllowed,
      message: null
    };
  } catch (error) {
    console.error('[Billing Validation] Fehler bei Quartals-Limitierungsprüfung:', error);
    throw error;
  }
}

/**
 * Validiert eine Liste von Leistungen für eine Rechnung
 * @param {String} patientId - Patient-ID
 * @param {Array} services - Array von Service-Objekten { serviceCode, description, quantity, unitPrice, date }
 * @param {Date} invoiceDate - Datum der Rechnung
 * @param {String} excludeInvoiceId - Rechnungs-ID die ausgeschlossen werden soll (für Updates)
 * @returns {Promise<Object>} { isValid: boolean, errors: Array, warnings: Array }
 */
async function validateBillingServices(patientId, services, invoiceDate, excludeInvoiceId = null) {
  const errors = [];
  const warnings = [];
  
  try {
    // Gruppiere Services nach Code und Datum
    const serviceGroups = {};
    
    for (const service of services) {
      const serviceCode = service.serviceCode;
      const serviceDate = service.date ? new Date(service.date) : invoiceDate;
      const key = `${serviceCode}_${serviceDate.toISOString().split('T')[0]}`;
      
      if (!serviceGroups[key]) {
        serviceGroups[key] = {
          code: serviceCode,
          date: serviceDate,
          count: 0,
          service: service
        };
      }
      serviceGroups[key].count += (service.quantity || 1);
    }
    
    // Prüfe jede Service-Gruppe
    for (const [key, group] of Object.entries(serviceGroups)) {
      const serviceCode = group.code;
      const serviceDate = group.date;
      
      // Lade Service-Details
      const serviceDoc = await ServiceCatalog.findOne({ code: serviceCode });
      if (!serviceDoc) {
        // Versuche Tariff zu finden
        const tariff = await Tariff.findOne({ code: serviceCode });
        if (!tariff) {
          warnings.push(`Service/Tarif ${serviceCode} nicht in Datenbank gefunden`);
          continue;
        }
        
        // Prüfe Duplikat am selben Tag
        const duplicateCheck = await checkDuplicateServiceOnSameDay(
          patientId, 
          serviceCode, 
          serviceDate, 
          excludeInvoiceId
        );
        
        if (duplicateCheck.isDuplicate) {
          // Prüfe ob es eine erlaubte Ausnahme ist (z.B. verschiedene Ärzte)
          // Für jetzt: Warnung statt Fehler
          warnings.push(duplicateCheck.message);
        }
        
        // Prüfe Quartals-Limitierung
        if (tariff.kho?.limitation) {
          const limitationCheck = await checkQuarterlyLimitation(
            patientId,
            serviceCode,
            serviceDate,
            tariff.kho.limitation,
            excludeInvoiceId
          );
          
          if (limitationCheck.exceedsLimit) {
            errors.push(limitationCheck.message);
          } else if (limitationCheck.currentCount > 0) {
            warnings.push(`Leistung ${serviceCode} wurde bereits ${limitationCheck.currentCount} mal im Quartal verrechnet (Maximum: ${limitationCheck.maxAllowed})`);
          }
        }
      } else {
        // Prüfe Duplikat am selben Tag
        const duplicateCheck = await checkDuplicateServiceOnSameDay(
          patientId, 
          serviceCode, 
          serviceDate, 
          excludeInvoiceId
        );
        
        if (duplicateCheck.isDuplicate) {
          // Prüfe ob Service mehrfach am selben Tag erlaubt ist
          // Standard: Ordination (001) sollte nicht doppelt verrechnet werden
          if (serviceCode === '001' || serviceCode === '7' || serviceCode === '8') {
            errors.push(duplicateCheck.message);
          } else {
            warnings.push(duplicateCheck.message);
          }
        }
        
        // Prüfe Quartals-Limitierung
        if (serviceDoc.ogk?.limitation) {
          const limitationCheck = await checkQuarterlyLimitation(
            patientId,
            serviceCode,
            serviceDate,
            serviceDoc.ogk.limitation,
            excludeInvoiceId
          );
          
          if (limitationCheck.exceedsLimit) {
            errors.push(limitationCheck.message);
          } else if (limitationCheck.currentCount > 0) {
            warnings.push(`Leistung ${serviceCode} wurde bereits ${limitationCheck.currentCount} mal im Quartal verrechnet (Maximum: ${limitationCheck.maxAllowed})`);
          }
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings
    };
  } catch (error) {
    console.error('[Billing Validation] Fehler bei Validierung:', error);
    return {
      isValid: false,
      errors: [`Validierungsfehler: ${error.message}`],
      warnings: warnings
    };
  }
}

/**
 * Berechnet die voraussichtliche Erstattung für Wahlarzt-Leistungen
 * @param {Array} services - Array von Service-Objekten
 * @param {Object} patient - Patient-Objekt
 * @returns {Promise<Object>} { totalRefund: number, serviceRefunds: Array, warnings: Array }
 */
async function calculateRefund(services, patient) {
  const serviceRefunds = [];
  const warnings = [];
  let totalRefund = 0;
  
  try {
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
      
      // Standard-Erstattung: 80% des Kassentarifs
      const kassenarztPrice = serviceDoc.ogk?.khoPrice || serviceDoc.ogk?.ebmPrice || 0;
      const refundRate = 0.80; // 80% Erstattung
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
    console.error('[Billing Validation] Fehler bei Erstattungsberechnung:', error);
    throw error;
  }
}

module.exports = {
  checkDuplicateServiceOnSameDay,
  checkQuarterlyLimitation,
  validateBillingServices,
  calculateRefund
};
