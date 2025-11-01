#!/usr/bin/env node

/**
 * Jährliches Update des Service-Katalogs
 * 
 * Dieses Script sollte jährlich ausgeführt werden, um:
 * 1. EBM-Preise zu aktualisieren
 * 2. Neue Leistungen hinzuzufügen
 * 3. Veraltete Leistungen zu deaktivieren
 * 4. Preisanpassungen durchzuführen
 */

const mongoose = require('mongoose');
const ServiceCatalog = require('../models/ServiceCatalog');
const AuditLog = require('../models/AuditLog');
require('dotenv').config();

// EBM 2025 Updates (Beispiel - sollte aus offizieller Quelle kommen)
const EBM_UPDATES_2025 = {
  // Neue Leistungen
  newServices: [
    {
      code: 'EBM-2025-001',
      name: 'Telemedizinische Beratung',
      description: 'Videosprechstunde',
      category: 'Telemedizin',
      specialty: 'allgemeinmedizin',
      base_duration_min: 15,
      kassenarzt: { price: 2500 }, // 25,00 EUR in Cent
      wahlarzt: { price: 5000, reimbursementRate: 0.80 },
      private: { price: 5000 },
      isMedical: true,
      required_role: 'arzt',
      online_bookable: true,
      color_hex: '#10B981'
    },
    {
      code: 'EBM-2025-002', 
      name: 'KI-gestützte Diagnostik',
      description: 'Künstliche Intelligenz unterstützte Befundung',
      category: 'Diagnostik',
      specialty: 'radiologie',
      base_duration_min: 30,
      kassenarzt: { price: 4500 },
      wahlarzt: { price: 8000, reimbursementRate: 0.75 },
      private: { price: 8000 },
      isMedical: true,
      required_role: 'arzt',
      color_hex: '#8B5CF6'
    }
  ],
  
  // Preisanpassungen (Inflationsausgleich)
  priceAdjustments: {
    inflationRate: 0.035, // 3.5% Inflation 2024
    adjustments: [
      { category: 'allgemeinmedizin', multiplier: 1.035 },
      { category: 'chirurgie', multiplier: 1.040 },
      { category: 'radiologie', multiplier: 1.030 }
    ]
  },
  
  // Zu deaktivierende Leistungen
  deprecatedServices: [
    'EBM-OLD-001', // Beispiel: Veraltete Leistung
    'EBM-OLD-002'  // Beispiel: Nicht mehr abrechenbare Leistung
  ],
  
  // Geänderte EBM-Codes
  codeChanges: [
    { oldCode: 'EBM-2024-001', newCode: 'EBM-2025-001', reason: 'Code-Struktur geändert' }
  ]
};

async function updateServiceCatalog() {
  try {
    console.log('🏥 Starte jährliches Service-Katalog Update...');
    
    // Verbindung zur Datenbank
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Datenbank verbunden');
    
    const updateResults = {
      newServices: 0,
      updatedPrices: 0,
      deprecatedServices: 0,
      codeChanges: 0,
      errors: []
    };
    
    // 1. Neue Leistungen hinzufügen
    console.log('📝 Füge neue Leistungen hinzu...');
    for (const newService of EBM_UPDATES_2025.newServices) {
      try {
        const existingService = await ServiceCatalog.findOne({ code: newService.code });
        if (!existingService) {
          const service = new ServiceCatalog({
            ...newService,
            createdBy: 'system-annual-update',
            version: 1,
            is_active: true
          });
          await service.save();
          updateResults.newServices++;
          console.log(`✅ Neue Leistung hinzugefügt: ${newService.code} - ${newService.name}`);
        } else {
          console.log(`⚠️ Leistung bereits vorhanden: ${newService.code}`);
        }
      } catch (error) {
        console.error(`❌ Fehler beim Hinzufügen von ${newService.code}:`, error.message);
        updateResults.errors.push(`Neue Leistung ${newService.code}: ${error.message}`);
      }
    }
    
    // 2. Preisanpassungen durchführen
    console.log('💰 Führe Preisanpassungen durch...');
    for (const adjustment of EBM_UPDATES_2025.priceAdjustments.adjustments) {
      try {
        const result = await ServiceCatalog.updateMany(
          { 
            category: adjustment.category,
            is_active: true 
          },
          [
            {
              $set: {
                'kassenarzt.price': { $multiply: ['$kassenarzt.price', adjustment.multiplier] },
                'wahlarzt.price': { $multiply: ['$wahlarzt.price', adjustment.multiplier] },
                'private.price': { $multiply: ['$private.price', adjustment.multiplier] },
                version: { $add: ['$version', 1] },
                updatedBy: 'system-annual-update'
              }
            }
          ]
        );
        updateResults.updatedPrices += result.modifiedCount;
        console.log(`✅ ${result.modifiedCount} Leistungen in Kategorie ${adjustment.category} aktualisiert`);
      } catch (error) {
        console.error(`❌ Fehler bei Preisanpassung für ${adjustment.category}:`, error.message);
        updateResults.errors.push(`Preisanpassung ${adjustment.category}: ${error.message}`);
      }
    }
    
    // 3. Veraltete Leistungen deaktivieren
    console.log('🚫 Deaktiviere veraltete Leistungen...');
    for (const deprecatedCode of EBM_UPDATES_2025.deprecatedServices) {
      try {
        const result = await ServiceCatalog.updateMany(
          { code: deprecatedCode },
          { 
            is_active: false,
            version: { $inc: 1 },
            updatedBy: 'system-annual-update',
            notes: 'Leistung wurde 2025 deaktiviert - nicht mehr abrechenbar'
          }
        );
        updateResults.deprecatedServices += result.modifiedCount;
        if (result.modifiedCount > 0) {
          console.log(`✅ ${result.modifiedCount} veraltete Leistung(en) deaktiviert: ${deprecatedCode}`);
        }
      } catch (error) {
        console.error(`❌ Fehler beim Deaktivieren von ${deprecatedCode}:`, error.message);
        updateResults.errors.push(`Deaktivierung ${deprecatedCode}: ${error.message}`);
      }
    }
    
    // 4. EBM-Code Änderungen
    console.log('🔄 Führe EBM-Code Änderungen durch...');
    for (const codeChange of EBM_UPDATES_2025.codeChanges) {
      try {
        const service = await ServiceCatalog.findOne({ code: codeChange.oldCode });
        if (service) {
          // Prüfe ob neuer Code bereits existiert
          const existingNewCode = await ServiceCatalog.findOne({ code: codeChange.newCode });
          if (!existingNewCode) {
            service.code = codeChange.newCode;
            service.version += 1;
            service.updatedBy = 'system-annual-update';
            service.notes = (service.notes || '') + `\nEBM-Code geändert von ${codeChange.oldCode} zu ${codeChange.newCode} (${codeChange.reason})`;
            await service.save();
            updateResults.codeChanges++;
            console.log(`✅ EBM-Code geändert: ${codeChange.oldCode} → ${codeChange.newCode}`);
          } else {
            console.log(`⚠️ Neuer EBM-Code bereits vorhanden: ${codeChange.newCode}`);
          }
        } else {
          console.log(`⚠️ Service mit altem EBM-Code nicht gefunden: ${codeChange.oldCode}`);
        }
      } catch (error) {
        console.error(`❌ Fehler bei EBM-Code Änderung ${codeChange.oldCode}:`, error.message);
        updateResults.errors.push(`EBM-Code Änderung ${codeChange.oldCode}: ${error.message}`);
      }
    }
    
    // 5. Audit Log erstellen
    await AuditLog.create({
      action: 'SERVICE_CATALOG_ANNUAL_UPDATE',
      entityType: 'ServiceCatalog',
      entityId: 'system',
      changes: {
        summary: 'Jährliches Service-Katalog Update 2025',
        details: updateResults
      },
      performedBy: 'system-annual-update',
      timestamp: new Date(),
      metadata: {
        updateYear: 2025,
        inflationRate: EBM_UPDATES_2025.priceAdjustments.inflationRate,
        newServicesCount: EBM_UPDATES_2025.newServices.length,
        deprecatedServicesCount: EBM_UPDATES_2025.deprecatedServices.length
      }
    });
    
    // 6. Zusammenfassung
    console.log('\n📊 Update-Zusammenfassung:');
    console.log(`✅ Neue Leistungen: ${updateResults.newServices}`);
    console.log(`✅ Preisanpassungen: ${updateResults.updatedPrices}`);
    console.log(`✅ Deaktivierte Leistungen: ${updateResults.deprecatedServices}`);
    console.log(`✅ EBM-Code Änderungen: ${updateResults.codeChanges}`);
    console.log(`❌ Fehler: ${updateResults.errors.length}`);
    
    if (updateResults.errors.length > 0) {
      console.log('\n❌ Fehler-Details:');
      updateResults.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n🎉 Jährliches Service-Katalog Update abgeschlossen!');
    
  } catch (error) {
    console.error('❌ Kritischer Fehler beim Update:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Datenbankverbindung geschlossen');
  }
}

// Script ausführen wenn direkt aufgerufen
if (require.main === module) {
  updateServiceCatalog()
    .then(() => {
      console.log('✅ Script erfolgreich abgeschlossen');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script fehlgeschlagen:', error);
      process.exit(1);
    });
}

module.exports = { updateServiceCatalog, EBM_UPDATES_2025 };


