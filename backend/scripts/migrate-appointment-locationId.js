/**
 * Migration: Fügt locationId zu bestehenden Appointments hinzu
 * 
 * Diese Migration:
 * 1. Findet alle Appointments ohne locationId
 * 2. Versucht locationId aus room.location_id abzuleiten
 * 3. Aktualisiert die Appointments mit der locationId
 * 
 * Ausführung: node scripts/migrate-appointment-locationId.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Appointment = require('../models/Appointment');
const Room = require('../models/Room');

const migrateAppointmentLocationId = async () => {
  try {
    // Verbindung zur Datenbank
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ordinationssoftware';
    await mongoose.connect(mongoURI);
    console.log('✅ Verbunden zur MongoDB');

    // Finde alle Appointments ohne locationId
    const appointmentsWithoutLocation = await Appointment.find({
      $or: [
        { locationId: { $exists: false } },
        { locationId: null }
      ]
    }).populate('room', 'location_id');

    console.log(`📋 Gefunden: ${appointmentsWithoutLocation.length} Termine ohne locationId`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const appointment of appointmentsWithoutLocation) {
      try {
        let locationId = null;

        // Versuche locationId aus room abzuleiten
        if (appointment.room) {
          // Wenn room bereits populated ist
          if (appointment.room.location_id) {
            locationId = appointment.room.location_id;
          } else {
            // Sonst Room aus DB laden
            const roomDoc = await Room.findById(appointment.room).select('location_id');
            if (roomDoc && roomDoc.location_id) {
              locationId = roomDoc.location_id;
            }
          }
        }

        // Versuche locationId aus assigned_rooms abzuleiten (falls vorhanden)
        if (!locationId && appointment.assigned_rooms && appointment.assigned_rooms.length > 0) {
          const firstAssignedRoom = await Room.findById(appointment.assigned_rooms[0]).select('location_id');
          if (firstAssignedRoom && firstAssignedRoom.location_id) {
            locationId = firstAssignedRoom.location_id;
          }
        }

        if (locationId) {
          await Appointment.updateOne(
            { _id: appointment._id },
            { $set: { locationId: locationId } }
          );
          updated++;
          console.log(`✅ Termin ${appointment._id} aktualisiert mit locationId: ${locationId}`);
        } else {
          skipped++;
          console.log(`⏭️  Termin ${appointment._id} übersprungen (kein Raum zugewiesen)`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Fehler bei Termin ${appointment._id}:`, error.message);
      }
    }

    console.log('\n📊 Migration abgeschlossen:');
    console.log(`   ✅ Aktualisiert: ${updated}`);
    console.log(`   ⏭️  Übersprungen: ${skipped}`);
    console.log(`   ❌ Fehler: ${errors}`);

    await mongoose.connection.close();
    console.log('✅ Datenbankverbindung geschlossen');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration fehlgeschlagen:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Migration ausführen
migrateAppointmentLocationId();

