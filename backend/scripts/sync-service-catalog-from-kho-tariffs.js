/**
 * Sync-Script: Leistungskatalog aus KHO-Tarifen
 *
 * Liest alle KHO/ET-Tarife aus der Tariff-Datenbank und erstellt bzw. aktualisiert
 * passende Einträge im ServiceCatalog.
 *
 * Mapping:
 * - name: Bezeichnung aus dem Tarif
 * - ogk.khoCode: pos_nr / kho.khoCode (z.B. 11a)
 * - ogk.khoPrice: Punkte * Punktwert (getPointValue-Logik)
 * - ogk.billingGroup: Gruppe aus Tarif (z.B. Sonderleistung, Labor)
 * - ogk.federalState: Standard-Bundesland (OOE = oberoesterreich)
 *
 * Zusammenführung: Existiert ein Service mit gleichem Namen oder gleichem ogk.khoCode,
 * werden nur die ogk-Felder aktualisiert (keine Dublette).
 *
 * Usage: node backend/scripts/sync-service-catalog-from-kho-tariffs.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Tariff = require('../models/Tariff');
const ServiceCatalog = require('../models/ServiceCatalog');
const User = require('../models/User');
const Location = require('../models/Location');
const { getPointValue } = require('../utils/federal-state-config');

const DEFAULT_FEDERAL_STATE = 'oberoesterreich'; // OOE
const DEFAULT_BASE_DURATION_MIN = 15;
const OGK_BILLING_GROUP_ENUM = [
  'Ordination', 'Untersuchung', 'Behandlung', 'Sonderleistung',
  'Grundleistung', 'Therapie', 'labor', null
];

/** ServiceCatalog.specialty Enum (Tariff hat zusätzlich 'allgemein' → wird nicht übernommen) */
const SERVICE_CATALOG_SPECIALTY_ENUM = [
  'allgemeinmedizin', 'chirurgie', 'dermatologie', 'gynaekologie', 'orthopaedie',
  'neurologie', 'kardiologie', 'pneumologie', 'gastroenterologie', 'urologie',
  'ophthalmologie', 'hno', 'psychiatrie', 'radiologie', 'labor', 'pathologie',
  'anästhesie', 'notfallmedizin', 'sportmedizin', 'arbeitsmedizin'
];

/**
 * Prüft ob billingGroup im ServiceCatalog-ogk-Enum erlaubt ist
 */
const normalizeBillingGroup = (billingGroup) => {
  if (billingGroup == null || billingGroup === '') return null;
  const val = (billingGroup + '').trim();
  if (OGK_BILLING_GROUP_ENUM.includes(val)) return val;
  // Tariff hat z.B. "Besuch" – ServiceCatalog nicht; dann null
  return null;
};

/**
 * Fachrichtung aus Tarif übernehmen. Nur Werte aus dem ServiceCatalog-Enum.
 * Tariff.specialty 'allgemein' → 'allgemeinmedizin', damit Leistungen unter Allgemeinmedizin erscheinen.
 */
const normalizeSpecialty = (specialty) => {
  if (specialty == null || specialty === '') return undefined;
  const val = (specialty + '').trim().toLowerCase();
  if (val === 'allgemein') return 'allgemeinmedizin';
  return SERVICE_CATALOG_SPECIALTY_ENUM.includes(val) ? val : undefined;
};

/**
 * Eindeutigen ServiceCatalog-Code erzeugen (KHO-{khoCode}, bei Kollision mit Zähler)
 */
const generateUniqueCode = async (baseCode) => {
  const safe = (baseCode || 'KHO').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '');
  let code = safe.length ? `KHO-${safe}` : 'KHO-UNKNOWN';
  let counter = 0;
  while (true) {
    const candidate = counter === 0 ? code : `${code}-${counter}`;
    const exists = await ServiceCatalog.findOne({ code: candidate }).lean();
    if (!exists) return candidate;
    counter++;
  }
};

const run = async () => {
  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoURI) {
    console.error('Fehler: MONGODB_URI bzw. MONGO_URI in .env fehlt.');
    process.exit(1);
  }

  await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 30000 });
  console.log('✓ MongoDB verbunden\n');

  const adminUser = await User.findOne({ role: { $in: ['admin', 'super_admin'] } }).sort({ createdAt: 1 });
  const fallbackUser = adminUser || await User.findOne().sort({ createdAt: 1 });
  const createdBy = fallbackUser ? fallbackUser._id : new mongoose.Types.ObjectId();
  if (!fallbackUser) {
    console.warn('⚠ Kein User gefunden, verwende Dummy-ID für createdBy.');
  }

  let defaultLocationId = null;
  try {
    const firstLocation = await Location.findOne().sort({ createdAt: 1 }).select('_id').lean();
    if (firstLocation) defaultLocationId = firstLocation._id;
  } catch (e) {
    // ignore
  }

  const tariffQuery = {
    tariffType: { $in: ['kho', 'et', 'ebm'] },
    isActive: true,
    $or: [
      { validUntil: { $exists: false } },
      { validUntil: null },
      { validUntil: { $gte: new Date() } }
    ]
  };

  const tariffs = await Tariff.find(tariffQuery).lean();
  console.log(`📊 Gefundene KHO/ET-Tarife: ${tariffs.length}\n`);

  let created = 0;
  let updated = 0;
  const errors = [];

  for (const tariff of tariffs) {
    try {
      const khoCode = tariff.kho?.khoCode || tariff.kho?.ebmCode || tariff.code || '';
      const name = (tariff.name || '').trim();
      if (!name) {
        errors.push({ code: tariff.code, error: 'Tarif ohne name übersprungen' });
        continue;
      }

      const federalState = tariff.kho?.federalState || DEFAULT_FEDERAL_STATE;
      const billingGroup = normalizeBillingGroup(tariff.kho?.billingGroup);
      const points = tariff.kho?.points;
      const serviceSpecialty = tariff.specialty || null;
      const specialty = normalizeSpecialty(tariff.specialty);

      let khoPrice = tariff.kho?.khoPrice;
      let pointValue = tariff.kho?.pointValue;
      let calculatedFromPoints = false;

      if (points != null && points > 0) {
        const pv = getPointValue(federalState, {
          khoCode,
          billingGroup,
          serviceSpecialty,
          service: { ogk: { billingGroup }, kho: { billingGroup: tariff.kho?.billingGroup } }
        });
        if (pv != null) {
          pointValue = pv;
          khoPrice = Math.round(points * pv * 100) / 100;
          calculatedFromPoints = true;
        }
      }
      if (khoPrice == null && tariff.kho?.khoPrice != null) {
        khoPrice = tariff.kho.khoPrice;
      }
      if (khoPrice == null) khoPrice = 0;

      const existingByName = await ServiceCatalog.findOne({
        name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        is_active: true
      });

      const existingByKhoCode = khoCode
        ? await ServiceCatalog.findOne({
            'ogk.khoCode': khoCode,
            is_active: true
          })
        : null;

      const existing = existingByName || existingByKhoCode;

      const ogkUpdate = {
        khoCode: khoCode || undefined,
        khoPrice,
        billingGroup: billingGroup ?? undefined,
        federalState: federalState || undefined,
        points: points ?? undefined,
        pointValue: pointValue ?? undefined,
        calculatedFromPoints
      };

      if (existing) {
        existing.ogk = existing.ogk || {};
        existing.ogk.khoCode = ogkUpdate.khoCode !== undefined ? ogkUpdate.khoCode : existing.ogk.khoCode;
        existing.ogk.khoPrice = ogkUpdate.khoPrice;
        existing.ogk.billingGroup = ogkUpdate.billingGroup !== undefined ? ogkUpdate.billingGroup : existing.ogk.billingGroup;
        existing.ogk.federalState = ogkUpdate.federalState !== undefined ? ogkUpdate.federalState : existing.ogk.federalState;
        existing.ogk.points = ogkUpdate.points !== undefined ? ogkUpdate.points : existing.ogk.points;
        existing.ogk.pointValue = ogkUpdate.pointValue !== undefined ? ogkUpdate.pointValue : existing.ogk.pointValue;
        existing.ogk.calculatedFromPoints = ogkUpdate.calculatedFromPoints;
        if (specialty !== undefined) existing.specialty = specialty;
        existing.updatedBy = createdBy;
        await existing.save();
        updated++;
        if (updated <= 20) {
          console.log(`  Aktualisiert: ${existing.code} – ${name} (${khoCode}) €${khoPrice.toFixed(2)}`);
        }
      } else {
        const code = await generateUniqueCode(khoCode || tariff.code);
        const newService = new ServiceCatalog({
          code,
          name,
          base_duration_min: DEFAULT_BASE_DURATION_MIN,
          location_id: defaultLocationId,
          createdBy,
          ...(specialty !== undefined && { specialty }),
          ogk: {
            khoCode: khoCode || undefined,
            khoPrice,
            billingGroup: billingGroup ?? undefined,
            federalState: federalState || undefined,
            points: points ?? undefined,
            pointValue: pointValue ?? undefined,
            calculatedFromPoints
          },
          is_active: true,
          isMedical: true
        });
        await newService.save();
        created++;
        if (created <= 20) {
          console.log(`  Neu: ${code} – ${name} (${khoCode}) €${khoPrice.toFixed(2)}`);
        }
      }
    } catch (err) {
      errors.push({ code: tariff.code, error: err.message });
      console.error(`  Fehler bei Tarif ${tariff.code}:`, err.message);
    }
  }

  const totalWithOgk = await ServiceCatalog.countDocuments({
    is_active: true,
    $or: [
      { 'ogk.khoCode': { $exists: true, $ne: null, $ne: '' } },
      { 'ogk.khoPrice': { $exists: true, $ne: null, $gt: 0 } }
    ]
  });

  const vuCount = await ServiceCatalog.countDocuments({
    is_active: true,
    $or: [
      { name: /vorsorge|Vorsorge|VU/i },
      { 'ogk.khoCode': /^VU/i }
    ]
  });

  console.log('\n=== Sync abgeschlossen ===');
  console.log(`  Neu erstellt: ${created}`);
  console.log(`  Aktualisiert: ${updated}`);
  console.log(`  Services mit KHO-Daten (aktiv): ${totalWithOgk}`);
  console.log(`  Davon VU-/Vorsorge-Leistungen: ${vuCount}`);
  if (errors.length > 0) {
    console.log(`  Fehler: ${errors.length}`);
    errors.slice(0, 10).forEach((e) => console.log(`    - ${e.code}: ${e.error}`));
  }
  console.log('');

  await mongoose.connection.close();
  console.log('✓ MongoDB-Verbindung geschlossen');

  return { created, updated, totalWithOgk, vuCount, errors };
};

if (require.main === module) {
  run()
    .then((result) => {
      if (result.totalWithOgk >= 50 && result.vuCount >= 1) {
        console.log('✅ Alle 50+ Basis-Leistungen und VU-Leistungen sind im Leistungskatalog verfügbar.');
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal:', err);
      process.exit(1);
    });
}

module.exports = run;
