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
 * Prüft prozentuale Limitierung (z.B. Position darf nur bei max. 15% der Fälle verwendet werden)
 * @param {String} serviceCode - Service-Code
 * @param {Date} startDate - Startdatum des Zeitraums
 * @param {Date} endDate - Enddatum des Zeitraums
 * @param {Number} maxPercentage - Maximale Prozentzahl (z.B. 15 für 15%)
 * @param {String} excludeInvoiceId - Rechnungs-ID die ausgeschlossen werden soll (für Updates)
 * @returns {Promise<Object>} { exceedsLimit: boolean, currentPercentage: number, maxPercentage: number, totalCases: number, serviceCount: number, message: string }
 */
async function checkPercentageLimitation(serviceCode, startDate, endDate, maxPercentage, excludeInvoiceId = null) {
  try {
    if (!maxPercentage || maxPercentage <= 0) {
      return {
        exceedsLimit: false,
        currentPercentage: 0,
        maxPercentage: null,
        totalCases: 0,
        serviceCount: 0,
        message: null
      };
    }
    
    // Suche nach allen Rechnungen im Zeitraum
    const query = {
      invoiceDate: {
        $gte: startDate,
        $lte: endDate
      },
      status: { $in: ['draft', 'sent', 'paid', 'overdue'] }
    };
    
    if (excludeInvoiceId) {
      query._id = { $ne: excludeInvoiceId };
    }
    
    const invoices = await Invoice.find(query);
    const totalCases = invoices.length;
    
    if (totalCases === 0) {
      return {
        exceedsLimit: false,
        currentPercentage: 0,
        maxPercentage: maxPercentage,
        totalCases: 0,
        serviceCount: 0,
        message: null
      };
    }
    
    // Zähle wie oft die Leistung verwendet wurde
    let serviceCount = 0;
    invoices.forEach(invoice => {
      const matchingServices = invoice.services.filter(s => s.serviceCode === serviceCode);
      if (matchingServices.length > 0) {
        serviceCount++; // Zähle Rechnungen, nicht Services
      }
    });
    
    // Berechne Prozentsatz
    const currentPercentage = (serviceCount / totalCases) * 100;
    
    if (currentPercentage > maxPercentage) {
      return {
        exceedsLimit: true,
        currentPercentage: Math.round(currentPercentage * 100) / 100,
        maxPercentage: maxPercentage,
        totalCases: totalCases,
        serviceCount: serviceCount,
        message: `Warnung: Position ${serviceCode} wurde bei ${Math.round(currentPercentage * 100) / 100}% der Fälle verwendet (Maximum: ${maxPercentage}%). Verwendet in ${serviceCount} von ${totalCases} Rechnungen.`
      };
    }
    
    return {
      exceedsLimit: false,
      currentPercentage: Math.round(currentPercentage * 100) / 100,
      maxPercentage: maxPercentage,
      totalCases: totalCases,
      serviceCount: serviceCount,
      message: null
    };
  } catch (error) {
    console.error('[Billing Validation] Fehler bei prozentualer Limitierungsprüfung:', error);
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
 * Prüft ob Begründungspflicht erfüllt ist
 * @param {Object} service - Service-Objekt
 * @param {Object} serviceDoc - ServiceCatalog-Eintrag
 * @param {Array} invoiceDiagnoses - Array von Diagnosen in der Rechnung (optional)
 * @returns {Object} { isValid: boolean, errors: Array, warnings: Array }
 */
function validateJustification(service, serviceDoc, invoiceDiagnoses = []) {
  const errors = [];
  const warnings = [];
  
  if (!serviceDoc.ogk?.justificationRules?.requiresJustification) {
    return { isValid: true, errors: [], warnings: [] };
  }
  
  const rules = serviceDoc.ogk.justificationRules;
  
  // Prüfe Textfeld
  if (rules.justificationFields.text) {
    const justification = service.justification || service.notes || '';
    
    if (!justification || justification.trim().length === 0) {
      errors.push(`Begründung ist für ${serviceDoc.name} erforderlich`);
    } else {
      // Prüfe Mindestlänge
      if (rules.minLength && justification.length < rules.minLength) {
        errors.push(`Begründung muss mindestens ${rules.minLength} Zeichen lang sein`);
      }
      
      // Prüfe Maximallänge
      if (rules.maxLength && justification.length > rules.maxLength) {
        errors.push(`Begründung darf maximal ${rules.maxLength} Zeichen lang sein`);
      }
      
      // Prüfe Regex-Pattern
      if (rules.validationPattern) {
        try {
          const pattern = new RegExp(rules.validationPattern);
          if (!pattern.test(justification)) {
            errors.push(`Begründung entspricht nicht dem erforderlichen Format`);
          }
        } catch (regexError) {
          console.warn('[Billing Validation] Ungültiges Regex-Pattern:', rules.validationPattern);
        }
      }
    }
  }
  
  // Prüfe Uhrzeit
  if (rules.justificationFields.time) {
    const serviceDate = service.date ? new Date(service.date) : null;
    const serviceTime = service.serviceTime || (serviceDate ? serviceDate.toTimeString().substring(0, 5) : null);
    
    if (!serviceTime && !serviceDate) {
      errors.push(`Uhrzeit ist für ${serviceDoc.name} erforderlich`);
    }
  }
  
  // Prüfe Diagnose
  if (rules.justificationFields.diagnosis) {
    if (!invoiceDiagnoses || invoiceDiagnoses.length === 0) {
      errors.push(`Diagnose ist für ${serviceDoc.name} erforderlich`);
    }
  }
  
  // Prüfe Dringlichkeit
  if (rules.justificationFields.urgency) {
    if (service.urgency === undefined && service.urgencyLevel === undefined) {
      errors.push(`Dringlichkeit ist für ${serviceDoc.name} erforderlich`);
    }
  }
  
  // Prüfe Grund
  if (rules.justificationFields.reason) {
    const reason = service.reason || service.justification || service.notes || '';
    if (!reason || reason.trim().length === 0) {
      errors.push(`Grund ist für ${serviceDoc.name} erforderlich`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}

/**
 * Prüft ob Services Konflikte haben
 * @param {Array} services - Array von Service-Objekten
 * @param {Date} invoiceDate - Rechnungsdatum
 * @returns {Promise<Object>} { hasConflicts: boolean, conflicts: Array, warnings: Array }
 */
async function checkServiceConflicts(services, invoiceDate) {
  const conflicts = [];
  const warnings = [];
  
  try {
    // Gruppiere Services nach Datum
    const servicesByDate = {};
    for (const service of services) {
      const serviceDate = service.date ? new Date(service.date) : invoiceDate;
      const dateKey = serviceDate.toISOString().split('T')[0];
      
      if (!servicesByDate[dateKey]) {
        servicesByDate[dateKey] = [];
      }
      servicesByDate[dateKey].push(service);
    }
    
    // Prüfe Konflikte für jeden Tag
    for (const [dateKey, dayServices] of Object.entries(servicesByDate)) {
      // Lade ServiceCatalog-Einträge für alle Services
      const serviceCodes = dayServices.map(s => s.serviceCode);
      const serviceDocs = await ServiceCatalog.find({ code: { $in: serviceCodes } });
      
      // Erstelle Mapping: serviceCode -> ServiceCatalog
      const serviceMap = {};
      serviceDocs.forEach(doc => {
        serviceMap[doc.code] = doc;
      });
      
      // Prüfe Konflikte zwischen allen Service-Paaren
      for (let i = 0; i < dayServices.length; i++) {
        const service1 = dayServices[i];
        const doc1 = serviceMap[service1.serviceCode];
        
        if (!doc1 || !doc1.ogk?.conflictRules?.conflictsWith || doc1.ogk.conflictRules.conflictsWith.length === 0) {
          continue;
        }
        
        for (let j = i + 1; j < dayServices.length; j++) {
          const service2 = dayServices[j];
          const doc2 = serviceMap[service2.serviceCode];
          
          // Prüfe ob service1 mit service2 kollidiert
          if (doc1.ogk.conflictRules.conflictsWith.includes(service2.serviceCode)) {
            // Prüfe ob Überschreibung erlaubt ist
            if (doc1.ogk.conflictRules.allowOverride) {
              // Prüfe ob Begründung vorhanden ist
              if (doc1.ogk.conflictRules.overrideRequiresJustification) {
                const justification = service1.justification || service1.notes || service2.justification || service2.notes || '';
                if (!justification || justification.trim().length === 0) {
                  conflicts.push({
                    type: 'conflict',
                    severity: 'error',
                    service1: service1.serviceCode,
                    service2: service2.serviceCode,
                    message: `${doc1.name} und ${doc2?.name || service2.serviceCode} können nicht am selben Tag abgerechnet werden. Begründung erforderlich.`
                  });
                } else {
                  warnings.push({
                    type: 'conflict_override',
                    service1: service1.serviceCode,
                    service2: service2.serviceCode,
                    message: `${doc1.name} und ${doc2?.name || service2.serviceCode} werden am selben Tag abgerechnet (mit Begründung).`
                  });
                }
              } else {
                warnings.push({
                  type: 'conflict_override',
                  service1: service1.serviceCode,
                  service2: service2.serviceCode,
                  message: `${doc1.name} und ${doc2?.name || service2.serviceCode} werden am selben Tag abgerechnet.`
                });
              }
            } else {
              // Keine Überschreibung erlaubt
              conflicts.push({
                type: 'conflict',
                severity: 'error',
                service1: service1.serviceCode,
                service2: service2.serviceCode,
                message: `${doc1.name} und ${doc2?.name || service2.serviceCode} können nicht am selben Tag abgerechnet werden.`
              });
            }
          }
        }
      }
    }
    
    return {
      hasConflicts: conflicts.length > 0,
      conflicts: conflicts,
      warnings: warnings
    };
  } catch (error) {
    console.error('[Billing Validation] Fehler bei Konflikt-Prüfung:', error);
    return {
      hasConflicts: false,
      conflicts: [],
      warnings: []
    };
  }
}

/**
 * Validiert eine Liste von Leistungen für eine Rechnung
 * @param {String} patientId - Patient-ID
 * @param {Array} services - Array von Service-Objekten { serviceCode, description, quantity, unitPrice, date, justification?, notes?, serviceTime?, urgency?, urgencyLevel?, reason? }
 * @param {Date} invoiceDate - Datum der Rechnung
 * @param {String} excludeInvoiceId - Rechnungs-ID die ausgeschlossen werden soll (für Updates)
 * @param {Array} invoiceDiagnoses - Array von Diagnosen in der Rechnung (optional)
 * @returns {Promise<Object>} { isValid: boolean, errors: Array, warnings: Array }
 */
async function validateBillingServices(patientId, services, invoiceDate, excludeInvoiceId = null, invoiceDiagnoses = []) {
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
          
          // NEU: Prüfe prozentuale Limitierung (z.B. max. 15% der Fälle)
          if (tariff.kho.limitation.maxPercentage) {
            // Bestimme Zeitraum (Quartal, Monat, etc.)
            const period = tariff.kho.limitation.period || 'quarter';
            let startDate, endDate;
            
            if (period === 'quarter') {
              const quarter = Math.floor(serviceDate.getMonth() / 3);
              const year = serviceDate.getFullYear();
              startDate = new Date(year, quarter * 3, 1);
              endDate = new Date(year, (quarter + 1) * 3, 0, 23, 59, 59, 999);
            } else if (period === 'month') {
              startDate = new Date(serviceDate.getFullYear(), serviceDate.getMonth(), 1);
              endDate = new Date(serviceDate.getFullYear(), serviceDate.getMonth() + 1, 0, 23, 59, 59, 999);
            } else {
              // Fallback: Quartal
              const quarter = Math.floor(serviceDate.getMonth() / 3);
              const year = serviceDate.getFullYear();
              startDate = new Date(year, quarter * 3, 1);
              endDate = new Date(year, (quarter + 1) * 3, 0, 23, 59, 59, 999);
            }
            
            const percentageCheck = await checkPercentageLimitation(
              serviceCode,
              startDate,
              endDate,
              tariff.kho.limitation.maxPercentage,
              excludeInvoiceId
            );
            
            if (percentageCheck.exceedsLimit) {
              warnings.push(percentageCheck.message);
            }
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
          
          // NEU: Prüfe prozentuale Limitierung (z.B. max. 15% der Fälle)
          if (serviceDoc.ogk.limitation.maxPercentage) {
            // Bestimme Zeitraum (Quartal, Monat, etc.)
            const period = serviceDoc.ogk.limitation.period || 'quarter';
            let startDate, endDate;
            
            if (period === 'quarter') {
              const quarter = Math.floor(serviceDate.getMonth() / 3);
              const year = serviceDate.getFullYear();
              startDate = new Date(year, quarter * 3, 1);
              endDate = new Date(year, (quarter + 1) * 3, 0, 23, 59, 59, 999);
            } else if (period === 'month') {
              startDate = new Date(serviceDate.getFullYear(), serviceDate.getMonth(), 1);
              endDate = new Date(serviceDate.getFullYear(), serviceDate.getMonth() + 1, 0, 23, 59, 59, 999);
            } else {
              // Fallback: Quartal
              const quarter = Math.floor(serviceDate.getMonth() / 3);
              const year = serviceDate.getFullYear();
              startDate = new Date(year, quarter * 3, 1);
              endDate = new Date(year, (quarter + 1) * 3, 0, 23, 59, 59, 999);
            }
            
            const percentageCheck = await checkPercentageLimitation(
              serviceCode,
              startDate,
              endDate,
              serviceDoc.ogk.limitation.maxPercentage,
              excludeInvoiceId
            );
            
            if (percentageCheck.exceedsLimit) {
              warnings.push(percentageCheck.message);
            }
          }
        }
      }
    }
    
    // NEU: Prüfe Service-Konflikte
    const conflictCheck = await checkServiceConflicts(services, invoiceDate);
    
    if (conflictCheck.hasConflicts) {
      conflictCheck.conflicts.forEach(conflict => {
        errors.push(conflict.message);
      });
    }
    
    conflictCheck.warnings.forEach(warning => {
      warnings.push(warning.message);
    });
    
    // NEU: Prüfe Begründungspflicht
    for (const service of services) {
      const serviceDoc = await ServiceCatalog.findOne({ code: service.serviceCode });
      
      if (serviceDoc && serviceDoc.ogk?.justificationRules?.requiresJustification) {
        const justificationCheck = validateJustification(service, serviceDoc, invoiceDiagnoses);
        
        if (!justificationCheck.isValid) {
          errors.push(...justificationCheck.errors);
        }
        
        warnings.push(...justificationCheck.warnings);
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
async function calculateRefund(services, patient, locationId = null) {
  const serviceRefunds = [];
  const warnings = [];
  let totalRefund = 0;
  
  try {
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
      console.warn('[Billing Validation] Kein Bundesland gefunden, verwende Default: oberoesterreich');
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
      let kassenarztPrice = serviceDoc.ogk?.khoPrice || serviceDoc.ogk?.ebmPrice || 0;
      
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
      
      // Standard-Erstattung: 80% des Kassentarifs
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
  checkPercentageLimitation,
  checkServiceConflicts,
  validateJustification,
  validateBillingServices,
  calculateRefund
};
