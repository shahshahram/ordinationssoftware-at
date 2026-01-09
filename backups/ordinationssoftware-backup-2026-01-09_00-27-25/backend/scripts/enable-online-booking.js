/**
 * Skript zum Aktivieren der Online-Buchung für einen Arzt
 * 
 * Verwendung:
 * node backend/scripts/enable-online-booking.js <arzt-email>
 * 
 * Beispiel:
 * node backend/scripts/enable-online-booking.js arzt@example.com
 */

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware';

async function enableOnlineBooking(doctorEmail) {
  try {
    // Verbinde zur Datenbank
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Verbunden mit MongoDB');

    // Finde den Arzt
    const doctor = await User.findOne({ 
      email: doctorEmail,
      role: 'doctor'
    });

    if (!doctor) {
      console.error(`❌ Arzt mit E-Mail "${doctorEmail}" nicht gefunden oder ist kein Arzt`);
      process.exit(1);
    }

    // Aktiviere Online-Buchung
    if (!doctor.profile) {
      doctor.profile = {};
    }
    
    doctor.profile.onlineBookingEnabled = true;
    
    // Setze Standard-Einstellungen falls nicht vorhanden
    if (!doctor.profile.onlineBookingSettings) {
      doctor.profile.onlineBookingSettings = {
        advanceBookingDays: 30,
        maxAdvanceBookingDays: 90,
        minAdvanceBookingHours: 2,
        maxConcurrentBookings: 1,
        duration: 30,
        price: 0,
        requiresApproval: false
      };
    }

    await doctor.save();

    console.log(`✅ Online-Buchung für ${doctor.firstName} ${doctor.lastName} (${doctor.email}) aktiviert`);
    console.log(`   Rolle: ${doctor.role}`);
    console.log(`   Aktiv: ${doctor.isActive}`);
    console.log(`   Online-Buchung: ${doctor.profile.onlineBookingEnabled}`);

    // Zeige alle Ärzte mit aktivierter Online-Buchung
    const allOnlineDoctors = await User.find({
      role: 'doctor',
      isActive: true,
      'profile.onlineBookingEnabled': true
    }).select('firstName lastName email');

    console.log('\n📋 Alle Ärzte mit aktivierter Online-Buchung:');
    if (allOnlineDoctors.length === 0) {
      console.log('   Keine Ärzte gefunden');
    } else {
      allOnlineDoctors.forEach((doc, index) => {
        console.log(`   ${index + 1}. ${doc.firstName} ${doc.lastName} (${doc.email})`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Verbindung zur Datenbank geschlossen');
  }
}

// Hauptfunktion
const doctorEmail = process.argv[2];

if (!doctorEmail) {
  console.error('❌ Bitte geben Sie die E-Mail-Adresse des Arztes an');
  console.log('\nVerwendung:');
  console.log('  node backend/scripts/enable-online-booking.js <arzt-email>');
  console.log('\nBeispiel:');
  console.log('  node backend/scripts/enable-online-booking.js arzt@example.com');
  process.exit(1);
}

enableOnlineBooking(doctorEmail);

