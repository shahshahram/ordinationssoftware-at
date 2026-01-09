const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Super Administrator Setup Script
 * 
 * Dieses Script erstellt einen Super Administrator für das System.
 * Es kann auf verschiedene Weise verwendet werden:
 * 
 * 1. Automatisch beim ersten Systemstart
 * 2. Manuell durch den Softwarehersteller
 * 3. Durch den Kunden/Betreiber nach der Installation
 */

async function setupSuperAdmin() {
  try {
    console.log('🚀 Super Administrator Setup gestartet...');
    
    // Verbinde zur MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ MongoDB verbunden');
    
    // Prüfe ob bereits ein Super Admin existiert
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      console.log('⚠️  Super Administrator existiert bereits:');
      console.log(`   Name: ${existingSuperAdmin.firstName} ${existingSuperAdmin.lastName}`);
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log(`   Erstellt: ${existingSuperAdmin.createdAt}`);
      console.log(`   Aktiv: ${existingSuperAdmin.isActive ? 'Ja' : 'Nein'}`);
      
      // Frage ob überschrieben werden soll
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise((resolve) => {
        rl.question('Möchten Sie den bestehenden Super Admin überschreiben? (j/n): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'j' && answer.toLowerCase() !== 'ja') {
        console.log('❌ Setup abgebrochen');
        await mongoose.disconnect();
        return;
      }
      
      // Lösche bestehenden Super Admin
      await User.findByIdAndDelete(existingSuperAdmin._id);
      console.log('🗑️  Bestehender Super Admin gelöscht');
    }
    
    // Super Admin Konfiguration
    const superAdminConfig = {
      firstName: 'Super',
      lastName: 'Administrator',
      email: 'superadmin@ordinationssoftware.at',
      password: 'SuperAdmin2024!', // Sollte in Produktion geändert werden
      role: 'super_admin',
      isActive: true,
      emailVerified: true,
      lastLogin: new Date(),
      rbac: {
        resourceRoles: [],
        customPermissions: [
          {
            resource: '*',
            actions: ['*'],
            grantedBy: null, // System-granted
            grantedAt: new Date(),
            reason: 'Initial super admin setup'
          }
        ],
        delegations: [],
        permissionHistory: [
          {
            action: 'created',
            permission: 'all',
            resource: '*',
            changedBy: null, // System-Aktion
            changedAt: new Date(),
            reason: 'Initial super admin creation'
          }
        ]
      },
      preferences: {
        language: 'de',
        timezone: 'Europe/Vienna',
        notifications: {
          email: true,
          push: true,
          sms: false
        }
      },
      metadata: {
        createdBy: 'system',
        setupMethod: 'script',
        version: '1.0.0'
      }
    };
    
    // Hash das Passwort
    const saltRounds = 12;
    superAdminConfig.password = await bcrypt.hash(superAdminConfig.password, saltRounds);
    
    // Erstelle Super Admin
    const superAdmin = new User(superAdminConfig);
    await superAdmin.save();
    
    console.log('\n🎉 Super Administrator erfolgreich erstellt!');
    console.log('📋 Login-Daten:');
    console.log(`   Email: ${superAdminConfig.email}`);
    console.log(`   Passwort: ${superAdminConfig.password.replace(/./g, '*')}`);
    console.log(`   Rolle: ${superAdminConfig.role}`);
    console.log(`   ID: ${superAdmin._id}`);
    
    console.log('\n🔐 Sicherheitshinweise:');
    console.log('   ⚠️  Ändern Sie das Passwort nach dem ersten Login!');
    console.log('   ⚠️  Verwenden Sie ein starkes, einzigartiges Passwort!');
    console.log('   ⚠️  Aktivieren Sie 2FA wenn verfügbar!');
    console.log('   ⚠️  Teilen Sie diese Daten nur mit autorisierten Personen!');
    
    console.log('\n📚 Nächste Schritte:');
    console.log('   1. Melden Sie sich mit den obigen Daten an');
    console.log('   2. Ändern Sie das Passwort');
    console.log('   3. Erstellen Sie weitere Administratoren');
    console.log('   4. Konfigurieren Sie die Systemeinstellungen');
    
  } catch (error) {
    console.error('❌ Fehler beim Super Admin Setup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB-Verbindung geschlossen');
  }
}

// Führe das Script aus
if (require.main === module) {
  setupSuperAdmin();
}

module.exports = setupSuperAdmin;
