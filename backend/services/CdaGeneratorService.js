const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// ELGA OID-Mapping für Code-Systeme
const ELGA_CODE_SYSTEM_OIDS = {
  'ELGA_Dokumentenklassen': '1.2.40.0.34.10.39',
  'ELGA_Formatcode': '1.2.40.0.34.10.61',
  'ELGA_FormatCode': '1.2.40.0.34.10.61',
  'ICD-10': '2.16.840.1.113883.6.90', // ICD-10 (WHO)
  'ICD-10-GM': '2.16.840.1.113883.6.90', // ICD-10 German Modification (Fallback)
  'LOINC': '2.16.840.1.113883.6.1'
};

/**
 * Holt die OID für ein Code-System
 * @param {String} codingScheme - Name des Code-Systems (z.B. 'ELGA_Dokumentenklassen')
 * @returns {String} - OID oder Fallback
 */
function getCodeSystemOID(codingScheme) {
  if (!codingScheme) {
    return '';
  }
  
  // Direktes Mapping
  if (ELGA_CODE_SYSTEM_OIDS[codingScheme]) {
    return ELGA_CODE_SYSTEM_OIDS[codingScheme];
  }
  
  // Prüfe ob es bereits eine OID ist (beginnt mit Zahlen)
  if (/^\d+\./.test(codingScheme)) {
    return codingScheme;
  }
  
  // Fallback: Versuche aus Datenbank zu laden (async, daher hier nicht möglich)
  // Für jetzt: Fallback auf bekannte OIDs
  logger.warn(`Unbekanntes Code-System: ${codingScheme}, verwende Fallback`);
  return codingScheme; // Sollte später durch Datenbankabfrage ersetzt werden
}

/**
 * Konvertiert ein JavaScript Date-Objekt in HL7 TS (Timestamp) Format
 * HL7 TS Format: YYYYMMDDHHMMSS[.FFFF][+/-HHMM]
 * @param {Date} date - JavaScript Date-Objekt
 * @param {Boolean} includeTime - Ob Uhrzeit enthalten sein soll (default: true)
 * @param {Boolean} includeMilliseconds - Ob Millisekunden enthalten sein sollen (default: false)
 * @param {Boolean} useUTC - Ob UTC-Zeit verwendet werden soll (default: false, verwendet lokale Zeit)
 * @returns {String} - HL7 TS formatierter Timestamp
 */
function formatHL7Timestamp(date, includeTime = true, includeMilliseconds = false, useUTC = false) {
  if (!date || !(date instanceof Date)) {
    date = new Date();
  }

  // Verwende UTC-Methoden wenn useUTC=true, sonst lokale Zeit
  const getYear = useUTC ? date.getUTCFullYear.bind(date) : date.getFullYear.bind(date);
  const getMonth = useUTC ? date.getUTCMonth.bind(date) : date.getMonth.bind(date);
  const getDate = useUTC ? date.getUTCDate.bind(date) : date.getDate.bind(date);
  const getHours = useUTC ? date.getUTCHours.bind(date) : date.getHours.bind(date);
  const getMinutes = useUTC ? date.getUTCMinutes.bind(date) : date.getMinutes.bind(date);
  const getSeconds = useUTC ? date.getUTCSeconds.bind(date) : date.getSeconds.bind(date);
  const getMilliseconds = useUTC ? date.getUTCMilliseconds.bind(date) : date.getMilliseconds.bind(date);

  const year = getYear();
  const month = String(getMonth() + 1).padStart(2, '0');
  const day = String(getDate()).padStart(2, '0');

  if (!includeTime) {
    // Nur Datum: YYYYMMDD
    return `${year}${month}${day}`;
  }

  const hours = String(getHours()).padStart(2, '0');
  const minutes = String(getMinutes()).padStart(2, '0');
  const seconds = String(getSeconds()).padStart(2, '0');

  let timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;

  // Millisekunden hinzufügen, wenn gewünscht
  if (includeMilliseconds) {
    const ms = String(getMilliseconds()).padStart(3, '0');
    timestamp += `.${ms}`;
  }

  // Zeitzone hinzufügen
  if (useUTC) {
    // Bei UTC: keine Zeitzone oder +0000
    timestamp += '+0000';
  } else {
    // Bei lokaler Zeit: UTC offset berechnen
    const timezoneOffset = date.getTimezoneOffset();
    if (timezoneOffset !== 0) {
      const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
      const offsetMinutes = Math.abs(timezoneOffset) % 60;
      const offsetSign = timezoneOffset <= 0 ? '+' : '-'; // getTimezoneOffset gibt negativen Wert für UTC+ zurück
      timestamp += `${offsetSign}${String(offsetHours).padStart(2, '0')}${String(offsetMinutes).padStart(2, '0')}`;
    }
  }

  return timestamp;
}

/**
 * CDA Generator Service
 * Generiert CDA XML Dokumente aus Ambulanzbefund-Daten
 * 
 * TODO: Erweitern mit vollständiger ELGA IL-Konformität
 */
class CdaGeneratorService {
  /**
   * Generiert CDA Ambulanzbefund aus Ambulanzbefund-Objekt
   * @param {Object} ambefund - Ambulanzbefund Object (populated)
   * @param {Object} template - AmbulanzbefundFormTemplate Object
   * @returns {String} CDA XML als String
   */
  static async generateAmbulanzbefundCDA(ambefund, template) {
    try {
      // Validiere erforderliche Felder
      if (!ambefund || !template) {
        throw new Error('Ambulanzbefund und Template sind erforderlich');
      }

      if (!template.elgaIlReference) {
        throw new Error('Template hat keine ELGA IL Referenz');
      }

      const elgaRef = template.elgaIlReference;

      // Erforderliche CDA-Felder prüfen
      if (!elgaRef.formatCode || !elgaRef.classCode || !elgaRef.typeCode) {
        throw new Error('Template hat unvollständige ELGA IL Referenz (formatCode, classCode, typeCode erforderlich)');
      }

      // Extrahiere Patient, Location, User (können populated oder IDs sein)
      const patient = typeof ambefund.patientId === 'object' && ambefund.patientId
        ? ambefund.patientId 
        : ambefund.patientId 
          ? { _id: ambefund.patientId }
          : null;
      
      const location = typeof ambefund.locationId === 'object' && ambefund.locationId
        ? ambefund.locationId
        : ambefund.locationId
          ? { _id: ambefund.locationId }
          : null;
      
      const author = typeof ambefund.createdBy === 'object' && ambefund.createdBy
        ? ambefund.createdBy
        : ambefund.createdBy
          ? { _id: ambefund.createdBy }
          : null;
      
      // Validiere erforderliche Felder
      if (!patient) {
        logger.error(`Patient ist null - ambefund.patientId: ${ambefund.patientId}, typeof: ${typeof ambefund.patientId}`);
        throw new Error('Patient nicht gefunden');
      }
      if (!location) {
        logger.error(`Location ist null - ambefund.locationId: ${ambefund.locationId}, typeof: ${typeof ambefund.locationId}`);
        throw new Error('Location nicht gefunden');
      }
      if (!author) {
        logger.error(`Autor ist null - ambefund.createdBy: ${ambefund.createdBy}, typeof: ${typeof ambefund.createdBy}`);
        throw new Error('Autor nicht gefunden');
      }
      
      // Log zur Debugging
      logger.info(`CDA-Generierung: Patient=${patient && patient._id ? patient._id : (patient || 'null')}, Location=${location && location._id ? location._id : (location || 'null')}, Author=${author && author._id ? author._id : (author || 'null')}`);

      // Generiere CDA XML
      const cdaXml = this.buildCDAXML({
        ambefund,
        template,
        patient,
        location,
        author,
        elgaRef
      });

      logger.info(`CDA XML generiert für Ambulanzbefund: ${ambefund.documentNumber}`);
      return cdaXml;
    } catch (error) {
      logger.error(`Fehler beim Generieren des CDA: ${error.message}`);
      throw error;
    }
  }

  /**
   * Baut CDA XML zusammen
   * @param {Object} params - Alle erforderlichen Parameter
   * @returns {String} CDA XML
   */
  static buildCDAXML({ ambefund, template, patient, location, author, elgaRef }) {
    // Validiere, dass alle Parameter vorhanden sind
    if (!patient) {
      throw new Error('Patient ist null oder undefined');
    }
    if (!location) {
      throw new Error('Location ist null oder undefined');
    }
    if (!author) {
      throw new Error('Author ist null oder undefined');
    }
    if (!ambefund) {
      throw new Error('Ambulanzbefund ist null oder undefined');
    }
    
    const now = new Date();
    // HL7 TS Format für Timestamps (YYYYMMDDHHMMSS) - verwende UTC für medizinische Dokumentation
    const hl7Timestamp = formatHL7Timestamp(now, true, false, true);

    // Generiere gültige HL7 UIDs (UUIDs für root-Attribute, nicht MongoDB ObjectIDs)
    // MongoDB ObjectIDs sind keine gültigen HL7 UIDs - verwende UUIDs stattdessen
    const docId = uuidv4(); // UUID für Dokument-ID root
    const authorId = uuidv4(); // UUID für Autor-ID
    const custodianId = uuidv4(); // UUID für Custodian/Organisation-ID
    const patientId = patient && patient._id ? patient._id.toString() : (patient ? patient.toString() : '');

    // Extrahiere Diagnosen
    const primaryDiagnosis = ambefund.assessment?.primaryDiagnosis || {};
    const secondaryDiagnoses = ambefund.assessment?.secondaryDiagnoses || [];

    // Patient-Name
    const patientName = patient && patient.firstName && patient.lastName
      ? `${patient.firstName} ${patient.lastName}`
      : 'Unbekannt';

    // Autor-Name
    const authorName = author && author.firstName && author.lastName
      ? `${author.firstName} ${author.lastName}`
      : (author && author.email ? author.email : 'Unbekannt');

    // Location-Name
    const locationName = location && location.name ? location.name : 'Unbekannter Standort';

    // Format Code (aus Template)
    let formatCode = '';
    if (typeof elgaRef.formatCode === 'object' && elgaRef.formatCode !== null) {
      // Wenn es ein Objekt ist, versuche .code zu extrahieren, sonst konvertiere zu String
      formatCode = typeof elgaRef.formatCode.code === 'string' 
        ? elgaRef.formatCode.code 
        : String(elgaRef.formatCode.code || elgaRef.formatCode || '');
    } else if (typeof elgaRef.formatCode === 'string') {
      formatCode = elgaRef.formatCode;
    } else {
      formatCode = String(elgaRef.formatCode || '');
    }
    
    // Stelle sicher, dass formatCode ein String ist
    formatCode = String(formatCode).trim();
    
    const formatCodeSchemeName = typeof elgaRef.formatCode === 'object' && elgaRef.formatCode !== null
      ? (elgaRef.formatCode.codingScheme || 'ELGA_Formatcode')
      : 'ELGA_Formatcode';
    const formatCodeScheme = getCodeSystemOID(formatCodeSchemeName); // Konvertiere zu OID
    const formatCodeDisplay = typeof elgaRef.formatCode === 'object' && elgaRef.formatCode !== null
      ? (elgaRef.formatCode.displayName || '')
      : '';

    // Class Code (aus Template) - MUSS vorhanden sein für CDA
    let classCode = '';
    if (typeof elgaRef.classCode === 'object' && elgaRef.classCode !== null) {
      // Wenn es ein Objekt ist, versuche .code zu extrahieren, sonst konvertiere zu String
      classCode = typeof elgaRef.classCode.code === 'string' 
        ? elgaRef.classCode.code 
        : String(elgaRef.classCode.code || elgaRef.classCode || '');
    } else if (typeof elgaRef.classCode === 'string') {
      classCode = elgaRef.classCode;
    } else {
      classCode = String(elgaRef.classCode || '');
    }
    
    // Stelle sicher, dass classCode ein String ist und trimme
    classCode = String(classCode).trim();
    
    // Fallback falls leer
    if (!classCode || classCode === '') {
      logger.warn('ClassCode ist leer, verwende Fallback');
      classCode = 'CDA'; // Standard CDA ClassCode als Fallback
    }
    
    const classCodeSchemeName = typeof elgaRef.classCode === 'object'
      ? (elgaRef.classCode.codingScheme || 'ELGA_Dokumentenklassen')
      : 'ELGA_Dokumentenklassen';
    const classCodeScheme = getCodeSystemOID(classCodeSchemeName); // Konvertiere zu OID
    const classCodeDisplay = typeof elgaRef.classCode === 'object'
      ? (elgaRef.classCode.displayName || '')
      : '';

    // Type Code (aus Template)
    let typeCode = '';
    if (typeof elgaRef.typeCode === 'object' && elgaRef.typeCode !== null) {
      // Wenn es ein Objekt ist, versuche .code zu extrahieren, sonst konvertiere zu String
      typeCode = typeof elgaRef.typeCode.code === 'string' 
        ? elgaRef.typeCode.code 
        : String(elgaRef.typeCode.code || elgaRef.typeCode || '');
    } else if (typeof elgaRef.typeCode === 'string') {
      typeCode = elgaRef.typeCode;
    } else {
      typeCode = String(elgaRef.typeCode || '');
    }
    
    // Stelle sicher, dass typeCode ein String ist
    typeCode = String(typeCode).trim();
    
    const typeCodeSchemeName = typeof elgaRef.typeCode === 'object' && elgaRef.typeCode !== null
      ? (elgaRef.typeCode.codingScheme || 'ELGA_Dokumentenklassen')
      : 'ELGA_Dokumentenklassen';
    const typeCodeScheme = getCodeSystemOID(typeCodeSchemeName); // Konvertiere zu OID
    const typeCodeDisplay = typeof elgaRef.typeCode === 'object' && elgaRef.typeCode !== null
      ? (elgaRef.typeCode.displayName || '')
      : '';

    // Geburtsdatum (HL7 TS Format, nur Datum: YYYYMMDD)
    const birthDate = patient && patient.dateOfBirth
      ? formatHL7Timestamp(new Date(patient.dateOfBirth), false)
      : '';

    // SVNR (Social Security Number)
    const svnr = (patient && patient.socialSecurityNumber) ? patient.socialSecurityNumber : '';

    // Baue CDA XML (vereinfachte Version - erweitern nach ELGA IL)
    const cdaXml = `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <realmCode code="AT"/>
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
  <templateId root="1.2.40.0.34.11.1"/>
  <templateId root="${elgaRef.templateId || '1.2.40.0.34.11.2'}"/>
  ${ambefund.documentNumber ? `<id root="${docId}" extension="${ambefund.documentNumber}"/>` : `<id root="${docId}"/>`}
  <code code="${classCode}" codeSystem="${classCodeScheme}"${classCodeDisplay ? ` displayName="${classCodeDisplay}"` : ''}/>
  <title>Ambulanzbefund - ${patientName}</title>
  <effectiveTime value="${hl7Timestamp}"/>
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
  <languageCode code="de-AT"/>
  
  <!-- Patient -->
  <recordTarget>
    <patientRole>
      ${svnr || patientId ? `<id root="2.16.840.1.113883.2.7" extension="${svnr || patientId}"/>` : `<id root="2.16.840.1.113883.2.7"/>`}
      <patient>
        ${(patient.firstName || patient.lastName) ? `<name>
          ${patient.firstName ? `<given>${patient.firstName}</given>` : ''}
          ${patient.lastName ? `<family>${patient.lastName}</family>` : ''}
        </name>` : '<name><family>Unbekannt</family></name>'}
        ${birthDate ? `<birthTime value="${birthDate}"/>` : ''}
      </patient>
    </patientRole>
  </recordTarget>
  
  <!-- Autor -->
  <author>
    <time value="${hl7Timestamp}"/>
    <assignedAuthor>
      ${author && author._id ? `<id root="${authorId}" extension="${author._id.toString()}"/>` : `<id root="${authorId}"/>`}
      <assignedPerson>
        ${(author.firstName || author.lastName) ? `<name>
          ${author.firstName ? `<given>${author.firstName}</given>` : ''}
          ${author.lastName ? `<family>${author.lastName}</family>` : ''}
        </name>` : `<name><family>${author.email || 'Unbekannt'}</family></name>`}
      </assignedPerson>
      <representedOrganization>
        <name>${locationName}</name>
      </representedOrganization>
    </assignedAuthor>
  </author>
  
  <!-- Custodian -->
  <custodian>
    <assignedCustodian>
      <representedCustodianOrganization>
        ${location && location._id ? `<id root="${custodianId}" extension="${location._id.toString()}"/>` : `<id root="${custodianId}"/>`}
        <name>${locationName}</name>
      </representedCustodianOrganization>
    </assignedCustodian>
  </custodian>
  
  <!-- Dokumenten-Information -->
  <component>
    <structuredBody>
      ${primaryDiagnosis && primaryDiagnosis.code && primaryDiagnosis.code.trim() !== '' ? `
      <!-- Primärdiagnose -->
      <component>
        <section>
          <code code="29548-5" codeSystem="2.16.840.1.113883.6.1" displayName="Diagnose"/>
          <entry>
            <act classCode="ACT" moodCode="EVN">
              <code code="${primaryDiagnosis.code}" codeSystem="${getCodeSystemOID(primaryDiagnosis.codingScheme || 'ICD-10')}"${primaryDiagnosis.display ? ` displayName="${primaryDiagnosis.display}"` : ''}/>
            </act>
          </entry>
        </section>
      </component>` : ''}
      
      ${secondaryDiagnoses && secondaryDiagnoses.length > 0 && secondaryDiagnoses.some(diag => diag && diag.code && diag.code.trim() !== '') ? `
      <!-- Sekundärdiagnosen -->
      <component>
        <section>
          <code code="29548-5" codeSystem="2.16.840.1.113883.6.1" displayName="Sekundärdiagnosen"/>
          ${secondaryDiagnoses.filter(diag => diag && diag.code && diag.code.trim() !== '').map(diag => `
          <entry>
            <act classCode="ACT" moodCode="EVN">
              <code code="${diag.code}" codeSystem="${getCodeSystemOID(diag.codingScheme || 'ICD-10')}"${diag.display ? ` displayName="${diag.display}"` : ''}/>
            </act>
          </entry>`).join('')}
        </section>
      </component>` : ''}
      
      <!-- Formulardaten als Text -->
      <component>
        <section>
          <code code="11534-6" codeSystem="2.16.840.1.113883.6.1" displayName="Ambulanzbefund"/>
          <text>
            <![CDATA[
${JSON.stringify(ambefund.formData, null, 2)}
            ]]>
          </text>
        </section>
      </component>
    </structuredBody>
  </component>
</ClinicalDocument>`;

    return cdaXml;
  }
}

module.exports = CdaGeneratorService;
