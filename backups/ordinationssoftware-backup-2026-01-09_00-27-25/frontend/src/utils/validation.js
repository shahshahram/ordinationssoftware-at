"use strict";
/**
 * Validierungsfunktionen für Formulare
 */
exports.__esModule = true;
exports.getEmailErrorMessage = exports.validateEmail = exports.normalizePhoneNumber = exports.getPhoneErrorMessage = exports.validatePhone = void 0;
/**
 * Validiert eine Telefonnummer im internationalen Format
 * @param phone - Telefonnummer zum Validieren
 * @returns true wenn gültig, false wenn ungültig
 */
var validatePhone = function (phone) {
    if (!phone || phone.trim().length === 0) {
        return false;
    }
    // Entferne Leerzeichen, Bindestriche, etc.
    var cleaned = phone.replace(/[\s\-\(\)]/g, '');
    // Prüfe auf internationales Format: + gefolgt von 1-15 Ziffern
    // Oder österreichisches Format: 0 gefolgt von 4-14 Ziffern (wird dann normalisiert)
    var internationalFormat = /^\+[1-9]\d{1,14}$/.test(cleaned);
    var austrianFormat = /^0\d{4,14}$/.test(cleaned);
    return internationalFormat || austrianFormat;
};
exports.validatePhone = validatePhone;
/**
 * Gibt eine benutzerfreundliche Fehlermeldung für Telefonnummern zurück
 */
var getPhoneErrorMessage = function () {
    return 'Internationales Format erforderlich (z.B. +436641234567)';
};
exports.getPhoneErrorMessage = getPhoneErrorMessage;
/**
 * Normalisiert eine Telefonnummer zu internationalem Format
 * @param phone - Telefonnummer zum Normalisieren
 * @returns Normalisierte Telefonnummer im Format +43...
 */
var normalizePhoneNumber = function (phone) {
    if (!phone)
        return '';
    // Entferne Leerzeichen, Bindestriche, etc.
    var cleaned = phone.replace(/[\s\-\(\)]/g, '');
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
exports.normalizePhoneNumber = normalizePhoneNumber;
/**
 * Validiert eine E-Mail-Adresse
 * @param email - E-Mail-Adresse zum Validieren
 * @returns true wenn gültig, false wenn ungültig
 */
var validateEmail = function (email) {
    if (!email || email.trim().length === 0) {
        return false;
    }
    // RFC 5322 kompatible E-Mail-Validierung
    // Erlaubt die meisten gültigen E-Mail-Formate
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
    var localPart = email.split('@')[0];
    if (!localPart || localPart.length === 0) {
        return false;
    }
    // Prüfe, dass der Domain-Teil (nach @) mindestens einen Punkt enthält
    var domainPart = email.split('@')[1];
    if (!domainPart || !domainPart.includes('.')) {
        return false;
    }
    return true;
};
exports.validateEmail = validateEmail;
/**
 * Gibt eine benutzerfreundliche Fehlermeldung für E-Mail-Adressen zurück
 */
var getEmailErrorMessage = function () {
    return 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
};
exports.getEmailErrorMessage = getEmailErrorMessage;
