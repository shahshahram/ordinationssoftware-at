/**
 * Gesetzliche Feiertage in Österreich (Bundesweit).
 * Verwendet für Stundenabrechnung: An Feiertagen gilt Soll-Stunden = 0 (wie am Wochenende).
 * Quelle: Österreichische Feiertagsregelung (Bundesgesetz).
 */

/**
 * Berechnet Ostersonntag für ein Jahr (Gregorianischer Kalender).
 * @param {number} year
 * @returns {{ month: number, day: number }} 1-based month (1–12), day (1–31)
 */
function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  const month = Math.floor(n / 31);
  const day = (n % 31) + 1;
  return { month, day };
}

/**
 * Fügt Tage zu einem Datum hinzu (ohne Zeitzonenwechsel).
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Gibt für ein Jahr alle österreichischen Feiertage als Map zurück.
 * Key: 'YYYY-MM-DD', Value: deutscher Name des Feiertags.
 * @param {number} year
 * @returns {Map<string, string>}
 */
function getAustrianHolidaysForYear(year) {
  const map = new Map();

  // Fixe Feiertage (Datum in diesem Jahr)
  const fixed = [
    [1, 1, 'Neujahr'],
    [1, 6, 'Heilige Drei Könige'],
    [5, 1, 'Staatsfeiertag'],
    [8, 15, 'Mariä Himmelfahrt'],
    [10, 26, 'Nationalfeiertag'],
    [11, 1, 'Allerheiligen'],
    [12, 8, 'Mariä Empfängnis'],
    [12, 25, 'Christtag'],
    [12, 26, 'Stefanitag'],
  ];
  for (const [m, d, name] of fixed) {
    const key = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    map.set(key, name);
  }

  // Bewegliche Feiertage (abhängig von Ostern)
  const easter = getEasterSunday(year);
  const easterDate = new Date(year, easter.month - 1, easter.day);

  const ostermontag = addDays(easterDate, 1);
  const christiHimmelfahrt = addDays(easterDate, 39);
  const pfingstmontag = addDays(easterDate, 50);
  const fronleichnam = addDays(easterDate, 60);

  const formatKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  map.set(formatKey(ostermontag), 'Ostermontag');
  map.set(formatKey(christiHimmelfahrt), 'Christi Himmelfahrt');
  map.set(formatKey(pfingstmontag), 'Pfingstmontag');
  map.set(formatKey(fronleichnam), 'Fronleichnam');

  return map;
}

// Cache pro Jahr (Report ruft oft für denselben Monat auf)
const cacheByYear = new Map();

/**
 * Prüft, ob ein Datum ein gesetzlicher Feiertag in Österreich ist.
 * @param {Date} date - beliebiges Datum (nur Jahr/Monat/Tag relevant)
 * @returns {{ name: string } | null} Feiertagsname oder null
 */
function getAustrianHoliday(date) {
  const year = date.getFullYear();
  if (!cacheByYear.has(year)) {
    cacheByYear.set(year, getAustrianHolidaysForYear(year));
  }
  const key = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const name = cacheByYear.get(year).get(key);
  return name ? { name } : null;
}

module.exports = {
  getEasterSunday,
  getAustrianHolidaysForYear,
  getAustrianHoliday,
};
