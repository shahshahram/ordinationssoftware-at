#!/usr/bin/env node

/**
 * Script zum Reparieren fehlender XDS permissions in bestehenden Locations
 */

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Lade .env von verschiedenen Orten
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend/.env')
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`✓ .env geladen von: ${envPath}`);
    break;
  }
}

const Location = require('../models/Location');
const connectDB = require('../config/db');

const defaultPermissions = {
  create: { roles: ['admin', 'super_admin', 'doctor', 'arzt'] },
  update: { roles: ['admin', 'super_admin', 'doctor', 'arzt'] },
  deprecate: { roles: ['admin', 'super_admin'] },
  delete: { roles: ['admin', 'super_admin'] },
  retrieve: { roles: ['admin', 'super_admin', 'doctor', 'arzt', 'nurse', 'assistent'] },
  query: { roles: ['admin', 'super_admin', 'doctor', 'arzt', 'nurse', 'assistent'] }
};

const main = async () => {
  try {
    await connectDB();
    console.log('✓ MongoDB verbunden\n');

    // Finde alle Locations mit aktiviertem XDS Registry
    const locations = await Location.find({ 'xdsRegistry.enabled': true });
    console.log(`Gefunden: ${locations.length} Location(s) mit aktiviertem XDS Registry\n`);

    if (locations.length === 0) {
      console.log('Keine Locations zum Reparieren gefunden.');
      process.exit(0);
    }

    let fixedCount = 0;

    for (const location of locations) {
      console.log(`Prüfe Location: ${location.name} (${location._id})`);
      
      let needsUpdate = false;

      // Prüfe ob xdsRegistry existiert
      if (!location.xdsRegistry) {
        console.log('  ⚠ xdsRegistry fehlt komplett - wird initialisiert');
        location.xdsRegistry = {
          enabled: true,
          permissions: defaultPermissions,
          allowPatientUpload: false,
          patientUploadMaxSize: 10485760,
          patientUploadAllowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff']
        };
        needsUpdate = true;
      } else if (!location.xdsRegistry.permissions) {
        console.log('  ⚠ permissions fehlen - werden initialisiert');
        location.xdsRegistry.permissions = defaultPermissions;
        needsUpdate = true;
      } else {
        // Prüfe jede Operation
        const missingOperations = [];
        Object.keys(defaultPermissions).forEach(operation => {
          if (!location.xdsRegistry.permissions[operation] || 
              !location.xdsRegistry.permissions[operation].roles ||
              location.xdsRegistry.permissions[operation].roles.length === 0) {
            missingOperations.push(operation);
            location.xdsRegistry.permissions[operation] = defaultPermissions[operation];
            needsUpdate = true;
          }
        });

        if (missingOperations.length > 0) {
          console.log(`  ⚠ Fehlende Permissions für: ${missingOperations.join(', ')}`);
        } else {
          console.log('  ✓ Permissions sind vorhanden');
        }
      }

      if (needsUpdate) {
        location.markModified('xdsRegistry');
        await location.save();
        console.log('  ✓ Location aktualisiert\n');
        fixedCount++;
      } else {
        console.log('  ✓ Keine Änderungen nötig\n');
      }
    }

    console.log(`\n✅ Zusammenfassung:`);
    console.log(`   ${fixedCount} Location(s) repariert`);
    console.log(`   ${locations.length - fixedCount} Location(s) waren bereits korrekt`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    console.error(error);
    process.exit(1);
  }
};

main();



