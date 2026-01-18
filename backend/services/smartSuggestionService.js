const PatientExtended = require('../models/PatientExtended');
const PatientDiagnosis = require('../models/PatientDiagnosis');
const PatientMedication = require('../models/PatientMedication');
const LaborResult = require('../models/LaborResult');
const Appointment = require('../models/Appointment');
const VitalSigns = require('../models/VitalSigns');
const logger = require('../utils/logger');

/**
 * Intelligenter Vorschlags-Service
 * Generiert kontextbezogene Vorschläge basierend auf Patientendaten
 */
class SmartSuggestionService {
  /**
   * Generiert intelligente Vorschläge für einen Patienten
   * @param {string} patientId - ID des Patienten
   * @param {string} userId - ID des Benutzers (für personalisierte Vorschläge)
   * @returns {Promise<Object>} Vorschläge kategorisiert nach Typ
   */
  async generateSuggestions(patientId, userId = null) {
    try {
      const patient = await PatientExtended.findById(patientId)
        .populate('insuranceProvider')
        .lean();

      if (!patient) {
        return { success: false, error: 'Patient nicht gefunden' };
      }

      const suggestions = {
        diagnoses: [],
        medications: [],
        appointments: [],
        laboratory: [],
        vitalSigns: [],
        documents: [],
        general: []
      };

      // Parallele Datenabfrage
      const [
        diagnoses,
        medications,
        recentLabResults,
        recentAppointments,
        recentVitalSigns
      ] = await Promise.all([
        PatientDiagnosis.find({ patientId }).sort({ onsetDate: -1 }).limit(10).lean(),
        PatientMedication.find({ patientId }).sort({ startDate: -1 }).limit(20).lean(),
        LaborResult.find({ patientId }).sort({ resultDate: -1 }).limit(5).lean(),
        Appointment.find({ patient: patientId }).sort({ startTime: -1 }).limit(5).lean(),
        VitalSigns.find({ patientId }).sort({ recordedAt: -1 }).limit(5).lean()
      ]);

      // 1. Diagnose-Vorschläge
      suggestions.diagnoses = await this.suggestDiagnoses(patient, diagnoses, medications, recentLabResults, recentVitalSigns);

      // 2. Medikamenten-Vorschläge
      suggestions.medications = await this.suggestMedications(patient, diagnoses, medications, recentLabResults);

      // 3. Termin-Vorschläge
      suggestions.appointments = await this.suggestAppointments(patient, diagnoses, medications, recentAppointments);

      // 4. Labor-Vorschläge
      suggestions.laboratory = await this.suggestLaboratory(patient, diagnoses, medications, recentLabResults);

      // 5. Vitalwerte-Vorschläge
      suggestions.vitalSigns = await this.suggestVitalSigns(patient, recentVitalSigns, diagnoses);

      // 6. Dokumenten-Vorschläge
      suggestions.documents = await this.suggestDocuments(patient, diagnoses, recentAppointments);

      // 7. Allgemeine Vorschläge
      suggestions.general = await this.suggestGeneral(patient, diagnoses, medications, recentAppointments, recentLabResults);

      return {
        success: true,
        suggestions,
        patientId,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Fehler beim Generieren von Vorschlägen:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Vorschläge für Diagnosen basierend auf Symptomen, Vitalwerten und Laborwerten
   */
  async suggestDiagnoses(patient, diagnoses, medications, labResults, vitalSigns) {
    const suggestions = [];
    const now = new Date();

    // Prüfe auf häufige Kombinationen
    const hasHighBloodPressure = vitalSigns.some(vs => vs.systolicBP > 140 || vs.diastolicBP > 90);
    const hasHighBloodSugar = labResults.some(lr => 
      lr.results?.some(r => r.name?.toLowerCase().includes('glucose') && r.value > 100)
    );
    const hasHighCholesterol = labResults.some(lr =>
      lr.results?.some(r => r.name?.toLowerCase().includes('cholesterol') && r.value > 200)
    );

    // Diabetes-Vorschlag
    if (hasHighBloodSugar && !diagnoses.some(d => d.display?.toLowerCase().includes('diabetes'))) {
      suggestions.push({
        type: 'diagnosis',
        category: 'endocrinology',
        title: 'Mögliche Diabetes-Diagnose',
        description: 'Erhöhte Blutzuckerwerte deuten auf möglichen Diabetes hin. Bitte weitere Untersuchungen durchführen.',
        priority: 'high',
        icd10Code: 'E11',
        icd10Title: 'Diabetes mellitus, Typ 2',
        confidence: 0.7,
        reason: 'Erhöhte Blutzuckerwerte in Laborbefunden',
        action: 'Weitere Diagnostik empfohlen: HbA1c, Nüchternblutzucker'
      });
    }

    // Hypertonie-Vorschlag
    if (hasHighBloodPressure && !diagnoses.some(d => d.display?.toLowerCase().includes('hypertonie'))) {
      suggestions.push({
        type: 'diagnosis',
        category: 'cardiology',
        title: 'Mögliche Hypertonie',
        description: 'Erhöhte Blutdruckwerte deuten auf mögliche Hypertonie hin.',
        priority: 'medium',
        icd10Code: 'I10',
        icd10Title: 'Essentielle Hypertonie',
        confidence: 0.6,
        reason: 'Wiederholt erhöhte Blutdruckwerte',
        action: 'Langzeit-Blutdruckmessung empfohlen'
      });
    }

    // Hypercholesterinämie-Vorschlag
    if (hasHighCholesterol && !diagnoses.some(d => d.display?.toLowerCase().includes('cholesterol'))) {
      suggestions.push({
        type: 'diagnosis',
        category: 'metabolism',
        title: 'Mögliche Hypercholesterinämie',
        description: 'Erhöhte Cholesterinwerte deuten auf mögliche Hypercholesterinämie hin.',
        priority: 'medium',
        icd10Code: 'E78.0',
        icd10Title: 'Reine Hypercholesterinämie',
        confidence: 0.6,
        reason: 'Erhöhte Cholesterinwerte in Laborbefunden',
        action: 'Lipidprofil und Ernährungsberatung empfohlen'
      });
    }

    // Follow-up für aktive Diagnosen
    const activeDiagnoses = diagnoses.filter(d => !d.resolved && d.onsetDate);
    for (const diagnosis of activeDiagnoses) {
      const daysSinceOnset = Math.floor((now - new Date(diagnosis.onsetDate)) / (1000 * 60 * 60 * 24));
      
      if (daysSinceOnset > 90 && daysSinceOnset < 180) {
        suggestions.push({
          type: 'diagnosis',
          category: 'follow-up',
          title: `Follow-up für: ${diagnosis.display}`,
          description: `Die Diagnose "${diagnosis.display}" wurde vor ${daysSinceOnset} Tagen gestellt. Ein Follow-up-Termin wird empfohlen.`,
          priority: 'normal',
          relatedDiagnosis: diagnosis._id,
          confidence: 0.8,
          reason: 'Aktive Diagnose ohne kürzlichen Termin',
          action: 'Nachsorgetermin vereinbaren'
        });
      }
    }

    return suggestions;
  }

  /**
   * Vorschläge für Medikamente basierend auf Diagnosen
   */
  async suggestMedications(patient, diagnoses, medications, labResults) {
    const suggestions = [];
    const now = new Date();

    // Medikamenten-Vorschläge basierend auf Diagnosen
    const diagnosisMedicationMap = {
      'diabetes': { name: 'Metformin', category: 'Antidiabetika', atc: 'A10BA02' },
      'hypertonie': { name: 'ACE-Hemmer', category: 'Antihypertensiva', atc: 'C09AA' },
      'hypercholesterinämie': { name: 'Statine', category: 'Lipidsenker', atc: 'C10AA' },
      'infektion': { name: 'Antibiotika', category: 'Antibiotika', atc: 'J01' }
    };

    for (const diagnosis of diagnoses) {
      if (diagnosis.resolved) continue;

      const diagnosisLower = diagnosis.display?.toLowerCase() || '';
      
      for (const [key, med] of Object.entries(diagnosisMedicationMap)) {
        if (diagnosisLower.includes(key) && !medications.some(m => 
          m.name?.toLowerCase().includes(med.name.toLowerCase())
        )) {
          suggestions.push({
            type: 'medication',
            category: med.category,
            title: `Medikamenten-Vorschlag: ${med.name}`,
            description: `Basierend auf der Diagnose "${diagnosis.display}" könnte ${med.name} indiziert sein.`,
            priority: 'medium',
            medicationName: med.name,
            atcCode: med.atc,
            relatedDiagnosis: diagnosis._id,
            confidence: 0.6,
            reason: `Diagnose "${diagnosis.display}" erfordert möglicherweise medikamentöse Therapie`,
            action: 'Bitte prüfen Sie die Indikation und verschreiben Sie bei Bedarf'
          });
        }
      }
    }

    // Medikamenten-Review für langfristige Medikation
    for (const medication of medications) {
      if (medication.startDate) {
        const daysSinceStart = Math.floor((now - new Date(medication.startDate)) / (1000 * 60 * 60 * 24));
        
        if (daysSinceStart > 365) {
          suggestions.push({
            type: 'medication',
            category: 'review',
            title: `Medikamenten-Review: ${medication.name}`,
            description: `${medication.name} wird seit ${Math.floor(daysSinceStart / 30)} Monaten eingenommen. Ein Review wird empfohlen.`,
            priority: 'normal',
            relatedMedication: medication._id,
            confidence: 0.8,
            reason: 'Langfristige Medikation ohne kürzliches Review',
            action: 'Medikamenten-Review durchführen'
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Vorschläge für Termine
   */
  async suggestAppointments(patient, diagnoses, medications, recentAppointments) {
    const suggestions = [];
    const now = new Date();

    // Nachsorgetermine für aktive Diagnosen
    const activeDiagnoses = diagnoses.filter(d => !d.resolved);
    const lastAppointment = recentAppointments[0];

    for (const diagnosis of activeDiagnoses) {
      if (!diagnosis.onsetDate) continue;

      const daysSinceOnset = Math.floor((now - new Date(diagnosis.onsetDate)) / (1000 * 60 * 60 * 24));
      const daysSinceLastAppointment = lastAppointment 
        ? Math.floor((now - new Date(lastAppointment.startTime)) / (1000 * 60 * 60 * 24))
        : Infinity;

      // Vorschlag für Nachsorgetermin nach 3 Monaten
      if (daysSinceOnset > 90 && daysSinceLastAppointment > 90) {
        suggestions.push({
          type: 'appointment',
          category: 'follow-up',
          title: `Nachsorgetermin für: ${diagnosis.display}`,
          description: `Die Diagnose "${diagnosis.display}" wurde vor ${Math.floor(daysSinceOnset / 30)} Monaten gestellt. Ein Nachsorgetermin wird empfohlen.`,
          priority: 'normal',
          suggestedDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // In 1 Woche
          relatedDiagnosis: diagnosis._id,
          confidence: 0.8,
          reason: 'Aktive Diagnose ohne kürzlichen Termin',
          action: 'Nachsorgetermin vereinbaren'
        });
      }
    }

    // Vorschlag für Kontrolltermin bei langfristiger Medikation
    for (const medication of medications) {
      if (medication.startDate) {
        const daysSinceStart = Math.floor((now - new Date(medication.startDate)) / (1000 * 60 * 60 * 24));
        
        if (daysSinceStart > 180 && daysSinceLastAppointment > 90) {
          suggestions.push({
            type: 'appointment',
            category: 'medication-review',
            title: `Kontrolltermin für Medikation`,
            description: `${medication.name} wird seit ${Math.floor(daysSinceStart / 30)} Monaten eingenommen. Ein Kontrolltermin wird empfohlen.`,
            priority: 'normal',
            suggestedDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // In 2 Wochen
            relatedMedication: medication._id,
            confidence: 0.7,
            reason: 'Langfristige Medikation erfordert regelmäßige Kontrolle',
            action: 'Kontrolltermin vereinbaren'
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Vorschläge für Laboruntersuchungen
   */
  async suggestLaboratory(patient, diagnoses, medications, recentLabResults) {
    const suggestions = [];
    const now = new Date();

    // Vorschläge basierend auf Diagnosen
    const diagnosisLabMap = {
      'diabetes': ['HbA1c', 'Nüchternblutzucker', 'Glukose-Toleranztest'],
      'hypertonie': ['Kreatinin', 'Elektrolyte', 'Lipidprofil'],
      'hypercholesterinämie': ['Gesamtcholesterin', 'LDL', 'HDL', 'Triglyceride'],
      'niere': ['Kreatinin', 'Harnstoff', 'GFR'],
      'leber': ['GPT', 'GOT', 'Gamma-GT', 'Bilirubin']
    };

    for (const diagnosis of diagnoses) {
      if (diagnosis.resolved) continue;

      const diagnosisLower = diagnosis.display?.toLowerCase() || '';
      
      for (const [key, labTests] of Object.entries(diagnosisLabMap)) {
        if (diagnosisLower.includes(key)) {
          // Prüfe, ob diese Tests kürzlich durchgeführt wurden
          const lastLabDate = recentLabResults[0]?.resultDate;
          const daysSinceLastLab = lastLabDate 
            ? Math.floor((now - new Date(lastLabDate)) / (1000 * 60 * 60 * 24))
            : Infinity;

          if (daysSinceLastLab > 90) {
            suggestions.push({
              type: 'laboratory',
              category: 'diagnostic',
              title: `Laboruntersuchung empfohlen: ${labTests.join(', ')}`,
              description: `Basierend auf der Diagnose "${diagnosis.display}" werden folgende Laboruntersuchungen empfohlen: ${labTests.join(', ')}`,
              priority: 'normal',
              suggestedTests: labTests,
              relatedDiagnosis: diagnosis._id,
              confidence: 0.7,
              reason: `Diagnose "${diagnosis.display}" erfordert regelmäßige Laboruntersuchungen`,
              action: 'Laborauftrag erstellen'
            });
          }
        }
      }
    }

    return suggestions;
  }

  /**
   * Vorschläge für Vitalwerte
   */
  async suggestVitalSigns(patient, recentVitalSigns, diagnoses) {
    const suggestions = [];
    const now = new Date();

    const lastVitalSigns = recentVitalSigns[0];
    const daysSinceLastVitalSigns = lastVitalSigns
      ? Math.floor((now - new Date(lastVitalSigns.recordedAt)) / (1000 * 60 * 60 * 24))
      : Infinity;

    // Vorschlag für regelmäßige Vitalwerte-Erfassung
    if (daysSinceLastVitalSigns > 365) {
      suggestions.push({
        type: 'vitalSigns',
        category: 'routine',
        title: 'Vitalwerte-Erfassung empfohlen',
        description: 'Die letzten Vitalwerte wurden vor über einem Jahr erfasst. Eine aktuelle Erfassung wird empfohlen.',
        priority: 'normal',
        confidence: 0.9,
        reason: 'Keine aktuellen Vitalwerte vorhanden',
        action: 'Vitalwerte erfassen'
      });
    }

    // Vorschlag für regelmäßige Kontrolle bei bestimmten Diagnosen
    const requiresRegularVitalSigns = diagnoses.some(d => {
      const dLower = d.display?.toLowerCase() || '';
      return dLower.includes('hypertonie') || dLower.includes('diabetes') || dLower.includes('herz');
    });

    if (requiresRegularVitalSigns && daysSinceLastVitalSigns > 90) {
      suggestions.push({
        type: 'vitalSigns',
        category: 'monitoring',
        title: 'Regelmäßige Vitalwerte-Kontrolle',
        description: 'Bei Ihren Diagnosen wird eine regelmäßige Erfassung der Vitalwerte empfohlen.',
        priority: 'medium',
        confidence: 0.8,
        reason: 'Diagnose erfordert regelmäßige Vitalwerte-Kontrolle',
        action: 'Vitalwerte erfassen'
      });
    }

    return suggestions;
  }

  /**
   * Vorschläge für Dokumente
   */
  async suggestDocuments(patient, diagnoses, recentAppointments) {
    const suggestions = [];
    const now = new Date();

    // Vorschlag für Arztbrief bei neuen Diagnosen
    const newDiagnoses = diagnoses.filter(d => {
      if (!d.onsetDate) return false;
      const daysSinceOnset = Math.floor((now - new Date(d.onsetDate)) / (1000 * 60 * 60 * 24));
      return daysSinceOnset < 30;
    });

    for (const diagnosis of newDiagnoses) {
      suggestions.push({
        type: 'document',
        category: 'communication',
        title: `Arztbrief für: ${diagnosis.display}`,
        description: `Ein Arztbrief für die neue Diagnose "${diagnosis.display}" könnte für die Kommunikation mit anderen Ärzten hilfreich sein.`,
        priority: 'low',
        documentType: 'Arztbrief',
        relatedDiagnosis: diagnosis._id,
        confidence: 0.6,
        reason: 'Neue Diagnose erfordert möglicherweise Dokumentation',
        action: 'Arztbrief erstellen'
      });
    }

    return suggestions;
  }

  /**
   * Allgemeine Vorschläge
   */
  async suggestGeneral(patient, diagnoses, medications, recentAppointments, recentLabResults) {
    const suggestions = [];
    const now = new Date();

    // Fehlende wichtige Daten
    if (!patient.dateOfBirth) {
      suggestions.push({
        type: 'general',
        category: 'data-completion',
        title: 'Geburtsdatum fehlt',
        description: 'Das Geburtsdatum des Patienten fehlt. Bitte ergänzen Sie diese wichtige Information.',
        priority: 'medium',
        confidence: 1.0,
        reason: 'Wichtige Patientendaten fehlen',
        action: 'Geburtsdatum erfassen'
      });
    }

    if (!patient.email && !patient.phone) {
      suggestions.push({
        type: 'general',
        category: 'data-completion',
        title: 'Kontaktdaten fehlen',
        description: 'Es fehlen E-Mail-Adresse oder Telefonnummer. Bitte ergänzen Sie mindestens eine Kontaktmöglichkeit.',
        priority: 'normal',
        confidence: 1.0,
        reason: 'Kontaktdaten fehlen',
        action: 'Kontaktdaten erfassen'
      });
    }

    // Allergien prüfen
    if (!patient.allergies || patient.allergies.length === 0) {
      suggestions.push({
        type: 'general',
        category: 'safety',
        title: 'Allergien nicht dokumentiert',
        description: 'Es sind keine Allergien dokumentiert. Bitte prüfen und dokumentieren Sie Allergien für die Patientensicherheit.',
        priority: 'high',
        confidence: 0.9,
        reason: 'Allergien sind wichtig für die Patientensicherheit',
        action: 'Allergien prüfen und dokumentieren'
      });
    }

    return suggestions;
  }
}

module.exports = new SmartSuggestionService();
