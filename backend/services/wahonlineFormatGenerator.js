// WAHonline-Format-Generator
// Generiert WAHonline-konforme Datensätze für Wahlarzt-Abrechnungen

class WAHonlineFormatGenerator {
  constructor() {
    this.logger = console;
  }

  /**
   * Generiert eine WAHonline-Meldung für eine Wahlarzt-Leistung
   * @param {object} data - Abrechnungsdaten (performance, patient, doctor)
   * @returns {object} WAHonline-konformer Datensatz
   */
  generateMeldung(data) {
    this.validateMeldungData(data);
    const { performance, patient, doctor } = data;
    
    const serialNumber = this.generateSerialNumber();
    const creationDate = this.formatDate(new Date());

    return {
      Meldungstyp: 'Wahlarzt-Leistung',
      Version: '1.0',
      Seriennummer: serialNumber,
      Erstellungsdatum: creationDate,
      
      Arzt: {
        Kammernummer: doctor.profile?.chamberNumber || doctor.chamberNumber,
        Arztnummer: doctor.profile?.doctorNumber || doctor.doctorNumber,
        Steuernummer: doctor.profile?.taxNumber || doctor.taxNumber,
        Name: this.getDoctorName(doctor),
        Titel: doctor.profile?.title || doctor.title || '',
        Fachrichtung: doctor.profile?.specialization || doctor.specialization || '',
        Adresse: {
          Strasse: doctor.profile?.address?.street || doctor.address?.street || '',
          PLZ: doctor.profile?.address?.postalCode || doctor.address?.postalCode || '',
          Ort: doctor.profile?.address?.city || doctor.address?.city || '',
          Land: doctor.profile?.address?.country || doctor.address?.country || 'Österreich'
        }
      },
      
      Patient: {
        Sozialversicherungsnummer: patient.socialSecurityNumber || '',
        Vorname: patient.firstName || patient.first_name || '',
        Nachname: patient.lastName || patient.last_name || '',
        Geburtsdatum: this.formatDate(patient.dateOfBirth),
        Geschlecht: patient.gender || '',
        Adresse: {
          Strasse: patient.address?.street || '',
          PLZ: patient.address?.postalCode || '',
          Ort: patient.address?.city || '',
          Land: patient.address?.country || 'Österreich'
        }
      },
      
      Leistung: {
        Leistungscode: performance.serviceCode || '',
        Leistungsbeschreibung: performance.serviceDescription || '',
        Leistungsdatum: this.formatDate(performance.serviceDatetime),
        Einzelpreis: performance.unitPrice || 0,
        Menge: performance.quantity || 1,
        Gesamtpreis: performance.totalPrice || 0,
        GOAECode: performance.goaeCode || '', // Gebührenordnung für Ärzte
        Diagnosecodes: performance.diagnosisCodes || [],
        Medikamentencodes: performance.medicationCodes || []
      },
      
      Abrechnung: {
        Tariftyp: 'wahlarzt',
        Selbstbehalt: this.calculateCopay(performance.totalPrice || 0),
        Erstattungsbetrag: this.calculateRefund(performance.totalPrice || 0),
        Rechnungsnummer: performance.invoiceNumber || '',
        Rechnungsdatum: performance.billedAt ? this.formatDate(performance.billedAt) : creationDate
      },
      
      Metadaten: {
        ErstelltVon: this.getDoctorName(doctor),
        Erstellungszeitpunkt: new Date().toISOString(),
        System: 'OrdinationsSoftware',
        IdempotencyKey: performance.idempotencyKey || serialNumber
      }
    };
  }

  /**
   * Generiert eine Batch-Meldung für mehrere Leistungen
   * @param {Array} performances - Array von Leistungen mit patient/doctor Daten
   * @returns {object} WAHonline-konformer Batch-Datensatz
   */
  generateBatchMeldung(performances) {
    if (!Array.isArray(performances) || performances.length === 0) {
      throw new Error('Batch-Meldung erfordert mindestens eine Leistung');
    }

    const serialNumber = this.generateSerialNumber();
    const creationDate = this.formatDate(new Date());

    const meldungen = performances.map((item, index) => {
      try {
        return this.generateMeldung(item);
      } catch (error) {
        this.logger.error(`Fehler bei Generierung der Meldung ${index + 1}:`, error);
        throw new Error(`Meldung ${index + 1} konnte nicht generiert werden: ${error.message}`);
      }
    });

    return {
      BatchTyp: 'Wahlarzt-Leistungen',
      Version: '1.0',
      Seriennummer: serialNumber,
      Erstellungsdatum: creationDate,
      AnzahlMeldungen: meldungen.length,
      Meldungen: meldungen,
      
      Metadaten: {
        Erstellungszeitpunkt: new Date().toISOString(),
        System: 'OrdinationsSoftware',
        BatchId: serialNumber
      }
    };
  }

  /**
   * Validiert Meldungsdaten
   */
  validateMeldungData(data) {
    const errors = [];
    const warnings = [];
    
    if (!data.performance) {
      errors.push('Leistung (performance) fehlt');
    } else {
      if (!data.performance.serviceCode) warnings.push('Leistungscode fehlt (wird als leerer String verwendet)');
      if (!data.performance.serviceDescription) warnings.push('Leistungsbeschreibung fehlt (wird als leerer String verwendet)');
      if (!data.performance.serviceDatetime) warnings.push('Leistungsdatum fehlt (wird als null verwendet)');
      if (data.performance.totalPrice === undefined || data.performance.totalPrice === null) {
        warnings.push('Gesamtpreis fehlt (wird als 0 verwendet)');
      }
    }
    
    if (!data.patient) {
      errors.push('Patient fehlt');
    } else {
      if (!data.patient.socialSecurityNumber) errors.push('Sozialversicherungsnummer fehlt');
      if (!data.patient.firstName && !data.patient.first_name) warnings.push('Patient Vorname fehlt (wird als leerer String verwendet)');
      if (!data.patient.lastName && !data.patient.last_name) warnings.push('Patient Nachname fehlt (wird als leerer String verwendet)');
    }
    
    if (!data.doctor) {
      errors.push('Arzt fehlt');
    } else {
      const chamberNumber = data.doctor.profile?.chamberNumber || data.doctor.chamberNumber;
      if (!chamberNumber) warnings.push('Kammernummer fehlt (wird als leerer String verwendet)');
    }
    
    // Logge Warnungen (nicht kritisch)
    if (warnings.length > 0) {
      this.logger.warn('WAHonline-Format-Generierung Warnungen:', warnings.join(', '));
    }
    
    // Nur kritische Fehler werfen
    if (errors.length > 0) {
      throw new Error(`Validierungsfehler: ${errors.join(', ')}`);
    }
  }

  /**
   * Berechnet Selbstbehalt (typischerweise 20% bei Wahlarzt)
   */
  calculateCopay(totalPrice) {
    if (totalPrice === null || totalPrice === undefined || isNaN(totalPrice)) {
      return 0;
    }
    // Standard: 20% Selbstbehalt bei Wahlarzt-Leistungen
    return Math.round((totalPrice * 0.2) * 100) / 100;
  }

  /**
   * Berechnet Erstattungsbetrag (typischerweise 80% bei Wahlarzt)
   */
  calculateRefund(totalPrice) {
    if (totalPrice === null || totalPrice === undefined || isNaN(totalPrice)) {
      return 0;
    }
    // Standard: 80% Erstattung bei Wahlarzt-Leistungen
    return Math.round((totalPrice * 0.8) * 100) / 100;
  }

  /**
   * Extrahiert Arztname aus verschiedenen Strukturen
   */
  getDoctorName(doctor) {
    if (doctor.profile?.display_name) {
      return doctor.profile.display_name;
    }
    if (doctor.profile?.firstName && doctor.profile?.lastName) {
      return `${doctor.profile.firstName} ${doctor.profile.lastName}`;
    }
    if (doctor.profile?.first_name && doctor.profile?.last_name) {
      return `${doctor.profile.first_name} ${doctor.profile.last_name}`;
    }
    if (doctor.firstName && doctor.lastName) {
      return `${doctor.firstName} ${doctor.lastName}`;
    }
    if (doctor.name) {
      return doctor.name;
    }
    return 'Unbekannter Arzt';
  }

  /**
   * Generiert eindeutige Seriennummer
   */
  generateSerialNumber() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `WAH${timestamp}_${random}`;
  }

  /**
   * Formatiert Datum im WAHonline-Format (YYYY-MM-DD)
   */
  formatDate(date) {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  }

  /**
   * Escaped XML-Sonderzeichen (falls XML-Format benötigt wird)
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
}

module.exports = new WAHonlineFormatGenerator();

