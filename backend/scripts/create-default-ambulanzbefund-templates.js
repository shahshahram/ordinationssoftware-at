#!/usr/bin/env node

/**
 * Erstellt Default-Templates für Ambulanzbefunde
 * Diese Templates können später im Admin-Bereich bearbeitet werden
 */

const path = require('path');
const dotenv = require('dotenv');

// Load .env from multiple possible locations
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend/.env')
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`✓ Environment loaded from: ${envPath}`);
    break;
  }
}

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const AmbulanzbefundFormTemplate = require('../models/AmbulanzbefundFormTemplate');
const User = require('../models/User');
const logger = require('../utils/logger');

// Minimales JSON Schema für Ambulanzbefund
const defaultSchema = {
  type: 'object',
  properties: {
    anamnesis: {
      type: 'object',
      properties: {
        chiefComplaint: { type: 'string', title: 'Hauptbeschwerde' },
        historyOfPresentIllness: { type: 'string', title: 'Aktuelle Anamnese' },
        pastMedicalHistory: { type: 'string', title: 'Vorgeschichte' }
      }
    },
    examination: {
      type: 'object',
      properties: {
        general: { type: 'string', title: 'Allgemeinbefund' },
        vitalSigns: {
          type: 'object',
          properties: {
            bloodPressure: { type: 'string', title: 'Blutdruck' },
            heartRate: { type: 'number', title: 'Herzfrequenz' },
            temperature: { type: 'number', title: 'Temperatur' }
          }
        }
      }
    },
    assessment: {
      type: 'object',
      properties: {
        primaryDiagnosis: {
          type: 'object',
          properties: {
            code: { type: 'string', title: 'ICD-10 Code' },
            display: { type: 'string', title: 'Diagnose' }
          }
        },
        clinicalImpression: { type: 'string', title: 'Klinischer Eindruck' }
      },
      required: ['primaryDiagnosis']
    },
    plan: {
      type: 'object',
      properties: {
        therapy: { type: 'string', title: 'Therapie' },
        medications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: 'Medikament' },
              dosage: { type: 'string', title: 'Dosierung' },
              frequency: { type: 'string', title: 'Häufigkeit' }
            }
          }
        },
        followUp: {
          type: 'object',
          properties: {
            date: { type: 'string', format: 'date', title: 'Kontrolle am' },
            reason: { type: 'string', title: 'Grund' }
          }
        }
      }
    }
  },
  required: ['assessment']
};

// Minimales Layout
const defaultLayout = {
  sections: [
    {
      id: 'anamnesis',
      label: 'Anamnese',
      description: 'Patientenanamnese',
      position: { order: 1 }
    },
    {
      id: 'examination',
      label: 'Befund',
      description: 'Körperliche Untersuchung',
      position: { order: 2 }
    },
    {
      id: 'assessment',
      label: 'Beurteilung',
      description: 'Diagnose und klinischer Eindruck',
      position: { order: 3 },
      required: true
    },
    {
      id: 'plan',
      label: 'Therapieplan',
      description: 'Therapie, Medikamente, Kontrollen',
      position: { order: 4 }
    }
  ],
  fields: [
    // Anamnese Fields
    {
      id: 'anamnesis.chiefComplaint',
      sectionId: 'anamnesis',
      label: 'Hauptbeschwerde',
      type: 'textarea',
      required: false,
      position: { width: 12, order: 1 },
      dataSource: 'anamnesis.chiefComplaint'
    },
    {
      id: 'anamnesis.historyOfPresentIllness',
      sectionId: 'anamnesis',
      label: 'Aktuelle Anamnese',
      type: 'textarea',
      required: false,
      position: { width: 12, order: 2 },
      dataSource: 'anamnesis.historyOfPresentIllness'
    },
    // Examination Fields
    {
      id: 'examination.general',
      sectionId: 'examination',
      label: 'Allgemeinbefund',
      type: 'textarea',
      required: false,
      position: { width: 12, order: 1 },
      dataSource: 'examination.general'
    },
    {
      id: 'examination.vitalSigns.bloodPressure',
      sectionId: 'examination',
      label: 'Blutdruck',
      type: 'text',
      required: false,
      position: { width: 4, order: 2 },
      dataSource: 'examination.vitalSigns.bloodPressure'
    },
    {
      id: 'examination.vitalSigns.heartRate',
      sectionId: 'examination',
      label: 'Herzfrequenz (bpm)',
      type: 'number',
      required: false,
      position: { width: 4, order: 3 },
      dataSource: 'examination.vitalSigns.heartRate'
    },
    {
      id: 'examination.vitalSigns.temperature',
      sectionId: 'examination',
      label: 'Temperatur (°C)',
      type: 'number',
      required: false,
      position: { width: 4, order: 4 },
      dataSource: 'examination.vitalSigns.temperature'
    },
    // Assessment Fields
    {
      id: 'assessment.primaryDiagnosis.code',
      sectionId: 'assessment',
      label: 'ICD-10 Code',
      type: 'text',
      required: true,
      position: { width: 6, order: 1 },
      dataSource: 'assessment.primaryDiagnosis.code'
    },
    {
      id: 'assessment.primaryDiagnosis.display',
      sectionId: 'assessment',
      label: 'Diagnose',
      type: 'text',
      required: true,
      position: { width: 6, order: 2 },
      dataSource: 'assessment.primaryDiagnosis.display'
    },
    {
      id: 'assessment.clinicalImpression',
      sectionId: 'assessment',
      label: 'Klinischer Eindruck',
      type: 'textarea',
      required: false,
      position: { width: 12, order: 3 },
      dataSource: 'assessment.clinicalImpression'
    },
    // Plan Fields
    {
      id: 'plan.therapy',
      sectionId: 'plan',
      label: 'Therapie',
      type: 'textarea',
      required: false,
      position: { width: 12, order: 1 },
      dataSource: 'plan.therapy'
    },
    {
      id: 'plan.followUp.date',
      sectionId: 'plan',
      label: 'Kontrolle am',
      type: 'date',
      required: false,
      position: { width: 6, order: 2 },
      dataSource: 'plan.followUp.date'
    },
    {
      id: 'plan.followUp.reason',
      sectionId: 'plan',
      label: 'Grund der Kontrolle',
      type: 'text',
      required: false,
      position: { width: 6, order: 3 },
      dataSource: 'plan.followUp.reason'
    }
  ]
};

const defaultTemplates = [
  {
    name: 'Ambulanzbefund Allgemeinmedizin',
    code: 'AMB-ALLG-001',
    version: '1.0',
    specialization: 'allgemein',
    description: 'Standard-Template für allgemeinmedizinische Ambulanzbefunde',
    isActive: true,
    isDefault: true
  },
  {
    name: 'Ambulanzbefund HNO',
    code: 'AMB-HNO-001',
    version: '1.0',
    specialization: 'hno',
    description: 'Standard-Template für HNO Ambulanzbefunde',
    isActive: true,
    isDefault: true
  },
  {
    name: 'Ambulanzbefund Innere Medizin',
    code: 'AMB-INT-001',
    version: '1.0',
    specialization: 'interne',
    description: 'Standard-Template für internistische Ambulanzbefunde',
    isActive: true,
    isDefault: true
  }
];

const main = async () => {
  try {
    await connectDB();
    logger.info('Erstelle Default-Templates für Ambulanzbefunde...');

    // Finde einen Admin-User für createdBy
    const adminUser = await User.findOne({ 
      role: { $in: ['admin', 'super_admin'] } 
    });
    
    if (!adminUser) {
      throw new Error('Kein Admin-User gefunden. Bitte zuerst einen Admin-User erstellen.');
    }
    
    console.log(`✓ Verwende Admin-User: ${adminUser.email} (${adminUser._id})`);

    const createdTemplates = [];
    const existingTemplates = [];

    for (const templateData of defaultTemplates) {
      // Prüfe ob Template bereits existiert
      const existing = await AmbulanzbefundFormTemplate.findOne({
        $or: [
          { code: templateData.code },
          { specialization: templateData.specialization, isDefault: true }
        ]
      });

      if (existing) {
        console.log(`⚠️  Template für ${templateData.specialization} existiert bereits: ${existing.name}`);
        existingTemplates.push(existing);
        continue;
      }

      // Erstelle Template
      const template = await AmbulanzbefundFormTemplate.create({
        ...templateData,
        formDefinition: {
          schema: defaultSchema,
          layout: defaultLayout,
          cdaMapping: {}
        },
        availableSections: defaultLayout.sections.map(s => ({
          id: s.id,
          label: s.label,
          description: s.description,
          required: s.required || false,
          category: s.required ? 'basic' : 'optional'
        })),
        createdBy: adminUser._id,
        updatedBy: adminUser._id,
        locationId: null // Global verfügbar
      });

      createdTemplates.push(template);
      console.log(`✓ Template erstellt: ${template.name} (${template.code})`);
    }

    console.log('\n📊 Zusammenfassung:');
    console.log(`   Erstellt: ${createdTemplates.length}`);
    console.log(`   Bereits vorhanden: ${existingTemplates.length}`);
    console.log(`   Gesamt: ${createdTemplates.length + existingTemplates.length}`);

    if (createdTemplates.length > 0) {
      logger.info(`${createdTemplates.length} Default-Templates erfolgreich erstellt`);
    }

    process.exit(0);
  } catch (error) {
    logger.error(`Fehler beim Erstellen der Default-Templates: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = { defaultTemplates, defaultSchema, defaultLayout };

