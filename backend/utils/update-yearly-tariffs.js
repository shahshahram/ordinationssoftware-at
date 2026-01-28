/**
 * Utility: Jährliche Tarif-Anpassung (Punktwerte mit Faktor multiplizieren)
 *
 * Liest federal_state_config.json, multipliziert alle Punktwerte (Default, Labor,
 * Specialty, positionSpecific) mit factor und speichert das Ergebnis unter einem
 * neuen Jahres-Key (z.B. 2026, 2027). Mit sourceYear: Basis aus config[sourceYear].pointValues
 * statt Root-pointValues → fortlaufende Indexierung (Kettenindex) über viele Jahre.
 *
 * @param {number} factor - Faktor (z.B. 1.04 für 4 % Erhöhung)
 * @param {number|string} [targetYear] - Zieljahr (z.B. 2027). Ohne Angabe: sourceYear-Jahr + 1 bzw. validFrom + 1
 * @param {number|string} [sourceYear] - Optional. Jahres-Key als Basis (z.B. "2026"). Wenn gesetzt: config[sourceYear].pointValues; sonst: Root-pointValues
 * @param {Object} [options] - Optionen (z.B. configPath). sourceYear kann auch hier über options.sourceYear gesetzt werden
 * @param {string} [options.configPath] - Pfad zur Config-Datei
 * @param {string} [options.sourceYear] - Alternative zu Parameter sourceYear
 * @returns {Object} { targetYear, validFrom, pointValues, written }
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG_PATH = path.join(__dirname, '../config/federal_state_config.json');
const DECIMALS = 4;

/**
 * Multipliziert alle numerischen Werte in einem Objekt rekursiv mit factor.
 * Belässt code, name und andere Nicht-Zahlen unverändert.
 */
function multiplyPointValues(obj, factor) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === 'number') {
    return Math.round(obj * factor * Math.pow(10, DECIMALS)) / Math.pow(10, DECIMALS);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => multiplyPointValues(item, factor));
  }
  if (typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      result[key] = multiplyPointValues(obj[key], factor);
    }
    return result;
  }
  return obj;
}

/**
 * Gibt die pointValues für ein Jahr aus der Config zurück.
 * sourceYear: optionaler Key (z.B. "2025"). Ohne: root.pointValues.
 */
function getSourcePointValues(config, sourceYear) {
  if (sourceYear != null && String(sourceYear) !== '') {
    const key = String(sourceYear);
    const yearBlock = config[key];
    if (!yearBlock) {
      throw new Error(`Jahres-Key "${key}" nicht in der Config gefunden (Kettenindex: config[${key}] fehlt).`);
    }
    if (yearBlock.pointValues) {
      return yearBlock.pointValues;
    }
  }
  return config.pointValues || {};
}

/**
 * Liest das aktuelle Jahr aus validFrom (z.B. "2025-01-01" -> 2025).
 */
function getCurrentYear(config, sourceYear) {
  if (sourceYear != null && String(sourceYear) !== '') {
    const yearBlock = config[String(sourceYear)];
    if (yearBlock && yearBlock.validFrom) {
      const match = yearBlock.validFrom.match(/^(\d{4})/);
      return match ? parseInt(match[1], 10) : null;
    }
  }
  if (config.validFrom) {
    const match = config.validFrom.match(/^(\d{4})/);
    return match ? parseInt(match[1], 10) : null;
  }
  return null;
}

/**
 * Hauptfunktion: Punktwerte mit factor multiplizieren und unter Jahres-Key speichern.
 * sourceYear optional: wenn gesetzt, Basis = config[sourceYear].pointValues (Kettenindex).
 */
function updateYearlyTariffs(factor, targetYear = null, sourceYearParam = undefined, options = {}) {
  const opts = typeof sourceYearParam === 'object' && sourceYearParam !== null && !Array.isArray(sourceYearParam)
    ? { ...sourceYearParam, ...(options || {}) }
    : (options || {});
  const configPath = opts.configPath || DEFAULT_CONFIG_PATH;
  const sourceYear = sourceYearParam != null && typeof sourceYearParam !== 'object'
    ? String(sourceYearParam)
    : (opts.sourceYear !== undefined ? opts.sourceYear : null);

  if (typeof factor !== 'number' || factor <= 0) {
    throw new Error('factor muss eine positive Zahl sein (z.B. 1.04 für 4 % Erhöhung).');
  }

  let config;
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Config konnte nicht gelesen werden: ${err.message}`);
  }

  const sourcePointValues = getSourcePointValues(config, sourceYear);
  if (!sourcePointValues || Object.keys(sourcePointValues).length === 0) {
    throw new Error('Keine pointValues in der Config gefunden.');
  }

  const multiplied = multiplyPointValues(sourcePointValues, factor);

  let resolvedTargetYear = targetYear;
  if (resolvedTargetYear == null || String(resolvedTargetYear).trim() === '') {
    const current = getCurrentYear(config, sourceYear);
    if (current == null) {
      throw new Error('Zieljahr konnte nicht ermittelt werden (validFrom fehlt). Bitte targetYear angeben.');
    }
    resolvedTargetYear = current + 1;
  } else {
    resolvedTargetYear = parseInt(String(resolvedTargetYear), 10);
    if (Number.isNaN(resolvedTargetYear)) {
      throw new Error('targetYear muss eine Zahl sein (z.B. 2026).');
    }
  }

  const yearKey = String(resolvedTargetYear);
  const validFrom = `${yearKey}-01-01`;

  config[yearKey] = {
    validFrom,
    pointValues: multiplied,
  };

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    throw new Error(`Config konnte nicht geschrieben werden: ${err.message}`);
  }

  return {
    targetYear: resolvedTargetYear,
    validFrom,
    pointValues: multiplied,
    written: true,
  };
}

module.exports = {
  updateYearlyTariffs,
  multiplyPointValues,
  getSourcePointValues,
  getCurrentYear,
};
