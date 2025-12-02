// Automatische ServiceCatalog-Updates
// Synchronisiert EBM-Preise aus Tariff-Model mit ServiceCatalog

const ServiceCatalog = require('../models/ServiceCatalog');
const Tariff = require('../models/Tariff');
const User = require('../models/User');

class ServiceCatalogUpdateService {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Aktualisiert EBM-Preise im ServiceCatalog basierend auf Tariff-Model
   */
  async updateEBMPrices() {
    if (this.isRunning) {
      console.log('⏳ ServiceCatalog-Update läuft bereits');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starte ServiceCatalog EBM-Preis-Update...');

    try {
      // Finde Admin-User für Updates
      const adminUser = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
      if (!adminUser) {
        throw new Error('Kein Admin-User gefunden');
      }

      // Finde alle aktiven EBM-Tarife
      const ebmTariffs = await Tariff.find({
        tariffType: 'ebm',
        isActive: true,
        $or: [
          { validUntil: { $exists: false } },
          { validUntil: null },
          { validUntil: { $gte: new Date() } }
        ]
      });

      console.log(`📊 Gefundene EBM-Tarife: ${ebmTariffs.length}`);

      let updated = 0;
      let created = 0;
      let errors = [];

      for (const tariff of ebmTariffs) {
        try {
          // Suche ServiceCatalog-Einträge mit diesem EBM-Code
          const services = await ServiceCatalog.find({
            'ogk.ebmCode': tariff.code,
            is_active: true
          });

          if (services.length === 0) {
            // Kein ServiceCatalog-Eintrag gefunden - könnte neu sein
            console.log(`ℹ️ Kein ServiceCatalog-Eintrag für EBM-Code ${tariff.code} gefunden`);
            continue;
          }

          // Aktualisiere alle gefundenen Services
          for (const service of services) {
            const oldPrice = service.ogk?.ebmPrice || 0;
            const newPrice = tariff.kho?.price || 0;

            if (oldPrice !== newPrice && newPrice > 0) {
              service.ogk = service.ogk || {};
              service.ogk.ebmPrice = newPrice;
              service.updatedBy = adminUser._id;
              await service.save();
              updated++;
              console.log(`✅ Service ${service.code} aktualisiert: €${(oldPrice/100).toFixed(2)} → €${(newPrice/100).toFixed(2)}`);
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
        totalTariffs: ebmTariffs.length
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

