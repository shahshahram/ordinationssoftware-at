// ELDA-Format-Generator
// Generiert ELDA-konforme Datensätze für verschiedene Datensatztypen

class ELDAFormatGenerator {
  /**
   * Generiert KSB (Krankenstandsbescheinigung) Datensatz
   * @param {object} data - KSB-Daten
   * @returns {object} ELDA-konformer KSB-Datensatz
   */
  generateKSB(data) {
    const {
      patient,
      doctor,
      illness,
      dates,
      diagnosis,
      notes
    } = data;

    return {
      Datensatztyp: 'KSB',
      Version: '1.0',
      Seriennummer: this.generateSerialNumber('KSB'),
      Erstellungsdatum: new Date().toISOString(),
      
      Patient: {
        Sozialversicherungsnummer: patient.socialSecurityNumber,
        Vorname: patient.firstName,
        Nachname: patient.lastName,
        Geburtsdatum: this.formatDate(patient.dateOfBirth),
        Geschlecht: patient.gender || '',
        Adresse: {
          Strasse: patient.address?.street || '',
          PLZ: patient.address?.postalCode || '',
          Ort: patient.address?.city || '',
          Land: patient.address?.country || 'Österreich'
        }
      },
      
      Arzt: {
        Steuernummer: doctor.taxNumber,
        Kammernummer: doctor.chamberNumber,
        Name: doctor.name || `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim(),
        Titel: doctor.title || '',
        Fachrichtung: doctor.specialization || '',
        Adresse: {
          Strasse: doctor.address?.street || '',
          PLZ: doctor.address?.postalCode || '',
          Ort: doctor.address?.city || '',
          Land: doctor.address?.country || 'Österreich'
        }
      },
      
      Krankheit: {
        Beginn: this.formatDate(illness.startDate),
        Ende: illness.endDate ? this.formatDate(illness.endDate) : null,
        VoraussichtlicheDauer: illness.expectedDuration || null,
        Arbeitsunfaehig: illness.unableToWork !== false, // Default: true
        Diagnose: {
          ICD10Code: diagnosis?.icd10Code || '',
          Beschreibung: diagnosis?.description || '',
          Primar: diagnosis?.isPrimary !== false
        }
      },
      
      Bemerkungen: notes || '',
      
      Metadaten: {
        ErstelltVon: doctor.name || '',
        Erstellungszeitpunkt: new Date().toISOString(),
        System: 'OrdinationsSoftware'
      }
    };
  }

  /**
   * Generiert Lohnmeldung Datensatz
   * @param {object} data - Lohnmeldungs-Daten
   * @returns {object} ELDA-konformer Lohnmeldungs-Datensatz
   */
  generateLohnmeldung(data) {
    const {
      employee,
      employer,
      period,
      salary,
      insurance
    } = data;

    return {
      Datensatztyp: 'Lohnmeldung',
      Version: '1.0',
      Seriennummer: this.generateSerialNumber('LHM'),
      Erstellungsdatum: new Date().toISOString(),
      
      Arbeitnehmer: {
        Sozialversicherungsnummer: employee.socialSecurityNumber,
        Vorname: employee.firstName,
        Nachname: employee.lastName,
        Geburtsdatum: this.formatDate(employee.dateOfBirth),
        Geschlecht: employee.gender || '',
        Adresse: {
          Strasse: employee.address?.street || '',
          PLZ: employee.address?.postalCode || '',
          Ort: employee.address?.city || '',
          Land: employee.address?.country || 'Österreich'
        }
      },
      
      Arbeitgeber: {
        Steuernummer: employer.taxNumber,
        Firmenname: employer.companyName,
        Adresse: {
          Strasse: employer.address?.street || '',
          PLZ: employer.address?.postalCode || '',
          Ort: employer.address?.city || '',
          Land: employer.address?.country || 'Österreich'
        }
      },
      
      Abrechnungsperiode: {
        Von: this.formatDate(period.startDate),
        Bis: this.formatDate(period.endDate),
        Jahr: period.year || new Date().getFullYear(),
        Monat: period.month || new Date().getMonth() + 1
      },
      
      Lohn: {
        Bruttolohn: salary.grossSalary || 0,
        Nettolohn: salary.netSalary || 0,
        Sozialversicherungsbeitrag: salary.socialInsuranceContribution || 0,
        Lohnsteuer: salary.incomeTax || 0
      },
      
      Versicherung: {
        Versicherungstraeger: insurance.provider || 'ÖGK',
        Versicherungsnummer: insurance.number || '',
        Beitragsgruppe: insurance.contributionGroup || ''
      },
      
      Metadaten: {
        ErstelltVon: employer.companyName || '',
        Erstellungszeitpunkt: new Date().toISOString(),
        System: 'OrdinationsSoftware'
      }
    };
  }

  /**
   * Generiert Abrechnungs-Datensatz
   * @param {object} data - Abrechnungs-Daten
   * @returns {object} ELDA-konformer Abrechnungs-Datensatz
   */
  generateAbrechnung(data) {
    const {
      patient,
      doctor,
      services,
      period,
      totals
    } = data;

    return {
      Datensatztyp: 'Abrechnung',
      Version: '1.0',
      Seriennummer: this.generateSerialNumber('ABR'),
      Erstellungsdatum: new Date().toISOString(),
      
      Patient: {
        Sozialversicherungsnummer: patient.socialSecurityNumber,
        Vorname: patient.firstName,
        Nachname: patient.lastName,
        Geburtsdatum: this.formatDate(patient.dateOfBirth),
        Versicherungsnummer: patient.insuranceNumber || '',
        Versicherungstraeger: patient.insuranceProvider || 'ÖGK',
        Adresse: {
          Strasse: patient.address?.street || '',
          PLZ: patient.address?.postalCode || '',
          Ort: patient.address?.city || '',
          Land: patient.address?.country || 'Österreich'
        }
      },
      
      Arzt: {
        Steuernummer: doctor.taxNumber,
        Kammernummer: doctor.chamberNumber,
        Name: doctor.name || `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim(),
        Titel: doctor.title || '',
        Fachrichtung: doctor.specialization || '',
        Adresse: {
          Strasse: doctor.address?.street || '',
          PLZ: doctor.address?.postalCode || '',
          Ort: doctor.address?.city || '',
          Land: doctor.address?.country || 'Österreich'
        }
      },
      
      Abrechnungsperiode: {
        Von: this.formatDate(period.startDate),
        Bis: this.formatDate(period.endDate),
        Jahr: period.year || new Date().getFullYear(),
        Monat: period.month || new Date().getMonth() + 1
      },
      
      Leistungen: (services || []).map(service => ({
        Leistungsdatum: this.formatDate(service.date),
        Leistungscode: service.code || '',
        EBMCode: service.khoCode || service.ebmCode || service.code || '',
        Beschreibung: service.description || '',
        Menge: service.quantity || 1,
        Einzelpreis: service.unitPrice || 0,
        Gesamtpreis: service.totalPrice || 0,
        Selbstbehalt: service.copay || 0,
        Versicherungsanteil: (service.totalPrice || 0) - (service.copay || 0)
      })),
      
      Summen: {
        Gesamtbetrag: totals?.totalAmount || 0,
        Selbstbehalt: totals?.totalCopay || 0,
        Versicherungsanteil: totals?.insuranceAmount || 0,
        AnzahlLeistungen: services?.length || 0
      },
      
      Metadaten: {
        ErstelltVon: doctor.name || '',
        Erstellungszeitpunkt: new Date().toISOString(),
        System: 'OrdinationsSoftware'
      }
    };
  }

  /**
   * Generiert XML aus Datensatz
   * @param {object} dataset - ELDA-Datensatz
   * @param {string} datasetType - Datensatztyp
   * @returns {string} XML-String
   */
  generateXML(dataset, datasetType) {
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<ELDADataset xmlns="http://www.elda.at/schema/${datasetType}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`,
      this.objectToXML(dataset, 2),
      '</ELDADataset>'
    ].join('\n');
    
    return xml;
  }

  /**
   * Konvertiert Objekt zu XML-Elementen
   */
  objectToXML(obj, indent = 0) {
    const spaces = ' '.repeat(indent);
    const lines = [];
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        continue;
      }
      
      if (Array.isArray(value)) {
        value.forEach(item => {
          lines.push(`${spaces}<${key}>`);
          if (typeof item === 'object') {
            lines.push(this.objectToXML(item, indent + 2));
          } else {
            lines.push(`${spaces}  ${this.escapeXML(String(item))}`);
          }
          lines.push(`${spaces}</${key}>`);
        });
      } else if (typeof value === 'object') {
        lines.push(`${spaces}<${key}>`);
        lines.push(this.objectToXML(value, indent + 2));
        lines.push(`${spaces}</${key}>`);
      } else {
        lines.push(`${spaces}<${key}>${this.escapeXML(String(value))}</${key}>`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Escaped XML-Sonderzeichen
   */
  escapeXML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Formatiert Datum im Format YYYY-MM-DD
   */
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  }

  /**
   * Generiert Seriennummer für Datensatz
   */
  generateSerialNumber(prefix) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Validiert Datensatz vor Generierung
   */
  validateDataset(data, datasetType) {
    const errors = [];
    
    switch (datasetType) {
      case 'KSB':
        if (!data.patient?.socialSecurityNumber) {
          errors.push('Sozialversicherungsnummer des Patienten fehlt');
        }
        if (!data.doctor?.taxNumber) {
          errors.push('Steuernummer des Arztes fehlt');
        }
        if (!data.illness?.startDate) {
          errors.push('Krankheitsbeginn fehlt');
        }
        break;
        
      case 'Lohnmeldung':
        if (!data.employee?.socialSecurityNumber) {
          errors.push('Sozialversicherungsnummer des Arbeitnehmers fehlt');
        }
        if (!data.employer?.taxNumber) {
          errors.push('Steuernummer des Arbeitgebers fehlt');
        }
        if (!data.period?.startDate || !data.period?.endDate) {
          errors.push('Abrechnungsperiode fehlt');
        }
        break;
        
      case 'Abrechnung':
        if (!data.patient?.socialSecurityNumber) {
          errors.push('Sozialversicherungsnummer des Patienten fehlt');
        }
        if (!data.doctor?.taxNumber) {
          errors.push('Steuernummer des Arztes fehlt');
        }
        if (!data.services || data.services.length === 0) {
          errors.push('Keine Leistungen vorhanden');
        }
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new ELDAFormatGenerator();




