const mongoose = require('mongoose');
const User = require('../models/User');
const { authorize } = require('../utils/rbac');

/**
 * Test Script: RBAC-Berechtigungen testen
 * 
 * Dieses Script testet die RBAC-Berechtigungen für verschiedene Benutzer und Rollen
 */

async function testRBACPermissions() {
  try {
    console.log('🧪 Starte RBAC-Berechtigungstests...');
    
    // Verbinde zur MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ MongoDB verbunden');
    
    // Teste verschiedene Benutzer
    const testUsers = await User.find({}).limit(5);
    
    for (const user of testUsers) {
      console.log(`\n👤 Teste Benutzer: ${user.firstName} ${user.lastName} (${user.role})`);
      
      // Teste verschiedene Berechtigungen
      const testCases = [
        { action: 'read', resource: 'user', description: 'Benutzer lesen' },
        { action: 'create', resource: 'user', description: 'Benutzer erstellen' },
        { action: 'update', resource: 'user', description: 'Benutzer aktualisieren' },
        { action: 'delete', resource: 'user', description: 'Benutzer löschen' },
        { action: 'read', resource: 'patient', description: 'Patienten lesen' },
        { action: 'create', resource: 'patient', description: 'Patienten erstellen' },
        { action: 'read', resource: 'appointment', description: 'Termine lesen' },
        { action: 'create', resource: 'appointment', description: 'Termine erstellen' },
        { action: 'read', resource: 'billing', description: 'Abrechnung lesen' },
        { action: 'create', resource: 'billing', description: 'Abrechnung erstellen' }
      ];
      
      for (const testCase of testCases) {
        try {
          const result = await authorize(user, testCase.action, testCase.resource);
          const status = result.allowed ? '✅ ERLAUBT' : '❌ VERWEIGERT';
          console.log(`   ${status}: ${testCase.description} - ${result.reason}`);
        } catch (error) {
          console.log(`   ❌ FEHLER: ${testCase.description} - ${error.message}`);
        }
      }
    }
    
    // Teste spezielle Rollen-Szenarien
    console.log('\n🔍 Teste spezielle Rollen-Szenarien...');
    
    // Teste Super Admin
    const superAdmin = await User.findOne({ role: 'super_admin' });
    if (superAdmin) {
      console.log(`\n👑 Teste Super Admin: ${superAdmin.firstName} ${superAdmin.lastName}`);
      const result = await authorize(superAdmin, 'delete', 'system');
      console.log(`   Super Admin System-Löschung: ${result.allowed ? '✅ ERLAUBT' : '❌ VERWEIGERT'}`);
    }
    
    // Teste Admin
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      console.log(`\n👨‍💼 Teste Admin: ${admin.firstName} ${admin.lastName}`);
      const result = await authorize(admin, 'manage_users', 'user');
      console.log(`   Admin Benutzer-Verwaltung: ${result.allowed ? '✅ ERLAUBT' : '❌ VERWEIGERT'}`);
    }
    
    // Teste Arzt
    const arzt = await User.findOne({ role: 'arzt' });
    if (arzt) {
      console.log(`\n👨‍⚕️ Teste Arzt: ${arzt.firstName} ${arzt.lastName}`);
      const result = await authorize(arzt, 'diagnose', 'diagnosis');
      console.log(`   Arzt Diagnose erstellen: ${result.allowed ? '✅ ERLAUBT' : '❌ VERWEIGERT'}`);
    }
    
    // Teste Patient
    const patient = await User.findOne({ role: 'patient' });
    if (patient) {
      console.log(`\n👤 Teste Patient: ${patient.firstName} ${patient.lastName}`);
      const result = await authorize(patient, 'read', 'patient');
      console.log(`   Patient eigene Daten lesen: ${result.allowed ? '✅ ERLAUBT' : '❌ VERWEIGERT'}`);
      
      // Teste ob Patient andere Patienten lesen kann (sollte verweigert werden)
      const otherPatient = await User.findOne({ role: 'patient', _id: { $ne: patient._id } });
      if (otherPatient) {
        const result2 = await authorize(patient, 'read', 'patient', otherPatient);
        console.log(`   Patient andere Patienten lesen: ${result2.allowed ? '✅ ERLAUBT' : '❌ VERWEIGERT'}`);
      }
    }
    
    console.log('\n🎉 RBAC-Tests abgeschlossen!');
    
  } catch (error) {
    console.error('❌ RBAC-Test fehlgeschlagen:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB-Verbindung geschlossen');
  }
}

// Führe Tests aus wenn Script direkt ausgeführt wird
if (require.main === module) {
  testRBACPermissions()
    .then(() => {
      console.log('✅ RBAC-Tests erfolgreich abgeschlossen');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ RBAC-Tests fehlgeschlagen:', error);
      process.exit(1);
    });
}

module.exports = { testRBACPermissions };
