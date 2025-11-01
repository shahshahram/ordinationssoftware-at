const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * First Run Setup Script
 * 
 * Dieses Script wird beim ersten Systemstart ausgeführt und:
 * 1. Prüft ob bereits ein Super Admin existiert
 * 2. Erstellt einen Super Admin falls keiner existiert
 * 3. Zeigt Setup-Anweisungen an
 */

async function firstRunSetup() {
  try {
    console.log('🔍 Prüfe System-Setup...');
    
    // Verbinde zur MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ MongoDB verbunden');
    
    // Prüfe ob bereits ein Super Admin existiert
    const superAdminExists = await User.findOne({ role: 'super_admin' });
    
    if (superAdminExists) {
      console.log('✅ Super Administrator bereits vorhanden');
      console.log(`   Email: ${superAdminExists.email}`);
      console.log(`   Aktiv: ${superAdminExists.isActive ? 'Ja' : 'Nein'}`);
      return { needsSetup: false, superAdmin: superAdminExists };
    }
    
    // Prüfe ob überhaupt Benutzer existieren
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      console.log('⚠️  Keine Benutzer gefunden - System benötigt Setup');
      return { needsSetup: true, message: 'Keine Benutzer gefunden' };
    }
    
    // Prüfe ob Admin-Benutzer existieren
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (adminExists) {
      console.log('⚠️  Admin-Benutzer gefunden, aber kein Super Admin');
      console.log('   Empfehlung: Führen Sie das Super Admin Setup aus');
      return { needsSetup: true, message: 'Admin gefunden, aber kein Super Admin' };
    }
    
    console.log('⚠️  System benötigt Super Administrator Setup');
    return { needsSetup: true, message: 'Super Admin Setup erforderlich' };
    
  } catch (error) {
    console.error('❌ Fehler beim Setup-Check:', error);
    return { needsSetup: true, error: error.message };
  } finally {
    await mongoose.disconnect();
  }
}

module.exports = firstRunSetup;
