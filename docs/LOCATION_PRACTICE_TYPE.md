# 📍 Location Practice Type: Kassenpraxis vs. Wahlarzt vs. Privat

## 🎯 Warum macht das Sinn?

### Problem ohne Practice Type:
- Bei mehreren Standorten muss manuell der Abrechnungstyp gewählt werden
- Fehleranfällig: Falsche Abrechnung bei falscher Auswahl
- Kompliziert: Jeder Termin/Dokument muss einzeln konfiguriert werden

### Lösung mit Practice Type:
- ✅ **Automatische Abrechnung:** System wählt automatisch den richtigen Weg
- ✅ **Weniger Fehler:** Standort bestimmt Abrechnungsart
- ✅ **Einfacher:** Einmal konfigurieren, überall gültig
- ✅ **Flexibel:** Verschiedene Standorte können verschiedene Typen haben

---

## 🏥 Praxistypen

### 1. **Kassenpraxis** (`kassenpraxis`)
- Ordination hat Kassenvertrag (ÖGK, BVAEB, SVS, etc.)
- Abrechnung direkt über Kasse
- ELGA-Integration aktiviert
- e-Card erforderlich
- OGK-Übermittlung möglich

**Beispiel:**
- Standort: "Hauptpraxis - Kassenarzt"
- Practice Type: `kassenpraxis`
- Alle Termine werden automatisch als Kassenarzt abgerechnet

---

### 2. **Wahlarzt** (`wahlarzt`)
- Ordination ohne Kassenvertrag
- Patient zahlt selbst, kann bei Kasse einreichen
- Erstattungssatz: 80% (standard)
- GOÄ-Tarife

**Beispiel:**
- Standort: "Wahlarzt-Praxis"
- Practice Type: `wahlarzt`
- Alle Termine werden automatisch als Wahlarzt abgerechnet
- Erstattungsberechnung automatisch

---

### 3. **Privat** (`privat`)
- Nur Privatabrechnung
- Keine Kassenabrechnung
- GOÄ oder individuelle Tarife

**Beispiel:**
- Standort: "Privatpraxis"
- Practice Type: `privat`
- Alle Termine werden automatisch als Privat abgerechnet

---

### 4. **Gemischt** (`gemischt`) - Standard
- Ordination kann sowohl Kassen- als auch Wahlarzt/Privat
- Abrechnungstyp wird basierend auf Patient/Service bestimmt
- Flexibelste Option

**Beispiel:**
- Standort: "Hauptpraxis"
- Practice Type: `gemischt`
- System wählt automatisch basierend auf:
  - Patient-Versicherung
  - Service-Konfiguration
  - Manuelle Auswahl

---

## 🔧 Konfiguration

### Location-Model erweitert:

```javascript
{
  name: "Hauptpraxis",
  practiceType: "kassenpraxis", // oder "wahlarzt", "privat", "gemischt"
  billing: {
    defaultBillingType: "kassenarzt", // Optional: Standard-Abrechnung
    kassenarzt: {
      enabled: true,
      ogkContractNumber: "12345",
      autoSubmitOGK: true,
      elgaEnabled: true,
      kimEnabled: true
    },
    wahlarzt: {
      enabled: true,
      defaultReimbursementRate: 0.80,
      autoCalculateReimbursement: true
    },
    privat: {
      enabled: true,
      defaultTariff: "GOÄ"
    }
  }
}
```

---

## 💡 Vorteile für die Abrechnung

### 1. **Automatische Routenwahl**

**Vorher:**
```javascript
// Manuell bei jeder Rechnung
const billingType = userSelection; // Fehleranfällig!
```

**Nachher:**
```javascript
// Automatisch basierend auf Location
const location = await Location.findById(locationId);
const billingType = location.practiceType; // Automatisch!
```

---

### 2. **Vereinfachte Abrechnung**

**Beispiel: Kassenpraxis**
- Patient kommt zur Kassenpraxis
- System erkennt: `practiceType = "kassenpraxis"`
- Automatisch:
  - ✅ e-Card prüfen
  - ✅ ELGA-Verbindung herstellen
  - ✅ EBM-Tarife verwenden
  - ✅ OGK-Übermittlung vorbereiten
  - ✅ Selbstbehalt berechnen

**Beispiel: Wahlarzt**
- Patient kommt zur Wahlarzt-Praxis
- System erkennt: `practiceType = "wahlarzt"`
- Automatisch:
  - ✅ GOÄ-Tarife verwenden
  - ✅ Erstattungssatz berechnen (80%)
  - ✅ Rechnung an Patient
  - ✅ Erstattungsformular generieren

---

### 3. **Weniger Fehler**

**Vorher:**
- ❌ Kassenarzt-Termin wird als Privat abgerechnet
- ❌ Wahlarzt-Termin wird als Kasse abgerechnet
- ❌ Falsche Tarife verwendet

**Nachher:**
- ✅ Standort bestimmt Abrechnung
- ✅ Automatische Validierung
- ✅ Warnung bei Inkompatibilität

---

### 4. **Flexibilität bei mehreren Standorten**

**Beispiel: Ordination mit 2 Standorten**

```
Standort 1: "Hauptpraxis"
- practiceType: "kassenpraxis"
- Alle Termine hier = Kassenabrechnung

Standort 2: "Privatpraxis"
- practiceType: "privat"
- Alle Termine hier = Privatabrechnung
```

**Vorteil:**
- Ein System, verschiedene Abrechnungswege
- Automatische Zuordnung
- Keine manuelle Auswahl nötig

---

## 🔄 Abrechnungslogik

### Automatische Routenwahl:

```javascript
// billingService.js
async determineRoute(doctor, performance, options) {
  // 1. Location-Praxistyp prüfen (höchste Priorität)
  if (options.locationId) {
    const location = await Location.findById(options.locationId);
    if (location.practiceType !== 'gemischt') {
      return mapPracticeTypeToRoute(location.practiceType);
    }
  }
  
  // 2. Fallback: Doctor contractType
  const contractType = doctor.contractType || 'privat';
  return mapContractTypeToRoute(contractType);
}
```

### Priorität:
1. **Location practiceType** (höchste Priorität)
2. **Doctor contractType** (Fallback)
3. **Options** (manuelle Überschreibung)

---

## 📊 Beispiel-Workflow

### Szenario: Patient kommt zur Kassenpraxis

```
1. Termin wird erstellt
   └─ locationId: "kassenpraxis-standort-123"

2. System lädt Location
   └─ practiceType: "kassenpraxis"
   └─ billing.kassenarzt.enabled: true
   └─ billing.kassenarzt.elgaEnabled: true

3. Abrechnung wird erstellt
   └─ Automatisch: billingType = "kassenarzt"
   └─ Automatisch: Route = "KASSE"
   └─ Automatisch: EBM-Tarife verwendet
   └─ Automatisch: ELGA-Verbindung hergestellt
   └─ Automatisch: e-Card geprüft

4. Rechnung wird übermittelt
   └─ OGK-XML generiert
   └─ Automatisch übermittelt (wenn autoSubmitOGK = true)
```

---

## ✅ Checkliste: Implementation

- [x] Location-Model erweitert mit `practiceType`
- [x] Location-Model erweitert mit `billing` Konfiguration
- [x] `billingService.determineRoute()` angepasst
- [ ] Frontend: Location-Formular erweitert
- [ ] Frontend: Practice Type Auswahl
- [ ] Frontend: Billing-Konfiguration UI
- [ ] Validierung: Inkompatible Kombinationen prüfen
- [ ] Migration: Bestehende Locations aktualisieren

---

## 🎯 Fazit

**Ja, es macht absolut Sinn!**

✅ Vereinfacht die Abrechnung erheblich
✅ Reduziert Fehler
✅ Automatisiert Routine-Aufgaben
✅ Flexibel bei mehreren Standorten
✅ Einfach zu konfigurieren

**Empfehlung:** Implementieren! 🚀



