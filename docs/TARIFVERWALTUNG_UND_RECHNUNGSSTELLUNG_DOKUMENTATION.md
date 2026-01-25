# Tarifverwaltung und Rechnungsstellung - Vollständige Implementierungsdokumentation

## Inhaltsverzeichnis
1. [Systemübersicht](#systemübersicht)
2. [Architektur](#architektur)
3. [Datenmodelle](#datenmodelle)
4. [Katalogstruktur (ServiceCatalog)](#katalogstruktur-servicecatalog)
5. [Tarifverwaltung](#tarifverwaltung)
6. [Rechnungsstellung](#rechnungsstellung)
7. [Abrechnungstypen](#abrechnungstypen)
8. [Honorarnoten (Honor Notes)](#honorarnoten-honor-notes)
9. [Integration mit Versicherungsträgern](#integration-mit-versicherungsträgern)
10. [Prozessabläufe](#prozessabläufe)
11. [Technische Details](#technische-details)
12. [API-Endpunkte](#api-endpunkte)

---

## Systemübersicht

Das System unterstützt drei Hauptabrechnungstypen:
- **Kassenarzt-Abrechnung**: Direkte Abrechnung mit gesetzlichen Versicherungsträgern (ÖGK, SVS, BVAEB, etc.)
- **Wahlarzt-Abrechnung**: Abrechnung über WAHonline (Österreichische Ärztekammer)
- **Privat-Abrechnung**: Direkte Abrechnung mit dem Patienten

### Kernkomponenten

1. **ServiceCatalog**: Zentrale Verwaltung aller Leistungen mit Preisen und Tarifinformationen
2. **Tariff**: Verwaltung von GOÄ, KHO/ET-Tarifen (Honorarordnungen)
3. **Invoice**: Rechnungsmodell mit Services, Beträgen und Status
4. **ServiceCodeMapping**: Mapping zwischen internen Codes und versicherungsträger-spezifischen Codes
5. **Billing Calculator**: Berechnung von Preisen, Selbstbehalten, Erstattungen
6. **Connectors**: ELDA, WAHonline, Kassen-Connectors für elektronische Übertragung

---

## Architektur

### Frontend-Komponenten

#### 1. ServiceCatalog.tsx
- **Zweck**: Verwaltung des Leistungskatalogs
- **Hauptfunktionen**:
  - Erstellen/Bearbeiten von Leistungen
  - Konfiguration von Preisen (Kassenarzt, Wahlarzt, Privat)
  - KHO-Code-Verwaltung
  - Conflict-Rules und Begründungspflicht-Regeln
  - Bundesland- und Versicherungsträger-spezifische Tarife

#### 2. Billing.tsx
- **Zweck**: Rechnungserstellung und -verwaltung
- **Hauptfunktionen**:
  - Rechnungen erstellen/bearbeiten
  - Service-Auswahl aus ServiceCatalog
  - Automatische Preisberechnung
  - Begründungsfelder (dynamisch basierend auf justificationRules)
  - PDF-Generierung
  - E-Mail-Versand

#### 3. TariffManagement.tsx
- **Zweck**: Verwaltung von GOÄ, KHO, ET-Tarifen
- **Hauptfunktionen**:
  - Tarif-Import (CSV, XML)
  - ÖGK-Tarif-Download
  - Tarif-Verwaltung nach Typ (GOÄ, KHO)
  - Bundesland- und Versicherungsträger-Filterung

#### 4. ServiceCodeMappingManagement.tsx
- **Zweck**: Mapping zwischen internen Service-Codes und Versicherungsträger-Codes
- **Hauptfunktionen**:
  - Mapping erstellen/bearbeiten
  - Automatische Erstellung aus ServiceCatalog
  - Versicherungsträger-spezifische Codes verwalten

### Backend-Komponenten

#### 1. Models

**ServiceCatalog.js**
```javascript
{
  code: String (unique),
  name: String,
  description: String,
  category: String,
  specialty: String,
  
  // Preise (ALLE IN EURO!)
  price: Number, // Allgemeiner Preis
  billingType: ['kassenarzt', 'wahlarzt', 'privat', 'both'],
  
  // Kassenarzt-Abrechnung
  ogk: {
    khoCode: String,        // KHO-Code (korrekte österreichische Bezeichnung)
    khoPrice: Number,       // Preis in Euro
    khoGroup: String,       // Kategorie
    khoSubGroup: String,   // Unterkategorie
    insuranceProvider: ['oegk', 'bvaeb', 'svs', 'kfa', 'pva', 'vaeb', 'auva', 'all'],
    federalState: ['burgenland', 'kaernten', ..., 'wien', null],
    conflictRules: { ... },      // NEU: Ausschluss-Regeln
    justificationRules: { ... }   // NEU: Begründungspflicht-Regeln
  },
  
  // Wahlarzt-Abrechnung
  wahlarzt: {
    price: Number,          // Preis in Euro
    priceType: ['netto', 'brutto'],
    reimbursementRate: Number (0-1)
  },
  
  // Privat-Abrechnung
  private: {
    price: Number,          // Preis in Euro
    priceType: ['netto', 'brutto']
  },
  
  taxRate: Number (0-100), // Optional: explizite Umsatzsteuer
  location_id: ObjectId    // Standort-Zuordnung
}
```

**Invoice.js**
```javascript
{
  invoiceNumber: String (unique),
  invoiceDate: Date,
  dueDate: Date,
  
  // Arzt/Ordination
  doctor: {
    name: String,
    taxNumber: String,
    chamberNumber: String,
    address: { ... }
  },
  
  // Patient
  patient: {
    id: ObjectId (ref: PatientExtended),
    name: String,
    insuranceNumber: String,
    insuranceProvider: String,
    address: { ... }
  },
  
  // Abrechnungstyp
  billingType: ['kassenarzt', 'wahlarzt', 'privat'],
  
  // Diagnosen
  diagnoses: [{
    code: String,
    display: String,
    isPrimary: Boolean,
    date: Date
  }],
  
  // Leistungen
  services: [{
    date: Date,
    serviceCode: String,
    description: String,
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number,
    category: String,
    justification: String,  // NEU: Begründung für Konflikt-Überschreibung
    notes: String
  }],
  
  // Beträge
  subtotal: Number,
  taxRate: Number (0-100),
  taxAmount: Number,
  totalAmount: Number,
  
  // Zahlungsstatus
  status: ['draft', 'pending', 'sent', 'paid', 'overdue', 'cancelled'],
  paymentDate: Date,
  paymentMethod: ['cash', 'transfer', 'card', ...],
  
  // Kassenabrechnung
  insuranceBilling: {
    insuranceCompany: String,
    billingPeriod: String,
    submissionDate: Date,
    status: ['pending', 'submitted', 'approved', 'rejected']
  },
  
  // Wahlarzt-Abrechnung
  privateBilling: {
    honorNote: Boolean,
    wahlarztCode: String,
    reimbursementAmount: Number,
    patientAmount: Number
  },
  
  // ÖGK-spezifisch
  ogkBilling: {
    xmlExported: Boolean,
    xmlExportDate: Date,
    elaNumber: String,
    billingPeriod: String
  }
}
```

**Tariff.js**
```javascript
{
  code: String (unique),
  name: String,
  tariffType: ['goae', 'kho', 'et', 'ebm', 'custom'],
  
  // GOÄ-spezifisch
  goae: {
    section: String,      // GOÄ-Abschnitt (A, B, C)
    number: String,       // GOÄ-Nummer
    multiplier: Number,   // GOÄ-Faktor
    basePrice: Number     // Grundpreis in Cent
  },
  
  // KHO/ET-spezifisch
  kho: {
    khoCode: String,      // KHO-Code
    khoPrice: Number,     // Preis in Euro
    price: Number,         // Legacy: Preis in Cent
    insuranceProvider: ['oegk', 'bvaeb', ...],
    federalState: ['burgenland', ..., 'wien', null]
  },
  
  specialty: String,
  validFrom: Date,
  validUntil: Date,
  isActive: Boolean
}
```

**ServiceCodeMapping.js**
```javascript
{
  baseCode: String,       // Interner Service-Code
  baseName: String,
  
  // Mappings zu Versicherungsträgern
  mappings: [{
    insuranceProvider: ['oegk', 'bvaeb', 'svs', ...],
    code: String,         // Provider-spezifischer Code
    name: String,         // Optional: Provider-Name
    price: Number,        // Optional: Provider-Preis (in Euro)
    validFrom: Date,
    validUntil: Date,
    isActive: Boolean
  }],
  
  specialty: String,
  category: String,
  isActive: Boolean
}
```

#### 2. Services

**billingService.js**
- `oneClickBill()`: One-Click-Abrechnung für Leistungen
- `createInvoice()`: Rechnung erstellen
- `calculateTaxRateForService()`: Umsatzsteuer berechnen
- `determineRoute()`: Abrechnungsroute bestimmen (Kassenarzt/Wahlarzt/Privat)

**serviceCodeMappingService.js**
- `findMapping()`: Mapping für Versicherungsträger finden
- `convertCode()`: Code konvertieren
- `convertServices()`: Mehrere Services konvertieren
- `createMappingFromServiceCatalog()`: Automatische Mapping-Erstellung

#### 3. Utils

**billing-calculator.js**
- `calculateBilling()`: Hauptberechnungsfunktion
- `calculateCopay()`: Selbstbehalt berechnen
- `checkInsuranceCoverage()`: Versicherungsdeckung prüfen
- `getPriceByType()`: Netto/Brutto-Umrechnung
- `calculateRefund()`: Erstattungsbetrag berechnen

**ogk-xml-generator.js**
- `generateELA()`: Einzelleistungsauszug (XML)
- `generateTurnusAbrechnung()`: Turnusabrechnung (XML)

**wahonlineFormatGenerator.js**
- `generateMeldung()`: WAHonline-Meldung generieren

**eldaFormatGenerator.js**
- `generateKSB()`: KSB-Datensatz generieren
- `generateAbrechnung()`: Abrechnungs-Datensatz generieren

#### 4. Connectors

**eldaConnector.js**
- `send()`: Daten an ELDA senden
- `sendViaFTPS()`: FTPS-Übertragung
- `sendViaWebservice()`: Webservice-Übertragung (ab 02.02.2026)

**wahonlineConnector.js**
- `send()`: WAHonline-Meldung senden
- `sendViaELDAWebservice()`: Über ELDA-Webservice (SIT)
- `sendViaRESTAPI()`: Über REST API (Production)

**kassenConnector.js**
- Kassenarzt-Abrechnung über verschiedene Schnittstellen

---

## Katalogstruktur (ServiceCatalog)

### Überblick

Der **ServiceCatalog** ist das zentrale Verwaltungstool für alle medizinischen Leistungen im System. Jede Leistung wird hier definiert und konfiguriert.

### Struktur und Organisation

#### 1. Hierarchische Kategorisierung

**Kategorien (ServiceCategories)**
- Strukturierte Kategorien aus separater Tabelle
- Beispiele: "Diagnostik", "Therapie", "Konsultation", "Untersuchung"
- Jede Kategorie hat:
  - `name`: Anzeigename
  - `code`: Eindeutiger Code
  - `color_hex`: Farbe für UI-Darstellung
  - `is_active`: Aktiv/Inaktiv-Status

**Fachrichtungen (Specialty)**
- Medizinische Fachrichtungen
- Beispiele: "allgemeinmedizin", "chirurgie", "dermatologie", etc.
- Filterung nach Fachrichtung möglich

**Standorte (Location)**
- Standort-spezifische Leistungen
- `location_id`: Verknüpfung zu Standort
- Filterung nach Standort möglich

#### 2. Leistungsstruktur

**Grunddaten**
```javascript
{
  code: String,              // Eindeutiger Code (z.B. "ORD1")
  name: String,              // Anzeigename (z.B. "Ordination")
  description: String,        // Beschreibung (Rich Text)
  category: String,           // Kategorie (aus ServiceCategories)
  specialty: String,          // Fachrichtung
  isMedical: Boolean,         // Medizinische Leistung?
  location_id: ObjectId       // Standort-Zuordnung
}
```

**Zeit- und Dauer-Konfiguration**
```javascript
{
  base_duration_min: Number,    // Grunddauer in Minuten (z.B. 30)
  buffer_before_min: Number,     // Puffer vorher (z.B. 5)
  buffer_after_min: Number,     // Puffer nachher (z.B. 10)
  can_overlap: Boolean,          // Kann parallel laufen?
  parallel_group: String         // Parallelisierungsgruppe
}
```

**Personal-Zuordnung**
```javascript
{
  required_role: String,              // Erforderliche Rolle ('arzt', 'therapeut', etc.)
  visible_to_roles: [String],         // Sichtbar für Rollen
  assigned_users: [ObjectId],         // Zugewiesene Benutzer
  requires_user_selection: Boolean   // Benutzer-Auswahl erforderlich?
}
```

**Geräte- und Raum-Zuordnung**
```javascript
{
  assigned_devices: [ObjectId],           // Zugewiesene Geräte
  requires_device_selection: Boolean,    // Geräte-Auswahl erforderlich?
  device_selection_mode: 'specific' | 'type',  // Spezifisch oder Typ-basiert
  device_quantity_required: Number,      // Anzahl benötigter Geräte
  
  assigned_rooms: [ObjectId],             // Zugewiesene Räume
  requires_room_selection: Boolean,       // Raum-Auswahl erforderlich?
  room_selection_mode: 'specific' | 'type',  // Spezifisch oder Typ-basiert
  room_quantity_required: Number          // Anzahl benötigter Räume
}
```

**Online-Buchung**
```javascript
{
  online_bookable: Boolean,              // Online buchbar?
  online_contingents: [{                 // Online-Kontingente
    timeWindow: { start: "08:00", end: "12:00" },
    daysOfWeek: [1, 2, 3, 4, 5],        // Mo-Fr
    maxOnlineBookings: Number,           // Max. Buchungen
    priority: Number,                    // Priorität
    isActive: Boolean
  }],
  anamnesisQuestions: [{                 // Anamnese-Vorabfragen
    questionId: String,
    question: String,
    type: 'text' | 'textarea' | 'number' | 'date' | 'yes_no' | 'multiple_choice',
    required: Boolean,
    order: Number
  }]
}
```

#### 3. Filterung und Suche

**Filter-Optionen**:
- **Suche**: Volltextsuche über Code, Name, Beschreibung
- **Kategorie**: Filter nach ServiceCategories
- **Fachrichtung**: Filter nach Specialty
- **Standort**: Filter nach Location
- **Rolle**: Filter nach required_role
- **Status**: Aktiv/Inaktiv

**Frontend-Implementierung** (ServiceCatalog.tsx):
```typescript
// Filter-State
const [searchTerm, setSearchTerm] = useState('');
const [filterCategory, setFilterCategory] = useState('');
const [filterSpecialty, setFilterSpecialty] = useState('');
const [filterLocation, setFilterLocation] = useState('');
const [filterRole, setFilterRole] = useState('');

// API-Aufruf mit Filtern
const params = new URLSearchParams({
  page: (page + 1).toString(),
  limit: rowsPerPage.toString()
});
if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
if (filterCategory) params.append('category', filterCategory);
if (filterSpecialty) params.append('specialty', filterSpecialty);
if (filterLocation) params.append('location_id', filterLocation);
if (filterRole) params.append('required_role', filterRole);
```

#### 4. Katalog-Verwaltung

**Erstellen/Bearbeiten**:
- Dialog-basierte Bearbeitung
- Tabs für verschiedene Konfigurationsbereiche:
  1. Grunddaten
  2. Personal
  3. Geräte
  4. Räume
  5. Zeit & Dauer
  6. Preis & Abrechnung
  7. Online-Buchung
  8. Patienteneignung
  9. Konflikt-Regeln
  10. Begründungspflicht

**Validierung**:
- Code muss eindeutig sein
- Name ist Pflichtfeld
- Preise müssen >= 0 sein
- Dauer muss > 0 sein

**Bulk-Operationen**:
- Mehrere Services gleichzeitig bearbeiten
- Kategorien zuweisen
- Standorte zuweisen

---

## Tarifverwaltung

### Tariftypen

#### 1. GOÄ (Gebührenordnung für Ärzte)
- **Verwendung**: Wahlarzt-Abrechnung
- **Struktur**: Abschnitt (A, B, C) + Nummer + Multiplikator
- **Preisberechnung**: `basePrice * multiplier`
- **Beispiel**: GOÄ 1 (Ordination) mit Faktor 2.3

#### 2. KHO (Kassenhonorarordnung)
- **Verwendung**: Kassenarzt-Abrechnung
- **Struktur**: KHO-Code + Preis in Euro
- **Bundesland-spezifisch**: Optional (z.B. Oberösterreich vs. Wien)
- **Versicherungsträger-spezifisch**: ÖGK, SVS, BVAEB, etc.
- **Beispiel**: KHO-Code "111" = Ordinationskonsultation, Preis: 18.50€

#### 3. ET (Erstattungstarif)
- **Verwendung**: Erstattungsberechnung für Wahlarzt
- **Struktur**: Ähnlich KHO, aber für Erstattungsberechnung

### Tarif-Import

**Quellen**:
1. ÖGK-Tarif-Download (automatisch)
2. CSV-Import
3. XML-Import
4. Manuelle Eingabe

**Prozess**:
```
1. Tarif-Datei hochladen (CSV/XML)
2. Parsing und Validierung
3. Duplikatsprüfung (Code + Typ)
4. Speicherung in Tariff-Collection
5. Optional: Verknüpfung mit ServiceCatalog
```

### Tarif-Verwaltung

**Filterung**:
- Nach Tariftyp (GOÄ, KHO, ET)
- Nach Fachrichtung
- Nach Versicherungsträger
- Nach Bundesland
- Nach Gültigkeitszeitraum

**Aktivierung/Deaktivierung**:
- Tarife können aktiv/inaktiv gesetzt werden
- Inaktive Tarife werden nicht in Abrechnungen verwendet

---

## Rechnungsstellung

### Rechnungserstellungsprozess

#### 1. Rechnung erstellen (Frontend: Billing.tsx)

**Schritt 1: Patient auswählen**
```typescript
// Patient wird aus Patientenliste ausgewählt
// Automatisches Laden von:
// - Versicherungsdaten
// - Adressdaten
// - Zusatzversicherungen
```

**Schritt 2: Services hinzufügen**
```typescript
// Service-Auswahl aus ServiceCatalog
// Automatische Preisberechnung basierend auf:
// - billingType (kassenarzt/wahlarzt/privat)
// - Patient-Versicherung
// - ServiceCatalog-Preise
```

**Schritt 3: Begründungsfelder (NEU)**
```typescript
// Dynamische Felder basierend auf justificationRules:
// - Textfeld (wenn justificationFields.text = true)
// - Uhrzeit (wenn justificationFields.time = true)
// - Diagnose (wenn justificationFields.diagnosis = true)
// - Dringlichkeit (wenn justificationFields.urgency = true)
```

**Schritt 4: Beträge berechnen**
```typescript
// Automatische Berechnung:
// - subtotal = Summe aller Services
// - taxRate = aus ServiceCatalog oder Standard (Kassenarzt: 0%, Wahlarzt: 20%)
// - taxAmount = subtotal * taxRate / 100
// - totalAmount = subtotal + taxAmount
```

**Schritt 5: Rechnung speichern**
```typescript
// POST /api/billing/invoices
// Backend erstellt Invoice-Dokument
// Automatische Validierung:
// - Conflict-Detection (wenn conflictRules vorhanden)
// - Begründungspflicht-Prüfung (wenn justificationRules vorhanden)
```

#### 2. Backend-Verarbeitung (billing.js)

**Route: POST /api/billing/invoices**

```javascript
// 1. Validierung
- Patient-ID prüfen
- Services validieren (Code, Beschreibung, Menge)
- billingType validieren

// 2. TaxRate-Berechnung
const taxRate = await calculateTaxRate(services, billingType);
// - Lädt ServiceCatalog-Einträge
// - Prüft explizite taxRate
// - Fallback: Kassenarzt = 0%, Wahlarzt/Privat = 20%

// 3. Preisberechnung für jeden Service
for (const service of services) {
  const serviceCatalogEntry = await ServiceCatalog.findOne({ code: service.serviceCode });
  
  // Preis basierend auf billingType:
  if (billingType === 'kassenarzt') {
    service.unitPrice = serviceCatalogEntry.ogk.khoPrice;
  } else if (billingType === 'wahlarzt') {
    // Netto/Brutto-Umrechnung
    service.unitPrice = getPriceByType(
      { price: serviceCatalogEntry.wahlarzt.price, priceType: 'netto' },
      taxRate,
      'brutto'
    );
  } else if (billingType === 'privat') {
    service.unitPrice = getPriceByType(
      { price: serviceCatalogEntry.private.price, priceType: 'netto' },
      taxRate,
      'brutto'
    );
  }
  
  service.totalPrice = service.unitPrice * service.quantity;
}

// 4. Gesamtbeträge berechnen
subtotal = services.reduce((sum, s) => sum + s.totalPrice, 0);
taxAmount = subtotal * taxRate / 100;
totalAmount = subtotal + taxAmount;

// 5. Invoice-Dokument erstellen
const invoice = new Invoice({
  invoiceNumber: auto-generiert,
  patient: { id: patientId, ... },
  doctor: { ... },
  billingType,
  services,
  subtotal,
  taxRate,
  taxAmount,
  totalAmount,
  status: 'draft'
});

// 6. Speichern
await invoice.save();

// 7. Automatische Erstattung (wenn wahlarzt)
if (billingType === 'wahlarzt') {
  await autoReimbursementService.createReimbursementForInvoice(invoice);
}

// 8. Journal-Eintrag
await InvoiceJournal.createFromInvoice(invoice, 'created', userId);
```

### Conflict-Detection (NEU)

**Zweck**: Verhindert, dass konfliktierende Services gleichzeitig abgerechnet werden.

**Beispiel**: "Ordination" (ORD1) und "Hausbesuch" (HB1) am selben Tag

**Implementierung**:
```javascript
// In ServiceCatalog.ogk.conflictRules:
{
  conflictsWith: ['HB1', 'TELE'],
  conflictsOnSameDay: true,
  allowOverride: true,
  overrideRequiresJustification: true
}

// Validierung beim Rechnung erstellen:
// 1. Prüfe alle Services in der Rechnung
// 2. Für jeden Service: Prüfe conflictRules
// 3. Wenn Konflikt gefunden:
//    - Wenn allowOverride = false: Fehler
//    - Wenn allowOverride = true: Prüfe justification
//    - Wenn overrideRequiresJustification = true: justification muss vorhanden sein
```

### Begründungspflicht (NEU)

**Zweck**: Erfordert Begründung für bestimmte Services (z.B. Dringlichkeit, außerordentliche Leistung).

**Implementierung**:
```javascript
// In ServiceCatalog.ogk.justificationRules:
{
  requiresJustification: true,
  justificationType: 'combination',
  justificationFields: {
    text: true,
    time: true,
    diagnosis: false,
    urgency: true
  },
  minLength: 10,
  maxLength: 500
}

// Frontend zeigt dynamisch Felder an:
// - Textfeld (wenn text = true)
// - Uhrzeit-Feld (wenn time = true)
// - Diagnose-Auswahl (wenn diagnosis = true)
// - Dringlichkeit-Auswahl (wenn urgency = true)
```

---

## Abrechnungstypen

### 1. Kassenarzt-Abrechnung

**Zweck**: Direkte Abrechnung mit gesetzlichen Versicherungsträgern

**Prozess**:
```
1. Rechnung erstellen (billingType: 'kassenarzt')
2. Services mit KHO-Code auswählen
3. Preis = ServiceCatalog.ogk.khoPrice (in Euro)
4. Umsatzsteuer = 0% (medizinische Leistungen)
5. Selbstbehalt berechnen (versicherungsträger-spezifisch)
6. Rechnung speichern
7. Optional: XML-Export für ÖGK
8. Optional: ELDA-Übertragung
```

**Preisberechnung**:
```javascript
// Kassenarzt-Preis = KHO-Preis aus ServiceCatalog
const kassenarztPrice = serviceCatalog.ogk.khoPrice; // in Euro

// Selbstbehalt (versicherungsträger-spezifisch):
// - ÖGK, BVAEB, KFA, PVA: 0% (kein Selbstbehalt)
// - SVS: 20% (max. 343€)
const copay = calculateCopay(service, patient, kassenarztPrice, 'kassenarzt');

// Patient zahlt: copay
// Versicherung zahlt: kassenarztPrice - copay
```

**Export-Formate**:
- ÖGK-XML (ELA = Einzelleistungsauszug)
- ÖGK-XML (Turnusabrechnung)
- ELDA-Format

### 2. Wahlarzt-Abrechnung

**Zweck**: Abrechnung über WAHonline (Österreichische Ärztekammer)

**Prozess**:
```
1. Rechnung erstellen (billingType: 'wahlarzt')
2. Services auswählen (müssen wahlarzt-fähig sein)
3. Preis = ServiceCatalog.wahlarzt.price (in Euro)
4. Umsatzsteuer = 20% (Standard, kann überschrieben werden)
5. Erstattungsbetrag berechnen (80% des Kassentarifs)
6. Patient zahlt: Differenz + Selbstbehalt
7. WAHonline-Meldung generieren
8. Übermittlung via ELDA-Webservice (SIT) oder REST API (Production)
```

**Honorarnoten (privateBilling.honorNote)**:
- **Zweck**: Spezielle Rechnungsart für Wahlarzt-Leistungen
- **Verwendung**: Wenn `privateBilling.honorNote = true`, handelt es sich um eine Honorarnote statt einer normalen Rechnung
- **Implementierung**:
  ```javascript
  // In Invoice-Model
  privateBilling: {
    honorNote: { type: Boolean, default: false },
    wahlarztCode: { type: String },
    reimbursementAmount: { type: Number, default: 0 },
    patientAmount: { type: Number, default: 0 }
  }
  
  // In billingService.js
  if (route === 'PATIENT+KASSE_REFUND' && payload.wahlarztData) {
    invoiceData.privateBilling = {
      honorNote: false,  // Kann auf true gesetzt werden für Honorarnoten
      reimbursementAmount: payload.wahlarztData.refundAmount || 0,
      patientAmount: payload.wahlarztData.patientAmount || performance.totalPrice
    };
  }
  ```
- **Unterschied zur normalen Wahlarzt-Rechnung**:
  - Honorarnote: Formular für Erstattungsantrag
  - Normale Rechnung: Direkte Abrechnung mit Patient
- **Verwendung**: Wird typischerweise verwendet, wenn der Patient die Rechnung selbst bezahlt und dann bei der Versicherung einreicht

**Preisberechnung**:
```javascript
// Wahlarzt-Preis (Netto oder Brutto)
const wahlarztPrice = serviceCatalog.wahlarzt.price; // in Euro
const priceType = serviceCatalog.wahlarzt.priceType; // 'netto' oder 'brutto'
const taxRate = serviceCatalog.taxRate || 20; // Standard: 20%

// Umrechnung zu Brutto (grossAmount ist immer Brutto)
const bruttoPrice = getPriceByType(
  { price: wahlarztPrice, priceType },
  taxRate,
  'brutto'
);

// Erstattungsbetrag (80% des Kassentarifs)
const kassenarztPrice = serviceCatalog.ogk.khoPrice;
const reimbursementRate = serviceCatalog.wahlarzt.reimbursementRate || 0.80;
const reimbursement = kassenarztPrice * reimbursementRate;

// Selbstbehalt (10%, max. 28,50€)
const copay = calculateCopay(service, patient, bruttoPrice, 'wahlarzt');

// Patient zahlt: bruttoPrice - reimbursement + copay
// Versicherung erstattet: reimbursement
```

**WAHonline-Übermittlung**:
```javascript
// XML-Generierung (WAHonline-Format)
const xml = wahonlineFormatGenerator.generateMeldung({
  performance,
  patient,
  doctor
});

// Übermittlung via ELDA-Webservice (SIT)
await wahonlineConnector.sendViaELDAWebservice(payload, idempotencyKey);

// Oder via REST API (Production)
await wahonlineConnector.sendViaRESTAPI(formattedPayload);
```

### 3. Privat-Abrechnung

**Zweck**: Direkte Abrechnung mit dem Patienten (ohne Versicherung)

**Prozess**:
```
1. Rechnung erstellen (billingType: 'privat')
2. Services auswählen
3. Preis = ServiceCatalog.private.price (in Euro)
4. Umsatzsteuer = 20% (Standard)
5. Patient zahlt vollständig
6. Keine Versicherungs-Erstattung
```

**Preisberechnung**:
```javascript
// Privat-Preis (Netto oder Brutto)
const privatPrice = serviceCatalog.private.price; // in Euro
const priceType = serviceCatalog.private.priceType; // 'netto' oder 'brutto'
const taxRate = serviceCatalog.taxRate || 20; // Standard: 20%

// Umrechnung zu Brutto
const bruttoPrice = getPriceByType(
  { price: privatPrice, priceType },
  taxRate,
  'brutto'
);

// Patient zahlt: bruttoPrice (vollständig)
// Keine Erstattung
```

---

## Integration mit Versicherungsträgern

### 1. ELDA (Elektronischer Datenaustausch)

**Zweck**: Elektronische Übertragung von Abrechnungsdaten

**Methoden**:
- **FTPS** (aktuell): Datei-Upload via FTPS
- **Webservice** (ab 02.02.2026): REST API

**Umgebungen**:
- **SIT** (Systemintegrationstest): Test-Umgebung
- **Test**: Test-Umgebung
- **Production**: Produktiv-Umgebung

**Konfiguration**:
```javascript
// elda.config.js
{
  environment: 'sit' | 'test' | 'production',
  defaultMethod: 'ftps' | 'webservice',
  ftps: {
    host: String,
    port: Number,
    enabled: Boolean
  },
  webservice: {
    baseUrl: String,
    enabled: Boolean
  },
  credentials: {
    username: String,
    password: String
  },
  certificates: {
    certPath: String,
    keyPath: String
  }
}
```

**Prozess**:
```
1. Rechnung erstellen
2. ELDA-Format generieren (XML)
3. Validierung
4. Übertragung (FTPS oder Webservice)
5. Response verarbeiten
6. Status aktualisieren
```

### 2. WAHonline

**Zweck**: Elektronische Meldung von Wahlarzt-Leistungen

**Methoden**:
- **ELDA-Webservice** (SIT): Über ELDA-SIT-Plattform
- **REST API** (Production): Direkte API-Anbindung

**Konfiguration**:
```javascript
// wahonline.config.js
{
  environment: 'sit' | 'production',
  sit: {
    seriennummer: String,
    passwort: String
  },
  api: {
    baseUrl: String,
    enabled: Boolean,
    apiKey: String
  },
  chamberNumber: String,
  doctorNumber: String
}
```

**Prozess**:
```
1. Rechnung erstellen (billingType: 'wahlarzt')
2. WAHonline-Meldung generieren (XML)
3. Übermittlung via ELDA-Webservice (SIT) oder REST API
4. Response verarbeiten
5. Status aktualisieren
```

### 3. ÖGK (Österreichische Gesundheitskasse)

**Zweck**: Kassenarzt-Abrechnung

**Formate**:
- **ELA** (Einzelleistungsauszug): XML-Format für einzelne Rechnungen
- **Turnusabrechnung**: XML-Format für Quartalsabrechnung

**Prozess**:
```
1. Rechnungen sammeln (Quartal)
2. ÖGK-XML generieren (ogk-xml-generator.js)
3. XML-Export
4. Manuelle Übertragung oder automatische Übermittlung
```

---

## Prozessabläufe

### Prozess 1: Kassenarzt-Rechnung erstellen

```
1. Frontend: Billing.tsx öffnen
2. Patient auswählen
3. Services hinzufügen:
   - Service aus ServiceCatalog auswählen
   - Automatische Preisberechnung (KHO-Preis)
   - KHO-Code wird automatisch übernommen
4. Begründungsfelder (falls erforderlich):
   - Textfeld, Uhrzeit, Diagnose, Dringlichkeit
5. Beträge prüfen:
   - subtotal = Summe aller Services
   - taxRate = 0% (Kassenarzt)
   - taxAmount = 0
   - totalAmount = subtotal
6. Rechnung speichern
7. Backend:
   - Invoice-Dokument erstellen
   - Conflict-Detection (falls aktiviert)
   - Begründungspflicht-Prüfung (falls aktiviert)
   - Journal-Eintrag erstellen
8. Optional: ÖGK-XML exportieren
9. Optional: ELDA-Übertragung
```

### Prozess 2: Wahlarzt-Rechnung erstellen

```
1. Frontend: Billing.tsx öffnen
2. Patient auswählen
3. Services hinzufügen:
   - Service aus ServiceCatalog auswählen
   - Automatische Preisberechnung (Wahlarzt-Preis)
   - Netto/Brutto-Umrechnung
4. Erstattungsbetrag anzeigen:
   - 80% des Kassentarifs (Standard)
   - Oder Zusatzversicherungs-Rate
5. Begründungsfelder (falls erforderlich)
6. Beträge prüfen:
   - subtotal = Summe aller Services (Brutto)
   - taxRate = 20% (Standard)
   - taxAmount = subtotal * 0.20
   - totalAmount = subtotal + taxAmount
   - Erstattung = kassenarztPrice * 0.80
   - Patient zahlt: totalAmount - Erstattung + Selbstbehalt
7. Rechnung speichern
8. Backend:
   - Invoice-Dokument erstellen
   - Automatische Erstattung erstellen (Reimbursement)
   - WAHonline-Meldung generieren
   - Übermittlung via ELDA-Webservice (SIT) oder REST API
9. Status aktualisieren
```

### Prozess 3: Tarif-Import

```
1. Frontend: TariffManagement.tsx öffnen
2. ÖGK-Tarif-Download:
   - ÖGK-URL aufrufen
   - Tarif-Datei herunterladen (PDF/XML)
   - Parsing (falls XML)
3. Oder CSV/XML-Import:
   - Datei hochladen
   - Format validieren
4. Backend:
   - Datei parsen
   - Tarife extrahieren
   - Duplikatsprüfung (Code + Typ)
   - Speicherung in Tariff-Collection
5. Optional: Verknüpfung mit ServiceCatalog
```

### Prozess 4: Service-Code-Mapping

```
1. Frontend: ServiceCodeMappingManagement.tsx öffnen
2. Mapping erstellen:
   - Basis-Code auswählen (ServiceCatalog)
   - Versicherungsträger auswählen
   - Provider-Code eingeben
   - Optional: Provider-Preis eingeben
3. Oder automatisch aus ServiceCatalog:
   - Service auswählen
   - "Mapping aus ServiceCatalog erstellen"
   - Automatische Erstellung für alle Versicherungsträger
4. Backend:
   - ServiceCodeMapping-Dokument erstellen
   - Validierung
   - Speicherung
```

---

## Technische Details

### Preisberechnung

**Alle Preise sind in Euro** (keine Cent-Konvertierung mehr nötig)

**Netto/Brutto-Umrechnung**:
```javascript
// Netto zu Brutto
function calculateBruttoFromNetto(nettoPrice, taxRate) {
  if (!taxRate || taxRate === 0) return nettoPrice;
  return nettoPrice * (1 + taxRate / 100);
}

// Brutto zu Netto
function calculateNettoFromBrutto(bruttoPrice, taxRate) {
  if (!taxRate || taxRate === 0) return bruttoPrice;
  return bruttoPrice / (1 + taxRate / 100);
}
```

**Preisbestimmung**:
```javascript
// 1. ServiceCatalog-Eintrag laden
const serviceCatalog = await ServiceCatalog.findOne({ code: serviceCode });

// 2. Preis basierend auf billingType
let price = 0;
if (billingType === 'kassenarzt') {
  price = serviceCatalog.ogk.khoPrice; // in Euro
} else if (billingType === 'wahlarzt') {
  price = serviceCatalog.wahlarzt.price; // in Euro
  // Netto/Brutto-Umrechnung
  price = getPriceByType(
    { price, priceType: serviceCatalog.wahlarzt.priceType },
    taxRate,
    'brutto'
  );
} else if (billingType === 'privat') {
  price = serviceCatalog.private.price; // in Euro
  // Netto/Brutto-Umrechnung
  price = getPriceByType(
    { price, priceType: serviceCatalog.private.priceType },
    taxRate,
    'brutto'
  );
}
```

### Umsatzsteuer-Berechnung

**Automatische Bestimmung**:
```javascript
// 1. Prüfe ServiceCatalog.taxRate (explizit)
if (serviceCatalog.taxRate !== null && serviceCatalog.taxRate !== undefined) {
  return serviceCatalog.taxRate;
}

// 2. Standard-Logik
// Kassenarzt: 0% (medizinische Leistungen)
// Wahlarzt/Privat: 20% (Standard-USt)
return billingType === 'kassenarzt' ? 0 : 20;
```

**Berechnung**:
```javascript
// taxAmount = subtotal * taxRate / 100
// totalAmount = subtotal + taxAmount
```

### Selbstbehalt-Berechnung

**Versicherungsträger-spezifisch**:
```javascript
// ÖGK, BVAEB, KFA, PVA: 0% (kein Selbstbehalt)
// SVS: 20% (max. 343€)
// Wahlarzt: 10% (max. 28,50€)
```

**Berechnung**:
```javascript
function calculateCopay(service, patient, grossAmount, billingType) {
  // 1. Prüfe Patient-Befreiung
  if (patient.exemptFromCopay) return 0;
  
  // 2. Service-spezifischer Selbstbehalt
  if (service.copay?.applicable) {
    if (service.copay.exempt) return 0;
    if (service.copay.percentage > 0) {
      return Math.min(
        grossAmount * (service.copay.percentage / 100),
        service.copay.maxAmount || Infinity
      );
    }
    if (service.copay.amount) {
      return service.copay.amount;
    }
  }
  
  // 3. Versicherungsspezifische Regel
  const copayRule = getInsuranceCopayRule(patient.insuranceProvider, billingType);
  if (!copayRule.applicable) return 0;
  
  return Math.min(grossAmount * copayRule.rate, copayRule.max);
}
```

### Erstattungsberechnung (Wahlarzt)

**Standard-Erstattung**:
```javascript
// 80% des Kassentarifs
const kassenarztPrice = serviceCatalog.ogk.khoPrice;
const reimbursementRate = serviceCatalog.wahlarzt.reimbursementRate || 0.80;
const reimbursement = kassenarztPrice * reimbursementRate;
```

**Zusatzversicherung**:
```javascript
// Wenn Patient Zusatzversicherung hat:
if (patient.additionalInsurances.privateDoctorInsurance) {
  const privateIns = patient.additionalInsurances.privateDoctorInsurance;
  reimbursementRate = privateIns.reimbursementRate / 100;
  
  // Prüfe Selbstbehalt der Zusatzversicherung
  if (privateIns.deductible > 0) {
    copay = Math.max(copay, privateIns.deductible);
  }
  
  // Prüfe jährliches Maximum
  if (privateIns.maxReimbursementPerYear) {
    reimbursement = Math.min(reimbursement, privateIns.maxReimbursementPerYear);
  }
}
```

### Code-Mapping

**Zweck**: Konvertierung zwischen internen Codes und Versicherungsträger-Codes

**Beispiel**:
```
Interner Code: "ORD1" (Ordination)
ÖGK-Code: "111"
SVS-Code: "ORD"
BVAEB-Code: "KONSULT"
```

**Prozess**:
```javascript
// 1. ServiceCodeMapping finden
const mapping = await ServiceCodeMapping.findOne({
  baseCode: 'ORD1',
  'mappings.insuranceProvider': 'oegk',
  'mappings.isActive': true
});

// 2. Provider-Code extrahieren
const providerCode = mapping.mappings.find(m => m.insuranceProvider === 'oegk').code;

// 3. Service konvertieren
service.serviceCode = providerCode; // "111" statt "ORD1"
```

---

## API-Endpunkte

### Billing

**POST /api/billing/invoices**
- Rechnung erstellen
- Body: `{ patient, billingType, services, ... }`
- Response: `{ success: true, data: invoice }`

**GET /api/billing/invoices**
- Alle Rechnungen abrufen
- Query: `?status=paid&billingType=wahlarzt&startDate=...&endDate=...`
- Response: `{ success: true, data: invoices[], pagination: {...} }`

**PUT /api/billing/invoices/:id**
- Rechnung bearbeiten
- Body: `{ services, ... }`
- Response: `{ success: true, data: invoice }`

**DELETE /api/billing/invoices/:id**
- Rechnung löschen
- Response: `{ success: true }`

**POST /api/billing/calculate**
- Berechnung testen
- Body: `{ patientId, serviceCode, billingType }`
- Response: `{ success: true, data: { grossAmount, copay, ... } }`

**POST /api/billing/invoices/:id/pdf**
- PDF generieren
- Response: PDF-Datei

**POST /api/billing/invoices/:id/send-email**
- E-Mail versenden
- Response: `{ success: true }`

**POST /api/billing/export-ogk-xml**
- ÖGK-XML exportieren
- Body: `{ invoiceIds, billingPeriod? }`
- Response: XML-Datei

### WAHonline

**POST /api/wahonline/send**
- WAHonline-Meldung senden
- Body: `{ performanceId?, payload?, autoFormat? }`
- Response: `{ success: true, data: { wahonlineRef, status, ... } }`

**POST /api/wahonline/test-connection**
- Verbindung testen
- Body: `{ environment? }`
- Response: `{ success: true, data: { ... } }`

### Tariffs

**GET /api/tariffs**
- Alle Tarife abrufen
- Query: `?tariffType=kho&specialty=allgemeinmedizin&insuranceProvider=oegk`
- Response: `{ success: true, data: tariffs[] }`

**POST /api/tariffs/import**
- Tarif-Import
- Body: `{ format: 'csv'|'xml', data: ... }`
- Response: `{ success: true, data: { imported: 100, errors: [] } }`

**GET /api/tariffs/goae**
- GOÄ-Tarife abrufen
- Query: `?section=A&specialty=allgemeinmedizin`
- Response: `{ success: true, data: tariffs[] }`

**GET /api/tariffs/kho**
- KHO-Tarife abrufen
- Query: `?insuranceProvider=oegk&federalState=oberoesterreich`
- Response: `{ success: true, data: tariffs[] }`

### Service Code Mapping

**GET /api/service-code-mapping**
- Alle Mappings abrufen
- Response: `{ success: true, data: mappings[] }`

**POST /api/service-code-mapping**
- Mapping erstellen
- Body: `{ baseCode, mappings: [{ insuranceProvider, code, ... }] }`
- Response: `{ success: true, data: mapping }`

**PUT /api/service-code-mapping/:id**
- Mapping bearbeiten
- Body: `{ mappings: [...] }`
- Response: `{ success: true, data: mapping }`

**POST /api/service-code-mapping/create-from-service-catalog/:baseCode**
- Mapping automatisch aus ServiceCatalog erstellen
- Response: `{ success: true, data: mapping }`

---

## Datenfluss-Diagramme

### Rechnungserstellung (Kassenarzt)

```
[Frontend: Billing.tsx]
    ↓
1. Patient auswählen
    ↓
2. Services hinzufügen (aus ServiceCatalog)
    ↓
3. Preise automatisch berechnen (KHO-Preis)
    ↓
4. Begründungsfelder (falls erforderlich)
    ↓
5. POST /api/billing/invoices
    ↓
[Backend: billing.js]
    ↓
6. TaxRate berechnen (0% für Kassenarzt)
    ↓
7. Preise validieren (ServiceCatalog)
    ↓
8. Conflict-Detection (falls aktiviert)
    ↓
9. Begründungspflicht-Prüfung (falls aktiviert)
    ↓
10. Invoice-Dokument erstellen
    ↓
11. Speichern in MongoDB
    ↓
12. Journal-Eintrag erstellen
    ↓
13. Response an Frontend
    ↓
[Frontend]
    ↓
14. Rechnung anzeigen
    ↓
15. Optional: ÖGK-XML exportieren
    ↓
16. Optional: ELDA-Übertragung
```

### Rechnungserstellung (Wahlarzt)

```
[Frontend: Billing.tsx]
    ↓
1. Patient auswählen
    ↓
2. Services hinzufügen (aus ServiceCatalog)
    ↓
3. Preise automatisch berechnen (Wahlarzt-Preis)
    ↓
4. Erstattungsbetrag anzeigen (80% des Kassentarifs)
    ↓
5. Begründungsfelder (falls erforderlich)
    ↓
6. POST /api/billing/invoices
    ↓
[Backend: billing.js]
    ↓
7. TaxRate berechnen (20% für Wahlarzt)
    ↓
8. Netto/Brutto-Umrechnung
    ↓
9. Erstattungsbetrag berechnen
    ↓
10. Selbstbehalt berechnen (10%, max. 28,50€)
    ↓
11. Invoice-Dokument erstellen
    ↓
12. Automatische Erstattung erstellen (Reimbursement)
    ↓
13. WAHonline-Meldung generieren
    ↓
14. Übermittlung via ELDA-Webservice (SIT) oder REST API
    ↓
15. Response an Frontend
    ↓
[Frontend]
    ↓
16. Rechnung anzeigen
    ↓
17. WAHonline-Status anzeigen
```

### Tarif-Import

```
[Frontend: TariffManagement.tsx]
    ↓
1. ÖGK-Tarif-Download oder CSV/XML-Import
    ↓
2. POST /api/tariffs/import
    ↓
[Backend: tariffs.js]
    ↓
3. Datei parsen (CSV/XML)
    ↓
4. Tarife extrahieren
    ↓
5. Duplikatsprüfung (Code + Typ)
    ↓
6. Validierung
    ↓
7. Speicherung in Tariff-Collection
    ↓
8. Response an Frontend
    ↓
[Frontend]
    ↓
9. Tarife anzeigen
    ↓
10. Optional: Verknüpfung mit ServiceCatalog
```

---

## Honorarnoten (Honor Notes)

### Überblick

Honorarnoten sind spezielle Rechnungsarten für Wahlarzt-Leistungen, bei denen der Patient die Rechnung selbst bezahlt und dann bei der Versicherung zur Erstattung einreicht.

### Implementierung

#### Datenmodell

**Invoice.privateBilling**:
```javascript
{
  honorNote: Boolean,              // true = Honorarnote, false = normale Rechnung
  wahlarztCode: String,             // Wahlarzt-Code (optional)
  reimbursementAmount: Number,      // Erstattungsbetrag (in Euro)
  patientAmount: Number             // Patient zahlt (in Euro)
}
```

#### Verwendung

**1. Honorarnote erstellen**:
```javascript
// Frontend: Billing.tsx
// Beim Rechnung erstellen:
const invoiceData = {
  billingType: 'wahlarzt',
  privateBilling: {
    honorNote: true,  // Honorarnote aktivieren
    reimbursementAmount: calculatedRefund,
    patientAmount: totalAmount - calculatedRefund
  },
  // ... weitere Felder
};
```

**2. Backend-Verarbeitung**:
```javascript
// billingService.js
if (route === 'PATIENT+KASSE_REFUND' && payload.wahlarztData) {
  invoiceData.privateBilling = {
    honorNote: payload.honorNote || false,
    reimbursementAmount: payload.wahlarztData.refundAmount || 0,
    patientAmount: payload.wahlarztData.patientAmount || performance.totalPrice
  };
}
```

**3. Erstattungsberechnung**:
```javascript
// Automatische Berechnung des Erstattungsbetrags
const kassenarztPrice = serviceCatalog.ogk.khoPrice;  // Kassenarzt-Preis
const reimbursementRate = serviceCatalog.wahlarzt.reimbursementRate || 0.80;  // 80%
const reimbursementAmount = kassenarztPrice * reimbursementRate;

// Patient zahlt: Wahlarzt-Preis - Erstattung
const patientAmount = wahlarztPrice - reimbursementAmount;
```

### Unterschiede zur normalen Wahlarzt-Rechnung

| Aspekt | Normale Wahlarzt-Rechnung | Honorarnote |
|--------|---------------------------|-------------|
| **Zahlung** | Patient zahlt direkt | Patient zahlt vollständig |
| **Erstattung** | Automatisch über WAHonline | Patient reicht bei Versicherung ein |
| **WAHonline** | Automatische Meldung | Optional (manuell) |
| **Rechnungsart** | `privateBilling.honorNote = false` | `privateBilling.honorNote = true` |
| **Verwendung** | Direkte Abrechnung | Erstattungsantrag |

### Prozessablauf

**Honorarnote erstellen**:
```
1. Frontend: Billing.tsx öffnen
2. Patient auswählen
3. Services hinzufügen (wahlarzt-fähig)
4. "Honorarnote" aktivieren (Checkbox)
5. Erstattungsbetrag wird automatisch berechnet:
   - Erstattung = Kassenarzt-Preis * 80%
   - Patient zahlt = Wahlarzt-Preis - Erstattung
6. Rechnung speichern
7. PDF generieren (für Versicherung)
8. Patient reicht bei Versicherung ein
```

**Normale Wahlarzt-Rechnung**:
```
1. Frontend: Billing.tsx öffnen
2. Patient auswählen
3. Services hinzufügen (wahlarzt-fähig)
4. "Honorarnote" NICHT aktivieren
5. WAHonline-Meldung wird automatisch generiert
6. Übermittlung via ELDA-Webservice oder REST API
7. Automatische Erstattung
```

### Frontend-Implementierung

**Billing.tsx - Honorarnote-Checkbox**:
```typescript
// State
const [isHonorNote, setIsHonorNote] = useState(false);

// UI
<FormControlLabel
  control={
    <Checkbox
      checked={isHonorNote}
      onChange={(e) => setIsHonorNote(e.target.checked)}
    />
  }
  label="Honorarnote (Patient reicht bei Versicherung ein)"
/>

// Beim Speichern
const invoiceData = {
  billingType: 'wahlarzt',
  privateBilling: {
    honorNote: isHonorNote,
    reimbursementAmount: calculatedRefund,
    patientAmount: totalAmount - calculatedRefund
  },
  // ...
};
```

### PDF-Generierung für Honorarnoten

**Spezielle Formatierung**:
- Hinweis: "Honorarnote - Zur Einreichung bei Versicherung"
- Erstattungsbetrag deutlich hervorgehoben
- Anleitung für Patient (wie bei Versicherung einreichen)

---

## Wichtige Konzepte

### 1. Preiseinheit
**ALLE Preise sind in Euro** (keine Cent-Konvertierung mehr nötig)
- `ServiceCatalog.ogk.khoPrice`: Euro
- `ServiceCatalog.wahlarzt.price`: Euro
- `ServiceCatalog.private.price`: Euro
- `Invoice.services[].unitPrice`: Euro
- `Invoice.totalAmount`: Euro

### 2. Netto vs. Brutto
- **Netto**: Preis ohne Umsatzsteuer
- **Brutto**: Preis mit Umsatzsteuer
- `priceType` in ServiceCatalog bestimmt, ob Preis Netto oder Brutto ist
- `grossAmount` (totalAmount) ist immer Brutto

### 3. Bundesland-spezifische Tarife
- KHO-Tarife können bundesland-spezifisch sein
- `federalState` in ServiceCatalog.ogk und Tariff.kho
- Automatische Filterung basierend auf Standort des Arztes

### 4. Versicherungsträger-spezifische Tarife
- KHO-Tarife können versicherungsträger-spezifisch sein
- `insuranceProvider` in ServiceCatalog.ogk und Tariff.kho
- Automatische Auswahl basierend auf Patient-Versicherung

### 5. Code-Mapping
- Interne Service-Codes werden zu Versicherungsträger-Codes konvertiert
- ServiceCodeMapping verwaltet diese Zuordnung
- Automatische Anwendung beim Rechnung erstellen

### 6. Conflict-Detection
- Verhindert, dass konfliktierende Services gleichzeitig abgerechnet werden
- Konfigurierbar in ServiceCatalog.ogk.conflictRules
- Optional: Überschreibung mit Begründung

### 7. Begründungspflicht
- Erfordert Begründung für bestimmte Services
- Konfigurierbar in ServiceCatalog.ogk.justificationRules
- Dynamische Felder im Frontend

---

## Validierung

### Service-Validierung

**Beim Rechnung erstellen**:
```javascript
// 1. ServiceCode muss vorhanden sein
if (!service.serviceCode) {
  throw new Error('Service-Code fehlt');
}

// 2. ServiceCatalog-Eintrag muss existieren
const serviceCatalog = await ServiceCatalog.findOne({ code: service.serviceCode });
if (!serviceCatalog) {
  throw new Error(`Service ${service.serviceCode} nicht gefunden`);
}

// 3. billingType muss kompatibel sein
if (billingType === 'kassenarzt' && 
    serviceCatalog.billingType !== 'kassenarzt' && 
    serviceCatalog.billingType !== 'both') {
  throw new Error(`Service ${service.serviceCode} ist nicht als Kassenarzt abrechenbar`);
}

// 4. Conflict-Detection
if (serviceCatalog.ogk?.conflictRules?.conflictsWith) {
  // Prüfe andere Services in der Rechnung
  const conflicts = checkConflicts(service, otherServices);
  if (conflicts.length > 0 && !serviceCatalog.ogk.conflictRules.allowOverride) {
    throw new Error(`Konflikt mit Services: ${conflicts.join(', ')}`);
  }
}

// 5. Begründungspflicht
if (serviceCatalog.ogk?.justificationRules?.requiresJustification) {
  const justification = validateJustification(service, serviceCatalog.ogk.justificationRules);
  if (!justification.valid) {
    throw new Error(`Begründung erforderlich: ${justification.errors.join(', ')}`);
  }
}
```

### Preis-Validierung

```javascript
// 1. Preis muss vorhanden sein
if (!price || price <= 0) {
  throw new Error('Preis muss größer als 0 sein');
}

// 2. Preis muss in Euro sein (nicht in Cent)
// Alle Preise sind bereits in Euro!

// 3. Netto/Brutto-Konsistenz prüfen
if (priceType === 'brutto' && taxRate === 0) {
  // Warnung: Brutto-Preis ohne USt macht keinen Sinn
  console.warn('Brutto-Preis ohne Umsatzsteuer');
}
```

---

## Fehlerbehandlung

### Häufige Fehler

1. **Service nicht gefunden**
   - Fehler: `Service ${code} nicht gefunden`
   - Lösung: Service in ServiceCatalog anlegen

2. **Preis fehlt**
   - Fehler: `Preis für Service ${code} nicht gefunden`
   - Lösung: Preis in ServiceCatalog konfigurieren

3. **Konflikt erkannt**
   - Fehler: `Konflikt mit Services: HB1, TELE`
   - Lösung: Begründung angeben (wenn allowOverride = true)

4. **Begründung fehlt**
   - Fehler: `Begründung erforderlich: Textfeld fehlt`
   - Lösung: Begründungsfelder ausfüllen

5. **Ungültiger billingType**
   - Fehler: `Service ist nicht als ${billingType} abrechenbar`
   - Lösung: billingType in ServiceCatalog anpassen

---

## Best Practices

### 1. ServiceCatalog-Pflege
- Immer KHO-Code eintragen für Kassenarzt-Services
- Bundesland und Versicherungsträger korrekt setzen
- Preise in Euro eintragen (nicht in Cent)
- Netto/Brutto korrekt markieren

### 2. Rechnungserstellung
- Immer Patient-Versicherung prüfen
- Automatische Preisberechnung nutzen
- Begründungsfelder ausfüllen (falls erforderlich)
- Conflict-Detection beachten

### 3. Tarif-Import
- Regelmäßig ÖGK-Tarife aktualisieren
- Duplikate vermeiden
- Gültigkeitszeiträume prüfen

### 4. Code-Mapping
- Mappings für alle Versicherungsträger anlegen
- Regelmäßig auf Aktualität prüfen
- Automatische Erstellung aus ServiceCatalog nutzen

---

## Zusammenfassung

Das System unterstützt eine vollständige Tarifverwaltung und Rechnungsstellung für:
- **Kassenärzte**: KHO-Tarife, ÖGK-XML-Export, ELDA-Übertragung
- **Wahlärzte**: WAHonline-Meldung, Erstattungsberechnung, ELDA-Webservice
- **Privatärzte**: Direkte Abrechnung, Netto/Brutto-Preise

**Kernfunktionen**:
- Zentrale ServiceCatalog-Verwaltung
- Automatische Preisberechnung
- Conflict-Detection
- Begründungspflicht
- Code-Mapping
- Bundesland- und Versicherungsträger-spezifische Tarife
- Elektronische Übertragung (ELDA, WAHonline)

**Technologie-Stack**:
- Frontend: React, TypeScript, Material-UI
- Backend: Node.js, Express.js, MongoDB/Mongoose
- Integration: ELDA, WAHonline, ÖGK

---

## Anhang: Code-Beispiele

### Rechnung erstellen (Backend)

```javascript
// POST /api/billing/invoices
router.post('/invoices', auth, async (req, res) => {
  // 1. Validierung
  const { patient, billingType, services } = req.body;
  
  // 2. TaxRate berechnen
  const taxRate = await calculateTaxRate(services, billingType);
  
  // 3. Preise berechnen
  const calculatedServices = [];
  for (const service of services) {
    const serviceCatalog = await ServiceCatalog.findOne({ code: service.serviceCode });
    
    let unitPrice = 0;
    if (billingType === 'kassenarzt') {
      unitPrice = serviceCatalog.ogk.khoPrice;
    } else if (billingType === 'wahlarzt') {
      unitPrice = getPriceByType(
        { price: serviceCatalog.wahlarzt.price, priceType: serviceCatalog.wahlarzt.priceType },
        taxRate,
        'brutto'
      );
    }
    
    calculatedServices.push({
      ...service,
      unitPrice,
      totalPrice: unitPrice * service.quantity
    });
  }
  
  // 4. Gesamtbeträge
  const subtotal = calculatedServices.reduce((sum, s) => sum + s.totalPrice, 0);
  const taxAmount = subtotal * taxRate / 100;
  const totalAmount = subtotal + taxAmount;
  
  // 5. Invoice erstellen
  const invoice = new Invoice({
    invoiceNumber: auto-generiert,
    patient: { id: patient.id, ... },
    billingType,
    services: calculatedServices,
    subtotal,
    taxRate,
    taxAmount,
    totalAmount,
    status: 'draft'
  });
  
  await invoice.save();
  
  res.json({ success: true, data: invoice });
});
```

### WAHonline-Übermittlung

```javascript
// POST /api/wahonline/send
router.post('/send', auth, async (req, res) => {
  const { performanceId, payload } = req.body;
  
  // 1. Daten laden
  const performance = await Performance.findById(performanceId);
  const patient = await PatientExtended.findById(performance.patientId);
  const doctor = await User.findById(performance.doctorId);
  
  // 2. WAHonline-Meldung generieren
  const meldungPayload = {
    performance,
    patient,
    doctor
  };
  
  // 3. Übermittlung
  const result = await wahonlineConnector.send(meldungPayload, idempotencyKey);
  
  res.json({ success: true, data: result });
});
```

---

**Ende der Dokumentation**

Diese Dokumentation kann an Gemini oder ChatGPT weitergegeben werden, um die Implementierung zu überprüfen oder Verbesserungsvorschläge zu erhalten.
