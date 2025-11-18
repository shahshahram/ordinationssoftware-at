# Abrechnungskonzept für Österreichische Ordinationssoftware

## Aktueller Stand

### ✅ Vorhanden:
1. Invoice-Model mit allen Basisdaten (Arzt, Patient, Beträge)
2. Backend API für CRUD-Operationen
3. Frontend UI für Rechnungserstellung
4. Patient hat Versicherungsdaten (insuranceProvider, insuranceNumber)
5. Grundlegende Stati und Typen (kassenarzt/wahlarzt/privat)

### ❌ Fehlt:
1. ServiceCatalog erweitern mit Abrechnungsinformationen
2. Automatische Versicherungsprüfung
3. Selbstbehalt-Berechnung
4. ÖGK-XML-Export
5. Erstattungsverwaltung
6. Spezialisierte Reporting für ÖGK

---

## 1. ServiceCatalog Erweiterung

### Neue Felder:
```javascript
{
  // Abrechnungsinformationen
  billingType: {
    type: String,
    enum: ['kassenarzt', 'wahlarzt', 'privat', 'both'],
    default: 'both'
  },
  
  // ÖGK-Tarife
  ogk: {
    ebmCode: { type: String }, // EBM-Code für Kassenarzt-Abrechnung
    ebmPrice: { type: Number }, // Preis in Cent (für Kassenarzt)
    requiresApproval: { type: Boolean, default: false },
    billingFrequency: { type: String, enum: ['once', 'periodic'], default: 'once' }
  },
  
  // Wahlarzt/Tarife
  wahlarzt: {
    price: { type: Number, required: true }, // Preis in Cent
    reimbursementRate: { type: Number, default: 0.80 }, // 80% von ÖGK erstattbar
    maxReimbursement: { type: Number }, // Max. Erstattung
    requiresPreApproval: { type: Boolean, default: false }
  },
  
  // Privatärztlich
  private: {
    price: { type: Number, required: true }, // Preis in Cent
    noInsurance: { type: Boolean, default: true }
  },
  
  // Selbstbehalt
  copay: {
    applicable: { type: Boolean, default: false },
    amount: { type: Number, default: 0 }, // Festbetrag in Cent
    percentage: { type: Number, default: 0 }, // Prozentsatz (10% oder 20%)
    maxAmount: { type: Number }, // Maximaler Selbstbehalt
    exempt: { type: Boolean, default: false } // Selbstbehalt befreit
  }
}
```

---

## 2. Patientenstatus-Prüfung (Automatisch)

### Workflow:
```
1. Termin erstellen → Patient auswählen
2. Service auswählen → System prüft:
   
   a) Patient hat Versicherung?
      - ÖGK → billingType = 'kassenarzt' möglich
      - PRIVATpatient → billingType = 'wahlarzt' möglich  
      - Keine Versicherung → billingType = 'privat'
   
   b) Service erlaubt diesen billingType?
      - Wenn Nein → Warnung anzeigen
      
3. Preise automatisch laden:
   - Kassenarzt: EBM-Preis
   - Wahlarzt: Privatpreis, Erstattung berechnen
   - Privat: Privatpreis
   
4. Selbstbehalt berechnen:
   - Wenn applicable: copay.amount oder copay.percentage
   - Maximaler Betrag beachten
```

### Implementierung:
```javascript
// routes/billing.js
router.post('/calculate-billing', auth, async (req, res) => {
  const { patientId, serviceCode, billingType } = req.body;
  
  // 1. Patient laden
  const patient = await Patient.findById(patientId);
  
  // 2. Service laden
  const service = await ServiceCatalog.findOne({ code: serviceCode });
  
  // 3. Versicherungsstatus prüfen
  const insuranceCoverage = await checkInsuranceCoverage(patient, service);
  
  // 4. Preis berechnen
  const calculation = calculateBilling(patient, service, billingType, insuranceCoverage);
  
  res.json({ success: true, calculation });
});

function calculateBilling(patient, service, billingType, coverage) {
  let result = {
    billingType,
    grossAmount: 0,
    copay: 0,
    insuranceAmount: 0,
    patientAmount: 0,
    reimbursement: 0,
    warnings: []
  };
  
  switch(billingType) {
    case 'kassenarzt':
      if (!coverage.hasOGK) {
        result.warnings.push('Patient hat keine ÖGK-Versicherung');
      }
      result.grossAmount = service.ogk.ebmPrice;
      result.copay = calculateCopay(service, result.grossAmount);
      result.insuranceAmount = result.grossAmount - result.copay;
      result.patientAmount = result.copay;
      break;
      
    case 'wahlarzt':
      result.grossAmount = service.wahlarzt.price;
      result.copay = calculateCopay(service, result.grossAmount);
      result.reimbursement = result.grossAmount * service.wahlarzt.reimbursementRate;
      result.patientAmount = result.grossAmount - result.reimbursement;
      result.patientAmount += result.copay; // Plus Selbstbehalt
      break;
      
    case 'privat':
      result.grossAmount = service.private.price;
      result.copay = 0;
      result.patientAmount = result.grossAmount;
      break;
  }
  
  return result;
}

function calculateCopay(service, grossAmount) {
  if (!service.copay.applicable || service.copay.exempt) {
    return 0;
  }
  
  if (service.copay.percentage > 0) {
    const percentage = service.copay.percentage / 100;
    let copay = grossAmount * percentage;
    
    if (service.copay.maxAmount && copay > service.copay.maxAmount) {
      copay = service.copay.maxAmount;
    }
    return copay;
  }
  
  if (service.copay.amount) {
    return service.copay.amount;
  }
  
  return 0;
}
```

---

## 3. ÖGK-XML-Export

### Format (ÖGK ELA - Einzelleistungsauszug):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ELA xmlns="http://www.elga.gv.at/ELA">
  <Header>
    <Sender>AID</Sender>
    <SenderSoftware>OrdinationsSoftware</SenderSoftware>
    <Timestamp>2025-01-15T10:30:00</Timestamp>
  </Header>
  <Invoices>
    <Invoice>
      <InvoiceNumber>2025-001234</InvoiceNumber>
      <InvoiceDate>2025-01-15</InvoiceDate>
      <Doctor>
        <Name>Dr. Max Mustermann</Name>
        <ChamberNumber>W1234</ChamberNumber>
        <TaxNumber>ATU12345678</TaxNumber>
      </Doctor>
      <Patient>
        <InsuranceNumber>1234567890123</InsuranceNumber>
        <Name>Max Mustermann</Name>
      </Patient>
      <Services>
        <Service>
          <ServiceDate>2025-01-15</ServiceDate>
          <EBMCode>201</EBMCode>
          <Description>Konsultation</Description>
          <Quantity>1</Quantity>
          <UnitPrice>1500</UnitPrice>
          <TotalPrice>1500</TotalPrice>
        </Service>
      </Services>
      <TotalAmount>1500</TotalAmount>
      <Copay>150</Copay>
    </Invoice>
  </Invoices>
</ELA>
```

### Implementierung:
```javascript
// utils/ogk-xml-generator.js
class OGKXMLGenerator {
  generateELA(invoices) {
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<ELA xmlns="http://www.elga.gv.at/ELA">',
      this.generateHeader(),
      '<Invoices>',
      ...invoices.map(inv => this.generateInvoice(inv)),
      '</Invoices>',
      '</ELA>'
    ].join('\n');
    
    return xml;
  }
  
  generateHeader() {
    return `
    <Header>
      <Sender>AID</Sender>
      <SenderSoftware>OrdinationsSoftware</SenderSoftware>
      <Timestamp>${new Date().toISOString()}</Timestamp>
    </Header>
    `;
  }
  
  generateInvoice(invoice) {
    return `
    <Invoice>
      <InvoiceNumber>${invoice.invoiceNumber}</InvoiceNumber>
      <InvoiceDate>${formatDate(invoice.invoiceDate)}</InvoiceDate>
      <Doctor>
        <Name>${invoice.doctor.name}</Name>
        <ChamberNumber>${invoice.doctor.chamberNumber}</ChamberNumber>
        <TaxNumber>${invoice.doctor.taxNumber}</TaxNumber>
      </Doctor>
      <Patient>
        <InsuranceNumber>${invoice.patient.insuranceNumber}</InsuranceNumber>
        <Name>${invoice.patient.name}</Name>
      </Patient>
      <Services>
        ${invoice.services.map(s => this.generateService(s)).join('')}
      </Services>
      <TotalAmount>${invoice.totalAmount}</TotalAmount>
      <Copay>${invoice.services.reduce((sum, s) => sum + (s.copay || 0), 0)}</Copay>
    </Invoice>
    `;
  }
}
```

---

## 4. Selbstbehalt-Berechnung

### Österreichische Selbstbehalte:
- **10%** (max. 28,50€): Grundversorgung
- **20%** (max. 343,00€): Standardleistungen
- **Festbetrag**: Bestimmte Leistungen

### Implementierung:
```javascript
// utils/copay-calculator.js
const SELBSTBEHALT_RATES = {
  STANDARD: { rate: 0.10, max: 2850 }, // 28,50€ in Cent
  EXTENDED: { rate: 0.20, max: 34300 } // 343,00€ in Cent
};

function calculateCopay(service, patient) {
  // Prüfen ob Patient selbstbehaltbefreit
  if (patient.exemptFromCopay) {
    return 0;
  }
  
  // Service-spezifischer Selbstbehalt
  if (service.copay.applicable) {
    if (service.copay.exempt) {
      return 0;
    }
    
    if (service.copay.percentage) {
      const copay = Math.min(
        service.grossAmount * (service.copay.percentage / 100),
        service.copay.maxAmount || Infinity
      );
      return Math.round(copay);
    }
    
    if (service.copay.amount) {
      return service.copay.amount;
    }
  }
  
  // Standard-Selbstbehalt
  const standardCopay = Math.min(
    service.grossAmount * 0.10,
    SELBSTBEHALT_RATES.STANDARD.max
  );
  
  return Math.round(standardCopay);
}
```

---

## 5. Erstattungsverwaltung

### Workflow für Wahlärzte:
```
1. Rechnung erstellen (wahlarzt)
2. System berechnet:
   - Gesamtpreis (wahlarzt.price)
   - Erstattungsbetrag (80% von ÖGK-Tarif)
   - Patient zahlt Differenz + Selbstbehalt
   
3. Erstattungsformular generieren (PDF):
   - Rechnung an Patient
   - Kostenerstattungsantrag für ÖGK
   
4. Patient zahlt und reicht bei ÖGK ein
5. Status tracken: pending → submitted → approved
```

### Neue Tabelle: Reimbursements
```javascript
{
  invoiceId: ObjectId,
  patientId: ObjectId,
  insuranceProvider: String,
  submittedDate: Date,
  approvalDate: Date,
  reimbursementAmount: Number,
  status: ['pending', 'submitted', 'approved', 'rejected'],
  documents: [PDF] // Uploaded documents
}
```

---

## 6. Reporting

### ÖGK-Turnusabrechnung:
- Alle Kassenarzt-Rechnungen eines Monats zusammenfassen
- Gesamtbeträge und Selbstbehalt summieren
- XML-Datei generieren
- An ÖGK übermitteln

### Privatärztliches Reporting:
- Einnahmen nach Typ (kassenarzt/wahlarzt/privat)
- Selbstbehalt-Übersicht
- Offene Forderungen
- Mahnwesen

### Patienten-Reporting:
- Rechnungsübersicht
- Erstattungsstatus
- Zahlungsstatus

---

## Implementierungsreihenfolge:

1. **ServiceCatalog erweitern** (1-2 Stunden)
2. **Selbstbehalt-Berechnung** (2-3 Stunden)
3. **Automatische Preisberechnung** (3-4 Stunden)
4. **XML-Generator für ÖGK** (4-6 Stunden)
5. **Erstattungsverwaltung** (3-4 Stunden)
6. **Reporting** (4-6 Stunden)

**Gesamt: ~20-30 Entwicklungsstunden**

---

## Zusätzliche Überlegungen:

### Versicherungsprüfung:
- Integration mit ÖGK-API (falls verfügbar)
- Online-Statusabfrage
- Deckungskontrolle

### Compliance:
- DSGVO-konform
- Archivierungspflichten
- Audit-Trail für Abrechnungen

### Security:
- Verschlüsselte Speicherung von Versicherungsdaten
- Zugriffsrechte auf Abrechnungen
- Digitale Signaturen für XML-Dateien







