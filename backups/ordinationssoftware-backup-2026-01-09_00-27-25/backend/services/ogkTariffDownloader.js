// ÖGK-Tarifdatenbank Downloader
// Lädt aktuelle EBM-Tarifdaten von der ÖGK herunter

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const Tariff = require('../models/Tariff');
const tariffImporter = require('../utils/tariff-importer');

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
      const url = format === 'csv' ? this.urls.khoCsv : this.urls.khoXml;
      
      console.log(`Lade KHO-Tarifdatenbank von ${url}...`);
      
      const response = await axios.get(url, {
        timeout: 60000,
        responseType: 'text',
        headers: {
          'User-Agent': 'OrdinationsSoftware/1.0'
        }
      });

      await fs.mkdir(this.cacheDir, { recursive: true });

      const filename = `kho-tariffs-${Date.now()}.${format}`;
      const filePath = path.join(this.cacheDir, filename);
      await fs.writeFile(filePath, response.data, 'utf8');

      console.log(`KHO-Tarifdatenbank erfolgreich heruntergeladen: ${filePath}`);

      return {
        success: true,
        filePath,
        format,
        size: response.data.length,
        downloadedAt: new Date()
      };
    } catch (error) {
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
   * Parst XML-Tarifdaten und konvertiert sie in das interne Format
   */
  async parseEBMXML(filePath) {
    try {
      const xmlData = await fs.readFile(filePath, 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_'
      });
      
      const jsonData = parser.parse(xmlData);
      
      // Konvertiere XML-Struktur in Tarif-Format
      // (Struktur hängt von der ÖGK-XML-Format ab)
      const tariffs = [];
      
      // TODO: XML-Struktur anpassen basierend auf tatsächlichem ÖGK-Format
      if (jsonData.tariffs && jsonData.tariffs.tariff) {
        const tariffList = Array.isArray(jsonData.tariffs.tariff) 
          ? jsonData.tariffs.tariff 
          : [jsonData.tariffs.tariff];
        
        tariffList.forEach(tariff => {
          tariffs.push({
            code: tariff['@_code'] || tariff.code,
            name: tariff.name || tariff.description,
            description: tariff.description || '',
            tariffType: 'kho',
            kho: {
              ebmCode: tariff['@_code'] || tariff.code,
              price: Math.round(parseFloat(tariff.price || 0) * 100),
              category: tariff.category || '',
              requiresApproval: tariff.requiresApproval === 'true',
              billingFrequency: tariff.billingFrequency || 'once'
            },
            specialty: this.mapSpecialty(tariff.specialty),
            validFrom: tariff.validFrom ? new Date(tariff.validFrom) : new Date(),
            validUntil: tariff.validUntil ? new Date(tariff.validUntil) : null,
            isActive: true
          });
        });
      }
      
      return tariffs;
    } catch (error) {
      console.error('Fehler beim Parsen der XML-Datei:', error);
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

