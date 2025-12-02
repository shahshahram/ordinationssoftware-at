// Tarif-Importer für GOÄ, KHO, ET
// Importiert Tarifdaten aus CSV/JSON-Dateien

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const Tariff = require('../models/Tariff');

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
   * Format: code,name,ebmCode,price,category,requiresApproval,billingFrequency,specialty
   */
  async importKHOFromCSV(filePath, userId) {
    const tariffs = [];
    
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          tariffs.push({
            code: row.code || row.ebmCode,
            name: row.name,
            description: row.description || '',
            tariffType: row.tariffType || 'kho',
            kho: {
              ebmCode: row.ebmCode,
              price: Math.round(parseFloat(row.price || 0) * 100), // In Cent
              category: row.category || '',
              requiresApproval: row.requiresApproval === 'true',
              billingFrequency: row.billingFrequency || 'once'
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
   * Importiert Tarife aus JSON
   */
  async importFromJSON(filePath, userId) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const tariffs = JSON.parse(data);
      
      const formattedTariffs = tariffs.map(tariff => ({
        ...tariff,
        createdBy: userId,
        validFrom: tariff.validFrom ? new Date(tariff.validFrom) : new Date(),
        validUntil: tariff.validUntil ? new Date(tariff.validUntil) : null
      }));
      
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

