/**
 * Field-Level Encryption Utility
 * Verschlüsselung für sensible Datenfelder (SVNR, Diagnosen, etc.)
 */

const crypto = require('crypto');

// Verschlüsselungsalgorithmus
const ALGORITHM = 'aes-256-gcm'; // GCM für Authentifizierung

/**
 * Generiert oder lädt Verschlüsselungsschlüssel
 */
function getEncryptionKey() {
  let key = process.env.FIELD_ENCRYPTION_KEY;
  
  if (!key) {
    console.warn('⚠️ FIELD_ENCRYPTION_KEY nicht gesetzt - verwende temporären Schlüssel (nicht für Produktion!)');
    // Generiere einen 32-Byte Schlüssel (256-Bit für AES-256)
    key = crypto.randomBytes(32).toString('hex');
    process.env.FIELD_ENCRYPTION_KEY = key;
  }
  
  // Konvertiere Hex-String zu Buffer (32 Bytes)
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  } else if (key.length > 64) {
    return Buffer.from(key.slice(0, 64), 'hex');
  } else {
    // Zu kurz: hashe den Schlüssel zu 32 Bytes
    return crypto.createHash('sha256').update(key).digest();
  }
}

/**
 * Verschlüsselt ein Datenfeld
 * @param {string} plaintext - Klartext
 * @returns {string} - Verschlüsselter Text (Base64-kodiert)
 */
function encryptField(plaintext) {
  if (!plaintext || plaintext === '') {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16); // 16 Bytes für GCM
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Auth-Tag für GCM
    const authTag = cipher.getAuthTag();
    
    // Kombiniere IV + AuthTag + Verschlüsselte Daten
    const combined = Buffer.concat([
      iv,           // 16 Bytes
      authTag,      // 16 Bytes
      encrypted     // Variable Länge
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('Fehler beim Verschlüsseln:', error);
    throw new Error('Verschlüsselung fehlgeschlagen');
  }
}

/**
 * Entschlüsselt ein Datenfeld
 * @param {string} encryptedText - Verschlüsselter Text (Base64-kodiert)
 * @returns {string} - Klartext
 */
function decryptField(encryptedText) {
  if (!encryptedText || encryptedText === '') {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedText, 'base64');
    
    // Extrahiere IV, AuthTag und verschlüsselte Daten
    const iv = combined.slice(0, 16);
    const authTag = combined.slice(16, 32);
    const encrypted = combined.slice(32);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Fehler beim Entschlüsseln:', error);
    // Bei Fehler: Versuche zu prüfen ob es bereits Klartext ist (für Migration)
    if (error.message.includes('bad decrypt')) {
      console.warn('⚠️ Entschlüsselung fehlgeschlagen - möglicherweise bereits Klartext');
      return encryptedText; // Fallback: Gib Original zurück
    }
    throw new Error('Entschlüsselung fehlgeschlagen');
  }
}

/**
 * Prüft ob ein Feld verschlüsselt ist
 * @param {string} value - Zu prüfender Wert
 * @returns {boolean} - true wenn verschlüsselt
 */
function isEncrypted(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }
  
  try {
    // Verschlüsselte Werte sind Base64-kodiert und haben mindestens 32 Bytes (IV + AuthTag)
    const buffer = Buffer.from(value, 'base64');
    return buffer.length >= 32;
  } catch (error) {
    return false;
  }
}

/**
 * Verschlüsselt mehrere Felder eines Objekts
 * @param {Object} data - Datenobjekt
 * @param {Array<string>} fieldsToEncrypt - Liste der zu verschlüsselnden Felder
 * @returns {Object} - Objekt mit verschlüsselten Feldern
 */
function encryptFields(data, fieldsToEncrypt) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const encrypted = { ...data };
  
  for (const field of fieldsToEncrypt) {
    if (encrypted[field] && !isEncrypted(encrypted[field])) {
      encrypted[field] = encryptField(encrypted[field]);
    }
  }
  
  return encrypted;
}

/**
 * Entschlüsselt mehrere Felder eines Objekts
 * @param {Object} data - Datenobjekt
 * @param {Array<string>} fieldsToDecrypt - Liste der zu entschlüsselnden Felder
 * @returns {Object} - Objekt mit entschlüsselten Feldern
 */
function decryptFields(data, fieldsToDecrypt) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const decrypted = { ...data };
  
  for (const field of fieldsToDecrypt) {
    if (decrypted[field] && isEncrypted(decrypted[field])) {
      try {
        decrypted[field] = decryptField(decrypted[field]);
      } catch (error) {
        console.error(`Fehler beim Entschlüsseln von Feld ${field}:`, error);
        // Bei Fehler: Behalte verschlüsselte Version
      }
    }
  }
  
  return decrypted;
}

module.exports = {
  encryptField,
  decryptField,
  isEncrypted,
  encryptFields,
  decryptFields,
  ALGORITHM
};








