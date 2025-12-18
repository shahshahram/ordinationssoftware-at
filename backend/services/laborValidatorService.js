/**
 * Labor-Validator-Service
 * Verantwortlich für die Validierung von Laborergebnissen
 */
class LaborValidatorService {
  /**
   * Validiert einen einzelnen Laborwert
   * @param {Object} result - Laborwert-Objekt
   * @returns {Object} { isValid: Boolean, errors: Array<String> }
   */
  validateResult(result) {
    const errors = [];

    // Test-Name ist erforderlich
    if (!result.testName || result.testName.trim() === '') {
      errors.push('Test-Name ist erforderlich');
    }

    // Wert ist erforderlich
    if (result.value === undefined || result.value === null || result.value === '') {
      errors.push('Wert ist erforderlich');
    }

    // Wenn Wert vorhanden ist, prüfe ob er numerisch ist (falls erwartet)
    if (result.value !== undefined && result.value !== null && result.value !== '') {
      // Prüfe ob Wert numerisch sein sollte (basierend auf Referenzbereich)
      if (result.referenceRange && (result.referenceRange.low !== undefined || result.referenceRange.high !== undefined)) {
        const numValue = typeof result.value === 'number' ? result.value : parseFloat(result.value);
        if (isNaN(numValue)) {
          errors.push(`Wert "${result.value}" ist nicht numerisch, aber Referenzbereich erfordert numerischen Wert`);
        } else {
          // Prüfe auf negative Werte (falls nicht erlaubt)
          if (numValue < 0 && this.isNegativeValueNotAllowed(result.testName)) {
            errors.push(`Wert "${result.value}" ist negativ, was für diesen Test nicht erlaubt ist`);
          }
        }
      }
    }

    // LOINC-Code-Format validieren (falls vorhanden)
    if (result.loincCode && result.loincCode.trim() !== '') {
      const loincError = this.validateLOINCCode(result.loincCode);
      if (loincError) {
        errors.push(loincError);
      }
    }

    // Referenzbereich validieren
    if (result.referenceRange) {
      const refError = this.validateReferenceRange(result.referenceRange);
      if (refError) {
        errors.push(refError);
      }

      // Prüfe Konsistenz zwischen Wert und Referenzbereich
      if (result.value !== undefined && result.value !== null && result.value !== '') {
        const numValue = typeof result.value === 'number' ? result.value : parseFloat(result.value);
        if (!isNaN(numValue) && result.referenceRange.low !== undefined && result.referenceRange.high !== undefined) {
          if (numValue < result.referenceRange.low || numValue > result.referenceRange.high) {
            // Das ist kein Fehler, sondern eine Warnung - wird als Interpretation behandelt
          }
        }
      }
    }

    // Einheit validieren (falls vorhanden)
    if (result.unit && result.unit.trim() !== '') {
      const unitError = this.validateUnit(result.unit, result.testName);
      if (unitError) {
        errors.push(unitError);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validiert ein vollständiges LaborResult-Objekt
   * @param {Object} laborResult - LaborResult-Objekt
   * @returns {Object} { isValid: Boolean, errors: Array<String>, warnings: Array<String> }
   */
  validateLaborResult(laborResult) {
    const errors = [];
    const warnings = [];

    // Patient-ID ist erforderlich
    if (!laborResult.patientId) {
      errors.push('Patient-ID ist erforderlich');
    }

    // Provider-ID ist erforderlich
    if (!laborResult.providerId) {
      errors.push('Provider-ID ist erforderlich');
    }

    // Datum-Validierung
    if (laborResult.collectionDate) {
      const dateError = this.validateDate(laborResult.collectionDate, 'collectionDate');
      if (dateError) {
        errors.push(dateError);
      }
    }

    if (laborResult.resultDate) {
      const dateError = this.validateDate(laborResult.resultDate, 'resultDate');
      if (dateError) {
        errors.push(dateError);
      }
    }

    // Prüfe, ob collectionDate vor resultDate liegt
    if (laborResult.collectionDate && laborResult.resultDate) {
      const collectionDate = new Date(laborResult.collectionDate);
      const resultDate = new Date(laborResult.resultDate);
      if (collectionDate > resultDate) {
        warnings.push('Entnahme-Datum liegt nach Ergebnis-Datum - das ist ungewöhnlich');
      }
    }

    // Ergebnisse validieren
    if (!laborResult.results || !Array.isArray(laborResult.results) || laborResult.results.length === 0) {
      errors.push('Mindestens ein Laborwert ist erforderlich');
    } else {
      laborResult.results.forEach((result, index) => {
        const validation = this.validateResult(result);
        if (!validation.isValid) {
          validation.errors.forEach(error => {
            errors.push(`Laborwert ${index + 1}: ${error}`);
          });
        }
      });
    }

    // Status-Validierung
    if (laborResult.status && !['pending', 'preliminary', 'final', 'corrected', 'cancelled'].includes(laborResult.status)) {
      errors.push(`Ungültiger Status: ${laborResult.status}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validiert ein Datum
   * @param {Date|String} date - Datum
   * @param {String} fieldName - Feldname für Fehlermeldung
   * @returns {String|null} Fehlermeldung oder null
   */
  validateDate(date, fieldName) {
    if (!date) {
      return null;
    }

    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return `${fieldName} ist kein gültiges Datum`;
    }

    // Prüfe, ob Datum in der Zukunft liegt (nur für collectionDate und resultDate)
    const now = new Date();
    if (dateObj > now) {
      return `${fieldName} liegt in der Zukunft - das ist nicht erlaubt`;
    }

    // Prüfe, ob Datum zu weit in der Vergangenheit liegt (z.B. mehr als 100 Jahre)
    const hundredYearsAgo = new Date();
    hundredYearsAgo.setFullYear(hundredYearsAgo.getFullYear() - 100);
    if (dateObj < hundredYearsAgo) {
      return `${fieldName} liegt zu weit in der Vergangenheit`;
    }

    return null;
  }

  /**
   * Validiert einen Referenzbereich
   * @param {Object} referenceRange - Referenzbereich-Objekt
   * @returns {String|null} Fehlermeldung oder null
   */
  validateReferenceRange(referenceRange) {
    if (!referenceRange) {
      return null;
    }

    // Wenn sowohl low als auch high vorhanden sind, prüfe ob low < high
    if (referenceRange.low !== undefined && referenceRange.high !== undefined) {
      const low = typeof referenceRange.low === 'number' ? referenceRange.low : parseFloat(referenceRange.low);
      const high = typeof referenceRange.high === 'number' ? referenceRange.high : parseFloat(referenceRange.high);

      if (!isNaN(low) && !isNaN(high)) {
        if (low >= high) {
          return `Referenzbereich ungültig: Untergrenze (${low}) muss kleiner als Obergrenze (${high}) sein`;
        }
      }
    }

    // Prüfe auf negative Werte in Referenzbereich (falls nicht erlaubt)
    if (referenceRange.low !== undefined) {
      const low = typeof referenceRange.low === 'number' ? referenceRange.low : parseFloat(referenceRange.low);
      if (!isNaN(low) && low < 0) {
        // Negative Werte sind für manche Tests erlaubt (z.B. pH-Werte können < 0 sein in speziellen Kontexten)
        // Hier könnten wir spezifische Tests ausschließen
      }
    }

    return null;
  }

  /**
   * Validiert einen LOINC-Code
   * @param {String} loincCode - LOINC-Code
   * @returns {String|null} Fehlermeldung oder null
   */
  validateLOINCCode(loincCode) {
    if (!loincCode || typeof loincCode !== 'string') {
      return 'LOINC-Code muss ein String sein';
    }

    // LOINC-Code Format: normalerweise 5-7 Ziffern, optional mit Bindestrich
    // Beispiele: "12345-6", "12345", "123456-7"
    const loincPattern = /^[0-9]{5,7}(-[0-9]{1,2})?$/;
    
    if (!loincPattern.test(loincCode.trim())) {
      return `LOINC-Code "${loincCode}" hat kein gültiges Format (erwartet: 5-7 Ziffern, optional mit Bindestrich)`;
    }

    return null;
  }

  /**
   * Validiert eine Einheit
   * @param {String} unit - Einheit
   * @param {String} testName - Test-Name (optional, für kontextspezifische Validierung)
   * @returns {String|null} Fehlermeldung oder null
   */
  validateUnit(unit, testName = '') {
    if (!unit || typeof unit !== 'string') {
      return 'Einheit muss ein String sein';
    }

    // Liste gängiger Einheiten (kann erweitert werden)
    const commonUnits = [
      'g/L', 'mg/dL', 'mg/L', 'µg/dL', 'µg/L', 'ng/mL', 'pg/mL',
      'mmol/L', 'µmol/L', 'nmol/L', 'pmol/L',
      'U/L', 'IU/L', 'mU/L',
      'cells/µL', 'cells/mL', '10^3/µL', '10^6/µL',
      '%', 'ratio', 'index',
      'pH', '°C', 'mmHg', 'kPa',
      'mm/h', 'g/dL', 'fL', 'pg',
      'mEq/L', 'mOsm/kg', 'g/24h', 'mg/24h'
    ];

    // Prüfe ob Einheit in der Liste ist (case-insensitive)
    const normalizedUnit = unit.trim();
    const isCommonUnit = commonUnits.some(u => u.toLowerCase() === normalizedUnit.toLowerCase());

    // Wenn nicht in der Liste, ist es trotzdem gültig (kann benutzerdefiniert sein)
    // Aber wir können eine Warnung ausgeben, wenn es sehr ungewöhnlich aussieht
    if (!isCommonUnit && normalizedUnit.length > 10) {
      return `Einheit "${unit}" ist sehr lang und könnte ungültig sein`;
    }

    return null;
  }

  /**
   * Prüft, ob negative Werte für einen Test nicht erlaubt sind
   * @param {String} testName - Test-Name
   * @returns {Boolean}
   */
  isNegativeValueNotAllowed(testName) {
    if (!testName) {
      return false;
    }

    const testNameLower = testName.toLowerCase();
    
    // Tests, die keine negativen Werte haben können
    const nonNegativeTests = [
      'hämoglobin', 'hemoglobin', 'hb',
      'hämatokrit', 'hematocrit', 'hct',
      'erythrozyten', 'erythrocytes', 'rbc',
      'leukozyten', 'leukocytes', 'wbc',
      'thrombozyten', 'platelets', 'plt',
      'glukose', 'glucose', 'blutzucker',
      'kreatinin', 'creatinine',
      'harnstoff', 'urea', 'bun',
      'cholesterin', 'cholesterol',
      'triglyzeride', 'triglycerides',
      'bilirubin', 'bilirubin total',
      'albumin', 'albumin',
      'protein', 'protein total'
    ];

    return nonNegativeTests.some(test => testNameLower.includes(test));
  }

  /**
   * Validiert mehrere Laborwerte auf einmal
   * @param {Array<Object>} results - Array von Laborwerten
   * @returns {Object} { isValid: Boolean, errors: Array<String>, warnings: Array<String> }
   */
  validateResults(results) {
    const errors = [];
    const warnings = [];

    if (!results || !Array.isArray(results)) {
      errors.push('Ergebnisse müssen ein Array sein');
      return { isValid: false, errors, warnings };
    }

    if (results.length === 0) {
      errors.push('Mindestens ein Laborwert ist erforderlich');
      return { isValid: false, errors, warnings };
    }

    // Prüfe auf doppelte Test-Namen
    const testNames = results.map(r => r.testName?.toLowerCase().trim()).filter(Boolean);
    const duplicates = testNames.filter((name, index) => testNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      warnings.push(`Doppelte Test-Namen gefunden: ${[...new Set(duplicates)].join(', ')}`);
    }

    // Validiere jeden Wert
    results.forEach((result, index) => {
      const validation = this.validateResult(result);
      if (!validation.isValid) {
        validation.errors.forEach(error => {
          errors.push(`Laborwert ${index + 1} (${result.testName || 'Unbekannt'}): ${error}`);
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = new LaborValidatorService();




