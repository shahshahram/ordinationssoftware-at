/**
 * SIT-Testdaten aus ELDA-Stammdaten- und Vertragspartner-CSV.
 * Nur die in diesen Dateien angeführten Testdaten sind in der SIT-Plattform eingerichtet.
 *
 * Umgebungsvariablen (optional):
 * - SIT_STAMMDATEN_CSV: Pfad zu Stammdaten_ASWH_MRSA_*.csv
 * - SIT_VERTRAGSPARTNER_ARZT_CSV: Pfad zu ASWH-VP-Arzt-*-Tabelle 1.csv
 */

const path = require('path');
const fs = require('fs');

const DEFAULT_STAMMDATEN_PATH = path.join(__dirname, 'sit-testdata', 'Stammdaten_ASWH_MRSA_20251219.csv');
const DEFAULT_VERTRAGSPARTNER_ARZT_PATH = path.join(__dirname, 'sit-testdata', 'ASWH-VP-Arzt-Linz-A-Tabelle 1.csv');

/** Fallback-Patient „Mark“ (aus Stammdaten-CSV) – wird verwendet, wenn keine CSV geladen. IBAN aus Testdaten für SIT. */
const FALLBACK_PATIENT = {
  lastName: 'ASWH-VS-MRSA-Familie-A',
  firstName: 'Mark',
  socialSecurityNumber: '1137041190',
  address: {
    postalCode: '4020',
    city: 'Linz',
    street: 'Duftschmidgasse',
    houseNumber: '18'
  },
  iban: 'DE61000031990310510131'
};

/** Fallback-Arzt „Vanessa“ (aus Vertragspartner-Arzt-CSV) – wird verwendet, wenn keine CSV geladen. */
const FALLBACK_DOCTOR = {
  lastName: 'ASWH-VP-Arzt-Linz-A',
  firstName: 'Vanessa',
  chamberNumber: '100014',
  landesstelle: '14',
  profile: { chamberNumber: '100014' },
  address: {
    postalCode: '4020',
    city: 'Linz',
    street: 'Gruberstraße',
    houseNumber: '77'
  },
  fachgebietCode: '01'
};

let stammdatenCache = null;
let vertragspartnerArztCache = null;

/**
 * Parst eine CSV-Zeile mit Semikolon; berücksichtigt Anführungszeichen.
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && c === ';') {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Lädt Stammdaten-CSV (Patienten). Erste Zeile = Titel, zweite = Header.
 * @returns {Array<object>} Liste der Patienten (Personenname, Vorname, Versicherungsnummer, PLZ, Ort, Straße, Hausnummer, IBAN, …)
 */
function loadStammdaten(csvPath) {
  const resolved = csvPath || process.env.SIT_STAMMDATEN_CSV || DEFAULT_STAMMDATEN_PATH;
  if (!fs.existsSync(resolved)) {
    return [];
  }
  const raw = fs.readFileSync(resolved, 'utf8').replace(/\uFEFF/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) return [];
  const headerLine = lines[1];
  const headers = parseCsvLine(headerLine);
  const rows = [];
  for (let i = 2; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx] : '';
    });
    if (row.Versicherungsnummer) rows.push(row);
  }
  return rows;
}

/**
 * Lädt Vertragspartner-Arzt-CSV. Erste Zeile = Titel, zweite = Header.
 * Gibt die erste Zeile mit ausgefüllter Vertragspartnernr. und Adresse zurück.
 */
function loadVertragspartnerArzt(csvPath) {
  const resolved = csvPath || process.env.SIT_VERTRAGSPARTNER_ARZT_CSV || DEFAULT_VERTRAGSPARTNER_ARZT_PATH;
  if (!fs.existsSync(resolved)) {
    return null;
  }
  const raw = fs.readFileSync(resolved, 'utf8').replace(/\uFEFF/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) return null;
  const headerLine = lines[1];
  const headers = parseCsvLine(headerLine);
  for (let i = 2; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx] : '';
    });
    if (row.Vertragspartnernr && row.PLZ && row.Ort && row.Straße) {
      return row;
    }
  }
  return null;
}

function getStammdaten() {
  if (stammdatenCache === null) {
    stammdatenCache = loadStammdaten();
  }
  return stammdatenCache;
}

function getVertragspartnerArzt() {
  if (vertragspartnerArztCache === null) {
    vertragspartnerArztCache = loadVertragspartnerArzt();
  }
  return vertragspartnerArztCache;
}

/**
 * Fachgebiet aus CSV (z.B. "001 - Allgemein-...") in zweistelligen Code (z.B. "01") für XML.
 */
function fachgebietToCode(fachgebiet) {
  if (!fachgebiet || typeof fachgebiet !== 'string') return '01';
  const match = fachgebiet.trim().match(/^(\d+)/);
  if (!match) return '01';
  const num = match[1];
  return num.length >= 2 ? num.slice(-2) : num.padStart(2, '0');
}

/**
 * Patient aus Stammdaten für SIT (Format wie für wahonlineFormatGenerator).
 * @param {string} vsnr - Optional; wenn nicht angegeben, wird der erste Patient (Mark) genommen.
 */
function getSitPatient(vsnr = null) {
  const rows = getStammdaten();
  const row = vsnr
    ? rows.find((r) => String(r.Versicherungsnummer || '').trim() === String(vsnr).trim())
    : rows[0];
  if (!row) {
    return { ...FALLBACK_PATIENT, socialSecurityNumber: vsnr || FALLBACK_PATIENT.socialSecurityNumber };
  }
  const strasse = (row.Straße || '').trim();
  const hausnummer = (row.Hausnummer || '').trim();
  return {
    lastName: (row.Personenname || '').trim(),
    firstName: (row.Vorname || '').trim(),
    last_name: (row.Personenname || '').trim(),
    first_name: (row.Vorname || '').trim(),
    socialSecurityNumber: (row.Versicherungsnummer || '').trim(),
    address: {
      postalCode: (row.PLZ || '').trim(),
      city: (row.Ort || '').trim(),
      street: strasse,
      houseNumber: hausnummer,
      postal_code: (row.PLZ || '').trim(),
      ort: (row.Ort || '').trim()
    },
    iban: (row.IBAN || '').trim() || null
  };
}

/**
 * Vertragspartner-Arzt aus CSV für SIT (Format wie für wahonlineFormatGenerator).
 */
function getSitDoctor() {
  const row = getVertragspartnerArzt();
  if (!row) {
    return { ...FALLBACK_DOCTOR };
  }
  const strasse = (row.Straße || '').trim();
  const hausnummer = (row.Hausnummer || '').trim();
  return {
    lastName: (row.Personenname || '').trim(),
    firstName: (row.Vorname || '').trim(),
    last_name: (row.Personenname || '').trim(),
    first_name: (row.Vorname || '').trim(),
    chamberNumber: (row.Vertragspartnernr || '').trim(),
    landesstelle: (row.Landesstelle || '').trim() || '14',
    profile: {
      chamberNumber: (row.Vertragspartnernr || '').trim()
    },
    address: {
      postalCode: (row.PLZ || '').trim(),
      city: (row.Ort || '').trim(),
      street: strasse,
      houseNumber: hausnummer,
      postal_code: (row.PLZ || '').trim(),
      ort: (row.Ort || '').trim()
    },
    fachgebietCode: fachgebietToCode(row.Fachgebiet)
  };
}

/**
 * Cache leeren (z.B. nach Änderung der CSV-Pfade oder zum Neuladen).
 */
function clearCache() {
  stammdatenCache = null;
  vertragspartnerArztCache = null;
}

module.exports = {
  loadStammdaten,
  loadVertragspartnerArzt,
  getStammdaten,
  getVertragspartnerArzt,
  getSitPatient,
  getSitDoctor,
  clearCache,
  FALLBACK_PATIENT,
  FALLBACK_DOCTOR
};
