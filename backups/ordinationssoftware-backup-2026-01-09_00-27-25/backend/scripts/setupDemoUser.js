const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const setupDemoUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ordinationssoftware');
    console.log('✅ MongoDB verbunden');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@ordinationssoftware.at' });
    if (existingAdmin) {
      console.log('ℹ️  Admin-Benutzer existiert bereits');
      return;
    }

    // Create demo admin user
    const adminUser = new User({
      email: 'admin@ordinationssoftware.at',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'Administrator',
      role: 'admin',
      permissions: [
        'patients.read', 'patients.write', 'patients.delete',
        'appointments.read', 'appointments.write', 'appointments.delete',
        'billing.read', 'billing.write',
        'documents.read', 'documents.write', 'documents.delete',
        'users.read', 'users.write', 'users.delete',
        'settings.read', 'settings.write',
        'reports.read'
      ],
      profile: {
        title: 'Dr.',
        specialization: 'Allgemeinmedizin',
        phone: '+43 1 234 5678',
        address: {
          street: 'Hauptstraße 1',
          city: 'Wien',
          postalCode: '1010',
          country: 'Österreich'
        }
      },
      preferences: {
        language: 'de',
        timezone: 'Europe/Vienna',
        dateFormat: 'DD.MM.YYYY',
        theme: 'light'
      }
    });

    await adminUser.save();
    console.log('✅ Demo-Admin-Benutzer erstellt:');
    console.log('   E-Mail: admin@ordinationssoftware.at');
    console.log('   Passwort: admin123');

    // Create demo doctor user
    const doctorUser = new User({
      email: 'arzt@ordinationssoftware.at',
      password: 'arzt123',
      firstName: 'Max',
      lastName: 'Mustermann',
      role: 'doctor',
      permissions: [
        'patients.read', 'patients.write',
        'appointments.read', 'appointments.write',
        'billing.read', 'billing.write',
        'documents.read', 'documents.write',
        'reports.read'
      ],
      profile: {
        title: 'Dr.',
        specialization: 'Innere Medizin',
        phone: '+43 1 234 5679',
        address: {
          street: 'Ordinationsstraße 2',
          city: 'Wien',
          postalCode: '1020',
          country: 'Österreich'
        }
      },
      preferences: {
        language: 'de',
        timezone: 'Europe/Vienna',
        dateFormat: 'DD.MM.YYYY',
        theme: 'light'
      }
    });

    await doctorUser.save();
    console.log('✅ Demo-Arzt-Benutzer erstellt:');
    console.log('   E-Mail: arzt@ordinationssoftware.at');
    console.log('   Passwort: arzt123');

    // Create demo staff user
    const staffUser = new User({
      email: 'mitarbeiter@ordinationssoftware.at',
      password: 'mitarbeiter123',
      firstName: 'Maria',
      lastName: 'Musterfrau',
      role: 'staff',
      permissions: [
        'patients.read', 'patients.write',
        'appointments.read', 'appointments.write',
        'billing.read',
        'documents.read', 'documents.write'
      ],
      profile: {
        title: 'Mag.',
        specialization: 'Sprechstundenhilfe',
        phone: '+43 1 234 5680',
        address: {
          street: 'Mitarbeiterstraße 3',
          city: 'Wien',
          postalCode: '1030',
          country: 'Österreich'
        }
      },
      preferences: {
        language: 'de',
        timezone: 'Europe/Vienna',
        dateFormat: 'DD.MM.YYYY',
        theme: 'light'
      }
    });

    await staffUser.save();
    console.log('✅ Demo-Mitarbeiter-Benutzer erstellt:');
    console.log('   E-Mail: mitarbeiter@ordinationssoftware.at');
    console.log('   Passwort: mitarbeiter123');

    console.log('\n🎉 Demo-Benutzer erfolgreich erstellt!');
    console.log('Sie können sich jetzt mit einem der oben genannten Konten anmelden.');

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Demo-Benutzer:', error.message);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('📡 MongoDB-Verbindung geschlossen');
  }
};

// Run the setup
setupDemoUser();
