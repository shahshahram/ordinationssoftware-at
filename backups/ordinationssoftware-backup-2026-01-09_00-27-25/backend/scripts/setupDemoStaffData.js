const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const StaffProfile = require('../models/StaffProfile');
const WorkShift = require('../models/WorkShift');
const Absence = require('../models/Absence');
const ServiceCatalog = require('../models/ServiceCatalog');
const Resource = require('../models/Resource');

async function setupDemoStaffData() {
  try {
    // MongoDB verbinden
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB verbunden');

    // Demo-Benutzer erstellen
    const demoUsers = [
      {
        firstName: 'Dr. Maria',
        lastName: 'Müller',
        email: 'maria.mueller@ordinationssoftware.at',
        password: 'password123',
        role: 'doctor',
        permissions: ['patients.read', 'patients.write', 'appointments.read', 'appointments.write', 'billing.read', 'billing.write']
      },
      {
        firstName: 'Dr. Thomas',
        lastName: 'Schmidt',
        email: 'thomas.schmidt@ordinationssoftware.at',
        password: 'password123',
        role: 'doctor',
        permissions: ['patients.read', 'patients.write', 'appointments.read', 'appointments.write', 'billing.read', 'billing.write']
      },
      {
        firstName: 'Anna',
        lastName: 'Weber',
        email: 'anna.weber@ordinationssoftware.at',
        password: 'password123',
        role: 'staff',
        permissions: ['patients.read', 'appointments.read', 'appointments.write']
      },
      {
        firstName: 'Michael',
        lastName: 'Fischer',
        email: 'michael.fischer@ordinationssoftware.at',
        password: 'password123',
        role: 'staff',
        permissions: ['patients.read', 'appointments.read', 'appointments.write']
      }
    ];

    const createdUsers = [];
    for (const userData of demoUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        createdUsers.push(user);
        console.log(`Benutzer erstellt: ${user.email}`);
      } else {
        createdUsers.push(existingUser);
        console.log(`Benutzer existiert bereits: ${userData.email}`);
      }
    }

    // Personalprofile erstellen
    const staffProfiles = [
      {
        userId: createdUsers[0]._id,
        displayName: 'Dr. Maria Müller',
        roleHint: 'arzt',
        colorHex: '#3B82F6',
        acceptsOnline: true,
        specializations: ['Allgemeinmedizin', 'Innere Medizin'],
        title: 'Dr. med.',
        contact: {
          phone: '+43 1 234 5678',
          mobile: '+43 664 123 4567',
          email: 'maria.mueller@ordinationssoftware.at'
        },
        workSettings: {
          defaultDuration: 30,
          bufferBefore: 5,
          bufferAfter: 5,
          maxConcurrentAppointments: 1,
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          workingHours: { start: '08:00', end: '17:00' }
        },
        permissions: ['patients.read', 'patients.write', 'appointments.read', 'appointments.write', 'billing.read', 'billing.write']
      },
      {
        userId: createdUsers[1]._id,
        displayName: 'Dr. Thomas Schmidt',
        roleHint: 'arzt',
        colorHex: '#10B981',
        acceptsOnline: true,
        specializations: ['Kardiologie', 'Innere Medizin'],
        title: 'Dr. med.',
        contact: {
          phone: '+43 1 234 5679',
          mobile: '+43 664 123 4568',
          email: 'thomas.schmidt@ordinationssoftware.at'
        },
        workSettings: {
          defaultDuration: 45,
          bufferBefore: 10,
          bufferAfter: 10,
          maxConcurrentAppointments: 1,
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          workingHours: { start: '09:00', end: '18:00' }
        },
        permissions: ['patients.read', 'patients.write', 'appointments.read', 'appointments.write', 'billing.read', 'billing.write']
      },
      {
        userId: createdUsers[2]._id,
        displayName: 'Anna Weber',
        roleHint: 'assistenz',
        colorHex: '#F59E0B',
        acceptsOnline: false,
        specializations: ['Ordinationsassistenz'],
        contact: {
          phone: '+43 1 234 5680',
          mobile: '+43 664 123 4569',
          email: 'anna.weber@ordinationssoftware.at'
        },
        workSettings: {
          defaultDuration: 15,
          bufferBefore: 0,
          bufferAfter: 0,
          maxConcurrentAppointments: 3,
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          workingHours: { start: '07:30', end: '16:30' }
        },
        permissions: ['patients.read', 'appointments.read', 'appointments.write']
      },
      {
        userId: createdUsers[3]._id,
        displayName: 'Michael Fischer',
        roleHint: 'assistenz',
        colorHex: '#EF4444',
        acceptsOnline: false,
        specializations: ['Ordinationsassistenz'],
        contact: {
          phone: '+43 1 234 5681',
          mobile: '+43 664 123 4570',
          email: 'michael.fischer@ordinationssoftware.at'
        },
        workSettings: {
          defaultDuration: 15,
          bufferBefore: 0,
          bufferAfter: 0,
          maxConcurrentAppointments: 3,
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          workingHours: { start: '08:00', end: '17:00' }
        },
        permissions: ['patients.read', 'appointments.read', 'appointments.write']
      }
    ];

    const createdStaffProfiles = [];
    for (const profileData of staffProfiles) {
      const existingProfile = await StaffProfile.findOne({ userId: profileData.userId });
      if (!existingProfile) {
        const profile = new StaffProfile(profileData);
        await profile.save();
        createdStaffProfiles.push(profile);
        console.log(`Personalprofil erstellt: ${profile.displayName}`);
      } else {
        createdStaffProfiles.push(existingProfile);
        console.log(`Personalprofil existiert bereits: ${profileData.displayName}`);
      }
    }

    // Erweiterte ServiceCatalog-Daten erstellen
    const services = [
      {
        code: 'KONS_001',
        name: 'Allgemeine Konsultation',
        description: 'Standard-Konsultation für allgemeine Beschwerden',
        category: 'konsultation',
        duration: 30,
        bufferBefore: 5,
        bufferAfter: 5,
        requiredRole: 'arzt',
        requiresRoom: true,
        isOnlineBookable: true,
        bookingConstraints: {
          maxAdvanceBooking: 30,
          minAdvanceBooking: 2,
          maxPerDay: 20,
          maxPerWeek: 100,
          allowedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          allowedTimeSlots: [
            { start: '08:00', end: '12:00' },
            { start: '14:00', end: '17:00' }
          ]
        },
        prices: { kassenarzt: 25.00, wahlarzt: 50.00, privat: 80.00 },
        createdBy: createdUsers[0]._id
      },
      {
        code: 'KONS_002',
        name: 'Erstkonsultation',
        description: 'Ausführliche Erstkonsultation für neue Patienten',
        category: 'konsultation',
        duration: 60,
        bufferBefore: 10,
        bufferAfter: 10,
        requiredRole: 'arzt',
        requiresRoom: true,
        isOnlineBookable: true,
        bookingConstraints: {
          maxAdvanceBooking: 30,
          minAdvanceBooking: 24,
          maxPerDay: 8,
          maxPerWeek: 40,
          allowedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          allowedTimeSlots: [
            { start: '09:00', end: '12:00' },
            { start: '14:00', end: '16:00' }
          ]
        },
        prices: { kassenarzt: 50.00, wahlarzt: 100.00, privat: 150.00 },
        createdBy: createdUsers[0]._id
      },
      {
        code: 'BEH_001',
        name: 'Blutdruckmessung',
        description: 'Routinemäßige Blutdruckmessung',
        category: 'behandlung',
        duration: 15,
        bufferBefore: 0,
        bufferAfter: 0,
        requiredRole: 'assistenz',
        requiresRoom: false,
        isOnlineBookable: false,
        bookingConstraints: {
          maxAdvanceBooking: 7,
          minAdvanceBooking: 0,
          maxPerDay: 50,
          maxPerWeek: 250
        },
        prices: { kassenarzt: 5.00, wahlarzt: 10.00, privat: 15.00 },
        createdBy: createdUsers[0]._id
      },
      {
        code: 'BEH_002',
        name: 'EKG',
        description: 'Elektrokardiogramm',
        category: 'behandlung',
        duration: 30,
        bufferBefore: 5,
        bufferAfter: 5,
        requiredRole: 'arzt',
        requiresRoom: true,
        isOnlineBookable: true,
        bookingConstraints: {
          maxAdvanceBooking: 14,
          minAdvanceBooking: 2,
          maxPerDay: 15,
          maxPerWeek: 75
        },
        prices: { kassenarzt: 15.00, wahlarzt: 30.00, privat: 50.00 },
        createdBy: createdUsers[0]._id
      }
    ];

    const createdServices = [];
    for (const serviceData of services) {
      const existingService = await ServiceCatalog.findOne({ code: serviceData.code });
      if (!existingService) {
        const service = new ServiceCatalog(serviceData);
        await service.save();
        createdServices.push(service);
        console.log(`Service erstellt: ${service.name}`);
      } else {
        createdServices.push(existingService);
        console.log(`Service existiert bereits: ${serviceData.name}`);
      }
    }

    // WorkShifts erstellen
    const today = new Date();
    const workShifts = [];

    // Schichten für die nächsten 30 Tage erstellen
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Nur Werktage
      if (date.getDay() >= 1 && date.getDay() <= 5) {
        // Dr. Maria Müller - Vormittag
        workShifts.push({
          staffId: createdStaffProfiles[0]._id,
          startsAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, 0),
          endsAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0),
          shiftType: 'regular',
          availableServices: [createdServices[0]._id, createdServices[1]._id, createdServices[3]._id],
          maxAppointmentsPerHour: 2,
          breaks: [
            { start: '10:00', end: '10:15', label: 'Kaffeepause' }
          ]
        });

        // Dr. Maria Müller - Nachmittag
        workShifts.push({
          staffId: createdStaffProfiles[0]._id,
          startsAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 14, 0),
          endsAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0),
          shiftType: 'regular',
          availableServices: [createdServices[0]._id, createdServices[1]._id],
          maxAppointmentsPerHour: 2,
          breaks: [
            { start: '15:30', end: '15:45', label: 'Kaffeepause' }
          ]
        });

        // Dr. Thomas Schmidt - Vormittag
        workShifts.push({
          staffId: createdStaffProfiles[1]._id,
          startsAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0),
          endsAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0),
          shiftType: 'regular',
          availableServices: [createdServices[0]._id, createdServices[1]._id, createdServices[3]._id],
          maxAppointmentsPerHour: 1,
          breaks: [
            { start: '10:30', end: '10:45', label: 'Kaffeepause' }
          ]
        });

        // Dr. Thomas Schmidt - Nachmittag
        workShifts.push({
          staffId: createdStaffProfiles[1]._id,
          startsAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 14, 0),
          endsAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 0),
          shiftType: 'regular',
          availableServices: [createdServices[0]._id, createdServices[1]._id],
          maxAppointmentsPerHour: 1,
          breaks: [
            { start: '16:00', end: '16:15', label: 'Kaffeepause' }
          ]
        });

        // Anna Weber - Ganztag
        workShifts.push({
          staffId: createdStaffProfiles[2]._id,
          startsAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 7, 30),
          endsAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 16, 30),
          shiftType: 'regular',
          availableServices: [createdServices[2]._id],
          maxAppointmentsPerHour: 4,
          breaks: [
            { start: '09:30', end: '09:45', label: 'Kaffeepause' },
            { start: '12:00', end: '13:00', label: 'Mittagspause' },
            { start: '15:00', end: '15:15', label: 'Kaffeepause' }
          ]
        });

        // Michael Fischer - Ganztag
        workShifts.push({
          staffId: createdStaffProfiles[3]._id,
          startsAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, 0),
          endsAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0),
          shiftType: 'regular',
          availableServices: [createdServices[2]._id],
          maxAppointmentsPerHour: 4,
          breaks: [
            { start: '10:00', end: '10:15', label: 'Kaffeepause' },
            { start: '12:30', end: '13:30', label: 'Mittagspause' },
            { start: '15:30', end: '15:45', label: 'Kaffeepause' }
          ]
        });
      }
    }

    for (const shiftData of workShifts) {
      const shift = new WorkShift(shiftData);
      await shift.save();
    }
    console.log(`${workShifts.length} Arbeitszeiten erstellt`);

    // Demo-Abwesenheiten erstellen
    const absences = [
      {
        staffId: createdStaffProfiles[0]._id,
        startsAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 0, 0),
        endsAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 23, 59),
        reason: 'vacation',
        description: 'Urlaub',
        status: 'approved',
        approvedBy: createdUsers[0]._id,
        approvedAt: new Date(),
        isFullDay: true,
        vacationType: 'annual',
        urgency: 'low'
      },
      {
        staffId: createdStaffProfiles[1]._id,
        startsAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14, 0, 0),
        endsAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 16, 23, 59),
        reason: 'conference',
        description: 'Medizinische Konferenz',
        status: 'approved',
        approvedBy: createdUsers[0]._id,
        approvedAt: new Date(),
        isFullDay: true,
        urgency: 'medium'
      }
    ];

    for (const absenceData of absences) {
      const absence = new Absence(absenceData);
      await absence.save();
    }
    console.log(`${absences.length} Abwesenheiten erstellt`);

    console.log('✅ Demo-Daten für Personalverwaltung erfolgreich erstellt!');
    console.log(`📊 Erstellt:`);
    console.log(`   - ${createdUsers.length} Benutzer`);
    console.log(`   - ${createdStaffProfiles.length} Personalprofile`);
    console.log(`   - ${createdServices.length} erweiterte Services`);
    console.log(`   - ${workShifts.length} Arbeitszeiten`);
    console.log(`   - ${absences.length} Abwesenheiten`);

  } catch (error) {
    console.error('Fehler beim Erstellen der Demo-Daten:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Verbindung geschlossen');
  }
}

// Skript ausführen
if (require.main === module) {
  setupDemoStaffData();
}

module.exports = setupDemoStaffData;
