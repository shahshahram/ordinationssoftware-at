/**
 * Script zur Analyse der Datenbank für Punktwert-Implementierung
 * Prüft: Laborleistungen, Specialties, Positionsnummern, billingGroups
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Tariff = require('../models/Tariff');
const ServiceCatalog = require('../models/ServiceCatalog');
const Location = require('../models/Location');

const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function analyzeData() {
  try {
    console.log('=== Datenbank-Analyse für Punktwert-Implementierung ===');
    console.log('');

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ MongoDB verbunden');
    console.log('');

    // 1. Laborleistungen
    console.log('1. LABORLEISTUNGEN:');
    const laborTariffs = await Tariff.countDocuments({ specialty: 'labor' });
    const laborServices = await ServiceCatalog.countDocuments({ specialty: 'labor' });
    console.log(`   Tariffs mit specialty='labor': ${laborTariffs}`);
    console.log(`   Services mit specialty='labor': ${laborServices}`);
    
    const laborBillingGroup = await Tariff.countDocuments({ 'kho.billingGroup': 'labor' });
    const laborServiceBillingGroup = await ServiceCatalog.countDocuments({ 'ogk.billingGroup': 'labor' });
    console.log(`   Tariffs mit billingGroup='labor': ${laborBillingGroup}`);
    console.log(`   Services mit billingGroup='labor': ${laborServiceBillingGroup}`);
    console.log('');

    // 2. BillingGroups
    console.log('2. BILLING GROUPS:');
    const tariffBillingGroups = await Tariff.distinct('kho.billingGroup');
    const serviceBillingGroups = await ServiceCatalog.distinct('ogk.billingGroup');
    console.log(`   Tariff billingGroups: ${JSON.stringify(tariffBillingGroups)}`);
    console.log(`   Service billingGroups: ${JSON.stringify(serviceBillingGroups)}`);
    console.log('');

    // 3. Specialties
    console.log('3. SPECIALTIES:');
    const tariffSpecialties = await Tariff.distinct('specialty');
    const serviceSpecialties = await ServiceCatalog.distinct('specialty');
    console.log(`   Tariff specialties (${tariffSpecialties.length}): ${JSON.stringify(tariffSpecialties)}`);
    console.log(`   Service specialties (${serviceSpecialties.length}): ${JSON.stringify(serviceSpecialties)}`);
    console.log('');

    // 4. Positionsnummern (spezifische Werte: 83, 97, 110, 165, 14, 27)
    console.log('4. POSITIONSNUMMERN (spezifische Werte):');
    const specificPositions = ['83', '97', '110', '165', '14', '27'];
    for (const pos of specificPositions) {
      const tariffCount = await Tariff.countDocuments({ 'kho.khoCode': pos });
      const serviceCount = await ServiceCatalog.countDocuments({ 'ogk.khoCode': pos });
      if (tariffCount > 0 || serviceCount > 0) {
        console.log(`   Position ${pos}: ${tariffCount} Tariffs, ${serviceCount} Services`);
      }
    }
    console.log('');

    // 5. Numerische Positionsnummern (Pattern: ^\d+$)
    console.log('5. NUMERISCHE POSITIONSNUMMERN (Pattern: ^\\d+$):');
    const allTariffCodes = await Tariff.distinct('kho.khoCode');
    const allServiceCodes = await ServiceCatalog.distinct('ogk.khoCode');
    const numericTariffCodes = allTariffCodes.filter(code => code && /^\d+$/.test(code));
    const numericServiceCodes = allServiceCodes.filter(code => code && /^\d+$/.test(code));
    console.log(`   Numerische Tariff-Codes: ${numericTariffCodes.length} (Beispiele: ${numericTariffCodes.slice(0, 10).join(', ')})`);
    console.log(`   Numerische Service-Codes: ${numericServiceCodes.length} (Beispiele: ${numericServiceCodes.slice(0, 10).join(', ')})`);
    console.log('');

    // 6. Radiologie
    console.log('6. RADIOLOGIE:');
    const radiologyTariffs = await Tariff.countDocuments({ specialty: 'radiologie' });
    const radiologyServices = await ServiceCatalog.countDocuments({ specialty: 'radiologie' });
    console.log(`   Tariffs mit specialty='radiologie': ${radiologyTariffs}`);
    console.log(`   Services mit specialty='radiologie': ${radiologyServices}`);
    console.log('');

    // 7. Arzt-Specialties (Location.owner.specialty)
    console.log('7. ARZT-SPECIALTIES (Location.owner.specialty):');
    const locations = await Location.find({ 'owner.specialty': { $exists: true, $ne: null } })
      .select('name owner.specialty');
    const doctorSpecialties = [...new Set(locations.map(loc => loc.owner?.specialty).filter(Boolean))];
    console.log(`   Locations mit Arzt-Specialty: ${locations.length}`);
    console.log(`   Verschiedene Arzt-Specialties: ${JSON.stringify(doctorSpecialties)}`);
    locations.forEach(loc => {
      console.log(`     - ${loc.name}: ${loc.owner?.specialty || 'N/A'}`);
    });
    console.log('');

    // 8. Bundesländer-Verteilung
    console.log('8. BUNDESLÄNDER-VERTEILUNG:');
    const tariffStates = await Tariff.distinct('kho.federalState');
    const serviceStates = await ServiceCatalog.distinct('ogk.federalState');
    const locationStates = await Location.distinct('federalState');
    console.log(`   Tariff federalStates: ${JSON.stringify(tariffStates)}`);
    console.log(`   Service federalStates: ${JSON.stringify(serviceStates)}`);
    console.log(`   Location federalStates: ${JSON.stringify(locationStates)}`);
    console.log('');

    // 9. Punktwerte in bestehenden Daten
    console.log('9. PUNKTWERTE IN BESTEHENDEN DATEN:');
    const tariffsWithPointValue = await Tariff.find({ 'kho.pointValue': { $exists: true, $ne: null } })
      .select('code kho.pointValue kho.federalState specialty')
      .limit(10);
    console.log(`   Tariffs mit pointValue (Beispiele):`);
    tariffsWithPointValue.forEach(t => {
      console.log(`     - ${t.code}: ${t.kho?.pointValue} (${t.kho?.federalState || 'N/A'}, ${t.specialty || 'N/A'})`);
    });
    console.log('');

    await mongoose.connection.close();
    console.log('✓ Analyse abgeschlossen');
  } catch (error) {
    console.error('Fehler:', error.message);
    console.error(error.stack);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

if (require.main === module) {
  analyzeData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fataler Fehler:', error);
      process.exit(1);
    });
}

module.exports = analyzeData;
