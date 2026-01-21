// WAHonline-Format-Generator
// Generiert WAHonline-konforme XML-Datensätze für Wahlarzt-Abrechnungen
// Basierend auf WAH_14_Test_Input.xml Beispiel von ELDA

class WAHonlineFormatGenerator {
  constructor() {
    this.logger = console;
  }

  /**
   * Generiert eine WAHonline-Meldung für eine Wahlarzt-Leistung
   * @param {object} data - Abrechnungsdaten (performance, patient, doctor)
   * @returns {object} WAHonline-konformer Datensatz (als Objekt, nicht XML)
   */
  generateMeldung(data) {
    this.validateMeldungData(data);
    const { performance, patient, doctor } = data;
    
    const now = new Date();
    const serviceDate = performance.serviceDatetime ? new Date(performance.serviceDatetime) : now;
    const invoiceDate = performance.billedAt ? new Date(performance.billedAt) : now;
    
    // Extrahiere Kammernummer und bestimme Bundesland und Abrechnungsstelle
    const chamberNumber = doctor.profile?.chamberNumber || doctor.chamberNumber || '14';
    const bundesland = this.getBundeslandFromChamberNumber(chamberNumber);
    const abrechnungsstelle = this.getAbrechnungsstelleFromChamberNumber(chamberNumber);
    // Vertragspartnernummer: Format "1000" + Kammernummer (z.B. "100014" für Kammernummer "14")
    const vertragspartnernummer = this.getVertragspartnernummer(chamberNumber);
    
    // Generiere Referenznummer (Format: [Seriennummer]/[Rechnungsnummer])
    const seriennummer = this.config?.sit?.seriennummer || '800062';
    const rechnungsnummer = performance.invoiceNumber || this.generateInvoiceNumber();
    const referenznummer = `${seriennummer}/${rechnungsnummer.replace(/[^0-9]/g, '')}`;

    return {
      // Root-Element: honorarnotenMeldung
      honorarnotenMeldung: {
        _attributes: {
          akz: 'a',
          'xmlns:n1': 'http://at.sozvers.stp.elda.wa',
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          'xsi:schemaLocation': 'http://at.sozvers.stp.elda.wa WA_V7.xsd'
        },
        patientenDaten: {
          // Diagnosen (optional)
          diagnosen: performance.diagnosisCodes && performance.diagnosisCodes.length > 0 ? {
            diagnose: performance.diagnosisCodes.map(code => typeof code === 'string' ? code : code.code || code.description)
          } : undefined,
          
          // Adresse des Patienten
          adresseDesPatienten: {
            postleitzahl: patient.address?.postalCode || '',
            strasseHausnummer: this.formatStreetAddress(patient.address),
            ort: patient.address?.city || ''
          },
          
          // Leistungsdaten
          leistungsDaten: {
            datumLeistungserbringungVon: this.formatDate(serviceDate),
            datumLeistungserbringungBis: this.formatDate(serviceDate),
            bruttoBetragProPosition: Math.round((performance.unitPrice || performance.totalPrice || 0) * 100) / 100,
            leistungsart: performance.serviceCode || '',
            positionsnummer: performance.positionNumber || '1010',
            positionsnummerAnzahl: performance.quantity || 1
          },
          
          // Daten Zahlungsempfänger (PFLICHT für WAHonline)
          // WICHTIG: Im Beispiel-XML immer vorhanden, daher als Pflichtfeld behandelt
          datenZahlungsempfaenger: {
            internationalBankAccountNumber: patient.bankAccount?.iban || patient.iban || '',
            versicherungsnummerZahlungsempfaenger: patient.bankAccount?.socialSecurityNumber || patient.socialSecurityNumber || ''
          },
          
          // Patientendaten
          patientDaten: {
            leistungsbestaetigungAnforderung: performance.confirmationRequired || false,
            rechnungsbetragBezahlt: performance.paid || true,
            versicherungsnummerVersicherter: patient.socialSecurityNumber || '',
            versicherungsnummerPatienten: patient.socialSecurityNumber || '',
            rechnungsbetrag: Math.round((performance.totalPrice || 0) * 100) / 100,
            familiennamePatienten: patient.lastName || patient.last_name || '',
            rechnungsnummer: rechnungsnummer,
            vornamePatienten: patient.firstName || patient.first_name || '',
            datumRechnung: this.formatDate(invoiceDate)
          }
        },
        
        // Infodaten
        infoDaten: {
          identifikationsSatz: {
            bundeslandAbrechnungsstelle: bundesland,
            listkennzeichen: 'HO', // HO = Honorarnoten
            projektkennzeichen: 'WA', // WA = WAHonline
            zustaendigeAbrechnungsstelle: abrechnungsstelle,
            versionDatenbestand: 7, // Version 7
            referenznummer: referenznummer
          },
          
          vertragspartnerDaten: {
            datumBehandlung: this.formatDate(serviceDate),
            datumUebermittlung: this.formatDateTime(now),
            fachgebietLeistungserbringerBehandler: this.getFachgebietCode(doctor.profile?.specialization || doctor.specialization || ''),
            familiennameBehandler: this.getLastName(doctor),
            vertragspartnernummerBehandler: vertragspartnernummer,
            vornameBehandler: this.getFirstName(doctor),
            ordiAdresseDesVertragspartners: {
              postleitzahl: doctor.profile?.address?.postalCode || doctor.address?.postalCode || '',
              strasseHausnummer: this.formatStreetAddress(doctor.profile?.address || doctor.address || {}),
              ort: doctor.profile?.address?.city || doctor.address?.city || ''
            }
          }
        }
      }
    };
  }

  /**
   * Generiert XML aus WAHonline-Datensatz
   * @param {object} dataset - WAHonline-Datensatz (von generateMeldung)
   * @returns {string} XML-String
   */
  generateXML(dataset) {
    const root = dataset.honorarnotenMeldung;
    const attrs = root._attributes;

    // Baue Root-Element mit Attributen in der exakten Reihenfolge wie im Beispiel-XML
    // Reihenfolge im Beispiel: akz, xsi:schemaLocation, xmlns:n1, xmlns:xsi
    const attrsOrdered = [
      `akz="${this.escapeXML(String(attrs.akz || 'a'))}"`,
      `xsi:schemaLocation="${this.escapeXML(String(attrs['xsi:schemaLocation'] || ''))}"`,
      `xmlns:n1="${this.escapeXML(String(attrs['xmlns:n1'] || ''))}"`,
      `xmlns:xsi="${this.escapeXML(String(attrs['xmlns:xsi'] || ''))}"`
    ].join(' ');

    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<n1:honorarnotenMeldung ${attrsOrdered}>`
    ];
    
    // Verarbeite patientenDaten
    if (root.patientenDaten) {
      lines.push(this.buildPatientenDaten(root.patientenDaten, 1));
    }
    
    // Verarbeite infoDaten
    if (root.infoDaten) {
      lines.push(this.buildInfoDaten(root.infoDaten, 1));
    }
    
    lines.push('</n1:honorarnotenMeldung>');
    
    return lines.join('\n');
  }

  /**
   * Baut patientenDaten XML
   */
  buildPatientenDaten(data, indent) {
    const tab = '\t';
    const tabs = tab.repeat(indent);
    const lines = [`${tabs}<patientenDaten>`];
    
    // Diagnosen (optional)
    if (data.diagnosen && data.diagnosen.diagnose && data.diagnosen.diagnose.length > 0) {
      lines.push(`${tabs}${tab}<diagnosen>`);
      data.diagnosen.diagnose.forEach(diagnose => {
        lines.push(`${tabs}${tab}${tab}<diagnose>${this.escapeXML(String(diagnose))}</diagnose>`);
      });
      lines.push(`${tabs}${tab}</diagnosen>`);
    }
    
    // Adresse des Patienten
    if (data.adresseDesPatienten) {
      const addr = data.adresseDesPatienten;
      lines.push(`${tabs}${tab}<adresseDesPatienten>`);
      lines.push(`${tabs}${tab}${tab}<postleitzahl>${this.escapeXML(String(addr.postleitzahl || ''))}</postleitzahl>`);
      lines.push(`${tabs}${tab}${tab}<strasseHausnummer>${this.escapeXML(String(addr.strasseHausnummer || ''))}</strasseHausnummer>`);
      lines.push(`${tabs}${tab}${tab}<ort>${this.escapeXML(String(addr.ort || ''))}</ort>`);
      lines.push(`${tabs}${tab}</adresseDesPatienten>`);
    }
    
    // Leistungsdaten
    if (data.leistungsDaten) {
      const leistung = data.leistungsDaten;
      lines.push(`${tabs}${tab}<leistungsDaten>`);
      lines.push(`${tabs}${tab}${tab}<datumLeistungserbringungVon>${this.escapeXML(String(leistung.datumLeistungserbringungVon || ''))}</datumLeistungserbringungVon>`);
      lines.push(`${tabs}${tab}${tab}<datumLeistungserbringungBis>${this.escapeXML(String(leistung.datumLeistungserbringungBis || ''))}</datumLeistungserbringungBis>`);
      lines.push(`${tabs}${tab}${tab}<bruttoBetragProPosition>${this.escapeXML(String(leistung.bruttoBetragProPosition || ''))}</bruttoBetragProPosition>`);
      lines.push(`${tabs}${tab}${tab}<leistungsart>${this.escapeXML(String(leistung.leistungsart || ''))}</leistungsart>`);
      lines.push(`${tabs}${tab}${tab}<positionsnummer>${this.escapeXML(String(leistung.positionsnummer || ''))}</positionsnummer>`);
      lines.push(`${tabs}${tab}${tab}<positionsnummerAnzahl>${this.escapeXML(String(leistung.positionsnummerAnzahl || ''))}</positionsnummerAnzahl>`);
      lines.push(`${tabs}${tab}</leistungsDaten>`);
    }
    
    // Daten Zahlungsempfänger (PFLICHT für WAHonline)
    // WICHTIG: Im Beispiel-XML immer vorhanden, daher als Pflichtfeld behandelt
    if (data.datenZahlungsempfaenger) {
      const zahlung = data.datenZahlungsempfaenger;
      lines.push(`${tabs}${tab}<datenZahlungsempfaenger>`);
      // IBAN ist optional
      if (zahlung.internationalBankAccountNumber) {
        lines.push(`${tabs}${tab}${tab}<internationalBankAccountNumber>${this.escapeXML(String(zahlung.internationalBankAccountNumber))}</internationalBankAccountNumber>`);
      }
      // versicherungsnummerZahlungsempfaenger ist PFLICHT (mindestens die SV-Nummer des Patienten)
      // Im Beispiel-XML immer vorhanden, daher immer ausgeben
      const svnr = zahlung.versicherungsnummerZahlungsempfaenger || '';
      lines.push(`${tabs}${tab}${tab}<versicherungsnummerZahlungsempfaenger>${this.escapeXML(String(svnr))}</versicherungsnummerZahlungsempfaenger>`);
      lines.push(`${tabs}${tab}</datenZahlungsempfaenger>`);
    }
    
    // Patientendaten
    if (data.patientDaten) {
      const patient = data.patientDaten;
      lines.push(`${tabs}${tab}<patientDaten>`);
      lines.push(`${tabs}${tab}${tab}<leistungsbestaetigungAnforderung>${this.escapeXML(String(patient.leistungsbestaetigungAnforderung || false))}</leistungsbestaetigungAnforderung>`);
      lines.push(`${tabs}${tab}${tab}<rechnungsbetragBezahlt>${this.escapeXML(String(patient.rechnungsbetragBezahlt || true))}</rechnungsbetragBezahlt>`);
      lines.push(`${tabs}${tab}${tab}<versicherungsnummerVersicherter>${this.escapeXML(String(patient.versicherungsnummerVersicherter || ''))}</versicherungsnummerVersicherter>`);
      lines.push(`${tabs}${tab}${tab}<versicherungsnummerPatienten>${this.escapeXML(String(patient.versicherungsnummerPatienten || ''))}</versicherungsnummerPatienten>`);
      lines.push(`${tabs}${tab}${tab}<rechnungsbetrag>${this.escapeXML(String(patient.rechnungsbetrag || ''))}</rechnungsbetrag>`);
      lines.push(`${tabs}${tab}${tab}<familiennamePatienten>${this.escapeXML(String(patient.familiennamePatienten || ''))}</familiennamePatienten>`);
      lines.push(`${tabs}${tab}${tab}<rechnungsnummer>${this.escapeXML(String(patient.rechnungsnummer || ''))}</rechnungsnummer>`);
      lines.push(`${tabs}${tab}${tab}<vornamePatienten>${this.escapeXML(String(patient.vornamePatienten || ''))}</vornamePatienten>`);
      lines.push(`${tabs}${tab}${tab}<datumRechnung>${this.escapeXML(String(patient.datumRechnung || ''))}</datumRechnung>`);
      lines.push(`${tabs}${tab}</patientDaten>`);
    }
    
    lines.push(`${tabs}</patientenDaten>`);
    return lines.join('\n');
  }

  /**
   * Baut infoDaten XML
   */
  buildInfoDaten(data, indent) {
    const tab = '\t';
    const tabs = tab.repeat(indent);
    const lines = [`${tabs}<infoDaten>`];
    
    // Identifikationssatz
    if (data.identifikationsSatz) {
      const ident = data.identifikationsSatz;
      lines.push(`${tabs}${tab}<identifikationsSatz>`);
      lines.push(`${tabs}${tab}${tab}<bundeslandAbrechnungsstelle>${this.escapeXML(String(ident.bundeslandAbrechnungsstelle || ''))}</bundeslandAbrechnungsstelle>`);
      lines.push(`${tabs}${tab}${tab}<listkennzeichen>${this.escapeXML(String(ident.listkennzeichen || ''))}</listkennzeichen>`);
      lines.push(`${tabs}${tab}${tab}<projektkennzeichen>${this.escapeXML(String(ident.projektkennzeichen || ''))}</projektkennzeichen>`);
      lines.push(`${tabs}${tab}${tab}<zustaendigeAbrechnungsstelle>${this.escapeXML(String(ident.zustaendigeAbrechnungsstelle || ''))}</zustaendigeAbrechnungsstelle>`);
      lines.push(`${tabs}${tab}${tab}<versionDatenbestand>${this.escapeXML(String(ident.versionDatenbestand || ''))}</versionDatenbestand>`);
      lines.push(`${tabs}${tab}${tab}<referenznummer>${this.escapeXML(String(ident.referenznummer || ''))}</referenznummer>`);
      lines.push(`${tabs}${tab}</identifikationsSatz>`);
    }
    
    // Vertragspartnerdaten
    if (data.vertragspartnerDaten) {
      const vp = data.vertragspartnerDaten;
      lines.push(`${tabs}${tab}<vertragspartnerDaten>`);
      lines.push(`${tabs}${tab}${tab}<datumBehandlung>${this.escapeXML(String(vp.datumBehandlung || ''))}</datumBehandlung>`);
      lines.push(`${tabs}${tab}${tab}<datumUebermittlung>${this.escapeXML(String(vp.datumUebermittlung || ''))}</datumUebermittlung>`);
      lines.push(`${tabs}${tab}${tab}<fachgebietLeistungserbringerBehandler>${this.escapeXML(String(vp.fachgebietLeistungserbringerBehandler || ''))}</fachgebietLeistungserbringerBehandler>`);
      lines.push(`${tabs}${tab}${tab}<familiennameBehandler>${this.escapeXML(String(vp.familiennameBehandler || ''))}</familiennameBehandler>`);
      lines.push(`${tabs}${tab}${tab}<vertragspartnernummerBehandler>${this.escapeXML(String(vp.vertragspartnernummerBehandler || ''))}</vertragspartnernummerBehandler>`);
      lines.push(`${tabs}${tab}${tab}<vornameBehandler>${this.escapeXML(String(vp.vornameBehandler || ''))}</vornameBehandler>`);
      
      // Ordinationsadresse
      if (vp.ordiAdresseDesVertragspartners) {
        const ordi = vp.ordiAdresseDesVertragspartners;
        lines.push(`${tabs}${tab}${tab}<ordiAdresseDesVertragspartners>`);
        lines.push(`${tabs}${tab}${tab}${tab}<postleitzahl>${this.escapeXML(String(ordi.postleitzahl || ''))}</postleitzahl>`);
        lines.push(`${tabs}${tab}${tab}${tab}<strasseHausnummer>${this.escapeXML(String(ordi.strasseHausnummer || ''))}</strasseHausnummer>`);
        lines.push(`${tabs}${tab}${tab}${tab}<ort>${this.escapeXML(String(ordi.ort || ''))}</ort>`);
        lines.push(`${tabs}${tab}${tab}</ordiAdresseDesVertragspartners>`);
      }
      
      lines.push(`${tabs}${tab}</vertragspartnerDaten>`);
    }
    
    lines.push(`${tabs}</infoDaten>`);
    return lines.join('\n');
  }

  /**
   * Konvertiert Objekt zu XML-Elementen
   * DEPRECATED: Diese Funktion wird nicht mehr verwendet. Verwenden Sie buildPatientenDaten() und buildInfoDaten().
   */
  objectToXML_DEPRECATED(obj, indent = 0, namespacePrefix = '') {
    const tab = '\t';
    const tabs = tab.repeat(indent);
    const lines = [];
    
    // Root-Element mit Attributen
    if (obj._attributes) {
      const attrs = [];
      for (const [key, value] of Object.entries(obj._attributes)) {
        attrs.push(`${key}="${this.escapeXML(String(value))}"`);
      }
      const tagName = namespacePrefix ? `${namespacePrefix}:honorarnotenMeldung` : 'honorarnotenMeldung';
      lines.push(`${tabs}<${tagName}${attrs.length > 0 ? ' ' + attrs.join(' ') : ''}>`);
    } else {
      // Normales Element - bestimme Tag-Name aus dem ersten Key
      const keys = Object.keys(obj).filter(k => k !== '_attributes');
      if (keys.length === 0) {
        return ''; // Leeres Objekt
      }
      const tagName = namespacePrefix ? `${namespacePrefix}:${this.camelToTagName(keys[0])}` : this.camelToTagName(keys[0]);
      lines.push(`${tabs}<${tagName}>`);
    }
    
    // Verarbeite alle anderen Eigenschaften in der richtigen Reihenfolge
    const orderedKeys = this.getOrderedKeys(obj);
    
    for (const key of orderedKeys) {
      if (key === '_attributes') continue;
      
      const value = obj[key];
      if (value === null || value === undefined) {
        continue; // Überspringe null/undefined Werte
      }
      
      const tagName = this.camelToTagName(key);
      
      if (Array.isArray(value)) {
        // Array: Jedes Element wird als eigenes Tag ausgegeben
        value.forEach(item => {
          if (typeof item === 'object') {
            // Objekt im Array: Rekursiv verarbeiten
            lines.push(`${tabs}${tab}<${tagName}>`);
            lines.push(this.objectToXML(item, indent + 1, ''));
            lines.push(`${tabs}${tab}</${tagName}>`);
          } else {
            // Einfacher Wert im Array
            lines.push(`${tabs}${tab}<${tagName}>${this.escapeXML(String(item))}</${tagName}>`);
          }
        });
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Objekt: Rekursiv verarbeiten
        lines.push(`${tabs}${tab}<${tagName}>`);
        const innerXML = this.objectToXML(value, indent + 1, '');
        if (innerXML) {
          lines.push(innerXML);
        }
        lines.push(`${tabs}${tab}</${tagName}>`);
      } else {
        // Einfacher Wert (String, Number, Boolean)
        const stringValue = typeof value === 'boolean' ? String(value) : String(value);
        lines.push(`${tabs}${tab}<${tagName}>${this.escapeXML(stringValue)}</${tagName}>`);
      }
    }
    
    // Closing Tag
    if (obj._attributes) {
      const closingTag = namespacePrefix ? `${namespacePrefix}:honorarnotenMeldung` : 'honorarnotenMeldung';
      lines.push(`${tabs}</${closingTag}>`);
    } else {
      const keys = Object.keys(obj).filter(k => k !== '_attributes');
      if (keys.length > 0) {
        const closingTag = namespacePrefix ? `${namespacePrefix}:${this.camelToTagName(keys[0])}` : this.camelToTagName(keys[0]);
        lines.push(`${tabs}</${closingTag}>`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Gibt Schlüssel in der richtigen Reihenfolge zurück (basierend auf Beispiel)
   */
  getOrderedKeys(obj) {
    // Reihenfolge basierend auf WAH_14_Test_Input.xml
    const order = {
      'patientenDaten': ['diagnosen', 'adresseDesPatienten', 'leistungsDaten', 'datenZahlungsempfaenger', 'patientDaten'],
      'infoDaten': ['identifikationsSatz', 'vertragspartnerDaten'],
      'identifikationsSatz': ['bundeslandAbrechnungsstelle', 'listkennzeichen', 'projektkennzeichen', 'zustaendigeAbrechnungsstelle', 'versionDatenbestand', 'referenznummer'],
      'vertragspartnerDaten': ['datumBehandlung', 'datumUebermittlung', 'fachgebietLeistungserbringerBehandler', 'familiennameBehandler', 'vertragspartnernummerBehandler', 'vornameBehandler', 'ordiAdresseDesVertragspartners'],
      'adresseDesPatienten': ['postleitzahl', 'strasseHausnummer', 'ort'],
      'ordiAdresseDesVertragspartners': ['postleitzahl', 'strasseHausnummer', 'ort'],
      'leistungsDaten': ['datumLeistungserbringungVon', 'datumLeistungserbringungBis', 'bruttoBetragProPosition', 'leistungsart', 'positionsnummer', 'positionsnummerAnzahl'],
      'patientDaten': ['leistungsbestaetigungAnforderung', 'rechnungsbetragBezahlt', 'versicherungsnummerVersicherter', 'versicherungsnummerPatienten', 'rechnungsbetrag', 'familiennamePatienten', 'rechnungsnummer', 'vornamePatienten', 'datumRechnung'],
      'datenZahlungsempfaenger': ['internationalBankAccountNumber', 'versicherungsnummerZahlungsempfaenger']
    };
    
    const keys = Object.keys(obj).filter(k => k !== '_attributes');
    const firstKey = keys[0];
    
    if (order[firstKey]) {
      // Verwende vordefinierte Reihenfolge
      const ordered = [];
      const used = new Set();
      
      for (const key of order[firstKey]) {
        if (keys.includes(key)) {
          ordered.push(key);
          used.add(key);
        }
      }
      
      // Füge restliche Keys hinzu
      for (const key of keys) {
        if (!used.has(key)) {
          ordered.push(key);
        }
      }
      
      return ordered;
    }
    
    return keys;
  }

  /**
   * Konvertiert camelCase zu Tag-Name (z.B. patientenDaten -> patientenDaten)
   */
  camelToTagName(camelCase) {
    return camelCase; // WAHonline verwendet camelCase direkt
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
   * Formatiert Straßenadresse (Straße + Hausnummer)
   */
  formatStreetAddress(address) {
    if (!address) return '';
    const street = address.street || '';
    const houseNumber = address.houseNumber || address.house_number || '';
    if (houseNumber) {
      return `${street} ${houseNumber}`.trim();
    }
    return street;
  }

  /**
   * Formatiert Datum im Format YYYY-MM-DD
   */
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Formatiert Datum mit Zeit im Format YYYY-MM-DDTHH:mm:ss
   */
  formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  /**
   * Bestimmt Bundesland aus Kammernummer
   * WICHTIG: Kammernummer kann "14" oder "100014" sein - extrahiere die eigentliche Kammernummer
   */
  getBundeslandFromChamberNumber(chamberNumber) {
    const chamberStr = String(chamberNumber);
    
    // Wenn Vertragspartnernummer-Format (z.B. "100014"), extrahiere Kammernummer
    let actualChamberNumber = chamberStr;
    if (chamberStr.startsWith('1000') && chamberStr.length > 4) {
      actualChamberNumber = chamberStr.substring(4); // Extrahiere "14" aus "100014"
    }
    
    // Mapping: Kammernummer -> Bundesland-Code
    // 1 = Burgenland (9), 2 = Kärnten (1), 3 = Niederösterreich (2), 4 = Oberösterreich (4), etc.
    const mapping = {
      '1': '9',   // Burgenland
      '2': '1',   // Kärnten
      '3': '2',   // Niederösterreich
      '4': '4',   // Oberösterreich
      '5': '4',   // Salzburg
      '6': '5',   // Steiermark
      '7': '6',   // Tirol
      '8': '7',   // Vorarlberg
      '9': '8',   // Wien
      '14': '4'   // Oberösterreich (explizit)
    };
    
    // Prüfe zuerst explizite Mappings
    if (mapping[actualChamberNumber]) {
      return mapping[actualChamberNumber];
    }
    
    // Dann prüfe erste Ziffer
    const firstDigit = actualChamberNumber.charAt(0);
    if (mapping[firstDigit]) {
      return mapping[firstDigit];
    }
    
    // Default: Oberösterreich (4)
    return '4';
  }

  /**
   * Bestimmt Abrechnungsstelle aus Kammernummer
   */
  getAbrechnungsstelleFromChamberNumber(chamberNumber) {
    // Abrechnungsstelle ist die Kammernummer (z.B. "14" für Oberösterreich)
    return String(chamberNumber);
  }

  /**
   * Generiert Vertragspartnernummer aus Kammernummer
   * Format: "1000" + Kammernummer (z.B. "100014" für Kammernummer "14")
   */
  getVertragspartnernummer(chamberNumber) {
    const chamberStr = String(chamberNumber);
    
    // Format: "1000" + Kammernummer (mindestens 2-stellig)
    if (chamberStr.length <= 2) {
      return `1000${chamberStr.padStart(2, '0')}`;
    }
    
    // Wenn bereits länger, verwende direkt
    return chamberStr;
  }

  /**
   * Konvertiert Fachrichtung zu Fachgebiet-Code
   */
  getFachgebietCode(specialization) {
    const mapping = {
      'Allgemeinmedizin': '01',
      'Innere Medizin': '02',
      'Chirurgie': '03',
      'Gynäkologie': '04',
      'Pädiatrie': '05',
      'Neurologie': '06',
      'Psychiatrie': '07',
      'Dermatologie': '08',
      'Urologie': '09',
      'Orthopädie': '10',
      'Augenheilkunde': '11',
      'HNO': '12',
      'Radiologie': '13',
      'Anästhesie': '14'
    };
    
    for (const [key, value] of Object.entries(mapping)) {
      if (specialization.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    
    return '01'; // Default: Allgemeinmedizin
  }

  /**
   * Extrahiert Nachname aus Arzt-Objekt
   */
  getLastName(doctor) {
    if (doctor.profile?.lastName) return doctor.profile.lastName;
    if (doctor.profile?.last_name) return doctor.profile.last_name;
    if (doctor.lastName) return doctor.lastName;
    if (doctor.last_name) return doctor.last_name;
    if (doctor.name) {
      const parts = doctor.name.split(' ');
      return parts[parts.length - 1] || '';
    }
    return '';
  }

  /**
   * Extrahiert Vorname aus Arzt-Objekt
   */
  getFirstName(doctor) {
    if (doctor.profile?.firstName) return doctor.profile.firstName;
    if (doctor.profile?.first_name) return doctor.profile.first_name;
    if (doctor.firstName) return doctor.firstName;
    if (doctor.first_name) return doctor.first_name;
    if (doctor.name) {
      const parts = doctor.name.split(' ');
      return parts[0] || '';
    }
    return '';
  }

  /**
   * Generiert Rechnungsnummer
   */
  generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 99999);
    return `${year}/${random}`;
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
      if (!data.performance.serviceCode) warnings.push('Leistungscode fehlt');
      if (!data.performance.totalPrice && data.performance.totalPrice !== 0) {
        warnings.push('Gesamtpreis fehlt');
      }
    }
    
    if (!data.patient) {
      errors.push('Patient fehlt');
    } else {
      if (!data.patient.socialSecurityNumber) {
        errors.push('Sozialversicherungsnummer fehlt');
      }
      if (!data.patient.firstName && !data.patient.first_name) {
        warnings.push('Patient Vorname fehlt');
      }
      if (!data.patient.lastName && !data.patient.last_name) {
        warnings.push('Patient Nachname fehlt');
      }
    }
    
    if (!data.doctor) {
      errors.push('Arzt fehlt');
    } else {
      const chamberNumber = data.doctor.profile?.chamberNumber || data.doctor.chamberNumber;
      if (!chamberNumber) {
        warnings.push('Kammernummer fehlt');
      }
    }
    
    if (warnings.length > 0) {
      this.logger.warn('WAHonline-Format-Generierung Warnungen:', warnings.join(', '));
    }
    
    if (errors.length > 0) {
      throw new Error(`Validierungsfehler: ${errors.join(', ')}`);
    }
  }

  /**
   * Setzt Konfiguration (für SIT-Seriennummer)
   */
  setConfig(config) {
    this.config = config;
  }
}

module.exports = new WAHonlineFormatGenerator();
