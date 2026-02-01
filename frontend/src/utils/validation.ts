/**
 * Validierungsfunktionen für Formulare
 */

/**
 * Validiert eine Telefonnummer im internationalen Format
 * @param phone - Telefonnummer zum Validieren
 * @returns true wenn gültig, false wenn ungültig
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone || phone.trim().length === 0) {
    return false;
  }
  
  // Entferne Leerzeichen, Bindestriche, etc.
  const cleaned = phone.replace(/[\s\-()]/g, '');
  
  // Prüfe auf internationales Format: + gefolgt von 1-15 Ziffern
  // Oder österreichisches Format: 0 gefolgt von 4-14 Ziffern (wird dann normalisiert)
  const internationalFormat = /^\+[1-9]\d{1,14}$/.test(cleaned);
  const austrianFormat = /^0\d{4,14}$/.test(cleaned);
  
  return internationalFormat || austrianFormat;
};

/**
 * Gibt eine benutzerfreundliche Fehlermeldung für Telefonnummern zurück
 */
export const getPhoneErrorMessage = (): string => {
  return 'Internationales Format erforderlich (z.B. +436641234567)';
};

/**
 * Normalisiert eine Telefonnummer zu internationalem Format
 * @param phone - Telefonnummer zum Normalisieren
 * @returns Normalisierte Telefonnummer im Format +43...
 */
export const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Entferne Leerzeichen, Bindestriche, etc.
  let cleaned = phone.replace(/[\s\-()]/g, '');
  
  // Wenn österreichische Nummer (beginnt mit 0), ersetze 0 durch +43
  if (cleaned.startsWith('0')) {
    cleaned = '+43' + cleaned.substring(1);
  }
  // Wenn keine + vorhanden, füge + hinzu (für österreichische Nummern)
  else if (!cleaned.startsWith('+')) {
    // Annahme: österreichische Nummer, füge +43 hinzu
    cleaned = '+43' + cleaned;
  }
  
  return cleaned;
};

/**
 * Validiert eine E-Mail-Adresse
 * @param email - E-Mail-Adresse zum Validieren
 * @returns true wenn gültig, false wenn ungültig
 */
export const validateEmail = (email: string): boolean => {
  if (!email || email.trim().length === 0) {
    return false;
  }
  
  // RFC 5322 kompatible E-Mail-Validierung
  // Erlaubt die meisten gültigen E-Mail-Formate
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Zusätzliche Prüfung: Mindestens ein Zeichen vor @, mindestens ein Zeichen nach @, mindestens ein Punkt nach @
  // und mindestens ein Zeichen nach dem letzten Punkt
  if (!emailRegex.test(email)) {
    return false;
  }
  
  // Prüfe, dass es nicht mit Punkt beginnt oder endet
  if (email.startsWith('.') || email.endsWith('.')) {
    return false;
  }
  
  // Prüfe, dass es nicht mehrere aufeinanderfolgende Punkte gibt
  if (email.includes('..')) {
    return false;
  }
  
  // Prüfe, dass der lokale Teil (vor @) nicht leer ist
  const localPart = email.split('@')[0];
  if (!localPart || localPart.length === 0) {
    return false;
  }
  
  // Prüfe, dass der Domain-Teil (nach @) mindestens einen Punkt enthält
  const domainPart = email.split('@')[1];
  if (!domainPart || !domainPart.includes('.')) {
    return false;
  }
  
  return true;
};

/**
 * Gibt eine benutzerfreundliche Fehlermeldung für E-Mail-Adressen zurück
 */
export const getEmailErrorMessage = (): string => {
  return 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
};

