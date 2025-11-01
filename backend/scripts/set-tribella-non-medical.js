const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ServiceCatalog = require('../models/ServiceCatalog');

const updateTribella = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware';
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Find the Tribella-Behandlung service
    const tribella = await ServiceCatalog.findOne({ name: 'Tribella-Behandlung' });
    
    if (tribella) {
      tribella.isMedical = false;
      await tribella.save();
      console.log('✅ Updated Tribella-Behandlung to isMedical: false');
    } else {
      console.log('❌ Tribella-Behandlung not found');
    }

    // Also update any service with category "Kosmetik"
    const cosmeticServices = await ServiceCatalog.find({ category: 'Kosmetik' });
    for (const service of cosmeticServices) {
      service.isMedical = false;
      await service.save();
      console.log(`✅ Updated ${service.name} (category: Kosmetik) to isMedical: false`);
    }

    console.log('✅ Update completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

updateTribella();



