# Honorarordnungen Download - Schritt-für-Schritt Anleitung

## Übersicht

In Österreich gibt es **unterschiedliche Honorarordnungen** je nach Versicherungsträger und möglicherweise nach Bundesland. Diese Anleitung zeigt, wo Sie die Honorarordnungen für jeden Versicherungsträger finden.

## 1. ÖGK (Österreichische Gesundheitskasse)

### Download-Bereich

- **Website**: https://www.gesundheitskasse.at
- **Bereich**: **"Vertragspartner"** oder **"Für Ärzte"**
- **NICHT**: "Tarifsystem" oder "Downloads" (das ist für andere Zwecke)

### Schritt-für-Schritt

1. **Besuchen Sie**: https://www.gesundheitskasse.at
2. **Navigieren Sie zu**: "Vertragspartner" oder "Für Ärzte"
3. **Suchen Sie nach**:
   - "Honorarordnung"
   - "KHO" (Kassenhonorarordnung)
   - "Leistungskatalog"
   - "Tarife"
4. **Wählen Sie ggf. Ihr Bundesland** (Honorarordnungen können nach Bundesländern getrennt sein)
5. **Laden Sie die Honorarordnung herunter** (XML oder CSV)

### Suchbegriffe

- "Honorarordnung"
- "KHO"
- "Kassenhonorarordnung"
- "Leistungskatalog"
- "Vertragspartner Downloads"
- "Ärzte Downloads"

### Format

- XML oder CSV
- Oft nach Bundesländern getrennt
- Monatlich aktualisiert

## 2. BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)

### Download-Bereich

- **Website**: https://www.bvaeb.at
- **Alternative**: Über die Ärztekammer des jeweiligen Bundeslandes

### Schritt-für-Schritt

1. **Option A - Direkt bei BVAEB**:
   - Besuchen Sie: https://www.bvaeb.at
   - Navigieren Sie zu: "Für Ärzte" oder "Downloads"
   - Suchen Sie nach: "Honorarordnung" oder "Leistungskatalog"
   - Laden Sie die Honorarordnung herunter

2. **Option B - Über Ärztekammer**:
   - Besuchen Sie die Website der Ärztekammer Ihres Bundeslandes
   - Navigieren Sie zu: "Downloads" oder "Für Ärzte"
   - Suchen Sie nach: "BVAEB Honorarordnung"
   - Laden Sie die Honorarordnung herunter

### Kontakt

- **Telefon**: 050 405-0
- **E-Mail**: info@bvaeb.at
- **Website**: https://www.bvaeb.at

## 3. SVS (Sozialversicherung der Selbständigen)

### Download-Bereich

- **Website**: https://www.svs.at
- **Alternative**: Über die Ärztekammer des jeweiligen Bundeslandes

### Schritt-für-Schritt

1. **Option A - Direkt bei SVS**:
   - Besuchen Sie: https://www.svs.at
   - Navigieren Sie zu: "Für Ärzte" oder "Downloads"
   - Suchen Sie nach: "Honorarordnung" oder "Leistungskatalog"
   - Laden Sie die Honorarordnung herunter

2. **Option B - Über Ärztekammer**:
   - Besuchen Sie die Website der Ärztekammer Ihres Bundeslandes
   - Navigieren Sie zu: "Downloads" oder "Für Ärzte"
   - Suchen Sie nach: "SVS Honorarordnung"
   - Laden Sie die Honorarordnung herunter

### Besonderheit

⚠️ **WICHTIG**: SVS hat **20% Selbstbehalt** auch bei Kassenarzt-Abrechnung (im Gegensatz zu ÖGK, BVAEB, etc.)

### Kontakt

- **Telefon**: 050 809-0
- **E-Mail**: info@svs.at
- **Website**: https://www.svs.at

## 4. GOÄ (Gebührenordnung für Ärzte) - Privattarife

### Download-Bereich

- **Quelle**: Österreichische Ärztekammer (ÖÄK)
- **Website**: https://www.aerztekammer.at

### Schritt-für-Schritt

1. **Besuchen Sie**: https://www.aerztekammer.at
2. **Navigieren Sie zu**: "Downloads" oder "Für Ärzte"
3. **Suchen Sie nach**:
   - "GOÄ"
   - "Gebührenordnung für Ärzte"
   - "Wahlarzt Tarife"
   - "Privattarife"
   - "Honorarempfehlungen"
4. **Laden Sie die GOÄ/Honorarempfehlungen herunter**

### Hinweis

Die ÖÄK veröffentlicht **regelmäßige Honorarempfehlungen** für Privatleistungen. Dies sind Empfehlungen, keine verbindlichen Tarife.

## 5. Weitere Versicherungsträger

### KFA (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)

- **Website**: https://www.kfa.at
- **Bereich**: "Für Ärzte" oder "Downloads"
- **Suchbegriffe**: "Honorarordnung", "Leistungskatalog"

### PVA (Pensionsversicherungsanstalt)

- **Website**: https://www.pensionsversicherung.at
- **Bereich**: "Für Ärzte" oder "Downloads"
- **Suchbegriffe**: "Honorarordnung", "Leistungskatalog"

### VAEB (Versicherungsanstalt öffentlich Bediensteter)

- **Website**: https://www.vaeb.at
- **Bereich**: "Für Ärzte" oder "Downloads"
- **Suchbegriffe**: "Honorarordnung", "Leistungskatalog"

### AUVA (Allgemeine Unfallversicherungsanstalt)

- **Website**: https://www.auva.at
- **Bereich**: "Für Ärzte" oder "Downloads"
- **Suchbegriffe**: "Honorarordnung", "Leistungskatalog"

## Wichtige Hinweise

### 1. Bundesland-spezifische Unterschiede

⚠️ **ÖGK-Honorarordnungen** können nach Bundesländern getrennt sein. Stellen Sie sicher, dass Sie die richtige Version für Ihr Bundesland verwenden!

### 2. Regelmäßige Updates

- Honorarordnungen werden **monatlich** aktualisiert
- Prüfen Sie regelmäßig auf neue Versionen
- Konfigurieren Sie die automatischen Updates entsprechend

### 3. Format

- Die meisten Honorarordnungen sind als **XML** oder **CSV** verfügbar
- XML ist strukturierter und besser für automatische Verarbeitung geeignet
- CSV ist einfacher zu lesen und zu bearbeiten

### 4. System-Konfiguration

Nach dem Download müssen Sie die URLs in der `.env`-Datei konfigurieren:

```env
# ÖGK (Kassenhonorarordnung)
OGK_EBM_XML_URL=https://www.gesundheitskasse.at/.../honorarordnung.xml

# BVAEB (falls verfügbar)
BVAEB_HONORARORDNUNG_URL=https://www.bvaeb.at/.../honorarordnung.xml

# SVS (falls verfügbar)
SVS_HONORARORDNUNG_URL=https://www.svs.at/.../honorarordnung.xml
```

## Zusammenfassung

| Versicherungsträger | Website | Bereich | Besonderheit |
|---------------------|--------|---------|--------------|
| **ÖGK** | gesundheitskasse.at | **Vertragspartner** | Oft nach Bundesländern getrennt |
| **BVAEB** | bvaeb.at | Für Ärzte | Über Ärztekammer oder direkt |
| **SVS** | svs.at | Für Ärzte | 20% Selbstbehalt auch bei Kassenarzt |
| **GOÄ** | aerztekammer.at | Downloads | Honorarempfehlungen (nicht verbindlich) |
| **KFA** | kfa.at | Für Ärzte | Nur für Wien |
| **PVA** | pensionsversicherung.at | Für Ärzte | - |
| **VAEB** | vaeb.at | Für Ärzte | - |
| **AUVA** | auva.at | Für Ärzte | - |

## Hilfe bei Problemen

Falls Sie die Honorarordnungen nicht finden können:

1. **Kontaktieren Sie den Versicherungsträger direkt**:
   - ÖGK: 0800 20 15 15
   - BVAEB: 050 405-0
   - SVS: 050 809-0

2. **Kontaktieren Sie die Ärztekammer** Ihres Bundeslandes

3. **Prüfen Sie die Dokumentation** des Versicherungsträgers

