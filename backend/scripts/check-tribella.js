const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ServiceCatalog = require('../models/ServiceCatalog');

const checkTribella = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware';
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Search for services with code K001
    const k001Services = await ServiceCatalog.find({ code: 'K001' });
    console.log(`\n🔍 Services with code K001: ${k001Services.length}`);
    k001Services.forEach(service => {
      console.log(`  - ${service.name} (ID: ${service._id}, Active: ${service.is_active}, Quick Select: ${service.quick_select})`);
    });

    // Search for services with name containing "Tribella"
    const tribellaServices = await ServiceCatalog.find({ 
      name: { $regex: /tribella/i } 
    });
    console.log(`\n🔍 Services with name containing "Tribella": ${tribellaServices.length}`);
    tribellaServices.forEach(service => {
      console.log(`  - ${service.name} (Code: ${service.code}, ID: ${service._id}, Active: ${service.is_active}, Quick Select: ${service.quick_select})`);
    });

    // Search for services with code KONS006
    const kons006Services = await ServiceCatalog.find({ code: 'KONS006' });
    console.log(`\n🔍 Services with code KONS006: ${kons006Services.length}`);
    kons006Services.forEach(service => {
      console.log(`  - ${service.name} (ID: ${service._id}, Active: ${service.is_active}, Quick Select: ${service.quick_select})`);
    });

    // Count all active services
    const activeCount = await ServiceCatalog.countDocuments({ is_active: true });
    console.log(`\n📊 Total active services: ${activeCount}`);

    // Count all services
    const totalCount = await ServiceCatalog.countDocuments({});
    console.log(`📊 Total services: ${totalCount}`);

    // List first 10 active services with their codes
    const sampleServices = await ServiceCatalog.find({ is_active: true })
      .select('code name is_active quick_select')
      .limit(10)
      .sort({ name: 1 });
    console.log(`\n📋 Sample of active services (first 10):`);
    sampleServices.forEach(service => {
      console.log(`  - ${service.code}: ${service.name} (Quick Select: ${service.quick_select})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkTribella();

















