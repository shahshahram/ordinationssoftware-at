const mongoose = require('mongoose');
const Resource = require('../models/Resource');
const User = require('../models/User');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB verbunden');
  } catch (error) {
    console.error('MongoDB Verbindungsfehler:', error);
    process.exit(1);
  }
};

const createDemoResources = async () => {
  try {
    // Lösche bestehende Demo-Ressourcen
    await Resource.deleteMany({ name: { $regex: /^Demo-/ } });
    console.log('Bestehende Demo-Ressourcen gelöscht');

    // Finde einen Admin-Benutzer
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('Kein Admin-Benutzer gefunden. Bitte erstellen Sie zuerst einen Admin-Benutzer.');
      return;
    }

    const demoResources = [
      // Räume
      {
        name: 'Demo-Behandlungsraum 1',
        type: 'room',
        category: 'Behandlung',
        description: 'Moderner Behandlungsraum mit allen notwendigen Geräten',
        onlineBooking: {
          enabled: true,
          advanceBookingDays: 30,
          maxAdvanceBookingDays: 90,
          minAdvanceBookingHours: 24,
          workingHours: {
            monday: { start: '08:00', end: '18:00', isWorking: true },
            tuesday: { start: '08:00', end: '18:00', isWorking: true },
            wednesday: { start: '08:00', end: '18:00', isWorking: true },
            thursday: { start: '08:00', end: '18:00', isWorking: true },
            friday: { start: '08:00', end: '16:00', isWorking: true },
            saturday: { start: '09:00', end: '12:00', isWorking: false },
            sunday: { start: '09:00', end: '12:00', isWorking: false }
          },
          breakTimes: [
            { start: '12:00', end: '13:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] }
          ],
          blockedDates: [],
          maxConcurrentBookings: 1,
          duration: 30,
          price: 0,
          requiresApproval: false
        },
        properties: {
          capacity: 1,
          location: 'Erdgeschoss',
          floor: 'EG',
          accessibility: true
        },
        isActive: true,
        isAvailable: true,
        tags: ['behandlung', 'modern', 'barrierefrei'],
        createdBy: adminUser._id
      },
      {
        name: 'Demo-Behandlungsraum 2',
        type: 'room',
        category: 'Behandlung',
        description: 'Zweiter Behandlungsraum für zusätzliche Termine',
        onlineBooking: {
          enabled: true,
          advanceBookingDays: 30,
          maxAdvanceBookingDays: 90,
          minAdvanceBookingHours: 24,
          workingHours: {
            monday: { start: '08:00', end: '18:00', isWorking: true },
            tuesday: { start: '08:00', end: '18:00', isWorking: true },
            wednesday: { start: '08:00', end: '18:00', isWorking: true },
            thursday: { start: '08:00', end: '18:00', isWorking: true },
            friday: { start: '08:00', end: '16:00', isWorking: true },
            saturday: { start: '09:00', end: '12:00', isWorking: false },
            sunday: { start: '09:00', end: '12:00', isWorking: false }
          },
          breakTimes: [
            { start: '12:00', end: '13:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] }
          ],
          blockedDates: [],
          maxConcurrentBookings: 1,
          duration: 30,
          price: 0,
          requiresApproval: false
        },
        properties: {
          capacity: 1,
          location: 'Erdgeschoss',
          floor: 'EG',
          accessibility: true
        },
        isActive: true,
        isAvailable: true,
        tags: ['behandlung', 'zusatz'],
        createdBy: adminUser._id
      },
      {
        name: 'Demo-Wartezimmer',
        type: 'room',
        category: 'Wartebereich',
        description: 'Komfortables Wartezimmer für Patienten',
        onlineBooking: {
          enabled: false,
          advanceBookingDays: 30,
          maxAdvanceBookingDays: 90,
          minAdvanceBookingHours: 24,
          workingHours: {
            monday: { start: '08:00', end: '18:00', isWorking: true },
            tuesday: { start: '08:00', end: '18:00', isWorking: true },
            wednesday: { start: '08:00', end: '18:00', isWorking: true },
            thursday: { start: '08:00', end: '18:00', isWorking: true },
            friday: { start: '08:00', end: '16:00', isWorking: true },
            saturday: { start: '09:00', end: '12:00', isWorking: false },
            sunday: { start: '09:00', end: '12:00', isWorking: false }
          },
          breakTimes: [],
          blockedDates: [],
          maxConcurrentBookings: 20,
          duration: 60,
          price: 0,
          requiresApproval: false
        },
        properties: {
          capacity: 20,
          location: 'Erdgeschoss',
          floor: 'EG',
          accessibility: true
        },
        isActive: true,
        isAvailable: true,
        tags: ['wartebereich', 'komfort'],
        createdBy: adminUser._id
      },

      // Geräte
      {
        name: 'Demo-EKG-Gerät',
        type: 'equipment',
        category: 'Diagnostik',
        description: 'Moderne EKG-Maschine für Herzuntersuchungen',
        onlineBooking: {
          enabled: true,
          advanceBookingDays: 30,
          maxAdvanceBookingDays: 90,
          minAdvanceBookingHours: 24,
          workingHours: {
            monday: { start: '08:00', end: '18:00', isWorking: true },
            tuesday: { start: '08:00', end: '18:00', isWorking: true },
            wednesday: { start: '08:00', end: '18:00', isWorking: true },
            thursday: { start: '08:00', end: '18:00', isWorking: true },
            friday: { start: '08:00', end: '16:00', isWorking: true },
            saturday: { start: '09:00', end: '12:00', isWorking: false },
            sunday: { start: '09:00', end: '12:00', isWorking: false }
          },
          breakTimes: [],
          blockedDates: [],
          maxConcurrentBookings: 1,
          duration: 15,
          price: 0,
          requiresApproval: false
        },
        properties: {
          brand: 'Philips',
          model: 'PageWriter TC70',
          serialNumber: 'EKG-2024-001',
          maintenanceDate: new Date('2024-12-01'),
          status: 'available'
        },
        isActive: true,
        isAvailable: true,
        tags: ['ekg', 'herz', 'diagnostik'],
        createdBy: adminUser._id
      },
      {
        name: 'Demo-Blutdruckmessgerät',
        type: 'equipment',
        category: 'Diagnostik',
        description: 'Digitales Blutdruckmessgerät',
        onlineBooking: {
          enabled: true,
          advanceBookingDays: 30,
          maxAdvanceBookingDays: 90,
          minAdvanceBookingHours: 24,
          workingHours: {
            monday: { start: '08:00', end: '18:00', isWorking: true },
            tuesday: { start: '08:00', end: '18:00', isWorking: true },
            wednesday: { start: '08:00', end: '18:00', isWorking: true },
            thursday: { start: '08:00', end: '18:00', isWorking: true },
            friday: { start: '08:00', end: '16:00', isWorking: true },
            saturday: { start: '09:00', end: '12:00', isWorking: false },
            sunday: { start: '09:00', end: '12:00', isWorking: false }
          },
          breakTimes: [],
          blockedDates: [],
          maxConcurrentBookings: 1,
          duration: 5,
          price: 0,
          requiresApproval: false
        },
        properties: {
          brand: 'Omron',
          model: 'M7 Intelli IT',
          serialNumber: 'BP-2024-001',
          maintenanceDate: new Date('2024-11-01'),
          status: 'available'
        },
        isActive: true,
        isAvailable: true,
        tags: ['blutdruck', 'diagnostik'],
        createdBy: adminUser._id
      },

      // Services
      {
        name: 'Demo-Blutabnahme',
        type: 'service',
        category: 'Labor',
        description: 'Professionelle Blutabnahme für Laboruntersuchungen',
        onlineBooking: {
          enabled: true,
          advanceBookingDays: 30,
          maxAdvanceBookingDays: 90,
          minAdvanceBookingHours: 24,
          workingHours: {
            monday: { start: '08:00', end: '18:00', isWorking: true },
            tuesday: { start: '08:00', end: '18:00', isWorking: true },
            wednesday: { start: '08:00', end: '18:00', isWorking: true },
            thursday: { start: '08:00', end: '18:00', isWorking: true },
            friday: { start: '08:00', end: '16:00', isWorking: true },
            saturday: { start: '09:00', end: '12:00', isWorking: false },
            sunday: { start: '09:00', end: '12:00', isWorking: false }
          },
          breakTimes: [],
          blockedDates: [],
          maxConcurrentBookings: 1,
          duration: 20,
          price: 0,
          requiresApproval: false
        },
        properties: {
          serviceCode: 'LAB-001',
          duration: 20,
          price: 0,
          requirements: ['Nüchtern', 'Ausweis mitbringen']
        },
        isActive: true,
        isAvailable: true,
        tags: ['labor', 'blut', 'untersuchung'],
        createdBy: adminUser._id
      },
      {
        name: 'Demo-Impfung',
        type: 'service',
        category: 'Prävention',
        description: 'Impfungen nach Impfplan',
        onlineBooking: {
          enabled: true,
          advanceBookingDays: 30,
          maxAdvanceBookingDays: 90,
          minAdvanceBookingHours: 24,
          workingHours: {
            monday: { start: '08:00', end: '18:00', isWorking: true },
            tuesday: { start: '08:00', end: '18:00', isWorking: true },
            wednesday: { start: '08:00', end: '18:00', isWorking: true },
            thursday: { start: '08:00', end: '18:00', isWorking: true },
            friday: { start: '08:00', end: '16:00', isWorking: true },
            saturday: { start: '09:00', end: '12:00', isWorking: false },
            sunday: { start: '09:00', end: '12:00', isWorking: false }
          },
          breakTimes: [],
          blockedDates: [],
          maxConcurrentBookings: 1,
          duration: 15,
          price: 0,
          requiresApproval: false
        },
        properties: {
          serviceCode: 'IMP-001',
          duration: 15,
          price: 0,
          requirements: ['Impfpass mitbringen', 'Allergien angeben']
        },
        isActive: true,
        isAvailable: true,
        tags: ['impfung', 'prävention', 'gesundheit'],
        createdBy: adminUser._id
      },

      // Personal
      {
        name: 'Demo-Dr. Müller',
        type: 'personnel',
        category: 'Arzt',
        description: 'Facharzt für Allgemeinmedizin',
        onlineBooking: {
          enabled: true,
          advanceBookingDays: 30,
          maxAdvanceBookingDays: 90,
          minAdvanceBookingHours: 24,
          workingHours: {
            monday: { start: '08:00', end: '18:00', isWorking: true },
            tuesday: { start: '08:00', end: '18:00', isWorking: true },
            wednesday: { start: '08:00', end: '18:00', isWorking: true },
            thursday: { start: '08:00', end: '18:00', isWorking: true },
            friday: { start: '08:00', end: '16:00', isWorking: true },
            saturday: { start: '09:00', end: '12:00', isWorking: false },
            sunday: { start: '09:00', end: '12:00', isWorking: false }
          },
          breakTimes: [
            { start: '12:00', end: '13:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] }
          ],
          blockedDates: [],
          maxConcurrentBookings: 1,
          duration: 30,
          price: 0,
          requiresApproval: false
        },
        properties: {
          specialization: 'Allgemeinmedizin',
          title: 'Dr. med.',
          qualifications: ['Facharzt für Allgemeinmedizin', 'Notfallmedizin'],
          languages: ['Deutsch', 'Englisch'],
          experience: '15 Jahre'
        },
        isActive: true,
        isAvailable: true,
        tags: ['arzt', 'allgemeinmedizin', 'erfahren'],
        createdBy: adminUser._id
      },
      {
        name: 'Demo-Schwester Anna',
        type: 'personnel',
        category: 'Pflege',
        description: 'Krankenschwester für Patientenbetreuung',
        onlineBooking: {
          enabled: true,
          advanceBookingDays: 30,
          maxAdvanceBookingDays: 90,
          minAdvanceBookingHours: 24,
          workingHours: {
            monday: { start: '08:00', end: '18:00', isWorking: true },
            tuesday: { start: '08:00', end: '18:00', isWorking: true },
            wednesday: { start: '08:00', end: '18:00', isWorking: true },
            thursday: { start: '08:00', end: '18:00', isWorking: true },
            friday: { start: '08:00', end: '16:00', isWorking: true },
            saturday: { start: '09:00', end: '12:00', isWorking: false },
            sunday: { start: '09:00', end: '12:00', isWorking: false }
          },
          breakTimes: [
            { start: '12:00', end: '13:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] }
          ],
          blockedDates: [],
          maxConcurrentBookings: 1,
          duration: 20,
          price: 0,
          requiresApproval: false
        },
        properties: {
          specialization: 'Krankenpflege',
          title: 'DGKP',
          qualifications: ['Diplomierte Gesundheits- und Krankenpflegerin', 'Wundversorgung'],
          languages: ['Deutsch', 'Englisch'],
          experience: '8 Jahre'
        },
        isActive: true,
        isAvailable: true,
        tags: ['krankenschwester', 'pflege', 'betreuung'],
        createdBy: adminUser._id
      }
    ];

    // Erstelle Ressourcen
    for (const resourceData of demoResources) {
      const resource = new Resource(resourceData);
      await resource.save();
      console.log(`✅ Demo-Ressource erstellt: ${resource.name}`);
    }

    console.log(`\n🎉 ${demoResources.length} Demo-Ressourcen erfolgreich erstellt!`);
    console.log('\n📋 Erstellte Ressourcen:');
    console.log('🏥 Räume:');
    console.log('  - Demo-Behandlungsraum 1 (Online buchbar)');
    console.log('  - Demo-Behandlungsraum 2 (Online buchbar)');
    console.log('  - Demo-Wartezimmer (Nicht online buchbar)');
    console.log('\n🔬 Geräte:');
    console.log('  - Demo-EKG-Gerät (Online buchbar)');
    console.log('  - Demo-Blutdruckmessgerät (Online buchbar)');
    console.log('\n🩺 Services:');
    console.log('  - Demo-Blutabnahme (Online buchbar)');
    console.log('  - Demo-Impfung (Online buchbar)');
    console.log('\n👥 Personal:');
    console.log('  - Demo-Dr. Müller (Online buchbar)');
    console.log('  - Demo-Schwester Anna (Online buchbar)');

  } catch (error) {
    console.error('Fehler beim Erstellen der Demo-Ressourcen:', error);
  }
};

const run = async () => {
  await connectDB();
  await createDemoResources();
  process.exit(0);
};

run();
