# GOÄ-URL Suche - Schritt-für-Schritt Anleitung

## Was ist GOÄ?

**GOÄ** = **Gebührenordnung für Ärzte**

Die GOÄ ist die Gebührenordnung für Privatärzte und Wahlärzte in Österreich. Sie legt die Preise für ärztliche Leistungen fest, die nicht über die Kassenärztliche Versorgung (EBM/KHO) abgerechnet werden.

## Wo finde ich die GOÄ-Download-URL?

### Schritt 1: ÖGK-Website durchsuchen

1. **Besuchen Sie**: https://www.gesundheitskasse.at

2. **Navigieren Sie zu einem dieser Bereiche**:
   - "Tarifsystem"
   - "Downloads"
   - "Für Ärzte"
   - "Service"
   - "Daten & Downloads"

3. **Verwenden Sie diese Suchbegriffe** (in der Suchfunktion der Website):
   ```
   GOÄ
   Gebührenordnung für Ärzte
   Wahlarzt Tarife
   Privatarzt Gebührenordnung
   GOÄ Katalog
   GOÄ Download
   GOÄ XML
   GOÄ CSV
   ```

4. **Suchen Sie nach**:
   - Download-Links
   - XML-Exporten
   - CSV-Exporten
   - Tarifdatenbanken
   - Links die `cdscontent/load?contentid=` enthalten

### Schritt 2: Alternative Quellen prüfen

Falls die ÖGK keine GOÄ-Datenbank bereitstellt, prüfen Sie:

#### Bundesministerium für Gesundheit (BMG)
- **URL**: https://www.bmg.gv.at
- **Suchbegriffe**: "GOÄ", "Gebührenordnung", "Ärzte Gebühren", "Tarife"

#### Österreichische Ärztekammer
- **URL**: https://www.aerztekammer.at
- **Suchbegriffe**: "GOÄ", "Gebührenordnung", "Tarife", "Downloads"

#### Bundesärztekammer
- **URL**: https://www.bundesaerztekammer.at
- **Suchbegriffe**: "GOÄ", "Gebührenordnung"

### Schritt 3: URL-Format erkennen

Die URL sollte ähnlich aussehen wie:
```
https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.XXXXXX&version=XXXXX
```

Oder:
```
https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.XXXXXX&format=csv
```

**Wichtig**: Die `contentid` ist eine eindeutige Nummer, die von der ÖGK vergeben wird.

### Schritt 4: URL testen

1. **Öffnen Sie die gefundene URL im Browser**
2. **Prüfen Sie**:
   - Wird eine Datei heruntergeladen?
   - Ist es eine XML- oder CSV-Datei?
   - Enthält die Datei GOÄ-Daten (Zahlen, Codes, Preise)?

### Schritt 5: URL in der Konfiguration eintragen

1. **Öffnen Sie**: `backend/.env` (oder erstellen Sie die Datei)
2. **Fügen Sie hinzu**:
   ```env
   OGK_GOAE_XML_URL=https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.XXXXXX&version=XXXXX
   OGK_GOAE_CSV_URL=https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.XXXXXX&version=XXXXX&format=csv
   ```
3. **Ersetzen Sie** `XXXXXX` mit der echten contentid

## Falls keine automatische Quelle gefunden wird

### Option 1: Manueller Import

1. Laden Sie die GOÄ-Daten manuell herunter (falls verfügbar)
2. Verwenden Sie den Import-Endpoint:
   ```bash
   POST /api/tariff-import/goae
   ```
3. Laden Sie die CSV-Datei hoch

### Option 2: GOÄ-Update deaktivieren

Falls keine automatische Quelle verfügbar ist, können Sie das GOÄ-Update in den Cron-Jobs deaktivieren:

1. **Öffnen Sie**: `backend/server.js`
2. **Kommentieren Sie** die GOÄ-bezogenen Zeilen aus (falls vorhanden)
3. **Oder**: Entfernen Sie `GOAE_UPDATE` aus den Update-Actions

### Option 3: Nur EBM und KHO verwenden

Das System funktioniert auch ohne GOÄ-Updates. Die GOÄ-Daten können manuell gepflegt werden.

## Hilfe bei der Suche

Falls Sie die URL nicht finden können:

1. **Kontaktieren Sie die ÖGK**:
   - Telefon: 0800 20 15 15
   - E-Mail: service@gesundheitskasse.at
   - Fragen Sie nach: "Download-URL für GOÄ-Tarifdatenbank"

2. **Kontaktieren Sie die Ärztekammer**:
   - Fragen Sie nach: "Wo finde ich die aktuelle GOÄ-Datenbank zum Download?"

3. **Prüfen Sie die Dokumentation**:
   - ÖGK-Handbücher
   - Ärztekammer-Veröffentlichungen
   - BMG-Veröffentlichungen

## Aktualisierung

Die GOÄ-URLs können sich ändern. Prüfen Sie regelmäßig:
- Mindestens einmal pro Jahr
- Wenn Updates nicht mehr funktionieren
- Wenn Fehler beim Download auftreten

## Notizen

**Aktueller Stand** (Stand: 2025):
- EBM-URL: ✅ Funktioniert (`contentid=10007.850240`)
- KHO-URL: ✅ Funktioniert (`contentid=10008.784932`)
- GOÄ-URL: ❌ Platzhalter (`contentid=10008.1234569`) - **MUSS ERMITTELT WERDEN**

**Hinweis**: Es ist möglich, dass die ÖGK keine GOÄ-Datenbank bereitstellt, da GOÄ primär für Privatärzte/Wahlärzte ist und möglicherweise von anderen Stellen verwaltet wird.

