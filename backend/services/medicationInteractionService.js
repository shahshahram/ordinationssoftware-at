// Medication Interaction Service
// Prüft Wechselwirkungen zwischen Medikamenten basierend auf ATC-Codes
// Für Österreich: Integration mit österreichischen Datenbanken möglich (z.B. PharmNet, AMK)

/**
 * Bekannte Wechselwirkungen (Beispiel-Daten)
 * In Produktion: Integration mit externer Datenbank (z.B. PharmNet, AMK)
 */
const KNOWN_INTERACTIONS = {
  // Antikoagulantien
  'B01AA': {
    name: 'Vitamin-K-Antagonisten',
    interactions: {
      'M01A': { severity: 'major', description: 'Erhöhtes Blutungsrisiko bei gleichzeitiger Einnahme von NSAR' },
      'A10BA': { severity: 'moderate', description: 'Mögliche Verstärkung der blutverdünnenden Wirkung' }
    }
  },
  // NSAR
  'M01A': {
    name: 'Nichtsteroidale Antirheumatika',
    interactions: {
      'B01AA': { severity: 'major', description: 'Erhöhtes Blutungsrisiko bei gleichzeitiger Einnahme von Antikoagulantien' },
      'C09AA': { severity: 'moderate', description: 'Mögliche Reduzierung der blutdrucksenkenden Wirkung' },
      'A10BA': { severity: 'moderate', description: 'Erhöhtes Risiko für Hypoglykämie' }
    }
  },
  // ACE-Hemmer
  'C09AA': {
    name: 'ACE-Hemmer',
    interactions: {
      'M01A': { severity: 'moderate', description: 'Mögliche Reduzierung der blutdrucksenkenden Wirkung' },
      'C03DA': { severity: 'moderate', description: 'Erhöhtes Risiko für Hyperkaliämie' }
    }
  },
  // Metformin
  'A10BA': {
    name: 'Biguanide (Metformin)',
    interactions: {
      'B01AA': { severity: 'moderate', description: 'Mögliche Verstärkung der blutverdünnenden Wirkung' },
      'M01A': { severity: 'moderate', description: 'Erhöhtes Risiko für Hypoglykämie' }
    }
  },
  // Metamizol (Novalgin)
  'N02BB02': {
    name: 'Metamizol',
    interactions: {
      'B01AA': { severity: 'moderate', description: 'Mögliche Verstärkung der blutverdünnenden Wirkung' }
    }
  }
};

/**
 * Prüft Wechselwirkungen zwischen zwei Medikamenten
 * @param {string} atcCode1 - ATC-Code des ersten Medikaments
 * @param {string} atcCode2 - ATC-Code des zweiten Medikaments
 * @param {string} name1 - Name des ersten Medikaments
 * @param {string} name2 - Name des zweiten Medikaments
 * @returns {Object|null} Wechselwirkung oder null
 */
const checkInteraction = (atcCode1, atcCode2, name1, name2) => {
  if (!atcCode1 || !atcCode2) return null;
  
  // Normalisiere ATC-Codes (nimm nur die ersten 4-5 Zeichen für Gruppierung)
  const group1 = atcCode1.substring(0, 5);
  const group2 = atcCode2.substring(0, 5);
  
  // Prüfe in beide Richtungen
  const interaction1 = KNOWN_INTERACTIONS[group1]?.interactions?.[group2];
  const interaction2 = KNOWN_INTERACTIONS[group2]?.interactions?.[group1];
  
  if (interaction1) {
    return {
      medication1: { atcCode: atcCode1, name: name1 },
      medication2: { atcCode: atcCode2, name: name2 },
      severity: interaction1.severity,
      description: interaction1.description,
      source: 'local'
    };
  }
  
  if (interaction2) {
    return {
      medication1: { atcCode: atcCode1, name: name1 },
      medication2: { atcCode: atcCode2, name: name2 },
      severity: interaction2.severity,
      description: interaction2.description,
      source: 'local'
    };
  }
  
  return null;
};

/**
 * Prüft alle Wechselwirkungen für eine Liste von Medikamenten
 * @param {Array} medications - Array von Medikamenten mit atcCode und name
 * @returns {Array} Array von Wechselwirkungen
 */
const checkAllInteractions = (medications) => {
  const interactions = [];
  const activeMedications = medications.filter(m => m.status === 'active');
  
  for (let i = 0; i < activeMedications.length; i++) {
    for (let j = i + 1; j < activeMedications.length; j++) {
      const med1 = activeMedications[i];
      const med2 = activeMedications[j];
      
      const interaction = checkInteraction(
        med1.atcCode,
        med2.atcCode,
        med1.name,
        med2.name
      );
      
      if (interaction) {
        interactions.push({
          ...interaction,
          medication1Id: med1._id,
          medication2Id: med2._id
        });
      }
    }
  }
  
  return interactions;
};

/**
 * Prüft Wechselwirkungen für ein neues Medikament gegen bestehende Medikamente
 * @param {Object} newMedication - Neues Medikament
 * @param {Array} existingMedications - Bestehende Medikamente
 * @returns {Array} Array von Wechselwirkungen
 */
const checkNewMedicationInteractions = (newMedication, existingMedications) => {
  const interactions = [];
  const activeMedications = existingMedications.filter(m => m.status === 'active');
  
  for (const existingMed of activeMedications) {
    const interaction = checkInteraction(
      newMedication.atcCode,
      existingMed.atcCode,
      newMedication.name,
      existingMed.name
    );
    
    if (interaction) {
      interactions.push({
        ...interaction,
        medication1Id: newMedication._id || 'new',
        medication2Id: existingMed._id
      });
    }
  }
  
  return interactions;
};

module.exports = {
  checkInteraction,
  checkAllInteractions,
  checkNewMedicationInteractions,
  KNOWN_INTERACTIONS
};






