/**
 * Hilfsfunktionen für Dokument-Klassifizierung und Versionierung
 */

/**
 * Bestimmt ob ein Dokumenttyp medizinisch ist
 */
const MEDICAL_DOCUMENT_TYPES = [
  'arztbrief', 'befund', 'ueberweisung', 'zuweisung', 
  'rueckueberweisung', 'operationsbericht', 'rezept',
  'heilmittelverordnung', 'krankenstandsbestaetigung',
  'bildgebende_zuweisung', 'impfbestaetigung',
  'patientenaufklaerung', 'therapieplan',
  'konsiliarbericht', 'pflegebrief', 'gutachten',
  'kostenuebernahmeantrag', 'attest', 'verlaufsdokumentation'
];

const NON_MEDICAL_DOCUMENT_TYPES = [
  'rechnung', 'formular', 'sonstiges'
];

const CONTINUOUS_DOCUMENT_TYPES = [
  'anamnese', 'medical_status'
];

/**
 * Prüft ob ein Dokumenttyp medizinisch ist
 */
function isMedicalDocumentType(documentType) {
  return MEDICAL_DOCUMENT_TYPES.includes(documentType) || 
         CONTINUOUS_DOCUMENT_TYPES.includes(documentType);
}

/**
 * Bestimmt die Dokument-Klasse basierend auf Typ
 */
function determineDocumentClass(documentType) {
  if (CONTINUOUS_DOCUMENT_TYPES.includes(documentType)) {
    return 'continuous_medical';
  } else if (MEDICAL_DOCUMENT_TYPES.includes(documentType)) {
    return 'static_medical';
  } else {
    return 'static_non_medical';
  }
}

/**
 * Prüft ob ein Dokumenttyp fortlaufend ist
 */
function isContinuousDocumentType(documentType) {
  return CONTINUOUS_DOCUMENT_TYPES.includes(documentType);
}

/**
 * Parst eine Versionsnummer (z.B. "1.0.0") in Komponenten
 */
function parseVersionNumber(versionNumber) {
  const parts = versionNumber.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

/**
 * Erhöht die Minor-Version (z.B. "1.0.0" -> "1.1.0")
 */
function incrementMinorVersion(versionNumber) {
  const { major, minor, patch } = parseVersionNumber(versionNumber);
  return `${major}.${minor + 1}.0`;
}

/**
 * Erhöht die Patch-Version (z.B. "1.0.0" -> "1.0.1")
 */
function incrementPatchVersion(versionNumber) {
  const { major, minor, patch } = parseVersionNumber(versionNumber);
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Erhöht die Major-Version (z.B. "1.0.0" -> "2.0.0")
 */
function incrementMajorVersion(versionNumber) {
  const { major } = parseVersionNumber(versionNumber);
  return `${major + 1}.0.0`;
}

/**
 * Berechnet SHA-256 Hash für ein Dokument (für Integrität)
 */
const crypto = require('crypto');

function calculateDocumentHash(document) {
  const documentString = JSON.stringify({
    content: document.content,
    medicalData: document.medicalData,
    referralData: document.referralData,
    findingData: document.findingData,
    patient: document.patient,
    doctor: document.doctor
  });
  return crypto.createHash('sha256').update(documentString).digest('hex');
}

/**
 * Berechnet Änderungen zwischen zwei Dokument-Versionen
 */
function calculateChanges(oldDocument, newDocument) {
  const changes = {
    added: [],
    modified: [],
    removed: []
  };

  // Einfache Feld-Vergleiche (kann später erweitert werden)
  const fieldsToCompare = ['content', 'medicalData', 'referralData', 'findingData'];
  
  fieldsToCompare.forEach(field => {
    const oldValue = oldDocument[field];
    const newValue = newDocument[field];
    
    if (!oldValue && newValue) {
      changes.added.push({ field, value: newValue });
    } else if (oldValue && !newValue) {
      changes.removed.push({ field, oldValue });
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.modified.push({ field, oldValue, newValue });
    }
  });

  return changes;
}

module.exports = {
  isMedicalDocumentType,
  determineDocumentClass,
  isContinuousDocumentType,
  parseVersionNumber,
  incrementMinorVersion,
  incrementPatchVersion,
  incrementMajorVersion,
  calculateDocumentHash,
  calculateChanges,
  MEDICAL_DOCUMENT_TYPES,
  NON_MEDICAL_DOCUMENT_TYPES,
  CONTINUOUS_DOCUMENT_TYPES
};


