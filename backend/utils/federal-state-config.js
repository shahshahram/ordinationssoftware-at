/**
 * Utility für Bundesland-Konfiguration
 * Lädt Punktwerte aus federal_state_config.json
 * 
 * NEU: 3-stufiges Prioritätssystem:
 * 1. Positionsnummer-/KHO-Code-spezifische Fix-Punktwerte (positionSpecific)
 *    - Numerische Keys (z.B. "83", "165") = Punktwert in Euro.
 *    - Nicht-numerische Keys (z.B. "VU1") = Pauschalpreis in Euro (Endpreis);
 *      bei 1 Punkt der Leistung entspricht der Rückgabewert dem fixen Endpreis (Wirkung 1:1).
 * 2. BillingGroup/Specialty-basierte Punktwerte
 * 3. Default-Punktwert des Bundeslandes
 */

const fs = require('fs');
const path = require('path');

let configCache = null;

/**
 * Lädt die Bundesland-Konfiguration
 * @returns {Object} Konfigurationsobjekt mit pointValues
 */
function loadConfig() {
  if (configCache) {
    return configCache;
  }

  try {
    const configPath = path.join(__dirname, '../config/federal_state_config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    configCache = JSON.parse(configData);
    return configCache;
  } catch (error) {
    console.error('[Federal State Config] Fehler beim Laden der Konfiguration:', error);
    // Fallback auf Standard-Werte
    configCache = {
      pointValues: {
        'burgenland': { default: 0.50 },
        'kaernten': { default: 0.50 },
        'niederoesterreich': { default: 0.52 },
        'oberoesterreich': { default: 0.53 },
        'salzburg': { default: 0.50 },
        'steiermark': { default: 0.51 },
        'tirol': { default: 0.50 },
        'vorarlberg': { default: 0.50 },
        'wien': { default: 0.49 }
      }
    };
    return configCache;
  }
}

/**
 * Extrahiert Positionsnummer aus khoCode
 * @param {String} khoCode - KHO-Code (z.B. "83", "165", "VU1")
 * @returns {String|null} Positionsnummer oder null
 */
function extractPositionNumber(khoCode) {
  if (!khoCode) return null;
  
  // Prüfe ob es eine reine numerische Positionsnummer ist (z.B. "83", "165")
  if (/^\d+$/.test(khoCode.trim())) {
    return khoCode.trim();
  }
  
  return null;
}

/**
 * Prüft ob es sich um eine Laborleistung handelt
 * @param {Object} service - Service-Objekt mit ogk/kho-Feldern
 * @param {String} specialty - Specialty des Services
 * @returns {Boolean} true wenn Laborleistung
 */
function isLaborService(service, specialty) {
  // Prüfe billingGroup
  const billingGroup = service?.ogk?.billingGroup || service?.kho?.billingGroup;
  if (billingGroup === 'labor') {
    return true;
  }
  
  // Prüfe specialty
  if (specialty === 'labor') {
    return true;
  }
  
  // Prüfe khoCode-Pattern (falls vorhanden)
  const khoCode = service?.ogk?.khoCode || service?.kho?.khoCode;
  if (khoCode && /^LAB|^L\d+/i.test(khoCode)) {
    return true;
  }
  
  return false;
}

/**
 * Prüft ob es sich um ein Labor-Institut handelt (vs. Ordination)
 * @param {String} specialty - Specialty
 * @param {String} doctorSpecialty - Specialty des Arztes
 * @returns {Boolean} true wenn Institut
 */
function isLaborInstitute(specialty, doctorSpecialty) {
  // Wenn Arzt-Specialty "labor" oder "pathologie" ist, könnte es ein Institut sein
  // Für jetzt: Wenn specialty === 'labor' UND doctorSpecialty === 'labor', dann Institut
  // Sonst: Ordination
  return specialty === 'labor' && doctorSpecialty === 'labor';
}

/**
 * Hauptfunktion: Gibt Punktwert mit 3-stufigem Prioritätssystem zurück
 * @param {String} federalState - Bundesland (z.B. 'oberoesterreich', 'wien')
 * @param {Object} options - Optionen für Punktwert-Bestimmung
 * @param {String} options.positionNumber - Positionsnummer (z.B. "83", "165")
 * @param {String} options.khoCode - KHO-Code (wird auf Positionsnummer geprüft)
 * @param {String} options.doctorSpecialty - Specialty des Arztes (z.B. 'radiologie', 'labor')
 * @param {String} options.serviceSpecialty - Specialty des Services
 * @param {String} options.billingGroup - BillingGroup des Services
 * @param {Object} options.service - Service-Objekt (für Labor-Erkennung)
 * @param {Boolean} options.isLabor - Explizite Labor-Markierung (optional)
 * @param {Date|string} [options.date] - Rechnungs-/Behandlungsdatum; Jahr bestimmt Tarif-Jahr (z.B. 2025/2026). Ohne: aktuelles Jahr
 * @returns {Number|null} Punktwert in Euro oder null wenn nicht gefunden
 */
function getPointValue(federalState, options = {}) {
  if (!federalState) {
    return null;
  }

  const config = loadConfig();
  const year = options.date
    ? new Date(options.date).getFullYear().toString()
    : new Date().getFullYear().toString();
  const pointValuesSource = config[year]?.pointValues ?? config.pointValues;
  const stateKey = federalState.toLowerCase().trim();
  const stateConfig = pointValuesSource[stateKey];

  if (!stateConfig) {
    console.warn(`[Federal State Config] Bundesland '${federalState}' nicht gefunden (Jahr: ${year})`);
    return null;
  }

  // Extrahiere Positionsnummer aus khoCode falls nicht explizit angegeben
  let positionNumber = options.positionNumber;
  if (!positionNumber && options.khoCode) {
    positionNumber = extractPositionNumber(options.khoCode);
  }
  // Lookup-Key für positionSpecific: numerische Positionsnummer ODER roher KHO-Code (z.B. "VU1")
  const positionKey = (positionNumber ?? (options.khoCode && options.khoCode.trim())) || null;

  // STUFE 1: Positionsnummer-/KHO-Code-spezifischer Fix-Punktwert (höchste Priorität)
  if (positionKey && stateConfig.positionSpecific && stateConfig.positionSpecific[positionKey] !== undefined) {
    const posValue = stateConfig.positionSpecific[positionKey];
    console.log(`[Federal State Config] positionSpecific Wert für ${positionKey}: ${posValue}`);
    return posValue;
  }

  // STUFE 2: BillingGroup/Specialty-basierte Punktwerte
  
  // 2a: Labor-Unterscheidung
  const isLabor = options.isLabor !== undefined 
    ? options.isLabor 
    : isLaborService(options.service || {}, options.serviceSpecialty);
  
  if (isLabor) {
    const isInstitute = isLaborInstitute(options.serviceSpecialty, options.doctorSpecialty);
    const labType = isInstitute ? 'institute' : 'ordination';
    if (stateConfig.labor && stateConfig.labor[labType]) {
      const labValue = stateConfig.labor[labType];
      console.log(`[Federal State Config] Labor-Punktwert (${labType}) für ${stateKey}: ${labValue}`);
      return labValue;
    }
    // Fallback: Wenn kein spezifischer Labor-Wert, verwende Ordination
    if (stateConfig.labor && stateConfig.labor.ordination) {
      return stateConfig.labor.ordination;
    }
  }

  // 2b: Radiologie (extrem wichtig: sehr niedriger Punktwert!)
  if (options.doctorSpecialty === 'radiologie' || options.serviceSpecialty === 'radiologie') {
    if (stateConfig.specialty && stateConfig.specialty.radiologie) {
      const radValue = stateConfig.specialty.radiologie;
      console.log(`[Federal State Config] Radiologie-Punktwert für ${stateKey}: ${radValue}`);
      return radValue;
    }
  }

  // 2c: Physiotherapie
  if (options.serviceSpecialty === 'physiotherapie' || options.billingGroup === 'Therapie') {
    if (stateConfig.specialty && stateConfig.specialty.physiotherapie) {
      return stateConfig.specialty.physiotherapie;
    }
  }

  // 2d: EKG
  if (options.serviceSpecialty === 'kardiologie' && options.billingGroup === 'Untersuchung') {
    // Prüfe ob es sich um EKG handelt (könnte auch über khoCode erkannt werden)
    if (stateConfig.specialty && stateConfig.specialty.ekg) {
      return stateConfig.specialty.ekg;
    }
  }

  // 2e: Röntgen (bei Nicht-Radiologen)
  if (options.serviceSpecialty === 'radiologie' && options.doctorSpecialty && options.doctorSpecialty !== 'radiologie') {
    if (stateConfig.specialty && stateConfig.specialty.roentgen_non_radiologist) {
      return stateConfig.specialty.roentgen_non_radiologist;
    }
  }

  // STUFE 3: Default-Punktwert des Bundeslandes (Fallback)
  const defaultValue = stateConfig.default;
  if (defaultValue !== undefined && defaultValue !== null) {
    return defaultValue;
  }

  // Letzter Fallback: 0.53 (OÖ Standard)
  console.warn(`[Federal State Config] Kein Punktwert gefunden für ${stateKey}, verwende Default: 0.53`);
  return 0.53;
}

/**
 * Legacy-Funktion: Gibt den Punktwert für ein Bundesland zurück (Backward Compatibility)
 * @param {String} federalState - Bundesland (z.B. 'oberoesterreich', 'wien')
 * @returns {Number|null} Punktwert in Euro oder null wenn nicht gefunden
 * @deprecated Verwende getPointValue() mit options für erweiterte Logik
 */
function getPointValueForState(federalState) {
  // Ruft neue Funktion mit Default-Optionen auf
  return getPointValue(federalState, {});
}

/**
 * Gibt alle Punktwerte zurück
 * @returns {Object} Objekt mit allen Bundesländern und ihren Punktwerten
 */
function getAllPointValues() {
  const config = loadConfig();
  const result = {};
  
  Object.keys(config.pointValues).forEach(state => {
    result[state] = {
      default: config.pointValues[state].default,
      code: config.pointValues[state].code,
      name: config.pointValues[state].name
    };
  });
  
  return result;
}

/**
 * Gibt Punktwert für spezifische Positionsnummer zurück
 * @param {String} federalState - Bundesland
 * @param {String} positionNumber - Positionsnummer (z.B. "83", "165")
 * @returns {Number|null} Punktwert oder null
 */
function getPositionSpecificPointValue(federalState, positionNumber) {
  return getPointValue(federalState, { positionNumber });
}

/**
 * Gibt Punktwert für Specialty zurück
 * @param {String} federalState - Bundesland
 * @param {String} specialty - Specialty (z.B. 'radiologie', 'labor')
 * @param {String} doctorSpecialty - Optional: Specialty des Arztes
 * @returns {Number|null} Punktwert oder null
 */
function getSpecialtyPointValue(federalState, specialty, doctorSpecialty = null) {
  return getPointValue(federalState, { 
    serviceSpecialty: specialty, 
    doctorSpecialty 
  });
}

/**
 * Gibt Labor-Punktwert zurück
 * @param {String} federalState - Bundesland
 * @param {Boolean} isInstitute - true wenn Labor-Institut, false wenn Ordination
 * @returns {Number|null} Punktwert oder null
 */
function getLaborPointValue(federalState, isInstitute = false) {
  const config = loadConfig();
  const stateKey = federalState.toLowerCase().trim();
  const stateConfig = config.pointValues[stateKey];
  
  if (!stateConfig || !stateConfig.labor) {
    return null;
  }
  
  const labType = isInstitute ? 'institute' : 'ordination';
  return stateConfig.labor[labType] || stateConfig.labor.ordination || null;
}

/**
 * Validiert ob ein Bundesland gültig ist
 * @param {String} federalState - Bundesland
 * @returns {Boolean} true wenn gültig
 */
function isValidFederalState(federalState) {
  if (!federalState) {
    return false;
  }

  const config = loadConfig();
  const stateKey = federalState.toLowerCase().trim();
  return stateKey in config.pointValues;
}

/**
 * Setzt den Config-Cache zurück (für Tests oder Reload)
 */
function clearCache() {
  configCache = null;
}

module.exports = {
  loadConfig,
  getPointValue, // NEU: Hauptfunktion mit Prioritätssystem
  getPointValueForState, // Legacy: Backward Compatibility
  getAllPointValues,
  getPositionSpecificPointValue,
  getSpecialtyPointValue,
  getLaborPointValue,
  isValidFederalState,
  clearCache,
  // Helper-Funktionen
  extractPositionNumber,
  isLaborService
};
