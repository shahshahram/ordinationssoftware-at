// Automatische ServiceCatalog-Updates
// Synchronisiert KHO-Preise aus Tariff-Model mit ServiceCatalog

const ServiceCatalog = require('../models/ServiceCatalog');
const Tariff = require('../models/Tariff');
const User = require('../models/User');

class ServiceCatalogUpdateService {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Aktualisiert KHO-Preise im ServiceCatalog basierend auf Tariff-Model
   * Unterstützt sowohl khoCode als auch ebmCode (Backward Compatibility)
   */
  async updateEBMPrices() {
    if (this.isRunning) {
      console.log('⏳ ServiceCatalog-Update läuft bereits');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starte ServiceCatalog KHO-Preis-Update...');

    try {
      // Finde Admin-User für Updates
      const adminUser = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
      if (!adminUser) {
        throw new Error('Kein Admin-User gefunden');
      }

      // Finde alle aktiven KHO-Tarife (inkl. 'ebm' als Legacy)
      const khoTariffs = await Tariff.find({
        tariffType: { $in: ['kho', 'et', 'ebm'] },
        isActive: true,
        $or: [
          { validUntil: { $exists: false } },
          { validUntil: null },
          { validUntil: { $gte: new Date() } }
        ]
      });

      console.log(`📊 Gefundene KHO-Tarife: ${khoTariffs.length}`);

      let updated = 0;
      let created = 0;
      let errors = [];

      for (const tariff of khoTariffs) {
        try {
          // Verwende khoCode oder ebmCode (Backward Compatibility)
          const tariffCode = tariff.kho?.khoCode || tariff.kho?.ebmCode || tariff.code;
          
          // Suche ServiceCatalog-Einträge mit diesem KHO-Code (sowohl khoCode als auch ebmCode)
          const services = await ServiceCatalog.find({
            $or: [
              { 'ogk.khoCode': tariffCode },
              { 'ogk.ebmCode': tariffCode } // Backward Compatibility
            ],
            is_active: true
          });

          if (services.length === 0) {
            // Kein ServiceCatalog-Eintrag gefunden - könnte neu sein
            console.log(`ℹ️ Kein ServiceCatalog-Eintrag für KHO-Code ${tariffCode} gefunden`);
            continue;
          }

          // Aktualisiere alle gefundenen Services
          for (const service of services) {
            const oldPrice = service.ogk?.khoPrice || service.ogk?.ebmPrice || 0;
            const newPriceInCents = tariff.kho?.price || 0;
            const newPriceInEuro = newPriceInCents / 100; // Konvertiere von Cent zu Euro

            if (oldPrice !== newPriceInEuro && newPriceInEuro > 0) {
              service.ogk = service.ogk || {};
              
              // Aktualisiere neue Felder
              service.ogk.khoCode = tariffCode;
              service.ogk.khoPrice = newPriceInEuro;
              
              // Aktualisiere auch Legacy-Felder für Backward Compatibility
              service.ogk.ebmCode = tariffCode;
              service.ogk.ebmPrice = newPriceInEuro;
              
              // Übernehme Versicherungsträger und Bundesland, falls vorhanden
              if (tariff.kho?.insuranceProvider) {
                service.ogk.insuranceProvider = tariff.kho.insuranceProvider;
              }
              if (tariff.kho?.federalState) {
                service.ogk.federalState = tariff.kho.federalState;
              }
              
              service.updatedBy = adminUser._id;
              await service.save();
              updated++;
              console.log(`✅ Service ${service.code} aktualisiert: €${oldPrice.toFixed(2)} → €${newPriceInEuro.toFixed(2)}`);
            }
          }
        } catch (error) {
          console.error(`❌ Fehler bei Tarif ${tariff.code}:`, error.message);
          errors.push({ tariffCode: tariff.code, error: error.message });
        }
      }

      console.log(`✅ ServiceCatalog-Update abgeschlossen: ${updated} Services aktualisiert, ${errors.length} Fehler`);

      return {
        success: true,
        updated,
        created,
        errors,
        totalTariffs: khoTariffs.length
      };
    } catch (error) {
      console.error('❌ Fehler bei ServiceCatalog-Update:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Aktualisiert GOÄ-Preise im ServiceCatalog
   */
  async updateGOAEPrices() {
    if (this.isRunning) {
      console.log('⏳ ServiceCatalog-Update läuft bereits');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starte ServiceCatalog GOÄ-Preis-Update...');

    try {
      const adminUser = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
      if (!adminUser) {
        throw new Error('Kein Admin-User gefunden');
      }

      const goaeTariffs = await Tariff.find({
        tariffType: 'goae',
        isActive: true,
        $or: [
          { validUntil: { $exists: false } },
          { validUntil: null },
          { validUntil: { $gte: new Date() } }
        ]
      });

      let updated = 0;
      let errors = [];

      for (const tariff of goaeTariffs) {
        try {
          // Suche Services mit GOÄ-Code
          const services = await ServiceCatalog.find({
            'wahlarzt.goaeCode': tariff.goae?.number || tariff.code,
            is_active: true
          });

          for (const service of services) {
            const basePrice = tariff.goae?.basePrice || 0;
            const multiplier = tariff.goae?.multiplier || 1.0;
            const newPrice = Math.round(basePrice * multiplier);

            if (service.wahlarzt?.price !== newPrice && newPrice > 0) {
              service.wahlarzt = service.wahlarzt || {};
              service.wahlarzt.price = newPrice;
              service.updatedBy = adminUser._id;
              await service.save();
              updated++;
            }
          }
        } catch (error) {
          errors.push({ tariffCode: tariff.code, error: error.message });
        }
      }

      return {
        success: true,
        updated,
        errors,
        totalTariffs: goaeTariffs.length
      };
    } catch (error) {
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Vollständiges Update (EBM + GOÄ)
   */
  async updateAll() {
    console.log('🔄 Starte vollständiges ServiceCatalog-Update...');
    
    const ebmResult = await this.updateEBMPrices();
    const goaeResult = await this.updateGOAEPrices();

    return {
      success: true,
      ebm: ebmResult,
      goae: goaeResult,
      totalUpdated: (ebmResult.updated || 0) + (goaeResult.updated || 0)
    };
  }
}

module.exports = new ServiceCatalogUpdateService();



