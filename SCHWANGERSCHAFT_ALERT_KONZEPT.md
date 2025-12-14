# Konzept: Erweiterte Schwangerschafts-Alert-Implementierung

## Anforderungen

1. **Schwangerschaftsdauer**: Normalerweise 40 Wochen (maximal 42 Wochen)
2. **Automatische Berechnung**: System soll beim nächsten Besuch prüfen, ob Patientin noch schwanger sein kann
3. **Alert nach 40 Wochen**: Wenn Patientin nach errechneter 40. Schwangerschaftswoche kommt, soll Alert erscheinen
4. **Altersgrenze**: Bei Patientinnen ab 50 Jahren soll kein Alert mehr kommen

## Datenstruktur

### Vorhandene Felder:
- `isPregnant`: boolean (aktueller Status)
- `pregnancyWeek`: number (1-42, aktuelle Schwangerschaftswoche)
- `pregnancyDueDate`: Date (optional, erwartetes Entbindungsdatum)
- `dateOfBirth`: Date (für Altersberechnung)

### Benötigte Informationen:
- **Erfassungsdatum der Schwangerschaft**: Aus MedicalDataHistory ermitteln, wann `pregnancyWeek` zuerst erfasst wurde
- **Aktuelles Datum**: Heute, um Zeitdifferenz zu berechnen

## Berechnungslogik

### Szenario 1: Patientin ist aktuell schwanger (`isPregnant === true`)

1. **Altersprüfung**:
   ```javascript
   const patientAge = calculateAge(patient.dateOfBirth);
   if (patientAge >= 50) return false; // Kein Alert
   ```

2. **Berechnung der erwarteten Entbindung**:
   - **Option A**: Wenn `pregnancyDueDate` vorhanden:
     - Erwartetes Entbindungsdatum = `pregnancyDueDate`
   - **Option B**: Wenn `pregnancyDueDate` nicht vorhanden:
     - Finde in MedicalDataHistory das Datum, an dem `pregnancyWeek` zuerst erfasst wurde
     - Berechne: `erwartetesEntbindungsdatum = erfassungsdatum + (40 - erfassteSchwangerschaftswoche) Wochen`
     - Oder: `erwartetesEntbindungsdatum = heute - (aktuelleSchwangerschaftswoche - 40) Wochen`

3. **Alert-Bedingungen**:
   - **Alert Typ 1**: Aktuelle `pregnancyWeek` >= 40
     - Meldung: "Patientin ist in der 40. Schwangerschaftswoche oder darüber. Bitte Status prüfen."
   - **Alert Typ 2**: Erwartetes Entbindungsdatum ist überschritten (heute > erwartetesEntbindungsdatum)
     - Meldung: "Erwartetes Entbindungsdatum ist überschritten. Bitte Status prüfen."
   - **Alert Typ 3**: Aktuelle `pregnancyWeek` > 42 (unrealistisch)
     - Meldung: "Schwangerschaftswoche übersteigt 42 Wochen. Bitte Status prüfen."

### Szenario 2: Patientin war schwanger (`isPregnant === false` aber `pregnancyWeek` vorhanden)

1. **Altersprüfung**: Wie oben
2. **Berechnung**: Finde in MedicalDataHistory das Datum, an dem `pregnancyWeek` zuletzt erfasst wurde
3. **Alert-Bedingung**: 
   - Wenn seit Erfassung mehr als 40 Wochen vergangen sind
   - Meldung: "Patientin war zuvor schwanger. Bitte aktuellen Status prüfen."

## Implementierungsplan

### 1. Neue Funktion: `calculatePregnancyAlert()`

```typescript
interface PregnancyAlertInfo {
  shouldShow: boolean;
  alertType: 'overdue' | 'week40' | 'week42' | 'previous' | null;
  message: string;
  expectedDueDate?: Date;
  currentWeek?: number;
  weeksSinceRecorded?: number;
}

const calculatePregnancyAlert = (
  patient: Patient,
  medicalDataHistory: MedicalDataHistoryEntry[]
): PregnancyAlertInfo => {
  // 1. Altersprüfung
  // 2. Prüfung ob Patientin weiblich
  // 3. Berechnung basierend auf isPregnant Status
  // 4. Rückgabe der Alert-Informationen
}
```

### 2. Erweiterte MedicalDataHistory-Auswertung

- Finde den ersten Eintrag mit `isPregnant === true` und `pregnancyWeek`
- Finde den letzten Eintrag mit `pregnancyWeek`
- Berechne Zeitdifferenz zwischen Erfassung und heute

### 3. Alert-Komponenten

- **Alert für aktuelle Schwangerschaft** (wenn `isPregnant === true`):
  - Zeige aktuelle Schwangerschaftswoche
  - Zeige erwartetes Entbindungsdatum (falls berechenbar)
  - Warnung wenn >= 40 Wochen
  - Warnung wenn Entbindungsdatum überschritten

- **Alert für frühere Schwangerschaft** (wenn `isPregnant === false`):
  - Zeige, dass Patientin zuvor schwanger war
  - Zeige, wann Schwangerschaft erfasst wurde
  - Warnung wenn > 40 Wochen seit Erfassung

### 4. UI-Anpassungen

- Verschiedene Alert-Typen mit unterschiedlichen Severity-Levels:
  - `warning`: Wenn >= 40 Wochen oder Entbindungsdatum überschritten
  - `info`: Wenn frühere Schwangerschaft erkannt
- Button "Status prüfen" navigiert zu Medizinischen Daten (Tab 2)

## Beispiel-Berechnungen

### Beispiel 1: Aktuell schwanger, Woche 38
- Erfasst: Vor 38 Wochen
- Erwartetes Entbindungsdatum: In 2 Wochen
- Alert: Nein (noch nicht 40 Wochen)

### Beispiel 2: Aktuell schwanger, Woche 41
- Erfasst: Vor 41 Wochen
- Erwartetes Entbindungsdatum: Vor 1 Woche
- Alert: Ja (Typ: "week40" oder "overdue")

### Beispiel 3: Nicht mehr schwanger, aber pregnancyWeek vorhanden
- Letzte Erfassung: Vor 45 Wochen mit Woche 35
- Alert: Ja (Typ: "previous", da > 40 Wochen seit Erfassung)

## Technische Details

### Abhängigkeiten:
- `date-fns` für Datumsberechnungen
- MedicalDataHistory API für historische Daten
- Patientendaten für aktuelle Werte

### Performance:
- MedicalDataHistory wird einmal beim Laden des Patienten geladen
- Berechnung erfolgt clientseitig
- Caching der Berechnungsergebnisse möglich

## Offene Fragen / Annahmen

1. **Berechnung ohne Erfassungsdatum**: 
   - Wenn kein Erfassungsdatum in MedicalDataHistory gefunden wird, verwende `pregnancyDueDate` oder berechne rückwärts von heute
   
2. **Update der Schwangerschaftswoche**:
   - Wenn `pregnancyWeek` aktualisiert wird, wird ein neuer MedicalDataHistory-Eintrag erstellt
   - System nutzt immer den neuesten Wert

3. **Mehrfache Schwangerschaften**:
   - System prüft nur die aktuelle/letzte Schwangerschaft
   - Historische Schwangerschaften werden nicht separat verfolgt

