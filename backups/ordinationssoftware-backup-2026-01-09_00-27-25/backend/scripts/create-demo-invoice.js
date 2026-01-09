const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const Invoice = require('../models/Invoice');
const Patient = require('../models/Patient');
const ServiceCatalog = require('../models/ServiceCatalog');
const User = require('../models/User');

async function createDemoInvoice() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB verbunden');

    // Get admin user for createdBy
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ Kein Admin-User gefunden!');
      process.exit(1);
    }

    // Find or create demo patient
    let patient = await Patient.findOne({ 'lastName': 'Mustermann' });
    if (!patient) {
      patient = await Patient.create({
        firstName: 'Max',
        lastName: 'Mustermann',
        dateOfBirth: new Date('1970-01-15'),
        gender: 'männlich',
        createdBy: adminUser._id,
        address: {
          street: 'Hauptstraße 1',
          city: 'Wien',
          postalCode: '1010',
          country: 'Österreich'
        },
        insuranceNumber: '123456789',
        insuranceProvider: 'ÖGK (Österreichische Gesundheitskasse)',
        phone: '+43 664 1234567',
        email: 'max.mustermann@example.com'
      });
      console.log('✅ Demo-Patient erstellt:', patient.firstName, patient.lastName);
    }

    // Get services
    const services = await ServiceCatalog.find().limit(3);
    console.log(`✅ ${services.length} Services gefunden`);

    if (services.length === 0) {
      console.log('❌ Keine Services gefunden! Bitte erstellen Sie zuerst Services im ServiceCatalog.');
      process.exit(1);
    }

    // Create demo invoices
    const demoInvoices = [
      {
        invoiceNumber: 'INV-2025-001',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        doctor: {
          name: 'Dr. Maria Brandt',
          title: 'Dr.',
          specialization: 'Allgemeinmedizin',
          address: {
            street: 'Medizinische Straße 10',
            city: 'Wien',
            postalCode: '1010',
            country: 'Österreich'
          },
          taxNumber: 'ATU12345678',
          chamberNumber: 'WKÖ'
        },
        patient: {
          id: patient._id,
          name: `${patient.firstName} ${patient.lastName}`,
          address: patient.address,
          insuranceNumber: patient.insuranceNumber,
          insuranceProvider: patient.insuranceProvider
        },
        billingType: 'privat',
        services: [
          {
            date: new Date(),
            serviceCode: services[0].code || 'KON-001',
            description: services[0].name || 'Konsultation',
            quantity: 1,
            unitPrice: 80,
            totalPrice: 80,
            category: 'konsultation'
          }
        ],
        subtotal: 80,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: 80,
        status: 'paid',
        paymentDate: new Date(),
        paymentMethod: 'cash',
        createdBy: adminUser._id
      },
      {
        invoiceNumber: 'INV-2025-002',
        invoiceDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        dueDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
        doctor: {
          name: 'Dr. Maria Brandt',
          title: 'Dr.',
          specialization: 'Allgemeinmedizin',
          address: {
            street: 'Medizinische Straße 10',
            city: 'Wien',
            postalCode: '1010',
            country: 'Österreich'
          },
          taxNumber: 'ATU12345678',
          chamberNumber: 'WKÖ'
        },
        patient: {
          id: patient._id,
          name: `${patient.firstName} ${patient.lastName}`,
          address: patient.address,
          insuranceNumber: patient.insuranceNumber,
          insuranceProvider: patient.insuranceProvider
        },
        billingType: 'wahlarzt',
        services: [
          {
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            serviceCode: services.length > 1 ? services[1].code : 'BEH-001',
            description: services.length > 1 ? services[1].name : 'Behandlung',
            quantity: 1,
            unitPrice: 150,
            totalPrice: 150,
            category: 'behandlung'
          }
        ],
        subtotal: 150,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: 150,
        status: 'sent',
        paymentMethod: 'transfer',
        privateBilling: {
          honorNote: true,
          wahlarztCode: 'WAHL-001',
          reimbursementAmount: 120,
          patientAmount: 30
        },
        createdBy: adminUser._id
      },
      {
        invoiceNumber: 'INV-2025-003',
        invoiceDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
        dueDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
        doctor: {
          name: 'Dr. Maria Brandt',
          title: 'Dr.',
          specialization: 'Allgemeinmedizin',
          address: {
            street: 'Medizinische Straße 10',
            city: 'Wien',
            postalCode: '1010',
            country: 'Österreich'
          },
          taxNumber: 'ATU12345678',
          chamberNumber: 'WKÖ'
        },
        patient: {
          id: patient._id,
          name: `${patient.firstName} ${patient.lastName}`,
          address: patient.address,
          insuranceNumber: patient.insuranceNumber,
          insuranceProvider: patient.insuranceProvider
        },
        billingType: 'kassenarzt',
        services: [
          {
            date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            serviceCode: services.length > 2 ? services[2].code : 'LAB-001',
            description: services.length > 2 ? services[2].name : 'Laboruntersuchung',
            quantity: 1,
            unitPrice: 45,
            totalPrice: 45,
            category: 'labor'
          }
        ],
        subtotal: 45,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: 45,
        status: 'draft',
        paymentMethod: 'insurance',
        insuranceBilling: {
          insuranceCompany: patient.insuranceProvider,
          billingPeriod: 'Q1 2025',
          status: 'pending'
        }
      }
    ];

    // Clear existing demo invoices
    await Invoice.deleteMany({ invoiceNumber: { $regex: /^INV-2025-/ } });
    console.log('✅ Alte Demo-Rechnungen gelöscht');

    // Create new invoices
    for (const invoiceData of demoInvoices) {
      // Add createdBy to each invoice
      invoiceData.createdBy = adminUser._id;
      
      const invoice = await Invoice.create(invoiceData);
      console.log(`✅ Rechnung erstellt: ${invoice.invoiceNumber} (${invoice.status})`);
    }

    console.log('\n✅ Demo-Rechnungen erfolgreich erstellt!');
    console.log('\n📊 Statistik:');
    console.log(`   - Privat: 1 Rechnung (€80)`);
    console.log(`   - Wahlarzt: 1 Rechnung (€150)`);
    console.log(`   - Kassenarzt: 1 Rechnung (€45)`);
    console.log(`   - Gesamt: 3 Rechnungen (€275)`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

createDemoInvoice();
