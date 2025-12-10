const LaborMappingService = require('./laborMappingService');
const LaborResult = require('../models/LaborResult');
const LaborProvider = require('../models/LaborProvider');

/**
 * Labor-Parser-Service
 * Verantwortlich für das Parsen verschiedener Labor-Datenformate (FHIR, HL7, etc.)
 */
class LaborParserService {
  /**
   * Parst FHIR DiagnosticReport
   * @param {Object} fhirReport - FHIR DiagnosticReport Resource
   * @param {String} providerId - ID des Labor-Providers
   * @returns {Promise<Object>} Transformiertes LaborResult-Objekt
   */
  async parseFHIR(fhirReport, providerId) {
    try {
      const provider = await LaborProvider.findById(providerId);
      if (!provider) {
        throw new Error('Labor provider not found');
      }

      // Patientendaten extrahieren
      const patientRef = fhirReport.subject?.reference || fhirReport.subject?.id;
      const patientId = patientRef?.replace('Patient/', '');

      // Datum extrahieren
      const collectionDate = fhirReport.effectiveDateTime || fhirReport.effectivePeriod?.start;
      const resultDate = fhirReport.issued || new Date();

      // Status
      const status = this.mapFHIRStatus(fhirReport.status);

      // Ergebnisse extrahieren
      const results = [];
      if (fhirReport.result && Array.isArray(fhirReport.result)) {
        for (const observationRef of fhirReport.result) {
          // In einer echten Implementierung würde man hier die Observation-Ressource abrufen
          // Für jetzt nehmen wir an, dass die Daten bereits im Report enthalten sind
          const observation = observationRef; // Vereinfacht

          if (observation.resourceType === 'Observation') {
            const transformedResult = await LaborMappingService.transformResult({
              code: observation.code?.coding?.[0]?.code,
              name: observation.code?.text || observation.code?.coding?.[0]?.display,
              value: this.extractFHIRValue(observation),
              unit: observation.valueQuantity?.unit,
              referenceRange: this.extractFHIRReferenceRange(observation),
              interpretation: this.extractFHIRInterpretation(observation)
            }, providerId);

            results.push(transformedResult);
          }
        }
      }

      return {
        patientId: patientId,
        providerId: providerId,
        externalId: fhirReport.id,
        orderNumber: fhirReport.identifier?.[0]?.value,
        collectionDate: new Date(collectionDate),
        analysisDate: new Date(resultDate),
        resultDate: new Date(resultDate),
        status: status,
        results: results,
        interpretation: fhirReport.conclusion,
        laboratoryComment: fhirReport.conclusionCode?.[0]?.text,
        metadata: {
          sourceFormat: 'fhir',
          rawData: fhirReport,
          mappingVersion: '1.0'
        },
        processingStatus: 'mapped'
      };
    } catch (error) {
      console.error('Error parsing FHIR:', error);
      throw error;
    }
  }

  /**
   * Parst HL7 v2.x ORU^R01 Message
   * @param {String} hl7Message - HL7 v2.x Message als String
   * @param {String} providerId - ID des Labor-Providers
   * @returns {Promise<Object>} Transformiertes LaborResult-Objekt
   */
  async parseHL7v2(hl7Message, providerId) {
    try {
      const segments = hl7Message.split('\r');
      const msh = this.parseHL7Segment(segments.find(s => s.startsWith('MSH')));
      const pid = this.parseHL7Segment(segments.find(s => s.startsWith('PID')));
      const obr = this.parseHL7Segment(segments.find(s => s.startsWith('OBR')));
      const obxSegments = segments.filter(s => s.startsWith('OBX'));

      // Patientendaten extrahieren
      const patientData = {
        firstName: pid[5]?.split('^')[1] || '',
        lastName: pid[5]?.split('^')[0] || '',
        dateOfBirth: this.parseHL7Date(pid[7]),
        insuranceNumber: pid[18] || pid[19]
      };

      // Patienten finden
      const provider = await LaborProvider.findById(providerId);
      const matchingStrategy = provider?.mapping?.patientMatching || 'name-dob';
      const patient = await LaborMappingService.findPatient(patientData, matchingStrategy);

      if (!patient) {
        throw new Error(`Patient not found: ${patientData.firstName} ${patientData.lastName}`);
      }

      // Datum extrahieren
      const collectionDate = this.parseHL7Date(obr[7]) || new Date();
      const resultDate = this.parseHL7Date(obr[22]) || new Date();

      // Ergebnisse extrahieren
      const results = [];
      for (const obxSegment of obxSegments) {
        const obx = this.parseHL7Segment(obxSegment);
        const valueType = obx[2]; // OBX-2: Value Type
        const observationId = obx[3]; // OBX-3: Observation Identifier
        const observationText = obx[4]; // OBX-4: Observation Sub-ID
        const value = obx[5]; // OBX-5: Observation Value
        const units = obx[6]; // OBX-6: Units
        const referenceRange = obx[7]; // OBX-7: Reference Range
        const abnormalFlags = obx[8]; // OBX-8: Abnormal Flags

        const transformedResult = await LaborMappingService.transformResult({
          code: observationId?.split('^')[0],
          name: observationId?.split('^')[1] || observationText,
          value: this.parseHL7Value(value, valueType),
          unit: units,
          referenceRange: this.parseHL7ReferenceRange(referenceRange),
          interpretation: this.parseHL7Interpretation(abnormalFlags)
        }, providerId);

        results.push(transformedResult);
      }

      return {
        patientId: patient._id,
        providerId: providerId,
        externalId: obr[2] || msh[10], // Filler Order Number oder Message Control ID
        orderNumber: obr[2],
        collectionDate: new Date(collectionDate),
        analysisDate: new Date(resultDate),
        resultDate: new Date(resultDate),
        status: 'final',
        results: results,
        metadata: {
          sourceFormat: 'hl7v2',
          rawData: hl7Message,
          mappingVersion: '1.0'
        },
        processingStatus: 'mapped'
      };
    } catch (error) {
      console.error('Error parsing HL7 v2:', error);
      throw error;
    }
  }

  /**
   * Parst einen HL7-Segment
   * @param {String} segment - HL7-Segment als String
   * @returns {Array} Array von Feldern
   */
  parseHL7Segment(segment) {
    if (!segment) return [];
    return segment.split('|');
  }

  /**
   * Parst ein HL7-Datum
   * @param {String} dateStr - HL7-Datum (Format: YYYYMMDDHHMMSS)
   * @returns {Date|null}
   */
  parseHL7Date(dateStr) {
    if (!dateStr) return null;
    // HL7 Format: YYYYMMDDHHMMSS
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(8, 10) || '00';
    const minute = dateStr.substring(10, 12) || '00';
    const second = dateStr.substring(12, 14) || '00';
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
  }

  /**
   * Parst einen HL7-Wert basierend auf Value Type
   * @param {String} value - Wert als String
   * @param {String} valueType - Value Type (NM, ST, TX, etc.)
   * @returns {*} Geparster Wert
   */
  parseHL7Value(value, valueType) {
    if (!value) return null;

    switch (valueType) {
      case 'NM': // Numeric
        return parseFloat(value);
      case 'SN': // Structured Numeric
        return parseFloat(value.split('^')[0]);
      case 'DT': // Date
      case 'DTM': // Date/Time
        return this.parseHL7Date(value);
      case 'CE': // Coded Entry
        return value.split('^')[1] || value.split('^')[0];
      default:
        return value;
    }
  }

  /**
   * Parst HL7-Referenzbereich
   * @param {String} rangeStr - Referenzbereich als String (z.B. "3.5-5.0")
   * @returns {Object}
   */
  parseHL7ReferenceRange(rangeStr) {
    if (!rangeStr) return null;

    const match = rangeStr.match(/([\d.]+)\s*-\s*([\d.]+)/);
    if (match) {
      return {
        low: parseFloat(match[1]),
        high: parseFloat(match[2]),
        text: rangeStr
      };
    }

    return { text: rangeStr };
  }

  /**
   * Parst HL7-Interpretation
   * @param {String} flags - Abnormal Flags (z.B. "H", "L", "LL", "HH")
   * @returns {String}
   */
  parseHL7Interpretation(flags) {
    if (!flags) return 'normal';

    const flag = flags.toUpperCase();
    if (flag.includes('LL') || flag.includes('L') && !flag.includes('H')) {
      return 'low';
    }
    if (flag.includes('HH') || flag.includes('H') && !flag.includes('L')) {
      return 'high';
    }
    if (flag.includes('CRIT')) {
      return 'critical';
    }

    return 'normal';
  }

  /**
   * Extrahiert Wert aus FHIR Observation
   * @param {Object} observation - FHIR Observation Resource
   * @returns {*}
   */
  extractFHIRValue(observation) {
    if (observation.valueQuantity) {
      return observation.valueQuantity.value;
    }
    if (observation.valueString) {
      return observation.valueString;
    }
    if (observation.valueCodeableConcept) {
      return observation.valueCodeableConcept.coding?.[0]?.display || 
             observation.valueCodeableConcept.text;
    }
    if (observation.valueBoolean !== undefined) {
      return observation.valueBoolean;
    }
    return null;
  }

  /**
   * Extrahiert Referenzbereich aus FHIR Observation
   * @param {Object} observation - FHIR Observation Resource
   * @returns {Object}
   */
  extractFHIRReferenceRange(observation) {
    if (observation.referenceRange && observation.referenceRange.length > 0) {
      const range = observation.referenceRange[0];
      return {
        low: range.low?.value,
        high: range.high?.value,
        text: range.text
      };
    }
    return null;
  }

  /**
   * Extrahiert Interpretation aus FHIR Observation
   * @param {Object} observation - FHIR Observation Resource
   * @returns {String}
   */
  extractFHIRInterpretation(observation) {
    if (observation.interpretation && observation.interpretation.length > 0) {
      const code = observation.interpretation[0].coding?.[0]?.code;
      const mapping = {
        'L': 'low',
        'H': 'high',
        'LL': 'low',
        'HH': 'high',
        'CRIT': 'critical',
        'N': 'normal'
      };
      return mapping[code] || 'normal';
    }
    return 'normal';
  }

  /**
   * Mappt FHIR Status zu internem Status
   * @param {String} fhirStatus - FHIR Status
   * @returns {String}
   */
  mapFHIRStatus(fhirStatus) {
    const mapping = {
      'registered': 'pending',
      'partial': 'preliminary',
      'preliminary': 'preliminary',
      'final': 'final',
      'amended': 'corrected',
      'corrected': 'corrected',
      'cancelled': 'cancelled'
    };
    return mapping[fhirStatus] || 'final';
  }
}

module.exports = new LaborParserService();












