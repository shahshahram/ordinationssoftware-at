// ÖGK-Tarifdatenbank Downloader
// Lädt aktuelle EBM-Tarifdaten von der ÖGK herunter

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const Tariff = require('../models/Tariff');
const tariffImporter = require('../utils/tariff-importer');

// PDF-Parsing optional (nur wenn pdf-parse installiert ist)
let pdf;
try {
  pdf = require('pdf-parse');
} catch (error) {
  console.warn('[OGK Tariff Downloader] pdf-parse nicht installiert. PDF-Parsing ist nicht verfügbar. Bitte installieren Sie pdf-parse mit: npm install pdf-parse');
}

class OGKTariffDownloader {
  constructor() {
    // ÖGK-URLs für Tarifdaten
    // Basierend auf Recherche: https://www.gesundheitskasse.at/cdscontent/
    // Die contentid-Parameter müssen von der ÖGK-Website ermittelt werden
    this.urls = {
      // EBM-Tarifdatenbank (Einheitlicher Bewertungsmaßstab)
      // TASY-Export Format (gültig ab 01.07.2023)
      ebmXml: process.env.OGK_EBM_XML_URL || 'https://www.gesundheitskasse.at/cdscontent/load?contentid=10007.850240&portal=oegkdgportal',
      ebmCsv: process.env.OGK_EBM_CSV_URL || 'https://www.gesundheitskasse.at/cdscontent/load?contentid=10007.850240&portal=oegkdgportal&format=csv',
      
      // KHO-Tarifdatenbank (Kassenhonorarordnung)
      // Tarifsystem Bereich: https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.784932
      khoXml: process.env.OGK_KHO_XML_URL || 'https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.784932&version=1704786268',
      khoCsv: process.env.OGK_KHO_CSV_URL || 'https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.784932&version=1704786268&format=csv',
      
      // GOÄ-Tarifdatenbank (Gebührenordnung für Ärzte)
      // Wird separat von der ÖGK bereitgestellt
      goaeXml: process.env.OGK_GOAE_XML_URL || 'https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.1234569&version=1',
      goaeCsv: process.env.OGK_GOAE_CSV_URL || 'https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.1234569&version=1&format=csv',
      
      // Basis-URL für Tarifsystem
      baseUrl: 'https://www.gesundheitskasse.at/cdscontent/',
      tarifsystemUrl: 'https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.784932'
    };
    
    // Cache-Verzeichnis
    this.cacheDir = process.env.OGK_TARIFF_CACHE_DIR || './cache/tariffs';
  }

  /**
   * Lädt EBM-Tarifdatenbank herunter
   */
  async downloadEBMTariffs(format = 'csv') {
    try {
      const url = format === 'csv' ? this.urls.ebmCsv : this.urls.ebmXml;
      
      console.log(`Lade EBM-Tarifdatenbank von ${url}...`);
      
      const response = await axios.get(url, {
        timeout: 60000, // 60 Sekunden
        responseType: 'text',
        headers: {
          'User-Agent': 'OrdinationsSoftware/1.0'
        }
      });

      // Erstelle Cache-Verzeichnis
      await fs.mkdir(this.cacheDir, { recursive: true });

      // Speichere heruntergeladene Datei
      const filename = `ebm-tariffs-${Date.now()}.${format}`;
      const filePath = path.join(this.cacheDir, filename);
      await fs.writeFile(filePath, response.data, 'utf8');

      console.log(`EBM-Tarifdatenbank erfolgreich heruntergeladen: ${filePath}`);

      return {
        success: true,
        filePath,
        format,
        size: response.data.length,
        downloadedAt: new Date()
      };
    } catch (error) {
      console.error('Fehler beim Herunterladen der EBM-Tarifdatenbank:', error.message);
      throw new Error(`EBM-Download fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Lädt KHO-Tarifdatenbank herunter
   */
  async downloadKHOTariffs(format = 'csv') {
    try {
      // ÖGK-URLs geben nur PDF zurück, daher verwenden wir immer die XML-URL
      // und akzeptieren PDF als Antwort
      const url = this.urls.khoXml;
      
      console.log(`Lade KHO-Tarifdatenbank von ${url}... (erwartetes Format: PDF)`);
      
      const response = await axios.get(url, {
        timeout: 120000, // 2 Minuten für große PDFs
        responseType: 'arraybuffer', // Wichtig für PDF-Binärdaten
        headers: {
          'User-Agent': 'OrdinationsSoftware/1.0'
        }
      });

      await fs.mkdir(this.cacheDir, { recursive: true });

      const filename = `kho-tariffs-${Date.now()}.pdf`;
      const filePath = path.join(this.cacheDir, filename);
      
      // Speichere PDF als Binärdatei
      await fs.writeFile(filePath, Buffer.from(response.data), 'binary');

      console.log(`KHO-Tarifdatenbank erfolgreich heruntergeladen (PDF): ${filePath}`);

      return {
        success: true,
        filePath,
        format: 'pdf', // Tatsächliches Format
        requestedFormat: format, // Ursprünglich angefordertes Format
        size: response.data.length,
        downloadedAt: new Date()
      };
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.error('KHO-URL nicht verfügbar (404):', error.message);
        throw new Error('KHO-URL nicht verfügbar (404). Bitte prüfen Sie die URL oder konfigurieren Sie eine gültige KHO-URL über die Umgebungsvariable OGK_KHO_XML_URL.');
      }
      console.error('Fehler beim Herunterladen der KHO-Tarifdatenbank:', error.message);
      throw new Error(`KHO-Download fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Lädt GOÄ-Tarifdatenbank herunter
   */
  async downloadGOAETariffs(format = 'csv') {
    try {
      const url = format === 'csv' ? this.urls.goaeCsv : this.urls.goaeXml;
      
      // Prüfe, ob URL konfiguriert ist (nicht Platzhalter)
      // Die Standard-URL enthält "10008.1234569" als Platzhalter
      if (!url || url.includes('10008.1234569') || url.includes('1234569') || url.includes('placeholder')) {
        throw new Error('GOÄ-URL nicht konfiguriert. GOÄ (Gebührenordnung für Ärzte) ist eine deutsche Gebührenordnung und wird normalerweise nicht von der ÖGK bereitgestellt. Bitte verwenden Sie KHO für österreichische Kassenarzt-Tarife oder konfigurieren Sie eine gültige GOÄ-URL über die Umgebungsvariable OGK_GOAE_XML_URL oder OGK_GOAE_CSV_URL.');
      }
      
      console.log(`Lade GOÄ-Tarifdatenbank von ${url}...`);
      
      const response = await axios.get(url, {
        timeout: 60000,
        responseType: 'text',
        headers: {
          'User-Agent': 'OrdinationsSoftware/1.0'
        }
      });

      await fs.mkdir(this.cacheDir, { recursive: true });

      const filename = `goae-tariffs-${Date.now()}.${format}`;
      const filePath = path.join(this.cacheDir, filename);
      await fs.writeFile(filePath, response.data, 'utf8');

      console.log(`GOÄ-Tarifdatenbank erfolgreich heruntergeladen: ${filePath}`);

      return {
        success: true,
        filePath,
        format,
        size: response.data.length,
        downloadedAt: new Date()
      };
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.error('GOÄ-URL nicht verfügbar:', error.message);
        throw new Error('GOÄ-URL nicht verfügbar (404). GOÄ (Gebührenordnung für Ärzte) ist eine deutsche Gebührenordnung und wird normalerweise nicht von der ÖGK bereitgestellt. Bitte verwenden Sie KHO für österreichische Kassenarzt-Tarife oder konfigurieren Sie eine gültige GOÄ-URL über die Umgebungsvariable OGK_GOAE_XML_URL oder OGK_GOAE_CSV_URL.');
      }
      console.error('Fehler beim Herunterladen der GOÄ-Tarifdatenbank:', error.message);
      throw new Error(`GOÄ-Download fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Lädt alle Tarifdatenbanken herunter
   */
  async downloadAllTariffs(format = 'csv') {
    const results = {
      ebm: null,
      kho: null,
      goae: null,
      errors: []
    };

    try {
      results.ebm = await this.downloadEBMTariffs(format);
    } catch (error) {
      results.errors.push({ type: 'ebm', error: error.message });
    }

    try {
      results.kho = await this.downloadKHOTariffs(format);
    } catch (error) {
      results.errors.push({ type: 'kho', error: error.message });
    }

    try {
      results.goae = await this.downloadGOAETariffs(format);
    } catch (error) {
      results.errors.push({ type: 'goae', error: error.message });
    }

    return results;
  }

  /**
   * Parst PDF-Tarifdaten und konvertiert sie in das interne Format
   * Extrahiert Text aus PDF und versucht, Tabellendaten zu erkennen
   */
  async parsePDF(filePath) {
    try {
      if (!pdf) {
        throw new Error('pdf-parse ist nicht installiert. Bitte installieren Sie pdf-parse mit: npm install pdf-parse');
      }
      
      console.log(`[PDF Parse] Lese PDF-Datei: ${filePath}`);
      
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdf(dataBuffer);
      
      console.log(`[PDF Parse] PDF gelesen: ${pdfData.numpages} Seiten, ${pdfData.text.length} Zeichen Text`);
      console.log(`[PDF Parse] Erste 1000 Zeichen: ${pdfData.text.substring(0, 1000)}`);
      
      const tariffs = [];
      const lines = pdfData.text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      console.log(`[PDF Parse] ${lines.length} Zeilen gefunden`);
      
      // Debug: Zeige einige Beispiel-Zeilen, die möglicherweise Tarife enthalten
      const sampleLines = lines.filter(line => 
        line.match(/\d{3,6}/) && // Enthält 3-6 Ziffern
        line.length > 5 && 
        line.length < 200 &&
        !line.match(/^(Seite|Editorial|Inhaltsverzeichnis|Index)/i)
      ).slice(0, 20);
      
      console.log(`[PDF Parse] Beispiel-Zeilen (mögliche Tarife):`, sampleLines);
      
      // Versuche, Tabellendaten zu extrahieren
      // Typische KHO-Tarifstruktur: Code, Name, Preis, etc.
      let currentTariff = null;
      let currentSection = null;
      let currentCategory = null;
      
      // Verschiedene Patterns für KHO-Codes:
      // - Numerische Codes: 100, 101, 200, etc.
      // - Alphanumerische Codes: K001, K002, A100, etc.
      // - Codes mit Bindestrich: 100-1, 200-2, etc.
      // - Positionen: Pos. Nr. 7, Pos. Nr. 8, etc.
      const codePatterns = [
        /Pos\.\s*Nr\.\s*(\d+[a-z]?)\s*(?:€\s*([\d,]+))?/i, // Position: Pos. Nr. 7 € 0,53
        /^([A-Z]?\d{3,6}[A-Z]?)\s+(.+?)(?:\s+(\d+[,.]?\d*)\s*€?)?/i, // Standard: Code Name Preis
        /^(\d{3,6})\s+(.+?)(?:\s+(\d+[,.]?\d*)\s*€?)?/i, // Numerisch: 100 Name Preis
        /^([A-Z]\d{3,6})\s+(.+?)(?:\s+(\d+[,.]?\d*)\s*€?)?/i, // Alphanumerisch: K100 Name Preis
        /^(\d{3,6}[-]\d+)\s+(.+?)(?:\s+(\d+[,.]?\d*)\s*€?)?/i, // Mit Bindestrich: 100-1 Name Preis
      ];
      
      // Patterns für Abschnitte und Kategorien
      const sectionPatterns = [
        /^A\.\s+Vergütung\s+Grundleistungen/i,
        /^B\.\s+Vergütung\s+Ordinationen\s+und\s+Besuche/i,
        /^C\.\s+Hausärztlicher\s+Notdienst/i,
        /^D\.\s+Vergütung\s+für\s+Sonderleistungen/i,
        /^I\.\s+Allgemeine\s+Sonderleistungen/i,
        /^II\.\s+Sonderleistungen\s+aus\s+den\s+Fachgebieten/i,
        /^III\.\s+Physikotherapie/i,
        /^IV\.\s+Elektrokardiographische\s+Untersuchungen/i,
        /^V\.\s+Röntgenleistungen/i,
        /^VI\.\s+Medizinisch-diagnostische\s+Laboratoriums/i,
      ];
      
      // Patterns für Punktwerte: € 0,53 oder € 0,74
      const pricePattern = /€\s*([\d,]+)/g;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Überspringe offensichtlich nicht-Tarif-Zeilen
        if (line.match(/^(Seite|Seite \d+|Inhaltsverzeichnis|Index|Editorial|Arbeitsbehelf|Honorarordnung|Punktwerte)/i)) {
          continue;
        }
        
        // Erkenne Abschnitte (A., B., C., etc.)
        for (const sectionPattern of sectionPatterns) {
          if (line.match(sectionPattern)) {
            const sectionMatch = line.match(/^([A-Z]+)\./);
            if (sectionMatch) {
              currentSection = sectionMatch[1];
              console.log(`[PDF Parse] Abschnitt erkannt: ${currentSection}`);
            }
            break;
          }
        }
        
        // Erkenne Positionen mit Punktwerten: "Pos. Nr. 7, 8 € 0,53"
        const positionMatch = line.match(/Pos\.\s*Nr\.\s*([\d\s,a-z]+)\s*€\s*([\d,]+)/i);
        if (positionMatch) {
          const positionNumbers = positionMatch[1].split(/[,\s]+/).filter(n => n.trim().length > 0);
          const priceStr = positionMatch[2].replace(',', '.');
          const price = Math.round(parseFloat(priceStr) * 100);
          
          // Erstelle einen Tarif für jede Position
          for (const posNum of positionNumbers) {
            const code = posNum.trim();
            tariffs.push({
              code: code,
              name: `Position ${code}`,
              description: currentSection ? `Abschnitt ${currentSection}` : '',
              tariffType: 'kho',
              kho: {
                khoCode: code,
                ebmCode: code, // Legacy-Feld
                khoPrice: price,
                price: price, // Legacy-Feld
                category: currentSection || '',
                requiresApproval: false,
                billingFrequency: 'once',
                insuranceProvider: 'oegk',
                federalState: 'oberoesterreich' // OÖ Honorarordnung
              },
              specialty: 'allgemein',
              validFrom: new Date('2023-01-01'),
              validUntil: null,
              isActive: true
            });
          }
          continue;
        }
        
        // Erkenne einzelne Positionen: "Pos. Nr. 7" oder "7" gefolgt von Preis
        const singlePositionMatch = line.match(/Pos\.\s*Nr\.\s*(\d+[a-z]?)/i);
        if (singlePositionMatch) {
          const code = singlePositionMatch[1];
          // Suche nach Preis in derselben oder nächsten Zeile
          let price = 0;
          const priceInLine = line.match(/€\s*([\d,]+)/);
          if (priceInLine) {
            price = Math.round(parseFloat(priceInLine[1].replace(',', '.')) * 100);
          } else if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            const priceInNextLine = nextLine.match(/€\s*([\d,]+)/);
            if (priceInNextLine) {
              price = Math.round(parseFloat(priceInNextLine[1].replace(',', '.')) * 100);
            }
          }
          
          if (price > 0) {
            tariffs.push({
              code: code,
              name: `Position ${code}`,
              description: currentSection ? `Abschnitt ${currentSection}` : '',
              tariffType: 'kho',
              kho: {
                khoCode: code,
                ebmCode: code,
                khoPrice: price,
                price: price,
                category: currentSection || '',
                requiresApproval: false,
                billingFrequency: 'once',
                insuranceProvider: 'oegk',
                federalState: 'oberoesterreich'
              },
              specialty: 'allgemein',
              validFrom: new Date('2023-01-01'),
              validUntil: null,
              isActive: true
            });
          }
          continue;
        }
        
        // Versuche andere Code-Patterns (für andere Tarifformate)
        let codeMatch = null;
        for (const pattern of codePatterns.slice(1)) { // Überspringe Position-Pattern, da bereits behandelt
          codeMatch = line.match(pattern);
          if (codeMatch) break;
        }
        
        if (codeMatch) {
          const code = codeMatch[1];
          const name = (codeMatch[2] || 'Unbenannt').trim();
          const priceStr = codeMatch[3] || '0';
          
          let price = 0;
          if (priceStr && priceStr !== '0') {
            price = Math.round(parseFloat(priceStr.replace(',', '.').replace(/[^\d.,]/g, '')) * 100);
          }
          
          // Wenn kein Preis in dieser Zeile, suche in nächsten Zeilen
          if (price === 0 && i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            const priceMatch = nextLine.match(/€\s*([\d,]+)/);
            if (priceMatch) {
              price = Math.round(parseFloat(priceMatch[1].replace(',', '.')) * 100);
            }
          }
          
          if (price > 0 || name.length > 3) {
            tariffs.push({
              code: code,
              name: name,
              description: currentSection ? `Abschnitt ${currentSection}` : '',
              tariffType: 'kho',
              kho: {
                khoCode: code,
                ebmCode: code,
                khoPrice: price,
                price: price,
                category: currentSection || '',
                requiresApproval: false,
                billingFrequency: 'once',
                insuranceProvider: 'oegk',
                federalState: 'oberoesterreich'
              },
              specialty: 'allgemein',
              validFrom: new Date('2023-01-01'),
              validUntil: null,
              isActive: true
            });
          }
        }
      }
      
      // Füge letzten Tarif hinzu
      if (currentTariff) {
        tariffs.push(currentTariff);
      }
      
      console.log(`[PDF Parse] ${tariffs.length} Tarife aus PDF extrahiert`);
      
      if (tariffs.length === 0) {
        throw new Error('Keine Tarifdaten im PDF gefunden. Das PDF-Format entspricht möglicherweise nicht dem erwarteten Format.');
      }
      
      return tariffs;
    } catch (error) {
      console.error('[PDF Parse] Fehler beim Parsen der PDF-Datei:', error);
      throw new Error(`PDF-Parsing fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Parst XML-Tarifdaten und konvertiert sie in das interne Format
   */
  async parseEBMXML(filePath) {
    try {
      console.log(`[XML Parse] Lese Datei: ${filePath}`);
      const xmlData = await fs.readFile(filePath, 'utf8');
      
      if (!xmlData || xmlData.trim().length === 0) {
        throw new Error('XML-Datei ist leer');
      }
      
      console.log(`[XML Parse] Datei gelesen: ${xmlData.length} Zeichen`);
      console.log(`[XML Parse] Erste 500 Zeichen: ${xmlData.substring(0, 500)}`);
      
      // Prüfe, ob es wirklich XML ist
      const trimmedData = xmlData.trim();
      
      // Prüfe auf PDF
      if (trimmedData.startsWith('%PDF')) {
        throw new Error('Die heruntergeladene Datei ist eine PDF-Datei, kein XML. Die ÖGK-URL gibt PDF-Dateien zurück. Bitte verwenden Sie das CSV-Format oder eine andere URL, die XML zurückgibt.');
      }
      
      // Prüfe auf HTML (möglicherweise Fehlerseite)
      if (trimmedData.startsWith('<!DOCTYPE') || trimmedData.startsWith('<html')) {
        throw new Error('Die heruntergeladene Datei ist eine HTML-Datei, kein XML. Möglicherweise ist die URL nicht verfügbar oder gibt eine Fehlerseite zurück.');
      }
      
      if (!trimmedData.startsWith('<?xml') && !trimmedData.startsWith('<')) {
        throw new Error('Die Datei scheint kein gültiges XML zu sein. Erwartet wird XML-Format, aber die Datei beginnt nicht mit "<?xml" oder "<".');
      }
      
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        ignoreNameSpace: true,
        removeNSPrefix: true,
        parseAttributeValue: true,
        trimValues: true,
        parseTrueNumberOnly: false
      });
      
      let jsonData;
      try {
        jsonData = parser.parse(xmlData);
        console.log(`[XML Parse] XML erfolgreich geparst. Struktur:`, Object.keys(jsonData || {}));
      } catch (parseError) {
        console.error('[XML Parse] Fehler beim Parsen:', parseError);
        console.error('[XML Parse] XML-Inhalt (erste 1000 Zeichen):', xmlData.substring(0, 1000));
        throw new Error(`XML-Parsing fehlgeschlagen: ${parseError.message}. Die Datei scheint kein gültiges XML zu enthalten oder hat ein unbekanntes Format.`);
      }
      
      // Konvertiere XML-Struktur in Tarif-Format
      // (Struktur hängt von der ÖGK-XML-Format ab)
      const tariffs = [];
      
      // Versuche verschiedene mögliche XML-Strukturen
      let tariffList = [];
      
      if (jsonData.tariffs && jsonData.tariffs.tariff) {
        tariffList = Array.isArray(jsonData.tariffs.tariff) 
          ? jsonData.tariffs.tariff 
          : [jsonData.tariffs.tariff];
      } else if (jsonData.tariff) {
        tariffList = Array.isArray(jsonData.tariff) 
          ? jsonData.tariff 
          : [jsonData.tariff];
      } else if (jsonData.root && jsonData.root.tariff) {
        tariffList = Array.isArray(jsonData.root.tariff) 
          ? jsonData.root.tariff 
          : [jsonData.root.tariff];
      } else {
        // Versuche, alle Objekte zu finden, die wie Tarife aussehen
        console.warn('[XML Parse] Standard-XML-Struktur nicht gefunden. Suche nach alternativen Strukturen...');
        console.log('[XML Parse] Verfügbare Top-Level-Keys:', Object.keys(jsonData || {}));
      }
      
      if (tariffList.length === 0) {
        throw new Error('Keine Tarif-Daten in der XML-Datei gefunden. Die XML-Struktur entspricht nicht dem erwarteten Format.');
      }
      
      console.log(`[XML Parse] ${tariffList.length} Tarife gefunden`);
      
      tariffList.forEach((tariff, index) => {
        try {
          const khoCode = tariff['@_code'] || tariff.code || tariff.khoCode || tariff.id || `TARIF-${index}`;
          
          tariffs.push({
            code: khoCode,
            name: tariff.name || tariff.description || tariff.title || 'Unbenannt',
            description: tariff.description || '',
            tariffType: 'kho',
            kho: {
              khoCode: khoCode, // Neues korrektes Feld
              ebmCode: khoCode, // Legacy-Feld für Backward Compatibility
              price: Math.round(parseFloat(tariff.price || tariff.amount || 0) * 100), // In Cent
              category: tariff.category || '',
              requiresApproval: tariff.requiresApproval === 'true' || tariff.requiresApproval === true,
              billingFrequency: tariff.billingFrequency || 'once',
              insuranceProvider: tariff.insuranceProvider || tariff.versicherungstraeger || 'oegk', // Standard: ÖGK
              federalState: tariff.federalState || tariff.bundesland || null // Optional: Bundesland
            },
            specialty: this.mapSpecialty(tariff.specialty || tariff.fachrichtung),
            validFrom: tariff.validFrom ? new Date(tariff.validFrom) : new Date(),
            validUntil: tariff.validUntil ? new Date(tariff.validUntil) : null,
            isActive: true
          });
        } catch (tariffError) {
          console.error(`[XML Parse] Fehler beim Verarbeiten eines Tarifs (Index ${index}):`, tariffError, tariff);
          // Überspringe fehlerhafte Tarife, aber fahre fort
        }
      });
      
      console.log(`[XML Parse] ${tariffs.length} Tarife erfolgreich konvertiert`);
      
      return tariffs;
    } catch (error) {
      console.error('[XML Parse] Fehler beim Parsen der XML-Datei:', error);
      throw new Error(`XML-Parsing fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Mappt Fachrichtung von ÖGK-Format zu internem Format
   */
  mapSpecialty(ogkSpecialty) {
    const mapping = {
      'Allgemeinmedizin': 'allgemeinmedizin',
      'Chirurgie': 'chirurgie',
      'Dermatologie': 'dermatologie',
      'Gynäkologie': 'gynaekologie',
      'Orthopädie': 'orthopaedie',
      'Neurologie': 'neurologie',
      'Kardiologie': 'kardiologie',
      'Pneumologie': 'pneumologie',
      'Gastroenterologie': 'gastroenterologie',
      'Urologie': 'urologie',
      'Ophthalmologie': 'ophthalmologie',
      'HNO': 'hno',
      'Psychiatrie': 'psychiatrie',
      'Radiologie': 'radiologie',
      'Labor': 'labor',
      'Pathologie': 'pathologie',
      'Anästhesie': 'anästhesie',
      'Notfallmedizin': 'notfallmedizin',
      'Sportmedizin': 'sportmedizin',
      'Arbeitsmedizin': 'arbeitsmedizin'
    };
    
    return mapping[ogkSpecialty] || 'allgemein';
  }

  /**
   * Lädt und importiert EBM-Tarifdatenbank
   */
  async downloadAndImportEBM(userId, format = 'csv') {
    try {
      // Lade herunter
      const downloadResult = await this.downloadEBMTariffs(format);
      
      // Importiere
      let importResult;
      if (format === 'csv') {
        importResult = await tariffImporter.importKHOFromCSV(downloadResult.filePath, userId);
      } else {
        const tariffs = await this.parseEBMXML(downloadResult.filePath);
        importResult = await tariffImporter.saveTariffs(tariffs.map(t => ({ ...t, createdBy: userId })));
      }
      
      return {
        success: true,
        download: downloadResult,
        import: importResult
      };
    } catch (error) {
      console.error('Fehler beim Download und Import der EBM-Tarifdatenbank:', error);
      throw error;
    }
  }

  /**
   * Lädt und importiert alle Tarifdatenbanken
   */
  async downloadAndImportAll(userId, format = 'csv') {
    const results = {
      ebm: null,
      kho: null,
      goae: null,
      errors: []
    };

    try {
      results.ebm = await this.downloadAndImportEBM(userId, format);
    } catch (error) {
      results.errors.push({ type: 'ebm', error: error.message });
    }

    try {
      const downloadResult = await this.downloadKHOTariffs(format);
      if (format === 'csv') {
        results.kho = await tariffImporter.importKHOFromCSV(downloadResult.filePath, userId);
      } else {
        const tariffs = await this.parseEBMXML(downloadResult.filePath);
        results.kho = await tariffImporter.saveTariffs(tariffs.map(t => ({ ...t, createdBy: userId })));
      }
    } catch (error) {
      results.errors.push({ type: 'kho', error: error.message });
    }

    try {
      const downloadResult = await this.downloadGOAETariffs(format);
      if (format === 'csv') {
        results.goae = await tariffImporter.importGOAEFromCSV(downloadResult.filePath, userId);
      } else {
        const tariffs = await this.parseEBMXML(downloadResult.filePath);
        results.goae = await tariffImporter.saveTariffs(tariffs.map(t => ({ ...t, createdBy: userId })));
      }
    } catch (error) {
      results.errors.push({ type: 'goae', error: error.message });
    }

    return results;
  }

  /**
   * Prüft auf Updates der Tarifdatenbank
   */
  async checkForUpdates() {
    try {
      // Prüfe letzte Änderung der Tarifdatenbank auf ÖGK-Website
      const response = await axios.head(this.urls.ebmXml, {
        timeout: 10000,
        headers: {
          'User-Agent': 'OrdinationsSoftware/1.0',
          'Accept': 'application/xml, text/xml, */*'
        }
      });

      const lastModified = response.headers['last-modified'];
      const etag = response.headers['etag'];
      const contentLength = response.headers['content-length'];

      // Prüfe ob bereits eine Datei im Cache existiert
      let cachedDate = null;
      try {
        await fs.mkdir(this.cacheDir, { recursive: true });
        const files = await fs.readdir(this.cacheDir);
        const ebmFiles = files.filter(f => f.startsWith('ebm-tariffs-'));
        if (ebmFiles.length > 0) {
          // Sortiere nach Datum (neueste zuerst)
          ebmFiles.sort().reverse();
          const latestFile = ebmFiles[0];
          const stats = await fs.stat(path.join(this.cacheDir, latestFile));
          cachedDate = stats.mtime;
        }
      } catch (error) {
        // Cache-Verzeichnis existiert noch nicht oder Fehler beim Lesen
      }

      const hasUpdate = !cachedDate || 
        (lastModified && new Date(lastModified) > cachedDate);

      return {
        hasUpdate,
        lastModified: lastModified ? new Date(lastModified) : null,
        cachedDate,
        etag,
        contentLength: contentLength ? parseInt(contentLength) : null
      };
    } catch (error) {
      console.error('Fehler beim Prüfen auf Updates:', error);
      return {
        hasUpdate: false,
        error: error.message
      };
    }
  }
  
  /**
   * Ruft Informationen über verfügbare Tarifdatenbanken ab
   */
  async getTariffInfo() {
    try {
      // Versuche HEAD-Request für alle URLs
      const info = {
        ebm: { available: false, lastModified: null, size: null },
        kho: { available: false, lastModified: null, size: null },
        goae: { available: false, lastModified: null, size: null }
      };

      // Prüfe EBM
      try {
        const ebmResponse = await axios.head(this.urls.ebmXml, {
          timeout: 5000,
          headers: { 'User-Agent': 'OrdinationsSoftware/1.0' }
        });
        info.ebm = {
          available: true,
          lastModified: ebmResponse.headers['last-modified'] 
            ? new Date(ebmResponse.headers['last-modified']) 
            : null,
          size: ebmResponse.headers['content-length'] 
            ? parseInt(ebmResponse.headers['content-length']) 
            : null
        };
      } catch (error) {
        console.warn('EBM-URL nicht verfügbar:', error.message);
      }

      // Prüfe KHO
      try {
        const khoResponse = await axios.head(this.urls.khoXml, {
          timeout: 5000,
          headers: { 'User-Agent': 'OrdinationsSoftware/1.0' }
        });
        info.kho = {
          available: true,
          lastModified: khoResponse.headers['last-modified'] 
            ? new Date(khoResponse.headers['last-modified']) 
            : null,
          size: khoResponse.headers['content-length'] 
            ? parseInt(khoResponse.headers['content-length']) 
            : null
        };
      } catch (error) {
        console.warn('KHO-URL nicht verfügbar:', error.message);
      }

      // Prüfe GOÄ
      try {
        const goaeResponse = await axios.head(this.urls.goaeXml, {
          timeout: 5000,
          headers: { 'User-Agent': 'OrdinationsSoftware/1.0' }
        });
        info.goae = {
          available: true,
          lastModified: goaeResponse.headers['last-modified'] 
            ? new Date(goaeResponse.headers['last-modified']) 
            : null,
          size: goaeResponse.headers['content-length'] 
            ? parseInt(goaeResponse.headers['content-length']) 
            : null
        };
      } catch (error) {
        console.warn('GOÄ-URL nicht verfügbar:', error.message);
      }

      return info;
    } catch (error) {
      console.error('Fehler beim Abrufen der Tarif-Informationen:', error);
      throw error;
    }
  }
}

module.exports = new OGKTariffDownloader();

