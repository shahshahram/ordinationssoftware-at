const mongoose = require('mongoose');
const ServiceCatalog = require('../models/ServiceCatalog');
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createTestServices() {
  try {
    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@ordinationssoftware.at' });
    if (!adminUser) {
      console.log('Admin user not found');
      return;
    }

    // Create test services
    const testServices = [
      {
        code: 'KONS',
        name: 'Konsultation',
        description: 'Allgemeine ärztliche Beratung',
        category: 'Beratung',
        base_duration_min: 30,
        color_hex: '#2563EB',
        quick_select: true,
        is_active: true,
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      },
      {
        code: 'UNTER',
        name: 'Untersuchung',
        description: 'Medizinische Untersuchung',
        category: 'Diagnostik',
        base_duration_min: 45,
        color_hex: '#DC2626',
        quick_select: true,
        is_active: true,
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      },
      {
        code: 'OP',
        name: 'Operation',
        description: 'Chirurgischer Eingriff',
        category: 'Chirurgie',
        base_duration_min: 120,
        color_hex: '#059669',
        quick_select: false,
        is_active: true,
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      },
      {
        code: 'NACH',
        name: 'Nachsorge',
        description: 'Nachbehandlung nach Eingriff',
        category: 'Nachsorge',
        base_duration_min: 20,
        color_hex: '#7C3AED',
        quick_select: true,
        is_active: true,
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      },
      {
        code: 'BERAT',
        name: 'Beratung',
        description: 'Medizinische Beratung',
        category: 'Beratung',
        base_duration_min: 25,
        color_hex: '#EA580C',
        quick_select: true,
        is_active: true,
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      }
    ];

    // Clear existing test services
    await ServiceCatalog.deleteMany({ code: { $in: ['KONS', 'UNTER', 'OP', 'NACH', 'BERAT'] } });

    // Create new services
    const createdServices = await ServiceCatalog.insertMany(testServices);
    console.log(`Created ${createdServices.length} test services:`);
    createdServices.forEach(service => {
      console.log(`- ${service.code}: ${service.name} (${service.base_duration_min}min)`);
    });

  } catch (error) {
    console.error('Error creating test services:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestServices();







