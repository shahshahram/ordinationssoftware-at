/**
 * Zeitzonen-Utility für das Frontend
 * Stellt sicher, dass alle Datum-Operationen in Europe/Vienna (UTC+1/UTC+2) durchgeführt werden
 */

export const DEFAULT_TIMEZONE = 'Europe/Vienna';

/**
 * Konvertiert ein Datum in die lokale Zeitzone (Europe/Vienna)
 */
export const toLocalDate = (date: Date | string | null | undefined): Date | null => {
  if (!date) return null;
  
  const d = date instanceof Date ? date : new Date(date);
  return d;
};

/**
 * Erstellt ein Datum für den Start des Tages in lokaler Zeitzone
 */
export const startOfDay = (date: Date | string | null | undefined): Date | null => {
  const d = toLocalDate(date || new Date());
  if (!d) return null;
  
  const localDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  localDate.setHours(0, 0, 0, 0);
  return localDate;
};

/**
 * Erstellt ein Datum für das Ende des Tages in lokaler Zeitzone
 */
export const endOfDay = (date: Date | string | null | undefined): Date | null => {
  const d = toLocalDate(date || new Date());
  if (!d) return null;
  
  const localDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  localDate.setHours(23, 59, 59, 999);
  return localDate;
};

/**
 * Formatiert ein Datum als YYYY-MM-DD String in lokaler Zeitzone
 */
export const formatDateString = (date: Date | string | null | undefined): string | null => {
  if (!date) return null;
  
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Parst ein Datum-String (YYYY-MM-DD) in lokaler Zeitzone
 */
export const parseDateString = (dateString: string | Date | null | undefined): Date | null => {
  if (!dateString) return null;
  
  // Wenn bereits ein Date-Objekt, zurückgeben
  if (dateString instanceof Date) return dateString;
  
  // Wenn kein String, versuche es zu konvertieren
  if (typeof dateString !== 'string') return null;
  
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
 */
export const now = (): Date => {
  return new Date();
};

/**
 * Formatiert ein Datum für die Anzeige in lokaler Zeitzone
 */
export const formatLocal = (date: Date | string | null | undefined, locale: string = 'de-DE'): string | null => {
  if (!date) return null;
  
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString(locale, { timeZone: DEFAULT_TIMEZONE });
};
