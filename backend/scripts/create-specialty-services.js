const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const specialtyCatalogs = require('../data/specialty-catalogs');
const ServiceCatalog = require('../models/ServiceCatalog');
const ServiceCategory = require('../models/ServiceCategory');
const User = require('../models/User');

async function createSpecialtyServices() {
  try {
    // MongoDB verbinden
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB verbunden');

    // Admin-User finden
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ Kein Admin-User gefunden!');
      process.exit(1);
    }

    // Alte Facharzt-Services löschen
    await ServiceCatalog.deleteMany({ 
      code: { $regex: /^(KON|UNT|IMP|DER|CHI|GYN|ORT|NEU|KAR|LAB)-/ } 
    });
    console.log('✅ Alte Facharzt-Services gelöscht');

    const createdServices = [];

    // Services für jede Fachrichtung erstellen
    for (const [specialtyKey, specialtyData] of Object.entries(specialtyCatalogs.SPECIALTY_CATALOGS)) {
      console.log(`\n📋 Erstelle Services für ${specialtyData.name}...`);

      for (const [groupKey, groupData] of Object.entries(specialtyData.ebmGroups)) {
        for (const service of groupData.services) {
          const serviceData = {
            code: service.code,
            name: service.name,
            description: service.description,
            category: groupData.name,
            specialty: specialtyKey,
            isMedical: true,
            required_role: 'arzt',
            visible_to_roles: ['arzt', 'assistenz', 'admin'],
            assigned_users: [],
            requires_user_selection: false,
            assigned_devices: [],
            requires_device_selection: false,
            device_quantity_required: 1,
            assigned_rooms: [],
            requires_room_selection: false,
            room_quantity_required: 1,
            base_duration_min: getDurationForService(service.code),
            buffer_before_min: 5,
            buffer_after_min: 5,
            can_overlap: false,
            parallel_group: '',
            requires_room: false,
            required_device_type: '',
            min_age_years: 0,
            max_age_years: 120,
            requires_consent: true,
            online_bookable: true,
            is_online_booking_enabled: true,
            requires_confirmation: false,
            requires_scheduling_confirmation: false,
            max_waitlist: 5,
            price_cents: service.price,
            billing_code: service.code,
            notes: `EBM-Code: ${service.ebmCode}`,
            is_active: true,
            color_hex: getColorForSpecialty(specialtyKey),
            quick_select: false,
            location_id: null, // Wird später gesetzt
            billingType: 'both',
            ogk: {
              ebmCode: service.ebmCode,
              ebmPrice: service.price,
              requiresApproval: false,
              billingFrequency: 'once',
              ebmGroup: groupData.name,
              ebmSubGroup: service.name,
              additionalServices: []
            },
            wahlarzt: {
              price: Math.round(service.price * 1.5), // Wahlarzt: 150% des EBM-Preises
              reimbursementRate: 0.80, // 80% als Dezimalzahl
              maxReimbursement: Math.round(service.price * 1.2),
              requiresPreApproval: false
            },
            private: {
              price: Math.round(service.price * 2), // Privat: 200% des EBM-Preises
              noInsurance: true
            },
            copay: {
              applicable: !isExemptFromCopay(specialtyKey, service.name),
              amount: 0,
              percentage: specialtyCatalogs.COPAY_RULES[specialtyKey]?.standard?.rate * 100 || 10,
              maxAmount: specialtyCatalogs.COPAY_RULES[specialtyKey]?.standard?.max || 28.50,
              exempt: isExemptFromCopay(specialtyKey, service.name)
            },
            createdBy: adminUser._id
          };

          const createdService = await ServiceCatalog.create(serviceData);
          createdServices.push(createdService);
          console.log(`  ✅ ${service.code}: ${service.name} (${service.ebmCode})`);
        }
      }
    }

    console.log(`\n✅ ${createdServices.length} Facharzt-Services erfolgreich erstellt!`);
    
    // Kategorien automatisch erstellen/aktualisieren
    console.log('\n📋 Erstelle/aktualisiere Service-Kategorien...');
    try {
      const allServices = await ServiceCatalog.find({}).select('category').lean();
      const uniqueCategories = new Set();
      allServices.forEach(service => {
        if (service.category && service.category.trim() !== '') {
          uniqueCategories.add(service.category.trim());
        }
      });

      const existingCategories = await ServiceCategory.find({}).select('name').lean();
      const existingCategoryNames = new Set(existingCategories.map(cat => cat.name));

      let newCategoriesCount = 0;
      for (const categoryName of Array.from(uniqueCategories).sort()) {
        if (existingCategoryNames.has(categoryName)) {
          continue;
        }

        let code = categoryName
          .toUpperCase()
          .replace(/[ÄÖÜ]/g, (match) => {
            const map = { 'Ä': 'AE', 'Ö': 'OE', 'Ü': 'UE' };
            return map[match];
          })
          .replace(/[^A-Z0-9]/g, '')
          .substring(0, 10);

        if (code.length < 3) {
          code = code.padEnd(3, 'X');
        }

        let existingWithCode = await ServiceCategory.findOne({ code });
        if (existingWithCode) {
          let counter = 1;
          let uniqueCode = `${code}-${counter}`;
          while (await ServiceCategory.findOne({ code: uniqueCode })) {
            counter++;
            uniqueCode = `${code}-${counter}`;
          }
          code = uniqueCode;
        }

        const colorHex = getColorForCategoryName(categoryName);

        try {
          const newCategory = new ServiceCategory({
            name: categoryName,
            code: code,
            color_hex: colorHex,
            is_active: true,
            sort_order: newCategoriesCount,
            visible_to_roles: [],
            description: `Automatisch erstellt beim Service-Import`,
            createdBy: adminUser._id,
            updatedBy: adminUser._id
          });
          await newCategory.save();
          newCategoriesCount++;
          console.log(`  ✅ Kategorie erstellt: "${categoryName}" (${code})`);
        } catch (error) {
          if (error.code !== 11000) {
            console.error(`  ❌ Fehler bei "${categoryName}":`, error.message);
          }
        }
      }

      if (newCategoriesCount > 0) {
        console.log(`\n✅ ${newCategoriesCount} neue Kategorien erstellt`);
      } else {
        console.log(`\n✅ Alle Kategorien sind bereits vorhanden`);
      }
    } catch (error) {
      console.error('❌ Fehler beim Kategorien-Update:', error.message);
    }
    
    // Statistiken nach Fachrichtung
    const stats = {};
    for (const service of createdServices) {
      if (!stats[service.specialty]) {
        stats[service.specialty] = 0;
      }
      stats[service.specialty]++;
    }

    console.log('\n📊 Statistiken nach Fachrichtung:');
    for (const [specialty, count] of Object.entries(stats)) {
      const specialtyName = specialtyCatalogs.SPECIALTY_CATALOGS[specialty]?.name || specialty;
      console.log(`   - ${specialtyName}: ${count} Services`);
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    mongoose.disconnect();
  }
}

function getDurationForService(code) {
  const durationMap = {
    // Allgemeinmedizin
    'KON-001': 30, 'KON-002': 15, 'KON-003': 5,
    'UNT-001': 60, 'UNT-002': 10, 'UNT-003': 5,
    'IMP-001': 10, 'IMP-002': 10, 'IMP-003': 10,
    
    // Dermatologie
    'DER-001': 30, 'DER-002': 20, 'DER-003': 45,
    'DER-004': 60, 'DER-005': 15, 'DER-006': 30,
    
    // Chirurgie
    'CHI-001': 90, 'CHI-002': 20, 'CHI-003': 10,
    'CHI-004': 30, 'CHI-005': 15,
    
    // Gynäkologie
    'GYN-001': 30, 'GYN-002': 10, 'GYN-003': 5,
    'GYN-004': 30, 'GYN-005': 20,
    
    // Orthopädie
    'ORT-001': 30, 'ORT-002': 10, 'ORT-003': 60,
    'ORT-004': 5, 'ORT-005': 20,
    
    // Neurologie
    'NEU-001': 45, 'NEU-002': 30, 'NEU-003': 45,
    
    // Kardiologie
    'KAR-001': 45, 'KAR-002': 30, 'KAR-003': 10,
    
    // Labor
    'LAB-001': 5, 'LAB-002': 5, 'LAB-003': 5,
    'LAB-004': 5, 'LAB-005': 5, 'LAB-006': 5,
    
    // Pneumologie
    'PNE-001': 20, 'PNE-002': 45, 'PNE-003': 10,
    'PNE-004': 60, 'PNE-005': 15,
    
    // Gastroenterologie
    'GAST-001': 45, 'GAST-002': 90, 'GAST-003': 30,
    
    // Urologie
    'URO-001': 10, 'URO-002': 30, 'URO-003': 15,
    
    // Ophthalmologie
    'OPH-001': 20, 'OPH-002': 30, 'OPH-003': 10,
    'OPH-004': 120,
    
    // HNO
    'HNO-001': 30, 'HNO-002': 20, 'HNO-003': 15,
    
    // Psychiatrie
    'PSY-001': 50, 'PSY-002': 50, 'PSY-003': 30,
    
    // Radiologie
    'RAD-001': 30, 'RAD-002': 45, 'RAD-003': 20,
    
    // Anästhesie
    'ANA-001': 30, 'ANA-002': 15, 'ANA-003': 60,
    
    // Notfallmedizin
    'NOT-001': 45, 'NOT-002': 120, 'NOT-003': 60,
    
    // Sportmedizin
    'SPO-001': 60, 'SPO-002': 90, 'SPO-003': 45,
    
    // Arbeitsmedizin
    'ARB-001': 60, 'ARB-002': 45, 'ARB-003': 60
  };
  
  return durationMap[code] || 30;
}

function getColorForSpecialty(specialty) {
  const colorMap = {
    allgemeinmedizin: '#2563EB', // Blau
    dermatologie: '#DC2626',     // Rot
    chirurgie: '#059669',        // Grün
    gynaekologie: '#7C3AED',     // Lila
    orthopaedie: '#EA580C',      // Orange
    neurologie: '#0891B2',       // Cyan
    kardiologie: '#BE185D',      // Pink
    labor: '#65A30D',            // Lime
    pneumologie: '#10B981',      // Emerald
    gastroenterologie: '#F59E0B', // Amber
    urologie: '#3B82F6',         // Blue
    ophthalmologie: '#A855F7',   // Purple
    hno: '#EF4444',              // Red
    psychiatrie: '#8B5CF6',      // Violet
    radiologie: '#6366F1',       // Indigo
    anästhesie: '#EC4899',       // Pink
    notfallmedizin: '#DC2626',   // Red
    sportmedizin: '#059669',     // Green
    arbeitsmedizin: '#0EA5E9'    // Sky
  };
  
  return colorMap[specialty] || '#6B7280';
}

function isExemptFromCopay(specialty, serviceName) {
  const exemptServices = specialtyCatalogs.COPAY_RULES[specialty]?.exempt || [];
  return exemptServices.some(exempt => serviceName.includes(exempt));
}

/**
 * Bestimmt eine Farbe für eine Kategorie basierend auf dem Namen
 */
function getColorForCategoryName(categoryName) {
  const nameLower = categoryName.toLowerCase();
  
  const colorMap = {
    'konsultation': '#2563EB', 'konsultationen': '#2563EB',
    'untersuchung': '#DC2626', 'untersuchungen': '#DC2626',
    'impfung': '#059669', 'impfungen': '#059669',
    'behandlung': '#7C3AED', 'behandlungen': '#7C3AED',
    'diagnostik': '#EA580C', 'therapie': '#0891B2',
    'chirurgie': '#BE185D', 'notfall': '#DC2626',
    'vorsorge': '#10B981', 'labor': '#65A30D',
    'beratung': '#3B82F6', 'kosmetik': '#EC4899',
    'sportmedizin': '#F59E0B', 'arbeitsmedizin': '#0EA5E9'
  };

  if (colorMap[nameLower]) {
    return colorMap[nameLower];
  }

  for (const [key, color] of Object.entries(colorMap)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return color;
    }
  }

  const defaultColors = [
    '#2563EB', '#DC2626', '#059669', '#7C3AED', '#EA580C',
    '#0891B2', '#BE185D', '#10B981', '#65A30D', '#3B82F6',
    '#EC4899', '#F59E0B', '#0EA5E9', '#8B5CF6', '#6366F1'
  ];
  
  const firstChar = nameLower.charCodeAt(0) || 0;
  const colorIndex = firstChar % defaultColors.length;
  return defaultColors[colorIndex];
}

createSpecialtyServices();
