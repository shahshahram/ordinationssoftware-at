# Checkliste: Hilfe-Dialoge aktualisieren

## ⚠️ WICHTIG: Bei jeder neuen Feature-Implementierung

Wenn neue Features implementiert werden, **MÜSSEN** die Hilfe-Dialoge aktualisiert werden!

---

## Checkliste für neue Features

### 1. ServiceCatalog (Leistungskatalog)
**Datei:** `/frontend/src/pages/ServiceCatalog.tsx`
**Hilfe-Dialog:** Zeile ~3254

- [ ] **Neue Tabs hinzufügen** (wenn nötig)
- [ ] **Übersicht-Tab aktualisieren:**
  - [ ] Neue Features in "Hauptfunktionen" erwähnen
  - [ ] Neue Features in "Tabs im Leistungsformular" erwähnen
  - [ ] "Neue Features" Sektion aktualisieren
- [ ] **Relevante Tabs erweitern:**
  - [ ] Tab "Preis & Abrechnung" (wenn Abrechnungs-Feature)
  - [ ] Tab "Leistung erstellen" (wenn UI-Änderungen)
  - [ ] Neuer Tab erstellen (wenn komplett neues Feature)
- [ ] **Tipps-Tab aktualisieren:**
  - [ ] Best Practices für neues Feature hinzufügen
  - [ ] Warnungen/Hinweise hinzufügen

### 2. Billing (Rechnungen)
**Datei:** `/frontend/src/pages/Billing.tsx`
**Hilfe-Dialog:** Zeile ~2885

- [ ] **Neue Tabs hinzufügen** (wenn nötig)
- [ ] **Übersicht-Tab aktualisieren:**
  - [ ] Neue Features in "Hauptfunktionen" erwähnen
- [ ] **Relevante Tabs erweitern:**
  - [ ] Tab "Rechnung erstellen" (wenn UI-Änderungen)
  - [ ] Neuer Tab erstellen (wenn komplett neues Feature)
- [ ] **Best Practices-Tab aktualisieren:**
  - [ ] Tipps für neues Feature hinzufügen

### 3. ServiceCodeMappingManagement
**Datei:** `/frontend/src/pages/ServiceCodeMappingManagement.tsx`
**Hilfe-Dialog:** Zeile ~550 (nach Dialog)

- [ ] **Hilfe-Dialog vorhanden?** (wenn nicht, erstellen!)
- [ ] **Neue Funktionen dokumentieren:**
  - [ ] Was ist das Feature?
  - [ ] Warum wird es benötigt?
  - [ ] Wie wird es verwendet?
  - [ ] Beispiele hinzufügen
  - [ ] Best Practices hinzufügen

### 4. Mitarbeiterplanung (StaffPlanning)
**Datei:** `/frontend/src/pages/StaffPlanning.tsx`
**Hilfe-Dialog:** Zeile ~1069

- [ ] **Übersicht-Tab:** Zeiterfassung, Urlaubskonto, Offene Anträge, Schnellzugriff (Stundenabrechnung), Benachrichtigungen erwähnen
- [ ] **Dashboard-Tab:** Meine Zeiterfassung, Offene Anträge, Mein Urlaubskonto, Schnellzugriff inkl. Stundenabrechnung
- [ ] **Abwesenheiten & Anträge-Tab:** Antrag stellen (Mitarbeiter), Genehmigung (Admin/Genehmiger), Status & Sichtbarkeit

### 5. Abwesenheiten / Mein Urlaubsantrag (Absences)
**Datei:** `/frontend/src/pages/Absences.tsx`
**Hilfe-Dialog:** Nach dem Haupt-Dialog (Dialog mit GradientDialogTitle)

- [ ] **Übersicht:** Was ist die Seite? (Self-Service vs. Verwaltung), Tabs (Alle, Ausstehend, Genehmigt, Abgelehnt)
- [ ] **Antrag stellen:** Von/Bis-Datum, Grund, nur für sich eintragen
- [ ] **Genehmigung:** Wer darf genehmigen?, Genehmigen/Ablehnen mit Kommentar
- [ ] **Benachrichtigungen:** Bei neuem Antrag an Berechtigte, bei Genehmigung/Ablehnung an Antragsteller

### 6. Stundenabrechnung (Timesheet)
**Datei:** `/frontend/src/pages/Timesheet.tsx`
**Hilfe-Dialog:** Vor dem Snackbar (Dialog mit GradientDialogTitle)

- [ ] **Übersicht:** Was ist die Stundenabrechnung?, Voraussetzung (Personalprofil, Zeiterfassung)
- [ ] **Monat & Tabelle:** Monat wählen, Spalten (Datum, Arbeitszeit, Pause, Ist, Soll, Saldo, Status), Wochenende & Feiertage
- [ ] **Bearbeiten:** Zeiteinträge bearbeiten am Tag (Start/Ende, Typ, Notiz, Löschen, Eintrag hinzufügen), Speichern
- [ ] **Drucken & Export:** Drucken (Querformat, no-print), Export CSV/PDF
- [ ] **Feiertage:** Österreichische Feiertage (Soll = 0, Status-Anzeige), feste und bewegliche Feiertage

### 7. Andere Seiten
**Prüfen:** Gibt es eine Hilfe-Funktion?
- [ ] Hilfe-Dialog vorhanden?
- [ ] Hilfe-Dialog aktualisiert?
- [ ] Wenn kein Hilfe-Dialog: Sollte einer erstellt werden?

---

## Standard-Struktur für neue Features

### Wenn neues Feature in bestehender Seite:

1. **Übersicht-Tab:**
   ```
   - Hauptfunktionen: Neues Feature erwähnen
   - Neue Features Sektion: Feature beschreiben
   ```

2. **Relevanter Tab oder neuer Tab:**
   ```
   - Was ist das Feature?
   - Warum wird es benötigt?
   - Schritt-für-Schritt Anleitung
   - Beispiele
   - Best Practices
   ```

3. **Tipps/Best Practices Tab:**
   ```
   - Tipps für neues Feature
   - Häufige Fehler vermeiden
   ```

### Wenn komplett neue Seite:

1. **Hilfe-Dialog erstellen:**
   - Hilfe-Button in Toolbar hinzufügen
   - Dialog mit Tabs strukturieren
   - Vollständige Dokumentation

---

## Beispiele für Feature-Typen

### Abrechnungs-Features
- ✅ ServiceCatalog: Tab "Preis & Abrechnung" erweitern
- ✅ Billing: Tab "Rechnung erstellen" oder neuer Tab
- ✅ Best Practices: Tipps hinzufügen

### UI-Features
- ✅ ServiceCatalog: Tab "Leistung erstellen" erweitern
- ✅ Billing: Tab "Rechnung erstellen" erweitern
- ✅ Relevante Tabs aktualisieren

### Konfigurations-Features
- ✅ ServiceCatalog: Neuer Tab oder "Preis & Abrechnung" erweitern
- ✅ Eigene Hilfe-Dialoge für Konfigurationsseiten

### Validierungs-Features
- ✅ ServiceCatalog: Tab "Tipps" erweitern
- ✅ Billing: Tab "Best Practices" erweitern
- ✅ Validierungsregeln dokumentieren

---

## Wann aktualisieren?

### ✅ IMMER aktualisieren bei:
- Neuen UI-Elementen
- Neuen Konfigurationsoptionen
- Neuen Validierungen
- Neuen Workflows
- Neuen Features (egal wie klein)
- Änderungen an bestehenden Features

### ⚠️ Besonders wichtig:
- **Begründungspflicht-Felder** → Billing Hilfe erweitern
- **Konflikt-Regeln** → ServiceCatalog Hilfe erweitern
- **Code-Mapping** → Eigene Hilfe-Dialoge
- **Neue Abrechnungsoptionen** → Beide Hilfe-Dialoge
- **HR-Modul (Mitarbeiterplanung, Abwesenheiten, Stundenabrechnung)** → StaffPlanning, Absences, Timesheet Hilfe-Dialoge aktualisieren

---

## Template für neuen Tab

```tsx
{helpTab === X && (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <Box>
      <Typography variant="h6" gutterBottom color="primary">
        Feature-Name
      </Typography>
      <Typography variant="body2" paragraph>
        Kurze Beschreibung des Features.
      </Typography>
    </Box>

    <Box>
      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
        Was ist das Feature?
      </Typography>
      <Typography variant="body2" paragraph>
        Detaillierte Erklärung...
      </Typography>
    </Box>

    <Box>
      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
        Wie verwende ich es?
      </Typography>
      <Box component="ol" sx={{ pl: 3, mb: 2 }}>
        <li>Schritt 1...</li>
        <li>Schritt 2...</li>
      </Box>
    </Box>

    <Box>
      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
        Beispiele
      </Typography>
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          Beispiel-Szenario...
        </Typography>
      </Alert>
    </Box>

    <Box>
      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
        Best Practices
      </Typography>
      <Box component="ul" sx={{ pl: 3, mb: 2 }}>
        <li>✅ Tipp 1</li>
        <li>✅ Tipp 2</li>
      </Box>
    </Box>
  </Box>
)}
```

---

## Erinnerung

**Bei JEDER neuen Feature-Implementierung:**
1. ✅ Hilfe-Dialoge prüfen
2. ✅ Relevante Tabs aktualisieren
3. ✅ Neue Tabs hinzufügen (wenn nötig)
4. ✅ Best Practices aktualisieren
5. ✅ Beispiele hinzufügen

**NICHT vergessen!** Die Hilfe-Dialoge sind wichtig für die Benutzerfreundlichkeit!
