// Medication Dosage Validation Service
// Prüft Dosierungen basierend auf Patientendaten (Alter, Gewicht, Geschlecht, etc.)
// Für Österreich: Berücksichtigt österreichische Standards und AMK-Empfehlungen

/**
 * Berechnet das Alter in Jahren
 * @param {Date} dateOfBirth - Geburtsdatum
 * @returns {number} Alter in Jahren
 */
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

/**
 * Berechnet die Körperoberfläche (BSA) nach Mosteller-Formel
 * @param {number} weight - Gewicht in kg
 * @param {number} height - Größe in cm
 * @returns {number|null} BSA in m²
 */
const calculateBSA = (weight, height) => {
  if (!weight || !height || weight <= 0 || height <= 0) return null;
  const heightInM = height / 100;
  const bsa = Math.sqrt((weight * heightInM) / 3600);
  return parseFloat(bsa.toFixed(2));
};

/**
 * Prüft Dosierung für pädiatrische Patienten
 * @param {Object} medication - Medikamentendaten
 * @param {Object} patient - Patientendaten
 * @returns {Object} Validierungsergebnis
 */
const validatePediatricDosage = (medication, patient) => {
  const age = calculateAge(patient.dateOfBirth);
  const warnings = [];
  const errors = [];
  
  if (age === null || age >= 18) {
    return { valid: true, warnings, errors };
  }
  
  // Pädiatrische Dosierungsprüfung
  const dosage = medication.dosage;
  const dosageMatch = dosage.match(/(\d+(?:\.\d+)?)\s*(mg|g|ml|µg|IE|Einheiten)/i);
  
  if (!dosageMatch) {
    return { valid: true, warnings, errors }; // Keine numerische Dosierung gefunden
  }
  
  const dosageValue = parseFloat(dosageMatch[1]);
  const dosageUnit = dosageMatch[2].toLowerCase();
  const weight = patient.weight;
  
  // Prüfe Gewicht-basierte Dosierung
  if (weight && weight > 0) {
    let maxDosagePerKg = null;
    let recommendedDosagePerKg = null;
    
    // Beispiel: Paracetamol für Kinder (max 60mg/kg/Tag, Einzeldosis max 15mg/kg)
    if (medication.name.toLowerCase().includes('paracetamol') || 
        medication.atcCode?.startsWith('N02BE01')) {
      maxDosagePerKg = 15; // mg/kg pro Einzeldosis
      recommendedDosagePerKg = 10; // mg/kg pro Einzeldosis
      
      if (dosageUnit === 'mg') {
        const dosagePerKg = dosageValue / weight;
        if (dosagePerKg > maxDosagePerKg) {
          errors.push({
            severity: 'error',
            message: `Dosierung zu hoch für pädiatrischen Patienten. Maximal ${maxDosagePerKg} mg/kg pro Einzeldosis. Aktuell: ${dosagePerKg.toFixed(2)} mg/kg`
          });
        } else if (dosagePerKg > recommendedDosagePerKg) {
          warnings.push({
            severity: 'warning',
            message: `Dosierung über der empfohlenen Dosis (${recommendedDosagePerKg} mg/kg). Aktuell: ${dosagePerKg.toFixed(2)} mg/kg`
          });
        }
      }
    }
    
    // Beispiel: Ibuprofen für Kinder (max 10mg/kg pro Einzeldosis)
    if (medication.name.toLowerCase().includes('ibuprofen') || 
        medication.atcCode?.startsWith('M01AE01')) {
      maxDosagePerKg = 10; // mg/kg pro Einzeldosis
      
      if (dosageUnit === 'mg') {
        const dosagePerKg = dosageValue / weight;
        if (dosagePerKg > maxDosagePerKg) {
          errors.push({
            severity: 'error',
            message: `Dosierung zu hoch für pädiatrischen Patienten. Maximal ${maxDosagePerKg} mg/kg pro Einzeldosis. Aktuell: ${dosagePerKg.toFixed(2)} mg/kg`
          });
        }
      }
    }
  }
  
  // Prüfe Alters-basierte Dosierung
  if (age < 2) {
    warnings.push({
      severity: 'warning',
      message: 'Besondere Vorsicht bei Säuglingen unter 2 Jahren. Bitte Dosierung nochmals prüfen.'
    });
  } else if (age < 6) {
    warnings.push({
      severity: 'info',
      message: 'Pädiatrische Dosierung für Kleinkinder. Bitte Gewicht-basierte Dosierung prüfen.'
    });
  }
  
  return {
    valid: errors.length === 0,
    warnings,
    errors
  };
};

/**
 * Prüft Dosierung für schwangere/stillende Patienten
 * @param {Object} medication - Medikamentendaten
 * @param {Object} patient - Patientendaten
 * @returns {Object} Validierungsergebnis
 */
const validatePregnancyDosage = (medication, patient) => {
  const warnings = [];
  const errors = [];
  
  if (patient.gender !== 'w') {
    return { valid: true, warnings, errors };
  }
  
  // Medikamente, die in Schwangerschaft/Stillzeit problematisch sind
  const pregnancyContraindicated = [
    'warfarin', 'phenprocoumon', 'acenocoumarol', // Antikoagulantien
    'isotretinoin', 'acitretin', // Retinoide
    'methotrexate', // Zytostatika
    'valproat', 'valproic acid', // Antiepileptika
    'doxycyclin', 'tetracyclin', // Tetrazykline
    'ribavirin' // Antiviral
  ];
  
  const medicationNameLower = medication.name.toLowerCase();
  const isContraindicated = pregnancyContraindicated.some(drug => 
    medicationNameLower.includes(drug)
  );
  
  if (isContraindicated) {
    if (patient.isPregnant) {
      errors.push({
        severity: 'error',
        message: `Medikament ist in der Schwangerschaft kontraindiziert. Bitte Alternative prüfen.`
      });
    }
    if (patient.isBreastfeeding) {
      warnings.push({
        severity: 'warning',
        message: `Medikament sollte in der Stillzeit vermieden werden. Bitte Alternative prüfen.`
      });
    }
  }
  
  // Dosierungsanpassungen in Schwangerschaft
  if (patient.isPregnant) {
    // Beispiel: ACE-Hemmer reduzieren
    if (medication.atcCode?.startsWith('C09AA')) {
      warnings.push({
        severity: 'warning',
        message: 'ACE-Hemmer sollten in der Schwangerschaft vermieden werden. Bitte Alternative prüfen.'
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    warnings,
    errors
  };
};

/**
 * Prüft Dosierung basierend auf Nierenfunktion (vereinfacht)
 * @param {Object} medication - Medikamentendaten
 * @param {Object} patient - Patientendaten
 * @returns {Object} Validierungsergebnis
 */
const validateRenalFunction = (medication, patient) => {
  const warnings = [];
  const errors = [];
  
  // Vereinfachte Prüfung - in Produktion: eGFR aus Laborwerten
  // Medikamente, die bei Niereninsuffizienz angepasst werden müssen
  const renalAdjustmentNeeded = [
    'metformin', // Biguanide
    'digoxin', // Digitalis
    'gentamicin', 'tobramycin', // Aminoglykoside
    'vancomycin' // Glykopeptid-Antibiotika
  ];
  
  const medicationNameLower = medication.name.toLowerCase();
  const needsAdjustment = renalAdjustmentNeeded.some(drug => 
    medicationNameLower.includes(drug)
  );
  
  if (needsAdjustment) {
    warnings.push({
      severity: 'warning',
      message: 'Dosierung sollte bei eingeschränkter Nierenfunktion angepasst werden. Bitte Nierenfunktion prüfen.'
    });
  }
  
  return {
    valid: true,
    warnings,
    errors
  };
};

/**
 * Prüft Dosierung basierend auf Leberfunktion (vereinfacht)
 * @param {Object} medication - Medikamentendaten
 * @param {Object} patient - Patientendaten
 * @returns {Object} Validierungsergebnis
 */
const validateHepaticFunction = (medication, patient) => {
  const warnings = [];
  const errors = [];
  
  // Vereinfachte Prüfung - in Produktion: Leberwerte aus Laborwerten
  // Medikamente, die bei Leberinsuffizienz angepasst werden müssen
  const hepaticAdjustmentNeeded = [
    'paracetamol', // Paracetamol
    'warfarin', // Antikoagulantien
    'phenytoin', 'carbamazepin' // Antiepileptika
  ];
  
  const medicationNameLower = medication.name.toLowerCase();
  const needsAdjustment = hepaticAdjustmentNeeded.some(drug => 
    medicationNameLower.includes(drug)
  );
  
  if (needsAdjustment) {
    warnings.push({
      severity: 'info',
      message: 'Dosierung sollte bei eingeschränkter Leberfunktion angepasst werden. Bitte Leberwerte prüfen.'
    });
  }
  
  return {
    valid: true,
    warnings,
    errors
  };
};

/**
 * Hauptfunktion: Prüft Dosierung für einen Patienten
 * @param {Object} medication - Medikamentendaten
 * @param {Object} patient - Patientendaten
 * @returns {Object} Validierungsergebnis
 */
const validateDosage = (medication, patient) => {
  if (!medication || !patient) {
    return {
      valid: false,
      warnings: [],
      errors: [{ severity: 'error', message: 'Medikament oder Patientendaten fehlen' }]
    };
  }
  
  const results = {
    valid: true,
    warnings: [],
    errors: [],
    age: calculateAge(patient.dateOfBirth),
    bsa: calculateBSA(patient.weight, patient.height)
  };
  
  // Führe alle Prüfungen durch
  const pediatricResult = validatePediatricDosage(medication, patient);
  const pregnancyResult = validatePregnancyDosage(medication, patient);
  const renalResult = validateRenalFunction(medication, patient);
  const hepaticResult = validateHepaticFunction(medication, patient);
  
  // Sammle alle Warnungen und Fehler
  results.warnings.push(...pediatricResult.warnings);
  results.warnings.push(...pregnancyResult.warnings);
  results.warnings.push(...renalResult.warnings);
  results.warnings.push(...hepaticResult.warnings);
  
  results.errors.push(...pediatricResult.errors);
  results.errors.push(...pregnancyResult.errors);
  results.errors.push(...renalResult.errors);
  results.errors.push(...hepaticResult.errors);
  
  results.valid = results.errors.length === 0;
  
  return results;
};

module.exports = {
  validateDosage,
  calculateAge,
  calculateBSA,
  validatePediatricDosage,
  validatePregnancyDosage,
  validateRenalFunction,
  validateHepaticFunction
};








