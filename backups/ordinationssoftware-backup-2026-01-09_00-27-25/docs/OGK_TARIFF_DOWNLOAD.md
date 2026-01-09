# ÖGK-Tarifdatenbank Download - Dokumentation

## Übersicht

Die Ordinationssoftware unterstützt den automatischen Download und Import von Tarifdatenbanken der Österreichischen Gesundheitskasse (ÖGK). Dies umfasst:

- **EBM** (Einheitlicher Bewertungsmaßstab) - Tarife für Kassenärzte
- **KHO** (Kassenhonorarordnung) - Tarife für Kassenärzte
- **GOÄ** (Gebührenordnung für Ärzte) - Tarife für Wahlärzte

## ÖGK-Website und Zugriff

### Offizielle ÖGK-Website
- **Hauptseite**: https://www.gesundheitskasse.at/
- **Tarifsystem**: https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.784932
- **TASY-Export**: https://www.gesundheitskasse.at/cdscontent/?contentid=10007.850240&portal=oegkdgportal

### Wichtige Hinweise

1. **Update-Häufigkeit**: 
   - Die ÖGK aktualisiert die Tarifdatenbanken **regelmäßig** (meist **monatlich** oder bei Tarifänderungen)
   - Die neueste Version (Stand 2024) ist gültig ab 01.07.2023
   - **Empfehlung**: Mindestens **monatlich** auf Updates prüfen
   - **Automatische Updates**: Das System prüft automatisch monatlich (am 1. des Monats) und wöchentlich (montags) auf Updates

2. **Zugriff**: Für den Download der Tarifdatenbanken ist möglicherweise ein Benutzerkonto auf der ÖGK-Website erforderlich.

3. **Format**: Die ÖGK stellt Tarifdaten im TASY-Export-Format (XML) bereit. CSV-Exporte können verfügbar sein, müssen aber auf der ÖGK-Website geprüft werden.

## Konfiguration

### Umgebungsvariablen

Erstellen Sie eine `.env`-Datei im Backend-Verzeichnis oder setzen Sie die folgenden Umgebungsvariablen:

```env
# ÖGK-Tarifdatenbank URLs
# EBM (Einheitlicher Bewertungsmaßstab)
OGK_EBM_XML_URL=https://www.gesundheitskasse.at/cdscontent/load?contentid=10007.850240&portal=oegkdgportal
OGK_EBM_CSV_URL=https://www.gesundheitskasse.at/cdscontent/load?contentid=10007.850240&portal=oegkdgportal&format=csv

# KHO (Kassenhonorarordnung)
OGK_KHO_XML_URL=https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.784932&version=1704786268
OGK_KHO_CSV_URL=https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.784932&version=1704786268&format=csv

# GOÄ (Gebührenordnung für Ärzte)
# Hinweis: GOÄ-Tarife werden möglicherweise separat bereitgestellt
OGK_GOAE_XML_URL=https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.1234569&version=1
OGK_GOAE_CSV_URL=https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.1234569&version=1&format=csv

# Cache-Verzeichnis (optional)
OGK_TARIFF_CACHE_DIR=./cache/tariffs
```

### URL-Ermittlung

Die exakten `contentid`-Parameter können sich ändern. So finden Sie die aktuellen URLs:

1. Besuchen Sie https://www.gesundheitskasse.at/
2. Navigieren Sie zum Bereich "Tarifsystem" oder "Dienstgeber"
3. Suchen Sie nach "Tarifdatenbank", "EBM", "KHO" oder "TASY-Export"
4. Kopieren Sie die Download-URLs aus dem Browser
5. Aktualisieren Sie die Umgebungsvariablen entsprechend

## API-Endpunkte

### Download

#### EBM-Tarifdatenbank herunterladen
```http
POST /api/ogk-tariff-download/ebm
Content-Type: application/json

{
  "format": "csv"  // oder "xml"
}
```

#### KHO-Tarifdatenbank herunterladen
```http
POST /api/ogk-tariff-download/kho
Content-Type: application/json

{
  "format": "csv"  // oder "xml"
}
```

#### GOÄ-Tarifdatenbank herunterladen
```http
POST /api/ogk-tariff-download/goae
Content-Type: application/json

{
  "format": "csv"  // oder "xml"
}
```

#### Alle Tarifdatenbanken herunterladen
```http
POST /api/ogk-tariff-download/all
Content-Type: application/json

{
  "format": "csv"  // oder "xml"
}
```

### Download und Import

#### EBM herunterladen und importieren
```http
POST /api/ogk-tariff-download/ebm/import
Content-Type: application/json

{
  "format": "csv"  // oder "xml"
}
```

#### Alle Tarifdatenbanken herunterladen und importieren
```http
POST /api/ogk-tariff-download/all/import
Content-Type: application/json

{
  "format": "csv"  // oder "xml"
}
```

### Update-Prüfung

#### Auf Updates prüfen
```http
GET /api/ogk-tariff-download/check-updates
```

## Verwendung

### Manueller Download

1. **Über API**: Verwenden Sie die oben genannten API-Endpunkte
2. **Über Frontend**: (Wird in zukünftiger Version verfügbar sein)

### Automatischer Download

Ein automatischer Download kann über einen Cron-Job eingerichtet werden:

```javascript
// Beispiel: Täglich um 2:00 Uhr prüfen und herunterladen
cron.schedule('0 2 * * *', async () => {
  const result = await ogkTariffDownloader.checkForUpdates();
  if (result.hasUpdate) {
    await ogkTariffDownloader.downloadAndImportAll(userId, 'csv');
  }
});
```

## Dateiformate

### TASY-Export (XML)

Die ÖGK stellt Tarifdaten im TASY-Export-Format bereit. Die XML-Struktur muss möglicherweise an das tatsächliche Format angepasst werden.

### CSV

CSV-Exporte sind möglicherweise verfügbar, müssen aber auf der ÖGK-Website geprüft werden.

## Troubleshooting

### Fehler: "Download fehlgeschlagen"

1. **URLs prüfen**: Stellen Sie sicher, dass die URLs in den Umgebungsvariablen korrekt sind
2. **Zugriff prüfen**: Möglicherweise ist ein Login auf der ÖGK-Website erforderlich
3. **Format prüfen**: Überprüfen Sie, ob das gewählte Format (CSV/XML) verfügbar ist

### Fehler: "XML-Parsing fehlgeschlagen"

1. **Struktur prüfen**: Die XML-Struktur der ÖGK kann sich geändert haben
2. **Parser anpassen**: Die `parseEBMXML`-Funktion muss möglicherweise an die tatsächliche Struktur angepasst werden

### Fehler: "Import fehlgeschlagen"

1. **Datenformat prüfen**: Stellen Sie sicher, dass die heruntergeladene Datei das erwartete Format hat
2. **Logs prüfen**: Überprüfen Sie die Server-Logs für detaillierte Fehlermeldungen

## Wichtige Links

- **ÖGK-Hauptseite**: https://www.gesundheitskasse.at/
- **Tarifsystem**: https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.784932
- **TASY-Export**: https://www.gesundheitskasse.at/cdscontent/?contentid=10007.850240&portal=oegkdgportal

## Support

Bei Fragen oder Problemen:
1. Prüfen Sie die ÖGK-Website auf aktuelle Informationen
2. Kontaktieren Sie den ÖGK-Kundenservice
3. Überprüfen Sie die Server-Logs für detaillierte Fehlermeldungen

## Aktualisierungen

Die ÖGK aktualisiert die Tarifdatenbanken regelmäßig. Es wird empfohlen:
- Regelmäßig auf Updates zu prüfen (z.B. monatlich)
- Die neuesten Versionen zu verwenden
- Die ÖGK-Website regelmäßig zu besuchen

**Letzte Aktualisierung**: 2024
**Aktuelle Tarifversion**: Gültig ab 01.07.2023

