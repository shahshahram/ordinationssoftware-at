const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import ServiceCatalog model
const ServiceCatalog = require('../models/ServiceCatalog');

const updateServiceCatalog = async () => {
  try {
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware';
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Get all services
    const services = await ServiceCatalog.find({});
    console.log(`Found ${services.length} services`);

    // Update services to set isMedical based on category
    for (const service of services) {
      let isMedical = true; // Default to medical
      
      // Define non-medical categories
      const nonMedicalCategories = ['Kosmetik', 'cosmetic', 'Beauty', 'Wellness', 'Massage'];
      
      if (service.category && nonMedicalCategories.some(cat => 
        service.category.toLowerCase().includes(cat.toLowerCase())
      )) {
        isMedical = false;
      }

      // Update if isMedical is not set
      if (service.isMedical === undefined) {
        await ServiceCatalog.findByIdAndUpdate(service._id, { isMedical });
        console.log(`Updated ${service.name} - isMedical: ${isMedical}`);
      } else {
        console.log(`Skipped ${service.name} - already has isMedical: ${service.isMedical}`);
      }
    }

    console.log('✅ Update completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

updateServiceCatalog();

