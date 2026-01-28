/**
 * Einmalige Migration: KHO-Preise 2025
 *
 * Berechnet alle ogk.khoPrice / kho.khoPrice in ServiceCatalog und Tariffs
 * neu mit der Formel: Points * Punktwert 2025 (aus federal_state_config.json).
 * Berücksichtigt billingGroup (z.B. Labor) für den richtigen Punktwert.
 *
 * Usage: node backend/scripts/migrate-kho-prices-2025.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ServiceCatalog = require('../models/ServiceCatalog');
const Tariff = require('../models/Tariff');
const Location = require('../models/Location');
const federalStateConfig = require('../utils/federal-state-config');

const DEFAULT_FEDERAL_STATE = 'oberoesterreich';

const run = async () => {
  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoURI) {
    console.error('Fehler: MONGODB_URI bzw. MONGO_URI in .env fehlt.');
    process.exit(1);
  }

  federalStateConfig.clearCache();
  await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 30000 });
  console.log('✓ MongoDB verbunden');
  console.log('✓ Config 2025 geladen (validFrom aus federal_state_config.json)\n');

  const countByFederalStateServices = {};
  const countByFederalStateTariffs = {};
  let servicesUpdated = 0;
  let tariffsUpdated = 0;
  const errors = [];

  const getFederalStateForService = async (doc) => {
    if (doc.ogk?.federalState) return doc.ogk.federalState;
    if (doc.location_id) {
      const loc = await Location.findById(doc.location_id).select('federalState').lean();
      if (loc?.federalState) return loc.federalState;
    }
    return DEFAULT_FEDERAL_STATE;
  };

  const services = await ServiceCatalog.find({
    $or: [
      { 'ogk.khoCode': { $exists: true, $ne: null, $ne: '' } },
      { 'ogk.points': { $exists: true, $ne: null, $gt: 0 } }
    ]
  });

  const tariffByKhoCode = await Tariff.find({
    tariffType: { $in: ['kho', 'et', 'ebm'] },
    'kho.khoCode': { $exists: true, $ne: null, $ne: '' }
  }).lean();
  const tariffMap = new Map();
  tariffByKhoCode.forEach((t) => {
    const code = t.kho?.khoCode || t.kho?.ebmCode;
    if (code && (t.kho?.points != null && t.kho.points > 0)) {
      tariffMap.set(code, t);
    }
  });

  console.log(`ServiceCatalog: ${services.length} Einträge mit KHO-Daten gefunden.`);

  for (const service of services) {
    try {
      const federalState = await getFederalStateForService(service);
      const khoCode = service.ogk?.khoCode || service.ogk?.ebmCode || null;
      let points = service.ogk?.points;
      const billingGroup = service.ogk?.billingGroup || null;
      const serviceSpecialty = service.specialty || null;

      if (points == null || points <= 0) {
        if (khoCode) {
          const tariff = tariffMap.get(khoCode);
          if (tariff?.kho?.points != null && tariff.kho.points > 0) {
            points = tariff.kho.points;
            service.ogk = service.ogk || {};
            service.ogk.points = points;
          }
        }
        if (points == null || points <= 0) {
          const pv = service.ogk?.pointValue;
          const price = service.ogk?.khoPrice;
          if (pv != null && pv > 0 && price != null && price > 0) {
            points = Math.round(price / pv);
            if (points > 0) {
              service.ogk = service.ogk || {};
              service.ogk.points = points;
            }
          }
        }
      }
      if (points == null || points <= 0) {
        continue;
      }

      const pointValue = federalStateConfig.getPointValue(federalState, {
        khoCode,
        billingGroup,
        serviceSpecialty,
        service: { ogk: service.ogk }
      });

      if (pointValue == null) {
        errors.push({ type: 'ServiceCatalog', code: service.code, error: 'Punktwert nicht ermittelbar' });
        continue;
      }

      const khoPrice = Math.round(points * pointValue * 100) / 100;
      service.ogk = service.ogk || {};
      service.ogk.khoPrice = khoPrice;
      service.ogk.pointValue = pointValue;
      service.ogk.calculatedFromPoints = true;
      if (!service.ogk.federalState) service.ogk.federalState = federalState;
      await service.save();

      countByFederalStateServices[federalState] = (countByFederalStateServices[federalState] || 0) + 1;
      servicesUpdated++;
    } catch (err) {
      errors.push({ type: 'ServiceCatalog', code: service.code, error: err.message });
    }
  }

  const tariffList = await Tariff.find({
    tariffType: { $in: ['kho', 'et', 'ebm'] },
    $or: [
      { 'kho.points': { $exists: true, $ne: null, $gt: 0 } },
      { 'kho.khoCode': { $exists: true, $ne: null, $ne: '' } }
    ]
  });

  console.log(`Tariffs: ${tariffList.length} KHO/ET-Tarife gefunden.\n`);

  for (const tariff of tariffList) {
    try {
      const federalState = tariff.kho?.federalState || DEFAULT_FEDERAL_STATE;
      const khoCode = tariff.kho?.khoCode || tariff.kho?.ebmCode || tariff.code || null;
      let points = tariff.kho?.points;
      const billingGroup = tariff.kho?.billingGroup || null;
      const serviceSpecialty = tariff.specialty || null;

      if (points == null || points <= 0) {
        const pv = tariff.kho?.pointValue;
        const price = tariff.kho?.khoPrice;
        if (pv != null && pv > 0 && price != null && price > 0) {
          points = Math.round(price / pv);
          if (points > 0) tariff.kho.points = points;
        }
      }
      if (points == null || points <= 0) {
        continue;
      }

      const pointValue = federalStateConfig.getPointValue(federalState, {
        khoCode,
        billingGroup,
        serviceSpecialty,
        service: { kho: tariff.kho }
      });

      if (pointValue == null) {
        errors.push({ type: 'Tariff', code: tariff.code, error: 'Punktwert nicht ermittelbar' });
        continue;
      }

      const khoPrice = Math.round(points * pointValue * 100) / 100;
      tariff.kho.khoPrice = khoPrice;
      tariff.kho.pointValue = pointValue;
      tariff.kho.calculatedFromPoints = true;
      await tariff.save();

      countByFederalStateTariffs[federalState] = (countByFederalStateTariffs[federalState] || 0) + 1;
      tariffsUpdated++;
    } catch (err) {
      errors.push({ type: 'Tariff', code: tariff.code, error: err.message });
    }
  }

  const stateOrder = [
    'oberoesterreich', 'niederoesterreich', 'wien', 'burgenland', 'steiermark',
    'kaernten', 'salzburg', 'tirol', 'vorarlberg'
  ];

  console.log('=== Migration 2025 abgeschlossen ===\n');
  console.log('ServiceCatalog (Leistungen) pro Bundesland:');
  stateOrder.forEach((state) => {
    const n = countByFederalStateServices[state] || 0;
    if (n > 0) console.log(`  ${state}: ${n}`);
  });
  console.log(`  Gesamt: ${servicesUpdated}`);

  console.log('\nTariffs pro Bundesland:');
  stateOrder.forEach((state) => {
    const n = countByFederalStateTariffs[state] || 0;
    if (n > 0) console.log(`  ${state}: ${n}`);
  });
  console.log(`  Gesamt: ${tariffsUpdated}`);

  if (errors.length > 0) {
    console.log(`\nFehler: ${errors.length}`);
    errors.slice(0, 10).forEach((e) => console.log(`  ${e.type} ${e.code}: ${e.error}`));
  }

  await mongoose.connection.close();
  console.log('\n✓ MongoDB-Verbindung geschlossen');

  return {
    servicesUpdated,
    tariffsUpdated,
    countByFederalStateServices,
    countByFederalStateTariffs,
    errors
  };
};

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal:', err);
      process.exit(1);
    });
}

module.exports = run;
