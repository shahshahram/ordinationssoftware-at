/**
 * Script zum Verschlüsseln bestehender Daten
 * Verschlüsselt sensible Felder in der Datenbank
 * 
 * Verwendung:
 * node backend/scripts/encrypt-existing-data.js [--dry-run] [--model=Patient]
 */

const mongoose = require('mongoose');
require('dotenv').config();

const { encryptField, isEncrypted } = require('../utils/fieldEncryption');

// Model-Mappings für verschlüsselte Felder
const ENCRYPTION_CONFIG = {
  Patient: {
    fields: ['insuranceNumber'],
    model: require('../models/Patient')
  },
  // Weitere Models können hier hinzugefügt werden
  // User: {
  //   fields: ['email'], // Beispiel
  //   model: require('../models/User')
  // }
};

/**
 * Verschlüsselt Felder eines Dokuments
 */
async function encryptDocument(Model, document, fieldsToEncrypt) {
  let modified = false;
  const updates = {};

  for (const field of fieldsToEncrypt) {
    const value = document[field];
    if (value && !isEncrypted(value)) {
      try {
        const encrypted = encryptField(value);
        updates[field] = encrypted;
        modified = true;
      } catch (error) {
        console.error(`Fehler beim Verschlüsseln von ${field} für ${document._id}:`, error);
      }
    }
  }

  return { modified, updates };
}

/**
 * Verschlüsselt alle Dokumente eines Models
 */
async function encryptModelData(modelName, dryRun = false) {
  const config = ENCRYPTION_CONFIG[modelName];
  if (!config) {
    console.error(`❌ Keine Verschlüsselungs-Konfiguration für Model: ${modelName}`);
    return { processed: 0, encrypted: 0, errors: 0 };
  }

  const Model = config.model;
  const fieldsToEncrypt = config.fields;

  console.log(`\n📦 Verarbeite Model: ${modelName}`);
  console.log(`   Felder: ${fieldsToEncrypt.join(', ')}`);

  try {
    // Finde alle Dokumente mit nicht-verschlüsselten Feldern
    const documents = await Model.find({});
    console.log(`   Gefunden: ${documents.length} Dokumente`);

    let processed = 0;
    let encrypted = 0;
    let errors = 0;

    for (const doc of documents) {
      try {
        const { modified, updates } = await encryptDocument(Model, doc, fieldsToEncrypt);

        if (modified) {
          if (dryRun) {
            console.log(`   🔍 Würde verschlüsseln: ${doc._id} - ${Object.keys(updates).join(', ')}`);
          } else {
            await Model.findByIdAndUpdate(doc._id, { $set: updates });
            console.log(`   ✅ Verschüsselt: ${doc._id} - ${Object.keys(updates).join(', ')}`);
          }
          encrypted++;
        }
        processed++;
      } catch (error) {
        console.error(`   ❌ Fehler bei ${doc._id}:`, error.message);
        errors++;
      }
    }

    return { processed, encrypted, errors };
  } catch (error) {
    console.error(`❌ Fehler beim Verarbeiten von ${modelName}:`, error);
    throw error;
  }
}

/**
 * Hauptfunktion
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const modelArg = args.find(arg => arg.startsWith('--model='));
  const modelName = modelArg ? modelArg.split('=')[1] : null;

  try {
    // Verbinde mit MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordinationssoftware';
    await mongoose.connect(mongoUri);
    console.log('✅ Verbunden mit MongoDB');

    if (dryRun) {
      console.log('🔍 DRY-RUN Modus - keine Änderungen werden gespeichert');
    }

    const modelsToProcess = modelName 
      ? [modelName] 
      : Object.keys(ENCRYPTION_CONFIG);

    let totalProcessed = 0;
    let totalEncrypted = 0;
    let totalErrors = 0;

    for (const model of modelsToProcess) {
      const result = await encryptModelData(model, dryRun);
      totalProcessed += result.processed;
      totalEncrypted += result.encrypted;
      totalErrors += result.errors;
    }

    console.log(`\n📈 Zusammenfassung:`);
    console.log(`   Verarbeitet: ${totalProcessed} Dokumente`);
    console.log(`   Verschüsselt: ${totalEncrypted} Dokumente`);
    console.log(`   Fehler: ${totalErrors}`);

    if (dryRun) {
      console.log(`\n💡 Führen Sie das Script ohne --dry-run aus, um die Verschlüsselung durchzuführen`);
    } else {
      console.log(`\n✅ Verschlüsselung abgeschlossen!`);
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Fehler bei der Verschlüsselung:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Führe Script aus
if (require.main === module) {
  main();
}

module.exports = { encryptModelData, encryptDocument };







