# Testanleitung: Billing-Features

## Übersicht

Diese Anleitung beschreibt, wie Sie die beiden neuen Features testen können:
1. **Begründungspflicht-Felder in Rechnungserstellung**
2. **Service-Code-Mapping-Verwaltung**

---

## 1. Begründungspflicht-Felder testen

### Vorbereitung

1. **ServiceCatalog konfigurieren:**
   - Öffnen Sie `/service-catalog` im Frontend
   - Wählen Sie einen Service aus oder erstellen Sie einen neuen
   - Gehen Sie zum Tab "ÖGK-Abrechnung"
   - Scrollen Sie zu "Begründungspflicht-Regeln"
   - Aktivieren Sie "Begründungspflicht aktivieren"
   - Wählen Sie die gewünschten Felder:
     - ✅ Textfeld (Begründung)
     - ✅ Uhrzeit
     - ✅ Dringlichkeit
     - ✅ Diagnose
   - Optional: Setzen Sie Mindest-/Maximallänge für Textfeld
   - Speichern Sie den Service

### Testschritte

1. **Rechnung erstellen:**
   - Öffnen Sie `/billing`
   - Klicken Sie auf "Neue Rechnung"
   - Wählen Sie einen Patient aus
   - Gehen Sie zum Tab "Leistungen"

2. **Service mit Begründungspflicht hinzufügen:**
   - Geben Sie den Service-Code ein (der konfigurierte Service)
   - **Erwartetes Verhalten:**
     - Nach Eingabe des Codes wird automatisch der ServiceCatalog geladen
     - Wenn `justificationRules.requiresJustification: true` ist, erscheint unter der Service-Zeile ein erweitertes Feld
     - Das Feld zeigt "Begründung erforderlich" als Überschrift

3. **Begründungsfelder testen:**
   - **Textfeld:**
     - Wenn `justificationFields.text: true` → Textfeld sollte erscheinen
     - Testen Sie Mindestlänge: Geben Sie weniger Zeichen ein als `minLength` → Fehler sollte angezeigt werden
   - **Uhrzeit:**
     - Wenn `justificationFields.time: true` → Uhrzeit-Feld sollte erscheinen
     - Wählen Sie eine Uhrzeit aus
   - **Dringlichkeit:**
     - Wenn `justificationFields.urgency: true` → Dropdown sollte erscheinen
     - Wählen Sie eine Dringlichkeitsstufe (Niedrig, Mittel, Hoch, Dringend)
   - **Diagnose:**
     - Wenn `justificationFields.diagnosis: true` → Info-Alert sollte erscheinen
     - Hinweis: Diagnose muss in der Rechnung hinzugefügt werden

4. **Validierung testen:**
   - Versuchen Sie, die Rechnung ohne ausgefüllte Begründung zu speichern
   - **Erwartetes Verhalten:**
     - Fehler sollte angezeigt werden (wenn `required: true`)
     - Textfeld sollte rot markiert sein

5. **Speichern testen:**
   - Füllen Sie alle erforderlichen Felder aus
   - Speichern Sie die Rechnung
   - **Erwartetes Verhalten:**
     - Rechnung wird erfolgreich gespeichert
     - Begründungsfelder werden in der Datenbank gespeichert

6. **Rechnung bearbeiten:**
   - Öffnen Sie die gespeicherte Rechnung
   - **Erwartetes Verhalten:**
     - Begründungsfelder sollten mit den gespeicherten Werten angezeigt werden

---

## 2. Service-Code-Mapping-Verwaltung testen

### Vorbereitung

1. **Backend starten:**
   ```bash
   cd backend
   npm start
   ```

2. **Frontend starten:**
   ```bash
   cd frontend
   npm start
   ```

### Testschritte

#### 2.1 Mapping-Verwaltungsseite öffnen

1. Navigieren Sie zu `/service-code-mapping` im Browser
2. **Erwartetes Verhalten:**
   - Seite sollte geladen werden
   - Tabelle sollte angezeigt werden (auch wenn leer)
   - Button "Neues Mapping" sollte sichtbar sein

#### 2.2 Neues Mapping erstellen

1. Klicken Sie auf "Neues Mapping"
2. **Dialog öffnet sich:**
   - Felder: Basis-Code, Basis-Name, Fachrichtung, Kategorie
   - Button "Mapping hinzufügen"

3. **Basis-Informationen eingeben:**
   - Basis-Code: z.B. `EKG`
   - Basis-Name: z.B. `Elektrokardiogramm`
   - Fachrichtung: z.B. `kardiologie` (optional)
   - Kategorie: z.B. `diagnostik` (optional)

4. **Versicherungsträger-Mapping hinzufügen:**
   - Klicken Sie auf "Mapping hinzufügen"
   - **Neues Mapping-Feld erscheint:**
     - Versicherungsträger (Dropdown): ÖGK, BVAEB, SVS, KFA, PVA, VAEB, AUVA
     - Provider-Code: z.B. `15` für ÖGK
     - Provider-Name: z.B. `EKG` (optional)
     - Preis: z.B. `12.50` (optional)
     - Gültig ab: Datum (optional)
     - Gültig bis: Datum (optional)

5. **Mehrere Mappings hinzufügen:**
   - Fügen Sie weitere Mappings für andere Versicherungsträger hinzu
   - Beispiel:
     - ÖGK: Code `15`, Preis `12.50`
     - SVS: Code `12`, Preis `13.00`
     - BVAEB: Code `EKG-001`, Preis `12.00`

6. **Speichern:**
   - Klicken Sie auf "Speichern"
   - **Erwartetes Verhalten:**
     - Erfolgsmeldung: "Mapping erfolgreich erstellt"
     - Dialog schließt sich
     - Tabelle wird aktualisiert
     - Neues Mapping sollte in der Tabelle erscheinen

#### 2.3 Mapping anzeigen

1. **Tabelle prüfen:**
   - Mapping sollte mit Basis-Code und Basis-Name angezeigt werden
   - Alle Versicherungsträger-Mappings sollten als separate Zeilen erscheinen
   - Status-Chips sollten angezeigt werden (Aktiv/Inaktiv)

#### 2.4 Mapping bearbeiten

1. Klicken Sie auf das Bearbeiten-Icon (Stift) bei einem Mapping
2. **Dialog öffnet sich mit vorhandenen Daten:**
   - Basis-Code ist deaktiviert (kann nicht geändert werden)
   - Alle anderen Felder können bearbeitet werden

3. **Änderungen vornehmen:**
   - Ändern Sie z.B. den Basis-Namen
   - Fügen Sie ein neues Mapping hinzu
   - Entfernen Sie ein Mapping (Löschen-Icon)

4. **Speichern:**
   - Klicken Sie auf "Speichern"
   - **Erwartetes Verhalten:**
     - Erfolgsmeldung: "Mapping erfolgreich aktualisiert"
     - Änderungen sollten in der Tabelle sichtbar sein

#### 2.5 Mapping löschen

1. Klicken Sie auf das Löschen-Icon (Mülleimer) bei einem Mapping
2. **Bestätigungsdialog erscheint:**
   - "Möchten Sie dieses Mapping wirklich löschen?"

3. **Bestätigen:**
   - Klicken Sie auf "OK"
   - **Erwartetes Verhalten:**
     - Erfolgsmeldung: "Mapping erfolgreich gelöscht"
     - Mapping verschwindet aus der Tabelle

#### 2.6 Automatische Erstellung aus ServiceCatalog

1. **ServiceCatalog vorbereiten:**
   - Stellen Sie sicher, dass ein Service mit `ogk.khoCode` oder `ogk.ebmCode` existiert
   - Beispiel: Service mit Code `EKG` und `ogk.khoCode: "15"`

2. **Mapping aus ServiceCatalog erstellen:**
   - In der Mapping-Verwaltung: Klicken Sie auf "Neues Mapping"
   - Geben Sie den Service-Code ein (z.B. `EKG`)
   - **Alternative:** API-Endpunkt direkt testen:
     ```bash
     curl -X POST http://localhost:5001/api/service-code-mapping/create-from-service-catalog/EKG \
       -H "x-auth-token: YOUR_TOKEN"
     ```
   - **Erwartetes Verhalten:**
     - Mapping wird automatisch erstellt
     - Basis-Informationen werden aus ServiceCatalog übernommen
     - Versicherungsträger-Mapping wird basierend auf `ogk.insuranceProvider` erstellt

#### 2.7 Integration in Billing testen

1. **Mapping verwenden:**
   - Erstellen Sie eine Rechnung mit einem Service, für den ein Mapping existiert
   - Wählen Sie einen Patient mit Versicherungsträger (z.B. ÖGK)

2. **Automatische Code-Konvertierung:**
   - Beim Senden an ELDA/WAHonline sollte der Code automatisch konvertiert werden
   - **Prüfen Sie Backend-Logs:**
     - Service-Code sollte in Provider-spezifischen Code konvertiert werden
     - Beispiel: `EKG` → `15` (für ÖGK)

---

## 3. Vollständiger Test-Workflow

### Szenario: Komplette Abrechnung mit Begründung und Mapping

1. **ServiceCatalog konfigurieren:**
   - Service `EKG` erstellen/bearbeiten
   - Begründungspflicht aktivieren (Textfeld + Uhrzeit)
   - ÖGK-Mapping: `khoCode: "15"`, `khoPrice: 12.50`

2. **Code-Mapping erstellen:**
   - Gehen Sie zu `/service-code-mapping`
   - Erstellen Sie Mapping für `EKG`:
     - ÖGK: Code `15`, Preis `12.50`
     - SVS: Code `12`, Preis `13.00`

3. **Rechnung erstellen:**
   - Gehen Sie zu `/billing`
   - Neue Rechnung erstellen
   - Patient mit ÖGK-Versicherung wählen
   - Service `EKG` hinzufügen
   - **Begründungsfelder sollten erscheinen:**
     - Textfeld für Begründung
     - Uhrzeit-Feld
   - Begründung eingeben: "Routine-Untersuchung"
   - Uhrzeit eingeben: z.B. `14:30`
   - Rechnung speichern

4. **Übermittlung testen:**
   - Rechnung an ELDA/WAHonline übermitteln
   - **Prüfen Sie Backend-Logs:**
     - Service-Code sollte konvertiert werden: `EKG` → `15`
     - Begründungsfelder sollten im XML enthalten sein

---

## 4. Fehlerbehandlung testen

### 4.1 Begründungspflicht

1. **Fehlende Begründung:**
   - Service mit Begründungspflicht hinzufügen
   - Begründung leer lassen
   - Speichern versuchen
   - **Erwartetes Verhalten:**
     - Fehlermeldung sollte erscheinen
     - Textfeld sollte rot markiert sein

2. **Zu kurze Begründung:**
   - Begründung eingeben, die kürzer ist als `minLength`
   - **Erwartetes Verhalten:**
     - Fehlermeldung: "Mindestens X Zeichen erforderlich"
     - Textfeld sollte rot markiert sein

### 4.2 Code-Mapping

1. **Doppeltes Mapping:**
   - Versuchen Sie, ein Mapping mit bereits existierendem Basis-Code zu erstellen
   - **Erwartetes Verhalten:**
     - Fehlermeldung: "Mapping für Code X existiert bereits"

2. **Fehlende Pflichtfelder:**
   - Versuchen Sie, Mapping ohne Basis-Code oder Basis-Name zu speichern
   - **Erwartetes Verhalten:**
     - Fehlermeldung: "baseCode und baseName sind erforderlich"

3. **Leeres Mapping:**
   - Versuchen Sie, Mapping ohne Versicherungsträger-Mappings zu speichern
   - **Erwartetes Verhalten:**
     - Fehlermeldung: "Mindestens ein Mapping ist erforderlich"

---

## 5. Browser-Konsole prüfen

Öffnen Sie die Browser-Entwicklertools (F12) und prüfen Sie:

1. **Netzwerk-Tab:**
   - API-Calls sollten erfolgreich sein (Status 200)
   - Request/Response-Daten sollten korrekt sein

2. **Console-Tab:**
   - Keine JavaScript-Fehler
   - Logs für ServiceCatalog-Laden sollten erscheinen

---

## 6. Backend-Logs prüfen

Prüfen Sie die Backend-Logs für:

1. **ServiceCatalog-Laden:**
   ```
   [ServiceCatalog] Service geladen: EKG
   ```

2. **Code-Mapping-Konvertierung:**
   ```
   [ServiceCodeMapping] Code konvertiert: EKG → 15 (oegk)
   ```

3. **Begründungsvalidierung:**
   ```
   [Billing Validation] Begründung geprüft für Service: EKG
   ```

---

## 7. Datenbank prüfen

### MongoDB prüfen:

```javascript
// ServiceCodeMapping prüfen
db.servicecodemappings.find().pretty()

// Invoice mit Begründungsfeldern prüfen
db.invoices.findOne({ "services.justification": { $exists: true } })
```

---

## 8. Häufige Probleme

### Problem: Begründungsfelder erscheinen nicht

**Lösung:**
- Prüfen Sie, ob `justificationRules.requiresJustification: true` im ServiceCatalog gesetzt ist
- Prüfen Sie Browser-Konsole für Fehler beim Laden der ServiceCatalog-Daten
- Prüfen Sie, ob der Service-Code korrekt eingegeben wurde

### Problem: Mapping wird nicht konvertiert

**Lösung:**
- Prüfen Sie, ob Mapping für den Versicherungsträger existiert
- Prüfen Sie, ob `isActive: true` für das Mapping gesetzt ist
- Prüfen Sie Backend-Logs für Fehler bei der Konvertierung

### Problem: API-Fehler beim Laden

**Lösung:**
- Prüfen Sie, ob Backend läuft
- Prüfen Sie, ob Route `/api/service-code-mapping` registriert ist
- Prüfen Sie Authentifizierung (Token vorhanden?)

---

## 9. Test-Checkliste

- [ ] ServiceCatalog: Begründungspflicht konfiguriert
- [ ] Rechnung: Begründungsfelder erscheinen dynamisch
- [ ] Rechnung: Validierung funktioniert (Pflichtfelder)
- [ ] Rechnung: Begründungsfelder werden gespeichert
- [ ] Mapping-Verwaltung: Seite öffnet sich
- [ ] Mapping-Verwaltung: Neues Mapping erstellen
- [ ] Mapping-Verwaltung: Mapping bearbeiten
- [ ] Mapping-Verwaltung: Mapping löschen
- [ ] Mapping-Verwaltung: Mehrere Versicherungsträger
- [ ] Integration: Code-Konvertierung funktioniert
- [ ] Integration: Begründung in XML enthalten

---

## 10. Nächste Schritte

Nach erfolgreichem Test können Sie:
1. Weitere Services mit Begründungspflicht konfigurieren
2. Mappings für alle wichtigen Services erstellen
3. Automatische Erstellung aus ServiceCatalog nutzen
4. In Produktion deployen
