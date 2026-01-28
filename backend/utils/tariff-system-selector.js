/**
 * Utility-Funktion zur Auswahl des Tariff-Systems basierend auf Location-Country
 * 
 * Österreich: KHO (Kassenärztliche Honorarordnung)
 * Deutschland: EBM (Einheitlicher Bewertungsmaßstab)
 */

/**
 * Bestimmt das Tariff-System basierend auf der Location
 * @param {Object} location - Location-Objekt mit country-Feld
 * @returns {String} 'kho' für Österreich, 'ebm' für Deutschland
 */
function getTariffSystem(location) {
  if (!location) {
    // Fallback: Österreich (KHO)
    return 'kho';
  }
  
  // Prüfe country-Feld
  if (location.country === 'germany') {
    return 'ebm';
  }
  
  // Default: Österreich (KHO)
  return 'kho';
}

/**
 * Prüft ob Location Österreich ist
 * @param {Object} location - Location-Objekt
 * @returns {Boolean} true wenn Österreich
 */
function isAustria(location) {
  return getTariffSystem(location) === 'kho';
}

/**
 * Prüft ob Location Deutschland ist
 * @param {Object} location - Location-Objekt
 * @returns {Boolean} true wenn Deutschland
 */
function isGermany(location) {
  return getTariffSystem(location) === 'ebm';
}

module.exports = {
  getTariffSystem,
  isAustria,
  isGermany
};
