# Jährliches Service-Katalog Update - Erklärung

## Was ist das "Jährliche Service-Katalog Update"?

Das **Jährliche Service-Katalog Update** ist ein automatisches Script, das einmal pro Jahr (am 1. Januar um 2:00 Uhr) ausgeführt wird, um den Leistungskatalog (ServiceCatalog) zu aktualisieren.

### Was macht das Update?

Das Update führt folgende Aufgaben durch:

1. **Neue Leistungen hinzufügen**
   - Fügt neue EBM-Leistungen hinzu, die im neuen Jahr eingeführt wurden
   - Beispiel: Neue Telemedizin-Leistungen, neue Diagnostik-Methoden

2. **Preisanpassungen durchführen**
   - Passt Preise an die Inflation an
   - Führt kategorien-spezifische Preisanpassungen durch
   - Beispiel: Allgemeinmedizin +3.5%, Chirurgie +4.0%

3. **Veraltete Leistungen deaktivieren**
   - Deaktiviert Leistungen, die nicht mehr abrechenbar sind
   - Beispiel: Alte EBM-Codes, die durch neue ersetzt wurden

4. **EBM-Code-Änderungen umsetzen**
   - Aktualisiert Services, deren EBM-Codes geändert wurden
   - Beispiel: `EBM-2024-001` → `EBM-2025-001`

5. **Kategorien automatisch erstellen**
   - Erstellt fehlende Service-Kategorien automatisch

## Was sind "hardcodierte Beispiel-Daten"?

Aktuell enthält das Script **Beispiel-Daten** (keine echten EBM-Daten):

```javascript
// EBM 2025 Updates (Beispiel - sollte aus offizieller Quelle kommen)
const EBM_UPDATES_2025 = {
  // Neue Leistungen (BEISPIELE - nicht echt!)
  newServices: [
    {
      code: 'EBM-2025-001',
      name: 'Telemedizinische Beratung',
      // ... weitere Daten
    }
  ],
  // Preisanpassungen (BEISPIELE)
  priceAdjustments: {
    inflationRate: 0.035, // 3.5% Inflation 2024
    adjustments: [
      { category: 'allgemeinmedizin', multiplier: 1.035 }
    ]
  },
  // Veraltete Leistungen (BEISPIELE)
  deprecatedServices: [
    'EBM-OLD-001'
  ]
};
```

**⚠️ WICHTIG**: Diese Daten sind **nur Beispiele** und müssen durch **echte EBM-Daten** ersetzt werden!

## Was sind "aktuelle EBM-Daten"?

⚠️ **WICHTIGER HINWEIS**: In Österreich gibt es **KEINEN EBM (Einheitlicher Bewertungsmaßstab)** wie in Deutschland!

### Österreichische Begriffe:

In Österreich werden folgende Begriffe verwendet:

1. **KHO (Kassenhonorarordnung)**
   - Das österreichische Äquivalent zum deutschen EBM
   - Enthält die Leistungen und Preise für die Kassenärztliche Versorgung
   - Wird von der ÖGK bereitgestellt

2. **Honorarordnung / Leistungskatalog**
   - Allgemeine Bezeichnung für die Abrechnungsdaten
   - Kann KHO, GOÄ und andere Tarife umfassen

3. **GOÄ (Gebührenordnung für Ärzte)**
   - Für Privatärzte und Wahlärzte
   - Wird möglicherweise nicht direkt von der ÖGK bereitgestellt

### Hinweis zum Code:

Im Code wird teilweise "EBM" als generischer Begriff verwendet, obwohl in Österreich eigentlich **KHO** gemeint ist. Dies ist historisch bedingt und sollte bei zukünftigen Updates korrigiert werden.

### Woher kommen die echten Daten?

1. **ÖGK-Website**:
   - **URL**: https://www.gesundheitskasse.at
   - **Bereich**: "Tarifsystem" oder "Downloads"
   - **Format**: XML oder CSV
   - **Inhalt**: KHO-Leistungen mit Codes, Namen, Preisen

2. **ÖGK-Veröffentlichungen**:
   - Jährliche KHO-Updates
   - Preisänderungen
   - Neue Leistungen
   - Veraltete Leistungen

3. **Ärztekammer-Veröffentlichungen**:
   - Informationen über Änderungen
   - Übersichten über neue Leistungen

## Wie aktualisiere ich die Daten im Script?

### Schritt 1: KHO-Daten von der ÖGK herunterladen

1. Besuchen Sie: https://www.gesundheitskasse.at
2. Navigieren Sie zu "Tarifsystem" oder "Downloads"
3. Laden Sie die aktuelle **KHO-Datenbank** herunter (XML oder CSV)
   - **Suchbegriffe**: "KHO", "Kassenhonorarordnung", "Leistungskatalog", "Honorarordnung"

### Schritt 2: Daten analysieren

Analysieren Sie die heruntergeladene Datei und identifizieren Sie:

- **Neue Leistungen**: Welche neuen KHO-Codes gibt es?
- **Preisänderungen**: Welche Preise haben sich geändert?
- **Veraltete Leistungen**: Welche Codes sind nicht mehr gültig?
- **Code-Änderungen**: Welche Codes wurden umbenannt?

### Schritt 3: Script aktualisieren

Öffnen Sie: `backend/scripts/update-service-catalog-annual.js`

#### 3.1 Neue Leistungen hinzufügen

Ersetzen Sie die Beispiel-Daten in `newServices`:

```javascript
newServices: [
  {
    code: 'KHO-2025-001',           // Echter KHO-Code (nicht EBM!)
    name: 'Telemedizinische Beratung', // Echter Name
    description: 'Videosprechstunde',
    category: 'Telemedizin',
    specialty: 'allgemeinmedizin',
    base_duration_min: 15,
    kassenarzt: { price: 2500 },     // Preis in Cent (25,00 EUR)
    wahlarzt: { price: 5000, reimbursementRate: 0.80 },
    private: { price: 5000 },
    isMedical: true,
    required_role: 'arzt',
    online_bookable: true,
    color_hex: '#10B981'
  },
  // ... weitere neue Leistungen
]
```

#### 3.2 Preisanpassungen aktualisieren

Aktualisieren Sie die Inflationsrate und Multiplikatoren:

```javascript
priceAdjustments: {
  inflationRate: 0.035, // Aktuelle Inflationsrate (z.B. 3.5%)
  adjustments: [
    { category: 'allgemeinmedizin', multiplier: 1.035 }, // +3.5%
    { category: 'chirurgie', multiplier: 1.040 },        // +4.0%
    { category: 'radiologie', multiplier: 1.030 }        // +3.0%
  ]
}
```

#### 3.3 Veraltete Leistungen aktualisieren

Fügen Sie die Codes der veralteten Leistungen hinzu:

```javascript
deprecatedServices: [
  'KHO-OLD-001',  // Echter Code der veralteten Leistung (KHO, nicht EBM!)
  'KHO-OLD-002'   // Weitere veraltete Codes
]
```

#### 3.4 Code-Änderungen aktualisieren

Fügen Sie die Code-Änderungen hinzu:

```javascript
codeChanges: [
  { 
    oldCode: 'KHO-2024-001',      // Alter Code (KHO, nicht EBM!)
    newCode: 'KHO-2025-001',      // Neuer Code (KHO, nicht EBM!)
    reason: 'Code-Struktur geändert' // Grund
  }
]
```

### Schritt 4: Jahr aktualisieren

Ändern Sie den Namen der Konstante und alle Referenzen:

```javascript
// Von:
const EBM_UPDATES_2025 = { ... };  // Hinweis: "EBM" ist historisch, eigentlich KHO

// Zu (für 2026):
const EBM_UPDATES_2026 = { ... };  // Hinweis: "EBM" ist historisch, eigentlich KHO
```

**Hinweis**: Der Name "EBM_UPDATES" ist historisch bedingt. In Österreich sind dies eigentlich **KHO-Updates**. Bei zukünftigen Refactorings sollte dies zu `KHO_UPDATES` umbenannt werden.

Und aktualisieren Sie alle Referenzen im Script.

### Schritt 5: Testen

1. **Testen Sie das Script manuell**:
   ```bash
   cd backend
   node scripts/update-service-catalog-annual.js
   ```

2. **Prüfen Sie die Ergebnisse**:
   - Wurden neue Leistungen hinzugefügt?
   - Wurden Preise korrekt angepasst?
   - Wurden veraltete Leistungen deaktiviert?

3. **Prüfen Sie die Logs**:
   - Gibt es Fehler?
   - Wurden alle Updates korrekt durchgeführt?

## Alternative: Automatisches Update aus Tarifdatenbank

**Besserer Ansatz**: Statt hardcodierte Daten zu verwenden, könnten die Daten automatisch aus der Tarifdatenbank (die monatlich aktualisiert wird) übernommen werden.

### Vorteile:
- ✅ Keine manuelle Aktualisierung nötig
- ✅ Immer aktuelle Daten
- ✅ Weniger Fehler

### Nachteile:
- ⚠️ Erfordert Anpassung des Scripts
- ⚠️ Neue Leistungen müssen trotzdem manuell hinzugefügt werden

## Zusammenfassung

| Aspekt | Aktueller Stand | Was zu tun ist |
|--------|----------------|----------------|
| **Neue Leistungen** | Beispiel-Daten | Durch echte **KHO-Daten** ersetzen (nicht EBM!) |
| **Preisanpassungen** | Beispiel-Werte | Durch echte Inflationsrate ersetzen |
| **Veraltete Leistungen** | Beispiel-Codes | Durch echte veraltete **KHO-Codes** ersetzen |
| **Code-Änderungen** | Beispiel-Änderungen | Durch echte **KHO-Code-Änderungen** ersetzen |
| **Jahr** | 2025 | Jährlich auf neues Jahr aktualisieren |
| **Begriffe** | "EBM" im Code | Bei Refactoring zu "KHO" umbenennen |

⚠️ **WICHTIG**: In Österreich gibt es **KEINEN EBM**. Verwenden Sie **KHO (Kassenhonorarordnung)** Daten!

## Wann muss das Update durchgeführt werden?

- **Jährlich**: Vor dem 1. Januar (damit das automatische Update am 1. Januar die neuen Daten verwendet)
- **Bei Bedarf**: Wenn wichtige Änderungen bekannt werden

## Weitere Informationen

- **Script-Datei**: `backend/scripts/update-service-catalog-annual.js`
- **Automatische Ausführung**: 1. Januar um 2:00 Uhr (siehe `backend/server.js`)
- **Manuelle Ausführung**: Über Update-Monitoring-Seite oder API

