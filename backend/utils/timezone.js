/**
 * Zeitzonen-Utility für die Ordinationssoftware
 * Stellt sicher, dass alle Datum-Operationen in Europe/Vienna (UTC+1/UTC+2) durchgeführt werden
 */

// Setze Prozess-Zeitzone auf Europe/Vienna
process.env.TZ = 'Europe/Vienna';

const DEFAULT_TIMEZONE = 'Europe/Vienna';

/**
 * Konvertiert ein Datum in die lokale Zeitzone (Europe/Vienna)
 * @param {Date|string} date - Datum das konvertiert werden soll
 * @returns {Date} Datum in lokaler Zeitzone
 */
const toLocalDate = (date) => {
  if (!date) return null;
  
  const d = date instanceof Date ? date : new Date(date);
  
  // Wenn das Datum als String kommt (YYYY-MM-DD), parse es in lokaler Zeit
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  return d;
};

/**
 * Erstellt ein Datum für den Start des Tages in lokaler Zeitzone
 * @param {Date|string} date - Datum
 * @returns {Date} Start des Tages (00:00:00.000)
 */
const startOfDay = (date) => {
  const d = toLocalDate(date || new Date());
  if (!d) return null;
  
  const localDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  localDate.setHours(0, 0, 0, 0);
  return localDate;
};

/**
 * Erstellt ein Datum für das Ende des Tages in lokaler Zeitzone
 * @param {Date|string} date - Datum
 * @returns {Date} Ende des Tages (23:59:59.999)
 */
const endOfDay = (date) => {
  const d = toLocalDate(date || new Date());
  if (!d) return null;
  
  const localDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  localDate.setHours(23, 59, 59, 999);
  return localDate;
};

/**
 * Formatiert ein Datum als YYYY-MM-DD String in lokaler Zeitzone
 * @param {Date} date - Datum
 * @returns {string} Formatierter String (YYYY-MM-DD)
 */
const formatDateString = (date) => {
  if (!date) return null;
  
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Parst ein Datum-String (YYYY-MM-DD) in lokaler Zeitzone
 * @param {string} dateString - Datum-String (YYYY-MM-DD)
 * @returns {Date} Datum in lokaler Zeitzone
 */
const parseDateString = (dateString) => {
  if (!dateString) return null;
  
  // Wenn bereits ein Date-Objekt, zurückgeben
  if (dateString instanceof Date) return dateString;
  
  // Wenn ISO-String mit Zeit, konvertiere zu lokal
  if (dateString.includes('T')) {
    const d = new Date(dateString);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
  }
  
  // Parse YYYY-MM-DD in lokaler Zeit
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  
  return new Date(dateString);
};

/**
 * Gibt die aktuelle Zeit in lokaler Zeitzone zurück
 * @returns {Date} Aktuelles Datum/Zeit in lokaler Zeitzone
 */
const now = () => {
  return new Date();
};

/**
 * Formatiert ein Datum für die Anzeige in lokaler Zeitzone
 * @param {Date} date - Datum
 * @param {string} locale - Locale (default: 'de-DE')
 * @returns {string} Formatierter String
 */
const formatLocal = (date, locale = 'de-DE') => {
  if (!date) return null;
  
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString(locale, { timeZone: DEFAULT_TIMEZONE });
};

module.exports = {
  DEFAULT_TIMEZONE,
  toLocalDate,
  startOfDay,
  endOfDay,
  formatDateString,
  parseDateString,
  now,
  formatLocal
};
