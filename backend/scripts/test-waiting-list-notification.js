/**
 * Test-Script für Wartelisten-Nachrücker-Automatik
 * 
 * Verwendung:
 * node backend/scripts/test-waiting-list-notification.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const WaitingList = require('../models/WaitingList');
const Appointment = require('../models/Appointment');
const PatientExtended = require('../models/PatientExtended');
const User = require('../models/User');
const ServiceCatalog = require('../models/ServiceCatalog');
const waitingListNotificationService = require('../services/waitingListNotificationService');

async function testWaitingListNotification() {
  try {
    // Verbinde zur Datenbank
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Mit Datenbank verbunden');

    // 1. Finde oder erstelle Test-Daten
    console.log('\n📋 Schritt 1: Test-Daten vorbereiten...');
    
    // Finde einen Arzt
    const doctor = await User.findOne({ role: { $in: ['doctor', 'arzt'] } });
    if (!doctor) {
      throw new Error('Kein Arzt gefunden. Bitte erstellen Sie zuerst einen Arzt.');
    }
    console.log(`✅ Arzt gefunden: ${doctor.firstName} ${doctor.lastName}`);

    // Finde einen Service
    const service = await ServiceCatalog.findOne({ online_bookable: true });
    if (!service) {
      throw new Error('Kein online-buchbarer Service gefunden. Bitte erstellen Sie zuerst einen Service.');
    }
    console.log(`✅ Service gefunden: ${service.name}`);

    // Finde oder erstelle Test-Patienten
    const patients = [];
    for (let i = 1; i <= 3; i++) {
      let patient = await PatientExtended.findOne({ 
        email: `test-patient-${i}@example.com` 
      });
      
      if (!patient) {
        patient = new PatientExtended({
          firstName: `Test`,
          lastName: `Patient ${i}`,
          email: `test-patient-${i}@example.com`,
          phone: `+4366412345${i}`,
          dateOfBirth: new Date('1990-01-01'),
          gender: 'm',
          socialSecurityNumber: `123456789${i}`,
          insuranceProvider: 'ÖGK',
          address: {
            street: 'Teststraße 1',
            zipCode: '1010',
            city: 'Wien',
            country: 'Österreich'
          },
          createdBy: doctor._id,
          userId: doctor._id,
          isActive: true
        });
        await patient.save();
        console.log(`✅ Test-Patient ${i} erstellt: ${patient.firstName} ${patient.lastName}`);
      } else {
        console.log(`✅ Test-Patient ${i} gefunden: ${patient.firstName} ${patient.lastName}`);
      }
      patients.push(patient);
    }

    // 2. Erstelle Wartelisten-Einträge
    console.log('\n📋 Schritt 2: Wartelisten-Einträge erstellen...');
    
    const waitingListEntries = [];
    for (let i = 0; i < patients.length; i++) {
      const priority = i === 0 ? 'high' : 'normal';
      
      // Prüfe ob Eintrag bereits existiert
      let entry = await WaitingList.findOne({
        patient: patients[i]._id,
        service: service._id,
        status: 'waiting'
      });

      if (!entry) {
        entry = new WaitingList({
          patient: patients[i]._id,
          service: service._id,
          reason: `Test-Warteliste für ${service.name}`,
          priority: priority,
          status: 'waiting',
          contactMethod: 'both',
          createdBy: doctor._id
        });
        await entry.save();
        console.log(`✅ Wartelisten-Eintrag ${i + 1} erstellt (Priorität: ${priority})`);
      } else {
        console.log(`✅ Wartelisten-Eintrag ${i + 1} bereits vorhanden`);
      }
      waitingListEntries.push(entry);
    }

    // 3. Erstelle einen Test-Termin
    console.log('\n📋 Schritt 3: Test-Termin erstellen...');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(10, 30, 0, 0);

    const testAppointment = new Appointment({
      patient: patients[0]._id, // Temporärer Patient
      doctor: doctor._id,
      startTime: tomorrow,
      endTime: endTime,
      type: service.name,
      service: service._id,
      status: 'geplant',
      title: `Test-Termin für Wartelisten-Test`,
      notes: 'Dieser Termin wird für den Wartelisten-Test verwendet'
    });
    await testAppointment.save();
    console.log(`✅ Test-Termin erstellt: ${tomorrow.toLocaleString('de-DE')}`);

    // 4. Storniere den Termin
    console.log('\n📋 Schritt 4: Termin stornieren...');
    testAppointment.status = 'cancelled';
    await testAppointment.save();
    console.log('✅ Termin storniert');

    // 5. Rufe Benachrichtigungsservice auf
    console.log('\n📋 Schritt 5: Wartelisten-Benachrichtigungen senden...');
    console.log('⚠️  Hinweis: SMS werden nur gesendet, wenn SMS_PROVIDER konfiguriert ist.');
    console.log('   Ansonsten werden sie nur geloggt (Mock-Modus).\n');
    
    const result = await waitingListNotificationService.notifyWaitingListPatients(testAppointment);
    
    console.log('\n📊 Ergebnis:');
    console.log(`   ✅ Benachrichtigt: ${result.notified}`);
    console.log(`   ❌ Fehlgeschlagen: ${result.failed}`);
    console.log(`   📧 Methoden: ${result.results.map(r => r.methods.join(', ')).join('; ')}`);
    
    if (result.results.length > 0) {
      console.log('\n📋 Details:');
      result.results.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.patientName}:`);
        console.log(`      - Methoden: ${r.methods.join(', ')}`);
        console.log(`      - Magic Link: ${r.magicLink}`);
        if (r.smsError) console.log(`      - SMS-Fehler: ${r.smsError}`);
        if (r.emailError) console.log(`      - E-Mail-Fehler: ${r.emailError}`);
      });
    }

    // 6. Prüfe Wartelisten-Einträge
    console.log('\n📋 Schritt 6: Wartelisten-Einträge prüfen...');
    const updatedEntries = await WaitingList.find({
      _id: { $in: waitingListEntries.map(e => e._id) }
    });
    
    updatedEntries.forEach((entry, i) => {
      console.log(`   Eintrag ${i + 1}:`);
      console.log(`      - Status: ${entry.status}`);
      console.log(`      - Reservierungs-Token: ${entry.reservationToken ? 'Vorhanden' : 'Nicht vorhanden'}`);
      console.log(`      - Ablaufzeit: ${entry.reservationExpiresAt ? entry.reservationExpiresAt.toLocaleString('de-DE') : 'N/A'}`);
    });

    console.log('\n✅ Test abgeschlossen!');
    console.log('\n📝 Nächste Schritte:');
    console.log('   1. Prüfen Sie die E-Mail-Postfächer der Test-Patienten');
    console.log('   2. Öffnen Sie einen Magic Link in einem Browser');
    console.log('   3. Testen Sie die Reservierung mit dem korrekten Geburtsdatum');
    console.log('   4. Prüfen Sie, ob der Termin dem Patienten zugeordnet wurde');

  } catch (error) {
    console.error('❌ Fehler beim Test:', error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Datenbankverbindung geschlossen');
  }
}

// Führe Test aus
if (require.main === module) {
  testWaitingListNotification();
}

module.exports = testWaitingListNotification;

