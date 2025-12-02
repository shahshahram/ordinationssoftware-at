const LaborMapping = require('../models/LaborMapping');
const Patient = require('../models/Patient');

/**
 * Labor-Mapping-Service
 * Verantwortlich für die Transformation von externen Laborcodes zu standardisierten LOINC-Codes
 */
class LaborMappingService {
  /**
   * Findet das Mapping für einen externen Code
   * @param {String} externalCode - Externer Code vom Laborsystem
   * @param {String} externalName - Externer Test-Name (optional)
   * @param {String} providerId - ID des Labor-Providers (optional)
   * @returns {Promise<Object|null>} Mapping-Objekt oder null
   */
  async findMapping(externalCode, externalName = null, providerId = null) {
    try {
      // Zuerst nach Provider-spezifischem Mapping suchen
      if (providerId) {
        let mapping = await LaborMapping.findOne({
          providerId: providerId,
          externalCode: externalCode,
          isActive: true
        });

        if (mapping) {
          return mapping;
        }

        // Falls nicht gefunden, nach Name suchen
        if (externalName) {
          mapping = await LaborMapping.findOne({
            providerId: providerId,
            externalName: { $regex: new RegExp(externalName, 'i') },
            isActive: true
          });

          if (mapping) {
            return mapping;
          }
        }
      }

      // Fallback: Globales Mapping suchen
      let mapping = await LaborMapping.findOne({
        providerId: null,
        externalCode: externalCode,
        isActive: true
      });

      if (mapping) {
        return mapping;
      }

      // Falls nicht gefunden, nach Name suchen
      if (externalName) {
        mapping = await LaborMapping.findOne({
          providerId: null,
          externalName: { $regex: new RegExp(externalName, 'i') },
          isActive: true
        });

        if (mapping) {
          return mapping;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding labor mapping:', error);
      throw error;
    }
  }

  /**
   * Transformiert einen Laborwert mit Mapping
   * @param {Object} rawResult - Roher Laborwert vom externen System
   * @param {String} providerId - ID des Labor-Providers
   * @returns {Promise<Object>} Transformierter Laborwert
   */
  async transformResult(rawResult, providerId) {
    try {
      const {
        code,
        name,
        value,
        unit,
        referenceRange,
        interpretation
      } = rawResult;

      // Mapping finden
      const mapping = await this.findMapping(code, name, providerId);

      if (!mapping) {
        // Kein Mapping gefunden - verwende Originaldaten
        return {
          loincCode: null,
          externalCode: code,
          testName: name || code,
          value: value,
          unit: unit,
          referenceRange: referenceRange,
          interpretation: this.interpretValue(value, referenceRange),
          isCritical: false,
          comment: 'Kein Mapping gefunden - Originaldaten verwendet'
        };
      }

      // Einheit transformieren
      let transformedUnit = unit;
      let transformedValue = value;

      if (unit && mapping.unitConversions && mapping.unitConversions.length > 0) {
        const conversion = mapping.unitConversions.find(c => c.fromUnit === unit);
        if (conversion) {
          transformedUnit = conversion.toUnit;
          transformedValue = (value * conversion.factor) + (conversion.offset || 0);
        }
      } else if (mapping.standardUnit && unit !== mapping.standardUnit) {
        transformedUnit = mapping.standardUnit;
      }

      // Referenzbereich anwenden (falls nicht vorhanden)
      let finalReferenceRange = referenceRange || mapping.referenceRange;

      // Interpretation bestimmen
      const finalInterpretation = this.interpretValue(
        transformedValue,
        finalReferenceRange,
        mapping.criticalValues
      );

      // Kritische Werte prüfen
      const isCritical = this.isCriticalValue(
        transformedValue,
        mapping.criticalValues
      );

      return {
        loincCode: mapping.loincCode,
        externalCode: code,
        testName: mapping.loincName || name || code,
        value: transformedValue,
        unit: transformedUnit || mapping.standardUnit,
        referenceRange: finalReferenceRange,
        interpretation: finalInterpretation,
        isCritical: isCritical
      };
    } catch (error) {
      console.error('Error transforming labor result:', error);
      throw error;
    }
  }

  /**
   * Interpretiert einen Laborwert basierend auf Referenzbereich
   * @param {*} value - Laborwert
   * @param {Object} referenceRange - Referenzbereich
   * @param {Object} criticalValues - Kritische Werte (optional)
   * @returns {String} Interpretation
   */
  interpretValue(value, referenceRange, criticalValues = null) {
    if (!referenceRange) {
      return 'normal';
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return 'normal'; // Für nicht-numerische Werte
    }

    // Kritische Werte prüfen
    if (criticalValues) {
      if (criticalValues.low !== undefined && numValue <= criticalValues.low) {
        return 'critical';
      }
      if (criticalValues.high !== undefined && numValue >= criticalValues.high) {
        return 'critical';
      }
    }

    // Referenzbereich prüfen
    if (referenceRange.low !== undefined && numValue < referenceRange.low) {
      return 'low';
    }
    if (referenceRange.high !== undefined && numValue > referenceRange.high) {
      return 'high';
    }

    return 'normal';
  }

  /**
   * Prüft, ob ein Wert kritisch ist
   * @param {*} value - Laborwert
   * @param {Object} criticalValues - Kritische Werte
   * @returns {Boolean}
   */
  isCriticalValue(value, criticalValues) {
    if (!criticalValues) {
      return false;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return false;
    }

    if (criticalValues.low !== undefined && numValue <= criticalValues.low) {
      return true;
    }
    if (criticalValues.high !== undefined && numValue >= criticalValues.high) {
      return true;
    }

    return false;
  }

  /**
   * Findet Patienten basierend auf Matching-Strategie
   * @param {Object} patientData - Patientendaten vom Laborsystem
   * @param {String} matchingStrategy - Matching-Strategie
   * @returns {Promise<Object|null>} Patient oder null
   */
  async findPatient(patientData, matchingStrategy = 'name-dob') {
    try {
      const { firstName, lastName, dateOfBirth, insuranceNumber, socialSecurityNumber, externalId } = patientData;

      switch (matchingStrategy) {
        case 'name-dob':
          if (firstName && lastName && dateOfBirth) {
            return await Patient.findOne({
              firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
              lastName: { $regex: new RegExp(`^${lastName}$`, 'i') },
              dateOfBirth: new Date(dateOfBirth)
            });
          }
          break;

        case 'insurance-number':
          if (insuranceNumber) {
            return await Patient.findOne({
              insuranceNumber: insuranceNumber
            });
          }
          break;

        case 'ssn':
          if (socialSecurityNumber) {
            return await Patient.findOne({
              socialSecurityNumber: socialSecurityNumber
            });
          }
          break;

        case 'external-id':
          if (externalId) {
            return await Patient.findOne({
              'metadata.externalId': externalId
            });
          }
          break;

        case 'multiple':
          // Versuche mehrere Strategien
          let patient = null;

          // 1. Name + Geburtsdatum
          if (firstName && lastName && dateOfBirth) {
            patient = await Patient.findOne({
              firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
              lastName: { $regex: new RegExp(`^${lastName}$`, 'i') },
              dateOfBirth: new Date(dateOfBirth)
            });
            if (patient) return patient;
          }

          // 2. Versicherungsnummer
          if (insuranceNumber) {
            patient = await Patient.findOne({
              insuranceNumber: insuranceNumber
            });
            if (patient) return patient;
          }

          // 3. Sozialversicherungsnummer
          if (socialSecurityNumber) {
            patient = await Patient.findOne({
              socialSecurityNumber: socialSecurityNumber
            });
            if (patient) return patient;
          }

          break;
      }

      return null;
    } catch (error) {
      console.error('Error finding patient:', error);
      throw error;
    }
  }
}

module.exports = new LaborMappingService();








