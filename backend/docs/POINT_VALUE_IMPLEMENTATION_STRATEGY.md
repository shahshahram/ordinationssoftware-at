# Implementierungsstrategie: Erweiterte Punktwert-Logik 2024/2025

## 📋 Zusammenfassung

Die österreichische Honorarordnung verwendet ein **3-stufiges Prioritätssystem** für Punktwerte:
1. **Positionsnummer-spezifische Fix-Punktwerte** (höchste Priorität)
2. **BillingGroup/Specialty-basierte Punktwerte** (mittlere Priorität)
3. **Default-Punktwert des Bundeslandes** (Fallback)

## 🎯 Anforderungen

### 1. Positionsnummer-spezifische Punktwerte
- Chirurgische Leistungen (Pos. 83, 97, 110): **0,74 EUR**
- Großflächige Verbände (Pos. 165): **0,83 EUR**
- Injektionen/Infusionen (Pos. 14, 27): **0,49 EUR**

### 2. Fachspezifische Punktwerte (ÖGK OÖ)
| Abrechnungsgruppe | Punktwert (EUR) | Anwendung |
|-------------------|-----------------|-----------|
| Allgemeinmedizin / Fachärzte | 0,53 | Standard-Satz für Sonderleistungen |
| Physiotherapie | 0,22 / 0,21 | Physikalische Therapien |
| EKG | 0,31 | Elektrokardiographische Untersuchungen |
| Röntgen (bei Nicht-Radiologen) | 0,34 | Wenn z.B. Internist/Chirurg selbst röntgt |
| Radiologen (Fachärzte) | **0,0859** | ⚠️ Extrem niedrig, aber Leistungen haben hunderte Punkte |
| Labor (Ordination) | 0,19 | Arzt wertet Blut selbst im Haus aus |
| Labormedizin (Institute) | 0,0778 | Spezialsatz für Großlabore |

### 3. Bundesland-spezifische Default-Werte (2024/2025)
| Bundesland | Code | Default | Labor | Besonderheit |
|------------|------|---------|-------|--------------|
| Oberösterreich | OOE | 0,5300 | 0,1900 | Basis |
| Niederösterreich | NOE | 0,7376 | - | Seit 01.01.2024 deutlich angehoben |
| Wien | W | 0,7370 | 0,2500 | Harmonisiert mit NÖ (neuer Tarif 2024) |
| Kärnten | K | 0,4805 | 0,2300 | Basierend auf Zusatzübereinkommen 2024 |
| Steiermark | ST | 0,5100 | 0,2000 | Schätzwert / Oft Euro-Fixbeträge |
| Salzburg | S | 0,4000 | 0,3980 | Oft degressive Limits |
| Tirol | T | 0,5000 | 0,2500 | Starke Verwendung von Euro-Fixbeträgen |
| Burgenland | B | 0,5200 | 0,2000 | Ähnlich wie NÖ/Wien orientiert |
| Vorarlberg | V | 0,5000 | 0,2500 | Nutzt fast ausschließlich Euro-Beträge |

## 🏗️ Architektur-Entscheidungen

### Config-Struktur (Hybrid-Ansatz)
```json
{
  "pointValues": {
    "oberoesterreich": {
      "code": "OOE",
      "default": 0.5300,
      "labor": {
        "ordination": 0.1900,
        "institute": 0.0778
      },
      "specialty": {
        "radiologie": 0.0859,
        "physiotherapie": 0.2200,
        "ekg": 0.3100,
        "roentgen_non_radiologist": 0.3400
      },
      "positionSpecific": {
        "83": 0.74,
        "97": 0.74,
        "110": 0.74,
        "165": 0.83,
        "14": 0.49,
        "27": 0.49
      }
    }
    // ... weitere Bundesländer
  }
}
```

### Prioritätssystem (getPointValue)
```javascript
function getPointValue(federalState, options = {}) {
  const { positionNumber, specialty, billingGroup, isLabor } = options;
  
  // Stufe 1: Positionsnummer-spezifischer Fix-Punktwert
  if (positionNumber) {
    const posValue = config.pointValues[federalState]?.positionSpecific?.[positionNumber];
    if (posValue) return posValue;
  }
  
  // Stufe 2: BillingGroup/Specialty-basierter Punktwert
  if (isLabor) {
    const labType = specialty === 'labor' ? 'institute' : 'ordination';
    return config.pointValues[federalState]?.labor?.[labType] || config.pointValues[federalState]?.labor?.ordination;
  }
  
  if (specialty === 'radiologie') {
    return config.pointValues[federalState]?.specialty?.radiologie;
  }
  
  if (specialty === 'physiotherapie') {
    return config.pointValues[federalState]?.specialty?.physiotherapie;
  }
  
  // Stufe 3: Default-Punktwert des Bundeslandes
  return config.pointValues[federalState]?.default || 0.53;
}
```

## 📝 Implementierungs-Schritte

### Phase 1: Config-Datei erweitern
- [ ] Erweiterte `federal_state_config.json` mit allen Bundesländern
- [ ] Positionsnummer-Mapping hinzufügen
- [ ] Specialty-Mapping hinzufügen
- [ ] Labor-Unterscheidung (Ordination vs. Institute)

### Phase 2: Utility-Funktion erweitern
- [ ] `federal-state-config.js` erweitern:
  - `getPointValue(federalState, options)` - neue Hauptfunktion
  - `getPointValueForState(federalState)` - Legacy-Support (ruft neue Funktion auf)
  - `getPositionSpecificPointValue(federalState, positionNumber)`
  - `getSpecialtyPointValue(federalState, specialty)`
  - `getLaborPointValue(federalState, isInstitute)`

### Phase 3: Model-Anpassungen
- [ ] `Tariff.js`: `billingGroup` enum erweitern um `'labor'`
- [ ] `ServiceCatalog.js`: `billingGroup` enum erweitern um `'labor'`
- [ ] Prüfen: Wird `khoCode` als Positionsnummer verwendet? (Ja, basierend auf CSV)

### Phase 4: Integration in bestehende Logik
Anpassen in 6 Stellen:
1. **`billing-calculator.js`**: `calculateRefund()`
2. **`billing-validation.js`**: `calculateRefund()`
3. **`invoicePDFService.js`**: `calculateServiceRefund()`
4. **`serviceCatalog.js`**: Service-Transformation
5. **`tariff-importer.js`**: Import-Logik
6. **Neue Funktionen**: Prüfe `service.ogk.khoCode` (Positionsnummer) und `service.specialty`

### Phase 5: Arzt-Specialty-Integration
- [ ] Location-Model: `owner.specialty` bereits vorhanden ✅
- [ ] Logik: Wenn Arzt-Specialty bekannt, verwende für Punktwert-Bestimmung
- [ ] Fallback: Wenn Service-Specialty vorhanden, verwende das

## 🔍 Identifikation von Laborleistungen

### Optionen:
1. **`billingGroup === 'labor'`** (nach Enum-Erweiterung)
2. **`specialty === 'labor'`** (bereits vorhanden)
3. **`khoCode` beginnt mit "LAB" oder ähnlich** (falls vorhanden)
4. **Kombination**: Beide prüfen für maximale Flexibilität

### Empfehlung:
```javascript
const isLabor = service.ogk?.billingGroup === 'labor' || 
                service.specialty === 'labor' ||
                (service.ogk?.khoCode && /^LAB|^L\d+/i.test(service.ogk.khoCode));
```

## ⚠️ Wichtige Hinweise

1. **Radiologen**: Punktwert 0,0859 ist **extrem niedrig**. System muss korrekt erkennen, dass es sich um einen Radiologen handelt, sonst werden Preise viel zu hoch.

2. **Positionsnummern**: Nicht alle Positionsnummern haben spezifische Werte. Nur die genannten (83, 97, 110, 165, 14, 27) haben Abweichungen.

3. **Backward Compatibility**: Alte Rechnungen bleiben unverändert. Nur neue Rechnungen nutzen neue Logik.

4. **Testing**: Umfangreiches Testing erforderlich:
   - Alle 9 Bundesländer
   - Alle Specialty-Typen
   - Positionsnummer-spezifische Tests
   - Labor vs. Nicht-Labor

## 📊 Datenbank-Analyse (vor Implementierung)

### Prüfungen:
```javascript
// 1. Wie viele Laborleistungen existieren?
Tariff.countDocuments({ specialty: 'labor' })
ServiceCatalog.countDocuments({ specialty: 'labor' })

// 2. Welche billingGroups existieren?
Tariff.distinct('kho.billingGroup')
ServiceCatalog.distinct('ogk.billingGroup')

// 3. Welche Positionsnummern haben spezifische Werte?
Tariff.find({ 'kho.khoCode': { $in: ['83', '97', '110', '165', '14', '27'] } })

// 4. Welche Specialties existieren?
Tariff.distinct('specialty')
ServiceCatalog.distinct('specialty')
```

## 🚀 Nächste Schritte

1. **Datenbank-Analyse durchführen** (siehe oben)
2. **Config-Datei erstellen** mit allen Werten
3. **Utility-Funktion implementieren** mit Prioritätssystem
4. **Model-Enums erweitern**
5. **Integration in 6 Stellen**
6. **Testing mit echten Daten**
7. **Dokumentation aktualisieren**
