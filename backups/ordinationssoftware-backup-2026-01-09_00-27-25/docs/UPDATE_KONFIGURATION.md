# Update-Konfiguration

Diese Dokumentation beschreibt, wie die automatischen Updates konfiguriert werden und wo die notwendigen Informationen und Links zu finden sind.

## Übersicht

Das System unterstützt drei Arten von automatischen Updates:

1. **Wöchentliche ServiceCatalog-Preis-Updates** (Montags um 4:00 Uhr)
2. **Monatliche Tarifdatenbank-Updates** (1. des Monats um 5:00 Uhr)
3. **Jährliches Service-Katalog Update** (1. Januar um 2:00 Uhr)

## Konfiguration

### 1. Environment-Variablen

Erstellen Sie eine `.env`-Datei im `backend/`-Verzeichnis basierend auf `update-config.env.example`:

```bash
cp backend/update-config.env.example backend/.env
```

### 2. Honorarordnungen URLs

⚠️ **WICHTIG**: In Österreich gibt es **KEINEN EBM** (Einheitlicher Bewertungsmaßstab) wie in Deutschland! Das österreichische Äquivalent ist **KHO** (Kassenhonorarordnung).

⚠️ **WICHTIG**: Da das Gesundheitswesen in Österreich föderal organisiert ist, gibt es **unterschiedliche Honorarordnungen** je nach Versicherungsträger und möglicherweise nach Bundesland!

#### ÖGK (Österreichische Gesundheitskasse)

**Die wichtigste Quelle - Honorarordnungen sind oft nach Bundesländern getrennt!**

#### KHO (Kassenhonorarordnung) - ⚠️ WICHTIG: Nicht "EBM"!

⚠️ **HINWEIS**: In Österreich gibt es **KEINEN EBM** (Einheitlicher Bewertungsmaßstab) wie in Deutschland!

**KHO** (Kassenhonorarordnung) ist das österreichische Äquivalent zum deutschen EBM.

- **Quelle**: https://www.gesundheitskasse.at/cdscontent/
- **Aktuelle URL**: https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.784932
- **Format**: XML oder CSV
- **Häufigkeit**: Monatlich aktualisiert

**So finden Sie die aktuelle URL:**
1. Besuchen Sie https://www.gesundheitskasse.at
2. Navigieren Sie zu **"Vertragspartner"** oder **"Für Ärzte"** (NICHT "Tarifsystem"!)
3. Suchen Sie nach **"Honorarordnung"**, **"KHO"**, **"Kassenhonorarordnung"**, **"Leistungskatalog"**
4. **Wählen Sie ggf. Ihr Bundesland** (Honorarordnungen können nach Bundesländern getrennt sein)
5. Kopieren Sie die Download-URL

**Hinweis**: 
- Im Code wird teilweise "EBM" verwendet, obwohl in Österreich eigentlich **KHO** gemeint ist. Dies ist historisch bedingt.
- **ÖGK-Honorarordnungen sind oft nach Bundesländern getrennt** - stellen Sie sicher, dass Sie die richtige Version verwenden!

#### BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)

**Bundesweiter Träger mit eigener Honorarordnung**

- **Quelle**: https://www.bvaeb.at oder über Ärztekammer
- **Download**: 
  - Direkt bei BVAEB: "Für Ärzte" oder "Downloads"
  - Oder über die Ärztekammer des jeweiligen Bundeslandes
- **Format**: XML oder CSV
- **Häufigkeit**: Monatlich aktualisiert

**So finden Sie die Honorarordnung:**
1. Besuchen Sie https://www.bvaeb.at
2. Navigieren Sie zu "Für Ärzte" oder "Downloads"
3. Suchen Sie nach "Honorarordnung" oder "Leistungskatalog"
4. Oder kontaktieren Sie die Ärztekammer Ihres Bundeslandes

#### SVS (Sozialversicherung der Selbständigen)

**Bundesweiter Träger mit eigener Honorarordnung**

- **Quelle**: https://www.svs.at oder über Ärztekammer
- **Download**: 
  - Direkt bei SVS: "Für Ärzte" oder "Downloads"
  - Oder über die Ärztekammer des jeweiligen Bundeslandes
- **Format**: XML oder CSV
- **Häufigkeit**: Monatlich aktualisiert
- **Besonderheit**: ⚠️ SVS hat **20% Selbstbehalt** auch bei Kassenarzt-Abrechnung

**So finden Sie die Honorarordnung:**
1. Besuchen Sie https://www.svs.at
2. Navigieren Sie zu "Für Ärzte" oder "Downloads"
3. Suchen Sie nach "Honorarordnung" oder "Leistungskatalog"
4. Oder kontaktieren Sie die Ärztekammer Ihres Bundeslandes

#### KHO (Kassenhonorarordnung)

- **Quelle**: https://www.gesundheitskasse.at/cdscontent/
- **Aktuelle URL**: https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.784932
- **Format**: XML oder CSV
- **Häufigkeit**: Monatlich aktualisiert

**So finden Sie die aktuelle URL:**
1. Besuchen Sie https://www.gesundheitskasse.at
2. Navigieren Sie zu "Tarifsystem"
3. Suchen Sie nach "KHO" oder "Kassenhonorarordnung"
4. Kopieren Sie die Download-URL

#### GOÄ (Gebührenordnung für Ärzte) - Privattarife

- **Quelle**: **Österreichische Ärztekammer (ÖÄK)**
- **Website**: https://www.aerztekammer.at
- **Download**: 
  - Bereich: "Downloads" oder "Für Ärzte"
  - Die ÖÄK veröffentlicht **regelmäßige Honorarempfehlungen** für Privatleistungen
- **Aktuelle URL**: ⚠️ **MUSS ERMITTELT WERDEN** (aktuell Platzhalter)
- **Format**: XML oder CSV
- **Häufigkeit**: Monatlich aktualisiert
- **Hinweis**: Dies sind **Empfehlungen**, keine verbindlichen Tarife

**So finden Sie die Honorarempfehlungen:**

1. **Besuchen Sie**: https://www.aerztekammer.at
2. **Navigieren Sie zu**: "Downloads" oder "Für Ärzte"
3. **Suchen Sie nach**:
   - "GOÄ"
   - "Gebührenordnung für Ärzte"
   - "Wahlarzt Tarife"
   - "Privattarife"
   - "Honorarempfehlungen"
4. Laden Sie die Honorarempfehlungen herunter

⚠️ **WICHTIG**: 
- Die GOÄ-URL in der Standard-Konfiguration ist ein Platzhalter (`contentid=10008.1234569`)
- Diese URL funktioniert NICHT und muss durch die echte URL ersetzt werden
- Die ÖÄK veröffentlicht **Empfehlungen**, keine verbindlichen Tarife
- Falls keine automatische Quelle gefunden wird, können Sie das GOÄ-Update deaktivieren oder manuell importieren

### 3. ServiceCatalog-Updates

Das jährliche Service-Katalog Update verwendet hardcodierte Daten im Script:
- **Datei**: `backend/scripts/update-service-catalog-annual.js`
- **Daten**: `EBM_UPDATES_2025` (Zeilen 21-75) - Hinweis: "EBM" ist historisch, eigentlich KHO

**Diese Daten müssen jährlich aktualisiert werden:**
- Neue Leistungen hinzufügen
- Preisanpassungen aktualisieren
- Veraltete Leistungen markieren
- KHO-Code-Änderungen dokumentieren (nicht EBM!)

**Quellen für Updates:**
- **ÖGK**: Honorarordnungen (KHO) - Bereich "Vertragspartner"
- **BVAEB**: Eigene Honorarordnung
- **SVS**: Eigene Honorarordnung
- **ÖÄK**: Honorarempfehlungen für Privatleistungen (GOÄ)
- **Ärztekammer-Veröffentlichungen**: Informationen über Änderungen

## Automatische Updates

### Zeitpläne

Die Zeitpläne sind in `backend/server.js` definiert:

```javascript
// Wöchentlich: Montags um 4:00 Uhr
cron.schedule('0 4 * * 1', async () => {
  // ServiceCatalog-Preis-Update
});

// Monatlich: 1. des Monats um 5:00 Uhr
cron.schedule('0 5 1 * *', async () => {
  // Tarifdatenbank-Update
});

// Jährlich: 1. Januar um 2:00 Uhr
cron.schedule('0 2 1 1 *', async () => {
  // Jährliches Service-Katalog Update
});
```

### Manuelle Auslösung

Updates können auch manuell ausgelöst werden:

1. **Über die Update-Monitoring-Seite**:
   - Navigieren Sie zu `/update-monitoring`
   - Klicken Sie auf "Jetzt ausführen" bei dem gewünschten Update

2. **Über die API**:
   ```bash
   # Jährliches Update
   POST /api/update-monitoring/trigger/annual
   
   # Wöchentliches Update
   POST /api/update-monitoring/trigger/weekly
   
   # Tarif-Update
   POST /api/update-monitoring/trigger/tariff
   ```

## Überprüfung der Konfiguration

### 1. URLs testen

Sie können die URLs direkt im Browser testen:
- EBM: https://www.gesundheitskasse.at/cdscontent/load?contentid=10007.850240
- KHO: https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.784932
- GOÄ: ⚠️ URL muss ermittelt werden

### 2. Update-Historie prüfen

Führen Sie das Prüf-Skript aus:

```bash
cd backend
node scripts/check-update-history.js
```

### 3. Update-Monitoring-Seite

Überprüfen Sie die Update-Monitoring-Seite:
- Status der Updates
- Letzte Ausführungen
- Nächste geplante Ausführungen
- Update-Protokoll

## Fehlerbehebung

### URLs funktionieren nicht

1. Prüfen Sie, ob die URLs noch gültig sind
2. Besuchen Sie die ÖGK-Website und suchen Sie nach aktuellen URLs
3. Aktualisieren Sie die `.env`-Datei

### Updates laufen nicht automatisch

1. Prüfen Sie, ob der Server läuft
2. Prüfen Sie die Logs: `backend/server.log`
3. Prüfen Sie, ob Cron-Jobs aktiviert sind

### Fehler beim Download

1. Prüfen Sie die Internetverbindung
2. Prüfen Sie, ob die URLs erreichbar sind
3. Prüfen Sie die Logs für detaillierte Fehlermeldungen

## Wartung

### Jährliche Wartung

1. **Service-Katalog Update-Script aktualisieren**:
   - Öffnen Sie `backend/scripts/update-service-catalog-annual.js`
   - Aktualisieren Sie `EBM_UPDATES_2025` mit neuen Daten
   - Testen Sie das Script manuell

2. **URLs überprüfen**:
   - Prüfen Sie alle ÖGK-URLs
   - Aktualisieren Sie die `.env`-Datei bei Bedarf

3. **Dokumentation aktualisieren**:
   - Dokumentieren Sie Änderungen
   - Aktualisieren Sie diese Dokumentation

### Monatliche Wartung

1. Prüfen Sie die Update-Historie
2. Prüfen Sie, ob alle Updates erfolgreich waren
3. Prüfen Sie die Logs auf Fehler

## Weitere Informationen

- **Update-Monitoring**: `/update-monitoring`
- **Update-Protokoll**: `/update-monitoring` → Tab "Update-Protokoll"
- **API-Dokumentation**: Siehe `backend/routes/updateMonitoring.js`
- **Service-Dokumentation**: Siehe `docs/UPDATE_KATALOGE_DOKUMENTATION.md`

