// Tarif-Importer für GOÄ, KHO, ET
// Importiert Tarifdaten aus CSV/JSON-Dateien

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { Transform, PassThrough } = require('stream');
const Tariff = require('../models/Tariff');

/**
 * Punktwerte nach Bundesland (in Euro)
 * Diese Werte werden für die Berechnung von khoPrice aus Punkten verwendet
 */
// NEU: Verwende zentrale Config-Datei für Punktwerte
const federalStateConfig = require('./federal-state-config');

/**
 * Ermittelt Punktwert für ein Bundesland (verwendet zentrale Config)
 * @deprecated Verwende direkt federalStateConfig.getPointValueForState()
 */
function getPointValueForState(federalState) {
  return federalStateConfig.getPointValueForState(federalState);
}

class TariffImporter {
  /**
   * Importiert GOÄ-Tarife aus CSV
   * Format: code,name,section,number,basePrice,multiplier,minMultiplier,maxMultiplier,specialty
   */
  async importGOAEFromCSV(filePath, userId) {
    const tariffs = [];
    
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          tariffs.push({
            code: row.code || `${row.section}-${row.number}`,
            name: row.name,
            description: row.description || '',
            tariffType: 'goae',
            goae: {
              section: row.section,
              number: row.number,
              basePrice: Math.round(parseFloat(row.basePrice || 0) * 100), // In Cent
              multiplier: parseFloat(row.multiplier || 1.0),
              minMultiplier: parseFloat(row.minMultiplier || 0.5),
              maxMultiplier: parseFloat(row.maxMultiplier || 3.5)
            },
            specialty: row.specialty || 'allgemein',
            validFrom: row.validFrom ? new Date(row.validFrom) : new Date(),
            validUntil: row.validUntil ? new Date(row.validUntil) : null,
            isActive: row.isActive !== 'false',
            createdBy: userId
          });
        })
        .on('end', async () => {
          try {
            const results = await this.saveTariffs(tariffs);
            resolve({
              success: true,
              imported: results.created,
              updated: results.updated,
              errors: results.errors
            });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  /**
   * Importiert KHO/ET-Tarife aus CSV
   * Format: pos_nr|code,name,khoCode|ebmCode,price|points,pointValue,category,billingGroup,requiresApproval,billingFrequency,specialty,insuranceProvider,federalState
   * NEU: Unterstützt pos_nr → serviceCode Mapping und Punktwert-Berechnung nach Bundesland
   */
  async importKHOFromCSV(filePath, userId) {
    const tariffs = [];
    let lineNumber = 0;
    
    return new Promise((resolve, reject) => {
      // Lese komplette Datei und bereinige sie
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const allLines = fileContent.split(/\r?\n/);
      
      // Entferne leere Zeilen und Zeilen mit nur Trennzeichen
      const cleanedLines = allLines.filter(line => {
        const trimmed = line.trim();
        return trimmed !== '' && !trimmed.match(/^[;,\s]+$/);
      });
      
      if (cleanedLines.length === 0) {
        reject(new Error('CSV-Datei ist leer oder enthält nur leere Zeilen'));
        return;
      }
      
      // Finde erste nicht-leere Zeile für Trennzeichen-Erkennung
      const firstDataLine = cleanedLines[0] || '';
      const hasComma = firstDataLine.includes(',');
      const separator = hasComma ? ',' : ';';
      
      console.log(`[KHO Import] Erkanntes Trennzeichen: ${separator === ',' ? 'Komma (neues Format)' : 'Semikolon (altes Format)'}`);
      
      // Erste bereinigte Zeile ist Header
      const headerLine = cleanedLines[0];
      const headers = headerLine.split(separator).map(h => h.trim()).filter(h => h);
      console.log(`[KHO Import] Header erkannt: ${headers.join(', ')}`);
      
      // Erstelle bereinigte Datei im Speicher
      const cleanedContent = cleanedLines.join('\n');
      const tempFilePath = filePath + '.cleaned';
      fs.writeFileSync(tempFilePath, cleanedContent, 'utf8');
      
      const stream = fs.createReadStream(tempFilePath, { encoding: 'utf8' })
        .pipe(csv({
          separator: separator,
          skipEmptyLines: true,
          skipLinesWithError: true,
          headers: headers // Explizite Header
        }))
        .on('data', (row) => {
          lineNumber++;
          try {
            // Überspringe Header-Zeile (prüfe verschiedene mögliche Header-Namen)
            const posNr = (row.pos_nr || row.POS_NR || row['pos_nr'] || '').toString().trim();
            const nameValue = (row.name || row.NAME || row['name'] || '').toString().trim();
            const pointsValue = (row.points || row.POINTS || row['points'] || '').toString().trim();
            const pointValueValue = (row.pointValue || row.POINT_VALUE || row['pointValue'] || '').toString().trim();
            const federalStateValue = (row.federalState || row.FEDERAL_STATE || row['federalState'] || '').toString().trim();
            const billingGroupValue = (row.billingGroup || row.BILLING_GROUP || row['billingGroup'] || '').toString().trim();
            
            // Prüfe ob es die Header-Zeile ist (enthält Header-Namen als Werte)
            // Prüfe auch case-insensitive
            const isHeader = 
              posNr.toLowerCase() === 'pos_nr' || 
              nameValue.toLowerCase() === 'name' || 
              pointsValue.toLowerCase() === 'points' || 
              pointValueValue.toLowerCase() === 'pointvalue' || 
              federalStateValue.toLowerCase() === 'federalstate' || 
              billingGroupValue.toLowerCase() === 'billinggroup' ||
              posNr === 'pos_nr' || nameValue === 'name' || pointsValue === 'points' || 
              pointValueValue === 'pointValue' || federalStateValue === 'federalState' || 
              billingGroupValue === 'billingGroup';
            
            if (isHeader) {
              console.log(`[KHO Import] Header-Zeile übersprungen: ${posNr || nameValue}`);
              return;
            }
            
            // NEU: pos_nr → serviceCode Mapping (unterstützt verschiedene Schreibweisen)
            let serviceCode = (row.pos_nr || row.POS_NR || row['pos_nr'] || row.code || row.CODE || posNr || '').trim();
            
            // Überspringe leere Zeilen
            if (!serviceCode || serviceCode.trim() === '') {
              return;
            }
            
            // Prüfe ob serviceCode binäre Daten enthält (Encoding-Problem)
            if (serviceCode && typeof serviceCode === 'string') {
              // Entferne nicht-druckbare Zeichen am Anfang
              serviceCode = serviceCode.replace(/^[\x00-\x1F\x7F-\x9F]+/, '').trim();
              
              // Prüfe ob es noch binäre Daten enthält
              if (serviceCode.length > 0 && /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/.test(serviceCode)) {
                console.warn('[KHO Import] Zeile mit binären Daten übersprungen (Encoding-Problem):', serviceCode.substring(0, 50));
                return;
              }
            }
            
            // Überspringe leere oder ungültige Zeilen
            if (!serviceCode || serviceCode.trim() === '') {
              return;
            }
            
            const khoCode = row.khoCode || row.ebmCode || serviceCode;
            
            // Name/Bezeichnung (unterstützt verschiedene Schreibweisen)
            const name = (row.name || row.NAME || row['name'] || row.bezeichnung || row.BEZEICHNUNG || row.description || 'Unbenannt').trim();
            
            // Bundesland ermitteln (neues Format hat explizites federalState)
            // WICHTIG: Setze für alle auf 'oberoesterreich' (OOE)
            let federalState = row.federalState || row.FEDERAL_STATE || row['federalState'] || row.state || null;
            if (federalState && typeof federalState === 'string') {
              const federalStateUpper = federalState.toUpperCase();
              if (federalStateUpper === 'OOE' || federalStateUpper === 'OÖ' || federalStateUpper === 'OEOE' || 
                  federalStateUpper === 'OBEROESTERREICH' || federalStateUpper === 'OBERÖSTERREICH') {
                federalState = 'oberoesterreich';
              } else {
                federalState = federalState.toLowerCase().replace('ö', 'oe').replace('ä', 'ae').replace('ü', 'ue');
              }
            }
            // WICHTIG: Setze für alle auf 'oberoesterreich' (wie angefordert)
            const federalStateNormalized = 'oberoesterreich';
            
            // Punktwert ermitteln (neues Format hat explizites pointValue)
            // WICHTIG: pointValue muss aus CSV gelesen werden, nicht aus Bundesland berechnet
            let pointValue = null;
            let pointValueRaw = row.pointValue || row.POINT_VALUE || row['pointValue'] || row.pointvalue || row.PointValue;
            
            // Debug für erste paar Zeilen
            if (lineNumber <= 3) {
              console.log(`[KHO Import] Zeile ${lineNumber}: ${serviceCode} - row.pointValue = '${pointValueRaw}' (${typeof pointValueRaw})`);
            }
            
            // Entferne Leerzeichen und prüfe ob es "pointValue" (Header) ist
            if (pointValueRaw !== undefined && pointValueRaw !== null) {
              if (typeof pointValueRaw === 'string') {
                pointValueRaw = pointValueRaw.trim();
                // Prüfe ob es der Header-Name ist
                if (pointValueRaw.toLowerCase() === 'pointvalue' || pointValueRaw === 'pointValue' || pointValueRaw === 'POINT_VALUE') {
                  pointValueRaw = null; // Header-Zeile
                }
              }
              
              // Prüfe ob es eine gültige Zahl ist
              if (pointValueRaw !== null && pointValueRaw !== '' && !isNaN(pointValueRaw)) {
                pointValue = parseFloat(pointValueRaw);
                // Validiere dass es eine gültige Zahl ist
                if (isNaN(pointValue) || pointValue <= 0) {
                  console.warn(`[KHO Import] Ungültiger pointValue für ${serviceCode}: ${pointValueRaw}, verwende Default`);
                  pointValue = 0.53; // Fallback
                } else {
                  // Debug für erste paar Zeilen
                  if (lineNumber <= 3) {
                    console.log(`[KHO Import] Zeile ${lineNumber}: ${serviceCode} - pointValue erfolgreich gelesen: ${pointValue}`);
                  }
                }
              } else {
                // Wenn pointValue leer oder ungültig, verwende Prioritätssystem aus Config
                // Lese specialty und billingGroup für Prioritätssystem (wird später gelesen, aber hier schon vorbereitet)
                const specialtyRaw = (row.specialty || row.fachgebiet || row.FACHGEBIET || 'allgemein').toLowerCase();
                const billingGroupRaw = (row.billingGroup || row.BILLING_GROUP || row['billingGroup'] || '').toString().trim();
                
                // Verwende neue getPointValue() Funktion mit Prioritätssystem
                pointValue = federalStateConfig.getPointValue(federalStateNormalized, {
                  khoCode: khoCode,
                  serviceSpecialty: specialtyRaw,
                  billingGroup: billingGroupRaw
                }) || 0.53; // Fallback
                
                if (lineNumber <= 5) {
                  console.warn(`[KHO Import] Zeile ${lineNumber}: pointValue leer/ungültig für ${serviceCode} (raw: '${pointValueRaw}'), verwende ${pointValue} aus Prioritätssystem`);
                }
              }
            } else {
              // Wenn pointValue nicht vorhanden, verwende Prioritätssystem aus Config
              // Lese specialty und billingGroup für Prioritätssystem
              const specialtyRaw = (row.specialty || row.fachgebiet || row.FACHGEBIET || 'allgemein').toLowerCase();
              const billingGroupRaw = (row.billingGroup || row.BILLING_GROUP || row['billingGroup'] || '').toString().trim();
              
              // Verwende neue getPointValue() Funktion mit Prioritätssystem
              pointValue = federalStateConfig.getPointValue(federalStateNormalized, {
                khoCode: khoCode,
                serviceSpecialty: specialtyRaw,
                billingGroup: billingGroupRaw
              }) || 0.53; // Fallback
              
              if (lineNumber <= 5) {
                console.warn(`[KHO Import] Zeile ${lineNumber}: pointValue nicht vorhanden für ${serviceCode}, verwende ${pointValue} aus Prioritätssystem`);
              }
            }
            
            // Points und Preis ermitteln (neues Format hat explizites points)
            let points = null;
            let khoPrice = null;
            let calculatedFromPoints = false;
            
            // Points ermitteln (unterstützt verschiedene Schreibweisen)
            const pointsRaw = row.points || row.POINTS || row['points'] || row.Points || null;
            if (pointsRaw !== undefined && pointsRaw !== null && pointsRaw !== '' && !isNaN(pointsRaw)) {
              const pointsValue = parseFloat(pointsRaw);
              
              // WICHTIG: basePrice (khoPrice) muss IMMER exakt points * pointValue sein
              // Auch wenn pointValue = 1, verwenden wir die Formel für Konsistenz
              if (pointValue !== null && pointValue > 0 && !isNaN(pointValue)) {
                points = pointsValue;
                // Exakte Berechnung: khoPrice = points * pointValue
                khoPrice = Math.round((points * pointValue) * 100) / 100; // Auf 2 Dezimalstellen gerundet
                calculatedFromPoints = true;
                
                // Debug-Log für erste paar Zeilen
                if (lineNumber <= 5) {
                  console.log(`[KHO Import] Zeile ${lineNumber}: ${serviceCode} - points=${points}, pointValue=${pointValue}, khoPrice=${khoPrice}`);
                }
              } else {
                // Fallback: Wenn pointValue fehlt oder ungültig, verwende points als direkten Preis
                khoPrice = pointsValue;
                points = null;
                calculatedFromPoints = false;
                console.warn(`[KHO Import] pointValue ungültig für ${serviceCode}, verwende points als direkten Preis`);
              }
            }
            
            // Fallback: Altes Format (wert + einheit)
            if (!khoPrice && row.wert) {
              const wertNum = parseFloat(row.wert);
              const einheit = (row.einheit || '').toUpperCase();
              
              if (einheit === 'EUR' || einheit === 'EURO' || einheit === '€') {
                khoPrice = wertNum;
              } else if (einheit === 'PUNKTE' || einheit === 'PUNKT' || !einheit) {
                points = wertNum;
                khoPrice = points * pointValue;
                calculatedFromPoints = true;
              }
            }
            
            // Falls Preis explizit vorhanden (höchste Priorität)
            if (row.price || row.khoPrice) {
              khoPrice = parseFloat(row.price || row.khoPrice);
              calculatedFromPoints = false;
            }
            
            // billingGroup ermitteln (neues Format hat explizites billingGroup)
            const billingGroup = (row.billingGroup || row.BILLING_GROUP || row['billingGroup'] || row.billing_group || row.BILLING_GROUP || null);
            
            // Kategorie (kann aus billingGroup abgeleitet werden)
            const category = row.category || row.kategorie || row.KATEGORIE || billingGroup || '';
            
            // Fachgebiet (normalisieren)
            const specialtyRaw = (row.specialty || row.fachgebiet || row.FACHGEBIET || 'allgemein').toLowerCase();
            const specialtyMap = {
              'allgemein': 'allgemein',
              'fachärzte': 'allgemein',
              'fachaerzte': 'allgemein',
              'fachärzt': 'allgemein',
              'fachaerzt': 'allgemein'
            };
            const specialty = specialtyMap[specialtyRaw] || 'allgemein';
            
            // Limitierung
            const limitation = row.limitierung || row.LIMITIERUNG || row.limitation || '';
            
            // Validiere serviceCode nochmal (muss alphanumerisch sein, keine binären Daten)
            const cleanServiceCode = serviceCode.trim();
            if (!cleanServiceCode || cleanServiceCode.length === 0 || /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/.test(cleanServiceCode)) {
              console.warn('[KHO Import] Ungültiger serviceCode übersprungen:', cleanServiceCode.substring(0, 50));
              return;
            }
            
            tariffs.push({
              code: cleanServiceCode,
              name: (name || 'Unbenannt').trim(),
              description: (row.description || row.DESCRIPTION || limitation || '').trim(),
              tariffType: 'kho',
              kho: {
                khoCode: khoCode.trim(),
                ebmCode: (row.ebmCode || khoCode).trim(), // Legacy
                khoPrice: khoPrice || 0, // Preis in Euro
                price: khoPrice ? Math.round(khoPrice * 100) : null, // Legacy: In Cent
                points: points,
                pointValue: pointValue, // OÖ Punktwert (0.53)
                calculatedFromPoints: calculatedFromPoints,
                category: category.trim(),
                billingGroup: billingGroup ? billingGroup.trim() : null,
                requiresApproval: row.requiresApproval === 'true' || row.requiresApproval === true,
                billingFrequency: row.billingFrequency || 'once',
                insuranceProvider: 'oegk', // Explizit OEGK für österreichische CSV
                federalState: federalStateNormalized // OÖ (oberoesterreich)
              },
              specialty: specialty,
              validFrom: row.validFrom ? new Date(row.validFrom) : new Date(),
              validUntil: row.validUntil ? new Date(row.validUntil) : null,
              isActive: row.isActive !== 'false',
              createdBy: userId
            });
          } catch (rowError) {
            console.error(`[KHO Import] Fehler beim Verarbeiten von Zeile ${lineNumber}:`, rowError.message);
            console.error('[KHO Import] Zeile:', JSON.stringify(row).substring(0, 200));
            // Überspringe fehlerhafte Zeilen, aber fahre fort
          }
        })
        .on('end', async () => {
          try {
            // Lösche temporäre bereinigte Datei
            try {
              if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
              }
            } catch (unlinkError) {
              console.warn('[KHO Import] Konnte temporäre Datei nicht löschen:', unlinkError.message);
            }
            
            console.log(`[KHO Import] ${tariffs.length} Tarife aus CSV gelesen (${lineNumber} Zeilen verarbeitet)`);
            
            if (tariffs.length === 0) {
              reject(new Error('Keine Tarife in der CSV-Datei gefunden. Bitte prüfen Sie das Datei-Format.'));
              return;
            }
            
            // Validiere alle Tarife vor dem Speichern
            const validTariffs = tariffs.filter(t => {
              // Prüfe ob code gültig ist (keine binären Daten)
              if (!t.code || typeof t.code !== 'string' || /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/.test(t.code)) {
                console.warn(`[KHO Import] Tarif mit ungültigem Code übersprungen: ${t.code ? t.code.substring(0, 50) : 'null'}`);
                return false;
              }
              return true;
            });
            
            if (validTariffs.length < tariffs.length) {
              console.warn(`[KHO Import] ${tariffs.length - validTariffs.length} Tarife mit ungültigen Daten wurden gefiltert`);
            }
            
            if (validTariffs.length === 0) {
              reject(new Error('Keine gültigen Tarife in der CSV-Datei gefunden. Möglicherweise Encoding-Problem.'));
              return;
            }
            
            const results = await this.saveTariffs(validTariffs);
            console.log(`[KHO Import] Speicherung abgeschlossen: ${results.created} erstellt, ${results.updated} aktualisiert, ${results.errors.length} Fehler`);
            
            resolve({
              success: true,
              imported: results.created,
              updated: results.updated,
              errors: results.errors
            });
          } catch (error) {
            // Lösche temporäre bereinigte Datei auch bei Fehler
            try {
              if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
              }
            } catch (unlinkError) {
              // Ignoriere Fehler beim Löschen
            }
            console.error('[KHO Import] Fehler beim Speichern der Tarife:', error);
            reject(error);
          }
        })
        .on('error', (error) => {
          console.error('[KHO Import] Fehler beim Lesen der CSV-Datei:', error);
          reject(new Error(`Fehler beim Lesen der CSV-Datei: ${error.message}`));
        });
    });
  }

  /**
   * Importiert Tarife aus JSON (tarife.json Format)
   * Unterstützt das neue strukturierte Format mit serviceCode, billingGroup, pointValue, etc.
   */
  async importFromJSON(filePath, userId) {
    try {
      const data = await fsPromises.readFile(filePath, 'utf8');
      const tariffs = JSON.parse(data);
      
      // Prüfe ob es das neue tarife.json Format ist (Array mit serviceCode, billingGroup, etc.)
      const isNewFormat = Array.isArray(tariffs) && tariffs.length > 0 && tariffs[0].serviceCode;
      
      const formattedTariffs = tariffs.map(tariff => {
        if (isNewFormat) {
          // NEU: tarife.json Format konvertieren
          const federalState = tariff.state ? this.normalizeFederalState(tariff.state) : null;
          // Verwende neue getPointValue() Funktion mit Prioritätssystem
          const pointValue = tariff.pointValue || (federalState ? federalStateConfig.getPointValue(federalState, {
            khoCode: tariff.serviceCode,
            serviceSpecialty: tariff.specialty,
            billingGroup: tariff.billingGroup
          }) : null);
          
          // Berechne khoPrice aus points * pointValue falls vorhanden
          let khoPrice = tariff.basePrice;
          let calculatedFromPoints = false;
          if (tariff.calculatedFromPoints && tariff.pointValue && tariff.calculatedFromPoints) {
            // Bereits berechnet, verwende basePrice
            calculatedFromPoints = true;
          } else if (tariff.calculatedFromPoints && pointValue) {
            // Punkte vorhanden, berechne Preis
            const points = tariff.calculatedFromPoints;
            khoPrice = points * pointValue;
            calculatedFromPoints = true;
          }
          
          return {
            code: tariff.serviceCode,
            name: tariff.description || tariff.name || 'Unbenannt',
            description: tariff.description || '',
            tariffType: 'kho',
            kho: {
              khoCode: tariff.serviceCode,
              khoPrice: khoPrice,
              price: khoPrice ? Math.round(khoPrice * 100) : null, // Legacy: In Cent
              points: tariff.calculatedFromPoints || null,
              pointValue: pointValue,
              calculatedFromPoints: calculatedFromPoints,
              category: tariff.billingGroup || null,
              billingGroup: tariff.billingGroup || null,
              insuranceProvider: this.normalizeInsuranceProvider(tariff.provider || 'OEGK'),
              federalState: federalState
            },
            specialty: 'allgemein',
            validFrom: tariff.validFrom ? new Date(tariff.validFrom) : new Date(),
            validUntil: tariff.validUntil ? new Date(tariff.validUntil) : null,
            isActive: true,
            createdBy: userId
          };
        } else {
          // Altes Format (direktes Tariff-Objekt)
          return {
            ...tariff,
            createdBy: userId,
            validFrom: tariff.validFrom ? new Date(tariff.validFrom) : new Date(),
            validUntil: tariff.validUntil ? new Date(tariff.validUntil) : null
          };
        }
      });
      
      const results = await this.saveTariffs(formattedTariffs);
      
      return {
        success: true,
        imported: results.created,
        updated: results.updated,
        errors: results.errors
      };
    } catch (error) {
      throw new Error(`Fehler beim Importieren: ${error.message}`);
    }
  }

  /**
   * Exportiert Tarife in tarife.json Format
   */
  async exportToJSON(filters = {}) {
    try {
      const query = { tariffType: { $in: ['kho', 'et', 'ebm'] }, isActive: true };
      
      // Filter anwenden
      if (filters.federalState) {
        query['kho.federalState'] = filters.federalState;
      }
      if (filters.insuranceProvider) {
        query['kho.insuranceProvider'] = { $in: [filters.insuranceProvider, 'all'] };
      }
      
      const tariffs = await Tariff.find(query).lean();
      
      // Konvertiere zu tarife.json Format
      const exportData = tariffs.map(tariff => {
        const federalState = tariff.kho?.federalState;
        const stateCode = this.getStateCode(federalState);
        
        return {
          serviceCode: tariff.kho?.khoCode || tariff.code,
          description: tariff.name,
          basePrice: tariff.kho?.khoPrice || 0,
          currency: 'EUR',
          state: stateCode,
          provider: this.getProviderCode(tariff.kho?.insuranceProvider || 'all'),
          billingGroup: tariff.kho?.billingGroup || null,
          refundRate: tariff.kho?.billingGroup === 'Grundleistung' ? 1.0 : 0.8,
          validFrom: tariff.validFrom ? tariff.validFrom.toISOString().split('T')[0] : null,
          ...(tariff.kho?.points && tariff.kho?.pointValue ? {
            calculatedFromPoints: tariff.kho.points,
            pointValue: tariff.kho.pointValue
          } : {}),
          ...(tariff.kho?.calculatedFromPoints ? { calculatedFromPoints: true } : {})
        };
      });
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      throw new Error(`Fehler beim Exportieren: ${error.message}`);
    }
  }

  /**
   * Normalisiert Bundesland-String
   */
  normalizeFederalState(state) {
    if (!state) return null;
    const normalized = state.toLowerCase()
      .replace('ö', 'oe')
      .replace('ä', 'ae')
      .replace('ü', 'ue')
      .replace(' ', '');
    
    const stateMap = {
      'ooe': 'oberoesterreich',
      'oo': 'oberoesterreich',
      'oberoesterreich': 'oberoesterreich',
      'wien': 'wien',
      'noe': 'niederoesterreich',
      'no': 'niederoesterreich',
      'niederoesterreich': 'niederoesterreich',
      'stmk': 'steiermark',
      'steiermark': 'steiermark',
      'tirol': 'tirol',
      'salzburg': 'salzburg',
      'kaernten': 'kaernten',
      'vorarlberg': 'vorarlberg',
      'burgenland': 'burgenland'
    };
    
    return stateMap[normalized] || normalized;
  }

  /**
   * Konvertiert Bundesland zu State-Code (OOE, WIE, etc.)
   */
  getStateCode(federalState) {
    if (!federalState) return null;
    const stateMap = {
      'oberoesterreich': 'OOE',
      'wien': 'WIE',
      'niederoesterreich': 'NOE',
      'steiermark': 'STMK',
      'tirol': 'TIR',
      'salzburg': 'SAL',
      'kaernten': 'KAE',
      'vorarlberg': 'VOR',
      'burgenland': 'BUR'
    };
    return stateMap[federalState] || federalState.toUpperCase();
  }

  /**
   * Normalisiert Versicherungsträger
   */
  normalizeInsuranceProvider(provider) {
    if (!provider) return 'all';
    const normalized = provider.toLowerCase();
    const providerMap = {
      'oegk': 'oegk',
      'ögk': 'oegk',
      'bvaeb': 'bvaeb',
      'svs': 'svs',
      'kfa': 'kfa',
      'pva': 'pva',
      'vaeb': 'vaeb',
      'auva': 'auva'
    };
    return providerMap[normalized] || 'all';
  }

  /**
   * Konvertiert Versicherungsträger zu Provider-Code
   */
  getProviderCode(provider) {
    if (!provider || provider === 'all') return 'OEGK';
    return provider.toUpperCase();
  }

  /**
   * Speichert Tarife (erstellt neue oder aktualisiert bestehende)
   */
  async saveTariffs(tariffs) {
    const results = {
      created: 0,
      updated: 0,
      errors: []
    };

    for (const tariffData of tariffs) {
      try {
        const existing = await Tariff.findOne({ code: tariffData.code });
        
        if (existing) {
          // Aktualisiere bestehenden Tarif
          Object.keys(tariffData).forEach(key => {
            if (key !== 'code' && tariffData[key] !== undefined) {
              existing[key] = tariffData[key];
            }
          });
          existing.updatedBy = tariffData.createdBy;
          await existing.save();
          results.updated++;
        } else {
          // Erstelle neuen Tarif
          const tariff = new Tariff(tariffData);
          await tariff.save();
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          code: tariffData.code,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Erstellt Beispiel-Tarife (für Testzwecke)
   */
  async createSampleTariffs(userId) {
    const sampleTariffs = [
      // GOÄ-Beispiele - Abschnitt A (Allgemeine Leistungen)
      {
        code: 'GOAE-A-1',
        name: 'Ordinationskonsultation',
        description: 'Erstkonsultation',
        tariffType: 'goae',
        goae: {
          section: 'A',
          number: '1',
          basePrice: 3500, // 35,00€ in Cent
          multiplier: 1.0,
          minMultiplier: 0.5,
          maxMultiplier: 3.5
        },
        specialty: 'allgemeinmedizin',
        isActive: true,
        createdBy: userId
      },
      {
        code: 'GOAE-A-2',
        name: 'Ordinationskonsultation',
        description: 'Folgekonsultation',
        tariffType: 'goae',
        goae: {
          section: 'A',
          number: '2',
          basePrice: 2500, // 25,00€ in Cent
          multiplier: 1.0,
          minMultiplier: 0.5,
          maxMultiplier: 3.5
        },
        specialty: 'allgemeinmedizin',
        isActive: true,
        createdBy: userId
      },
      {
        code: 'GOAE-A-3',
        name: 'Hausbesuch',
        description: 'Hausbesuch',
        tariffType: 'goae',
        goae: {
          section: 'A',
          number: '3',
          basePrice: 4500, // 45,00€ in Cent
          multiplier: 1.0,
          minMultiplier: 0.5,
          maxMultiplier: 3.5
        },
        specialty: 'allgemeinmedizin',
        isActive: true,
        createdBy: userId
      },
      // GOÄ-Beispiele - Abschnitt B (Untersuchungen)
      {
        code: 'GOAE-B-1',
        name: 'Körperliche Untersuchung',
        description: 'Ganzkörperuntersuchung',
        tariffType: 'goae',
        goae: {
          section: 'B',
          number: '1',
          basePrice: 2800, // 28,00€ in Cent
          multiplier: 1.0,
          minMultiplier: 0.5,
          maxMultiplier: 3.5
        },
        specialty: 'allgemeinmedizin',
        isActive: true,
        createdBy: userId
      },
      {
        code: 'GOAE-B-2',
        name: 'Blutdruckmessung',
        description: 'Blutdruckmessung',
        tariffType: 'goae',
        goae: {
          section: 'B',
          number: '2',
          basePrice: 800, // 8,00€ in Cent
          multiplier: 1.0,
          minMultiplier: 0.5,
          maxMultiplier: 3.5
        },
        specialty: 'allgemeinmedizin',
        isActive: true,
        createdBy: userId
      },
      // KHO-Beispiele
      {
        code: 'KHO-201',
        name: 'Konsultation',
        description: 'Ordinationskonsultation',
        tariffType: 'kho',
        kho: {
          ebmCode: '201',
          price: 1500, // 15,00€ in Cent
          category: 'Konsultation',
          requiresApproval: false,
          billingFrequency: 'once'
        },
        specialty: 'allgemeinmedizin',
        isActive: true,
        createdBy: userId
      },
      {
        code: 'KHO-202',
        name: 'Folgekonsultation',
        description: 'Ordinationskonsultation (Folge)',
        tariffType: 'kho',
        kho: {
          ebmCode: '202',
          price: 1200, // 12,00€ in Cent
          category: 'Konsultation',
          requiresApproval: false,
          billingFrequency: 'once'
        },
        specialty: 'allgemeinmedizin',
        isActive: true,
        createdBy: userId
      },
      {
        code: 'KHO-203',
        name: 'Hausbesuch',
        description: 'Hausbesuch',
        tariffType: 'kho',
        kho: {
          ebmCode: '203',
          price: 2200, // 22,00€ in Cent
          category: 'Konsultation',
          requiresApproval: false,
          billingFrequency: 'once'
        },
        specialty: 'allgemeinmedizin',
        isActive: true,
        createdBy: userId
      },
      {
        code: 'KHO-300',
        name: 'EKG',
        description: 'Elektrokardiogramm',
        tariffType: 'kho',
        kho: {
          ebmCode: '300',
          price: 1800, // 18,00€ in Cent
          category: 'Untersuchung',
          requiresApproval: false,
          billingFrequency: 'once'
        },
        specialty: 'allgemeinmedizin',
        isActive: true,
        createdBy: userId
      },
      {
        code: 'KHO-301',
        name: 'Blutabnahme',
        description: 'Venöse Blutabnahme',
        tariffType: 'kho',
        kho: {
          ebmCode: '301',
          price: 500, // 5,00€ in Cent
          category: 'Untersuchung',
          requiresApproval: false,
          billingFrequency: 'once'
        },
        specialty: 'allgemeinmedizin',
        isActive: true,
        createdBy: userId
      },
      {
        code: 'KHO-400',
        name: 'Impfung',
        description: 'Schutzimpfung',
        tariffType: 'kho',
        kho: {
          ebmCode: '400',
          price: 1200, // 12,00€ in Cent
          category: 'Behandlung',
          requiresApproval: false,
          billingFrequency: 'once'
        },
        specialty: 'allgemeinmedizin',
        isActive: true,
        createdBy: userId
      }
    ];

    return await this.saveTariffs(sampleTariffs);
  }
  
  /**
   * Erstellt umfangreiche Beispiel-Tarife aus verschiedenen Fachrichtungen
   */
  async createExtendedSampleTariffs(userId) {
    const extendedTariffs = [
      // Allgemeinmedizin
      ...(await this.createSampleTariffs(userId)).created,
      
      // Chirurgie
      {
        code: 'GOAE-C-100',
        name: 'Kleine Operation',
        description: 'Kleine chirurgische Eingriffe',
        tariffType: 'goae',
        goae: {
          section: 'C',
          number: '100',
          basePrice: 8500, // 85,00€ in Cent
          multiplier: 1.0,
          minMultiplier: 0.5,
          maxMultiplier: 3.5
        },
        specialty: 'chirurgie',
        isActive: true,
        createdBy: userId
      },
      
      // Dermatologie
      {
        code: 'GOAE-D-50',
        name: 'Hautuntersuchung',
        description: 'Dermatologische Untersuchung',
        tariffType: 'goae',
        goae: {
          section: 'D',
          number: '50',
          basePrice: 3200, // 32,00€ in Cent
          multiplier: 1.0,
          minMultiplier: 0.5,
          maxMultiplier: 3.5
        },
        specialty: 'dermatologie',
        isActive: true,
        createdBy: userId
      },
      
      // Gynäkologie
      {
        code: 'GOAE-G-10',
        name: 'Gynäkologische Untersuchung',
        description: 'Vorsorgeuntersuchung',
        tariffType: 'goae',
        goae: {
          section: 'G',
          number: '10',
          basePrice: 4200, // 42,00€ in Cent
          multiplier: 1.0,
          minMultiplier: 0.5,
          maxMultiplier: 3.5
        },
        specialty: 'gynaekologie',
        isActive: true,
        createdBy: userId
      }
    ];

    return await this.saveTariffs(extendedTariffs);
  }
}

module.exports = new TariffImporter();

