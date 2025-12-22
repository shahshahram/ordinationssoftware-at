/**
 * Platzhalter-Utility für Briefvorlagen
 * Unterstützt sowohl alte Format [Name] als auch neues Format {{...}}
 */

import { Patient } from '../store/slices/patientSlice';
import { Location } from '../store/slices/locationSlice';

export interface PlaceholderContext {
  patient?: Patient;
  doctor?: {
    firstName?: string;
    lastName?: string;
    title?: string;
    specialization?: string;
    email?: string;
    phone?: string;
  };
  location?: Location;
  date?: Date;
}

/**
 * Mapping von alten Platzhaltern [Name] zu neuen {{...}}
 */
const legacyPlaceholderMap: Record<string, string> = {
  '[Name]': '{{doctor.fullName}}',
  '[Patient]': '{{patient.fullName}}',
  '[Datum]': '{{date}}',
  '[Standort]': '{{location.name}}',
  '[ArztTitel]': '{{doctor.title}}',
};

/**
 * Erstellt alle verfügbaren Platzhalter-Werte basierend auf dem Kontext
 */
export const createPlaceholderValues = (context: PlaceholderContext): Record<string, string> => {
  const { patient, doctor, location, date = new Date() } = context;
  
  const values: Record<string, string> = {};
  
  // Datum/Zeit Platzhalter
  values['{{date}}'] = date.toLocaleDateString('de-DE');
  values['{{date.short}}'] = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
  values['{{date.long}}'] = date.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  values['{{date.iso}}'] = date.toISOString().split('T')[0];
  values['{{date.year}}'] = date.getFullYear().toString();
  values['{{date.month}}'] = date.toLocaleDateString('de-DE', { month: 'long' });
  values['{{date.monthNumber}}'] = (date.getMonth() + 1).toString();
  values['{{date.day}}'] = date.getDate().toString();
  values['{{date.weekday}}'] = date.toLocaleDateString('de-DE', { weekday: 'long' });
  
  values['{{time}}'] = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  values['{{time.full}}'] = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  values['{{time.hour}}'] = date.getHours().toString().padStart(2, '0');
  values['{{time.minute}}'] = date.getMinutes().toString().padStart(2, '0');
  
  values['{{year}}'] = date.getFullYear().toString();
  values['{{month}}'] = (date.getMonth() + 1).toString();
  values['{{day}}'] = date.getDate().toString();
  
  // Patient Platzhalter
  if (patient) {
    // {{patient.name}} sollte den vollen Namen zurückgeben (Alias für fullName)
    const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    values['{{patient.name}}'] = fullName;
    values['{{patient.firstName}}'] = patient.firstName || '';
    values['{{patient.lastName}}'] = patient.lastName || '';
    values['{{patient.fullName}}'] = fullName;
    // Alias für Rückwärtskompatibilität
    values['{{patient}}'] = fullName;
    // Alias für Rückwärtskompatibilität
    values['{{patient}}'] = values['{{patient.fullName}}'];
    values['{{patient.birthDate}}'] = patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('de-DE') : '';
    values['{{patient.age}}'] = patient.dateOfBirth ? Math.floor((date.getTime() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toString() : '';
    values['{{patient.gender}}'] = patient.gender === 'm' ? 'männlich' : patient.gender === 'w' ? 'weiblich' : patient.gender === 'd' ? 'divers' : patient.gender || '';
    values['{{patient.phone}}'] = patient.phone || '';
    values['{{patient.email}}'] = patient.email || '';
    values['{{patient.socialSecurityNumber}}'] = patient.socialSecurityNumber ? patient.socialSecurityNumber.substring(0, 3) + '***' + patient.socialSecurityNumber.substring(patient.socialSecurityNumber.length - 2) : '';
    
    // Adresse
    if (patient.address) {
      const addr = patient.address;
      values['{{patient.address}}'] = typeof addr === 'string' ? addr : `${addr.street || ''}, ${addr.postalCode || ''} ${addr.city || ''}`.trim();
      values['{{patient.address.street}}'] = typeof addr === 'string' ? '' : (addr.street || '');
      values['{{patient.address.city}}'] = typeof addr === 'string' ? '' : (addr.city || '');
      values['{{patient.address.postalCode}}'] = typeof addr === 'string' ? '' : (addr.postalCode || addr.zipCode || '');
      values['{{patient.address.country}}'] = typeof addr === 'string' ? '' : (addr.country || '');
      values['{{patient.address.full}}'] = typeof addr === 'string' ? addr : `${addr.street || ''}\n${addr.postalCode || ''} ${addr.city || ''}\n${addr.country || ''}`.trim();
    }
    
    // Versicherung
    values['{{patient.insuranceProvider}}'] = patient.insuranceProvider || '';
    values['{{patient.insuranceNumber}}'] = patient.insuranceNumber || '';
    values['{{patient.ecardNumber}}'] = patient.ecard?.cardNumber ? patient.ecard.cardNumber.substring(0, 4) + '***' + patient.ecard.cardNumber.substring(patient.ecard.cardNumber.length - 4) : '';
    
    // Medizinische Daten
    values['{{patient.height}}'] = patient.height ? `${patient.height} cm` : '';
    values['{{patient.weight}}'] = patient.weight ? `${patient.weight} kg` : '';
    values['{{patient.bmi}}'] = patient.bmi ? patient.bmi.toFixed(1) : '';
    values['{{patient.bloodType}}'] = patient.bloodType || '';
    
    // Allergien
    if (patient.allergies && patient.allergies.length > 0) {
      const allergiesList = patient.allergies.map(a => 
        typeof a === 'string' ? a : a.description || ''
      ).filter(Boolean).join(', ');
      values['{{patient.allergies}}'] = allergiesList;
    } else {
      values['{{patient.allergies}}'] = 'Keine bekannt';
    }
    
    // Medikamente
    if (patient.currentMedications && patient.currentMedications.length > 0) {
      const medsList = patient.currentMedications.map(m => 
        typeof m === 'string' ? m : `${m.name} ${m.dosage || ''} ${m.frequency || ''}`.trim()
      ).filter(Boolean).join(', ');
      values['{{patient.currentMedications}}'] = medsList;
    } else {
      values['{{patient.currentMedications}}'] = 'Keine';
    }
    
    // Notfallkontakt
    if (patient.emergencyContact) {
      values['{{patient.emergencyContact.name}}'] = patient.emergencyContact.name || '';
      values['{{patient.emergencyContact.phone}}'] = patient.emergencyContact.phone || '';
      values['{{patient.emergencyContact.relationship}}'] = patient.emergencyContact.relationship || '';
    }
    
    // Zusätzliche Daten
    values['{{patient.primaryCarePhysician}}'] = patient.primaryCarePhysician?.name || '';
    values['{{patient.notes}}'] = patient.notes || '';
    values['{{patient.medicalNotes}}'] = patient.medicalNotes || '';
  }
  
  // Arzt/Personal Platzhalter
  if (doctor) {
    values['{{doctor.firstName}}'] = doctor.firstName || '';
    values['{{doctor.lastName}}'] = doctor.lastName || '';
    values['{{doctor.fullName}}'] = `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim();
    values['{{doctor.name}}'] = values['{{doctor.fullName}}'];
    values['{{doctor.title}}'] = doctor.title || '';
    values['{{doctor.specialization}}'] = doctor.specialization || '';
    values['{{doctor.email}}'] = doctor.email || '';
    values['{{doctor.phone}}'] = doctor.phone || '';
  }
  
  // Standort/Praxis Platzhalter
  if (location) {
    values['{{location.name}}'] = location.name || '';
    values['{{location.code}}'] = location.code || '';
    values['{{location.phone}}'] = location.phone || '';
    values['{{location.email}}'] = location.email || '';
    values['{{location.website}}'] = (location as any).website || '';
    
    // Standort Adresse
    if (location.address_line1) {
      values['{{location.address.full}}'] = `${location.address_line1}${location.address_line2 ? ', ' + location.address_line2 : ''}\n${location.postal_code || ''} ${location.city || ''}`.trim();
      values['{{location.address.street}}'] = location.address_line1 || '';
      values['{{location.address.city}}'] = location.city || '';
      values['{{location.address.postalCode}}'] = location.postal_code || '';
    }
    
    // Praxisinhaber
    if (location.owner) {
      const owner = location.owner;
      values['{{location.owner.fullName}}'] = `${owner.firstName || ''} ${owner.lastName || ''}`.trim();
      values['{{location.owner.title}}'] = owner.title || '';
      values['{{location.owner.specialty}}'] = owner.specialty || '';
    }
  }
  
  // Fallback für alte Platzhalter
  values['{{clinic.name}}'] = location?.name || 'Ordinationssoftware Praxis';
  
  return values;
};

/**
 * Entfernt Link-Tags (<a>) aus Platzhaltern, damit sie korrekt ersetzt werden können
 * Behandelt auch komplexe Fälle, wo Platzhalter durch mehrere Tags aufgeteilt sind
 */
export const removeLinksFromPlaceholders = (html: string): string => {
  if (!html) return html;
  
  let cleaned = html;
  
  // Pattern 1: Komplexer Fall - Platzhalter durch mehrere Tags aufgeteilt
  // z.B. <strong>{{</strong><a href="http://patient.name"><strong>patient.name</strong></a><strong>}}</strong>
  // Dies muss ZUERST behandelt werden, bevor andere Patterns angewendet werden
  cleaned = cleaned.replace(/<strong>\{\{<\/strong><a[^>]*><strong>([^<]+)<\/strong><\/a><strong>\}\}<\/strong>/gi, '{{$1}}');
  cleaned = cleaned.replace(/<strong>\{\{<\/strong><a[^>]*>([^<]+)<\/a><strong>\}\}<\/strong>/gi, '{{$1}}');
  cleaned = cleaned.replace(/<strong>\{\{<\/strong><a[^>]*href="[^"]*"[^>]*><strong>([^<]+)<\/strong><\/a><strong>\}\}<\/strong>/gi, '{{$1}}');
  
  // Pattern 2: Platzhalter in href-Attribut (z.B. href="{{patient.name}}")
  cleaned = cleaned.replace(/<a[^>]*href="({{[^}]+}})"[^>]*>.*?<\/a>/gi, '$1');
  
  // Pattern 3: <a href="...">{{...}}</a> - Platzhalter als einziger Inhalt
  cleaned = cleaned.replace(/<a[^>]*href="[^"]*"[^>]*>({{[^}]+}})<\/a>/gi, '$1');
  
  // Pattern 4: <a>{{...}}</a> (ohne href) - Platzhalter als einziger Inhalt
  cleaned = cleaned.replace(/<a[^>]*>({{[^}]+}})<\/a>/gi, '$1');
  
  // Pattern 5: Platzhalter innerhalb von Link-Text (kann auch anderen Text enthalten)
  cleaned = cleaned.replace(/<a[^>]*>([^<]*{{[^}]+}}[^<]*)<\/a>/gi, '$1');
  
  // Pattern 6: Mehrere Platzhalter in einem Link
  cleaned = cleaned.replace(/<a[^>]*>([^<]*(?:{{[^}]+}}[^<]*)+)<\/a>/gi, '$1');
  
  // Pattern 7: Platzhalter mit Whitespace
  cleaned = cleaned.replace(/<a[^>]*>\s*({{[^}]+}})\s*<\/a>/gi, '$1');
  
  // Pattern 8: Entferne alle <a> Tags, die nur Platzhalter-Teile enthalten
  // Finde Links, die Teil eines Platzhalters sein könnten (z.B. href="http://patient.name")
  cleaned = cleaned.replace(/<a[^>]*href="[^"]*patient\.name[^"]*"[^>]*>([^<]+)<\/a>/gi, '$1');
  cleaned = cleaned.replace(/<a[^>]*href="[^"]*patient\.[^"]*"[^>]*>([^<]+)<\/a>/gi, '$1');
  
  // Pattern 9: Allgemeiner Fall - Links, die nur Platzhalter-Teile enthalten (ohne {{}})
  // z.B. <a href="http://patient.name">patient.name</a> zwischen {{ und }}
  // Finde alle Links, die zwischen {{ und }} stehen könnten
  cleaned = cleaned.replace(/\{\{([^}]*?)<a[^>]*>([^<]+)<\/a>([^}]*?)\}\}/gi, '{{$1$2$3}}');
  
  return cleaned;
};

/**
 * Ersetzt Platzhalter in einem Text-String (unterstützt auch HTML)
 * Unterstützt sowohl alte Format [Name] als auch neues Format {{...}}
 */
export const replacePlaceholders = (
  content: string,
  context: PlaceholderContext
): string => {
  if (!content) return content;
  
  // Entferne zuerst Links aus Platzhaltern, damit sie korrekt ersetzt werden können
  let processedContent = removeLinksFromPlaceholders(content);
  
  // Erstelle Platzhalter-Werte
  const placeholderValues = createPlaceholderValues(context);
  console.log('🔍 Placeholder values created:', placeholderValues);
  
  // Ersetze neue Platzhalter {{...}}
  // Wichtig: HTML-Escaping für Werte, damit Sonderzeichen korrekt angezeigt werden
  Object.entries(placeholderValues).forEach(([placeholder, value]) => {
    // HTML-Escaping für Werte, damit Sonderzeichen wie &, <, > korrekt angezeigt werden
    const escapedValue = String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    
    const escapedPlaceholder = placeholder.replace(/[{}]/g, '\\$&');
    const regex = new RegExp(escapedPlaceholder, 'g');
    const beforeReplace = processedContent;
    processedContent = processedContent.replace(regex, escapedValue);
    if (beforeReplace !== processedContent) {
      console.log(`🔄 Replaced ${placeholder} with ${String(value).substring(0, 50)}...`);
    }
  });
  
  // Ersetze alte Platzhalter [Name] (für Rückwärtskompatibilität)
  Object.entries(legacyPlaceholderMap).forEach(([oldPlaceholder, newPlaceholder]) => {
    if (placeholderValues[newPlaceholder]) {
      const value = String(placeholderValues[newPlaceholder])
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      
      const regex = new RegExp(oldPlaceholder.replace(/[\[\]]/g, '\\$&'), 'g');
      const beforeReplace = processedContent;
      processedContent = processedContent.replace(regex, value);
      if (beforeReplace !== processedContent) {
        console.log(`🔄 Replaced legacy ${oldPlaceholder} with ${value.substring(0, 50)}...`);
      }
    }
  });
  
  return processedContent;
};

/**
 * Liste aller verfügbaren Platzhalter für die Legende
 */
export const getPlaceholderLegend = () => {
  return {
    patient: [
      { placeholder: '{{patient.name}}', description: 'Vorname des Patienten' },
      { placeholder: '{{patient.firstName}}', description: 'Vorname des Patienten' },
      { placeholder: '{{patient.lastName}}', description: 'Nachname des Patienten' },
      { placeholder: '{{patient.fullName}}', description: 'Vollständiger Name (Vorname + Nachname)' },
      { placeholder: '{{patient.birthDate}}', description: 'Geburtsdatum (DD.MM.YYYY)' },
      { placeholder: '{{patient.age}}', description: 'Alter (berechnet aus Geburtsdatum)' },
      { placeholder: '{{patient.gender}}', description: 'Geschlecht (männlich/weiblich/divers)' },
      { placeholder: '{{patient.phone}}', description: 'Telefonnummer' },
      { placeholder: '{{patient.email}}', description: 'E-Mail-Adresse' },
      { placeholder: '{{patient.socialSecurityNumber}}', description: 'SVNR (gekürzt/verschlüsselt)' },
      { placeholder: '{{patient.address}}', description: 'Vollständige Adresse (eine Zeile)' },
      { placeholder: '{{patient.address.street}}', description: 'Straße' },
      { placeholder: '{{patient.address.city}}', description: 'Stadt' },
      { placeholder: '{{patient.address.postalCode}}', description: 'Postleitzahl' },
      { placeholder: '{{patient.address.country}}', description: 'Land' },
      { placeholder: '{{patient.address.full}}', description: 'Vollständige Adresse (mehrzeilig)' },
      { placeholder: '{{patient.insuranceProvider}}', description: 'Versicherungsträger' },
      { placeholder: '{{patient.insuranceNumber}}', description: 'Versicherungsnummer' },
      { placeholder: '{{patient.ecardNumber}}', description: 'eCard-Nummer (gekürzt)' },
      { placeholder: '{{patient.height}}', description: 'Größe (cm)' },
      { placeholder: '{{patient.weight}}', description: 'Gewicht (kg)' },
      { placeholder: '{{patient.bmi}}', description: 'BMI' },
      { placeholder: '{{patient.bloodType}}', description: 'Blutgruppe' },
      { placeholder: '{{patient.allergies}}', description: 'Allergien (kommagetrennt)' },
      { placeholder: '{{patient.currentMedications}}', description: 'Aktuelle Medikamente' },
      { placeholder: '{{patient.emergencyContact.name}}', description: 'Name des Notfallkontakts' },
      { placeholder: '{{patient.emergencyContact.phone}}', description: 'Telefon des Notfallkontakts' },
      { placeholder: '{{patient.emergencyContact.relationship}}', description: 'Verwandtschaftsverhältnis' },
      { placeholder: '{{patient.primaryCarePhysician}}', description: 'Hausarzt' },
      { placeholder: '{{patient.notes}}', description: 'Allgemeine Notizen' },
      { placeholder: '{{patient.medicalNotes}}', description: 'Medizinische Notizen' },
    ],
    doctor: [
      { placeholder: '{{doctor.firstName}}', description: 'Vorname des Arztes' },
      { placeholder: '{{doctor.lastName}}', description: 'Nachname des Arztes' },
      { placeholder: '{{doctor.fullName}}', description: 'Vollständiger Name des Arztes' },
      { placeholder: '{{doctor.name}}', description: 'Vollständiger Name des Arztes (Alias)' },
      { placeholder: '{{doctor.title}}', description: 'Titel (Dr., Prof., etc.)' },
      { placeholder: '{{doctor.specialization}}', description: 'Fachrichtung/Spezialisierung' },
      { placeholder: '{{doctor.email}}', description: 'E-Mail des Arztes' },
      { placeholder: '{{doctor.phone}}', description: 'Telefon des Arztes' },
    ],
    location: [
      { placeholder: '{{location.name}}', description: 'Standortname' },
      { placeholder: '{{location.code}}', description: 'Standortcode' },
      { placeholder: '{{location.phone}}', description: 'Telefon der Praxis' },
      { placeholder: '{{location.email}}', description: 'E-Mail der Praxis' },
      { placeholder: '{{location.website}}', description: 'Website der Praxis' },
      { placeholder: '{{location.address.full}}', description: 'Vollständige Standortadresse' },
      { placeholder: '{{location.address.street}}', description: 'Straße' },
      { placeholder: '{{location.address.city}}', description: 'Stadt' },
      { placeholder: '{{location.address.postalCode}}', description: 'Postleitzahl' },
      { placeholder: '{{location.owner.fullName}}', description: 'Name des Praxisinhabers' },
      { placeholder: '{{location.owner.title}}', description: 'Titel des Praxisinhabers' },
      { placeholder: '{{location.owner.specialty}}', description: 'Fachrichtung des Praxisinhabers' },
      { placeholder: '{{clinic.name}}', description: 'Praxisname (Alias für location.name)' },
    ],
    dateTime: [
      { placeholder: '{{date}}', description: 'Aktuelles Datum (DD.MM.YYYY)' },
      { placeholder: '{{date.short}}', description: 'Kurzes Datum (DD.MM.YY)' },
      { placeholder: '{{date.long}}', description: 'Langes Datum (z.B. "Montag, 15. Januar 2024")' },
      { placeholder: '{{date.iso}}', description: 'ISO-Format (YYYY-MM-DD)' },
      { placeholder: '{{date.year}}', description: 'Nur Jahr' },
      { placeholder: '{{date.month}}', description: 'Nur Monat (Name)' },
      { placeholder: '{{date.monthNumber}}', description: 'Nur Monat (Zahl)' },
      { placeholder: '{{date.day}}', description: 'Nur Tag' },
      { placeholder: '{{date.weekday}}', description: 'Wochentag' },
      { placeholder: '{{time}}', description: 'Aktuelle Uhrzeit (HH:MM)' },
      { placeholder: '{{time.full}}', description: 'Vollständige Uhrzeit (HH:MM:SS)' },
      { placeholder: '{{time.hour}}', description: 'Nur Stunde' },
      { placeholder: '{{time.minute}}', description: 'Nur Minute' },
      { placeholder: '{{year}}', description: 'Aktuelles Jahr' },
      { placeholder: '{{month}}', description: 'Aktueller Monat (Zahl)' },
      { placeholder: '{{day}}', description: 'Aktueller Tag' },
    ],
    legacy: [
      { placeholder: '[Name]', description: 'Arztname (veraltet, verwenden Sie {{doctor.fullName}})' },
      { placeholder: '[Patient]', description: 'Patientenvollname (veraltet, verwenden Sie {{patient.fullName}})' },
      { placeholder: '[Datum]', description: 'Aktuelles Datum (veraltet, verwenden Sie {{date}})' },
      { placeholder: '[Standort]', description: 'Standortname (veraltet, verwenden Sie {{location.name}})' },
      { placeholder: '[ArztTitel]', description: 'Arzt-Titel (veraltet, verwenden Sie {{doctor.title}})' },
    ],
  };
};

