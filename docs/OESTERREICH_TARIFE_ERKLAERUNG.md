# Österreichische Tarife und Abrechnungssysteme - Erklärung

## Wichtiger Hinweis

⚠️ **In Österreich gibt es KEINEN EBM (Einheitlicher Bewertungsmaßstab) wie in Deutschland!**

Der Begriff "EBM" wird im Code teilweise verwendet, ist aber historisch bedingt. In Österreich sind die korrekten Begriffe:

## Österreichische Abrechnungssysteme

### 1. KHO (Kassenhonorarordnung)

**Das österreichische Äquivalent zum deutschen EBM**

- **Vollständiger Name**: Kassenhonorarordnung
- **Zweck**: Leistungen und Preise für die Kassenärztliche Versorgung
- **Herausgeber**: ÖGK (Österreichische Gesundheitskasse)
- **Format**: XML oder CSV
- **Aktualisierung**: Monatlich
- **URL**: https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.784932

**Was enthält KHO?**
- Alle abrechenbaren Leistungen für Kassenärzte
- Preise in Euro
- Codes für jede Leistung
- Kategorien und Fachrichtungen

### 2. GOÄ (Gebührenordnung für Ärzte)

**Für Privatärzte und Wahlärzte**

- **Vollständiger Name**: Gebührenordnung für Ärzte
- **Zweck**: Leistungen und Preise für Privatärzte/Wahlärzte
- **Herausgeber**: Möglicherweise nicht direkt von der ÖGK
- **Format**: XML oder CSV
- **Aktualisierung**: Monatlich
- **URL**: ⚠️ Muss ermittelt werden (aktuell Platzhalter)

**Was enthält GOÄ?**
- Leistungen für Privatärzte
- Basispreise und Multiplikatoren
- Abschnitte (A, B, C, etc.)
- GOÄ-Nummern

### 3. Honorarordnung / Leistungskatalog

**Allgemeine Bezeichnung**

- **Begriff**: Honorarordnung oder Leistungskatalog
- **Zweck**: Allgemeine Bezeichnung für Abrechnungsdaten
- **Umfang**: Kann KHO, GOÄ und andere Tarife umfassen

## Verwirrung im Code

### Warum steht "EBM" im Code?

Der Code verwendet teilweise den Begriff "EBM", obwohl in Österreich eigentlich **KHO** gemeint ist. Dies ist historisch bedingt und sollte bei zukünftigen Refactorings korrigiert werden.

### Wo wird "EBM" verwendet (aber KHO gemeint)?

1. **ServiceCatalog Model**:
   - `ogk.ebmCode` → Sollte eigentlich `ogk.khoCode` heißen
   - `ogk.ebmPrice` → Sollte eigentlich `ogk.khoPrice` heißen

2. **Update-Scripts**:
   - `EBM_UPDATES_2025` → Sollte eigentlich `KHO_UPDATES_2025` heißen

3. **Dokumentation**:
   - Teilweise wird "EBM" verwendet, obwohl "KHO" korrekt wäre

### Was sollte geändert werden?

Bei zukünftigen Refactorings sollte:
- `ebmCode` → `khoCode` umbenannt werden
- `ebmPrice` → `khoPrice` umbenannt werden
- `EBM_UPDATES` → `KHO_UPDATES` umbenannt werden
- Kommentare und Dokumentation aktualisiert werden

## Korrekte Begriffe für Österreich

| Falsch (Deutsch) | Richtig (Österreich) | Verwendung |
|------------------|----------------------|------------|
| EBM | **KHO** | Kassenärztliche Abrechnung |
| Einheitlicher Bewertungsmaßstab | **Kassenhonorarordnung** | Offizieller Name |
| EBM-Code | **KHO-Code** | Leistungscode |
| EBM-Preis | **KHO-Preis** | Leistungspreis |

## Datenquellen

### 1. Honorarordnungen der Krankenkassen (Kassenärzte)

⚠️ **WICHTIG**: Da das Gesundheitswesen in Österreich föderal organisiert ist, gibt es **unterschiedliche Honorarordnungen** je nach Bundesland und Sozialversicherungsträger!

#### ÖGK (Österreichische Gesundheitskasse)

**Die wichtigste Quelle**

- **Quelle**: ÖGK (Österreichische Gesundheitskasse)
- **URL**: https://www.gesundheitskasse.at
- **Bereich**: **"Vertragspartner"** (nicht "Tarifsystem"!)
- **Besonderheit**: Honorarordnungen sind oft **nach Bundesländern getrennt**
- **Suchbegriffe**: "KHO", "Kassenhonorarordnung", "Leistungskatalog", "Honorarordnung"
- **Format**: XML oder CSV
- **Aktualisierung**: Monatlich
- **Download**: Auf der Website der ÖGK im Bereich für "Vertragspartner"

**So finden Sie die Honorarordnung:**
1. Besuchen Sie: https://www.gesundheitskasse.at
2. Navigieren Sie zu **"Vertragspartner"** oder **"Für Ärzte"**
3. Suchen Sie nach **"Honorarordnung"**, **"KHO"** oder **"Leistungskatalog"**
4. Wählen Sie ggf. Ihr **Bundesland** aus
5. Laden Sie die Honorarordnung herunter

#### BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)

**Bundesweiter Träger mit eigener Honorarordnung**

- **Quelle**: BVAEB
- **URL**: https://www.bvaeb.at
- **Download**: 
  - Über die **Ärztekammer** des jeweiligen Bundeslandes
  - Oder **direkt bei BVAEB**
- **Format**: XML oder CSV
- **Aktualisierung**: Monatlich

**So finden Sie die Honorarordnung:**
1. Besuchen Sie: https://www.bvaeb.at
2. Navigieren Sie zu "Für Ärzte" oder "Downloads"
3. Suchen Sie nach "Honorarordnung" oder "Leistungskatalog"
4. Oder kontaktieren Sie die Ärztekammer Ihres Bundeslandes

#### SVS (Sozialversicherung der Selbständigen)

**Bundesweiter Träger mit eigener Honorarordnung**

- **Quelle**: SVS
- **URL**: https://www.svs.at
- **Download**: 
  - Über die **Ärztekammer** des jeweiligen Bundeslandes
  - Oder **direkt bei SVS**
- **Format**: XML oder CSV
- **Aktualisierung**: Monatlich
- **Besonderheit**: SVS hat **20% Selbstbehalt** auch bei Kassenarzt-Abrechnung

**So finden Sie die Honorarordnung:**
1. Besuchen Sie: https://www.svs.at
2. Navigieren Sie zu "Für Ärzte" oder "Downloads"
3. Suchen Sie nach "Honorarordnung" oder "Leistungskatalog"
4. Oder kontaktieren Sie die Ärztekammer Ihres Bundeslandes

#### Weitere Versicherungsträger

- **KFA** (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)
- **PVA** (Pensionsversicherungsanstalt)
- **VAEB** (Versicherungsanstalt öffentlich Bediensteter)
- **AUVA** (Allgemeine Unfallversicherungsanstalt)

Alle haben eigene Honorarordnungen, die über die jeweiligen Websites oder die Ärztekammer verfügbar sind.

### 2. Privattarife

#### GOÄ (Gebührenordnung für Ärzte)

**Für Privatärzte und Wahlärzte**

- **Quelle**: Österreichische Ärztekammer (ÖÄK)
- **URL**: https://www.aerztekammer.at
- **Download**: 
  - **Österreichische Ärztekammer** veröffentlicht regelmäßige Honorarempfehlungen
  - Möglicherweise auch über ÖGK (falls bereitgestellt)
- **Format**: XML oder CSV
- **Aktualisierung**: Monatlich
- **Suchbegriffe**: "GOÄ", "Gebührenordnung für Ärzte", "Wahlarzt Tarife", "Privattarife"

**So finden Sie die GOÄ:**
1. Besuchen Sie: https://www.aerztekammer.at
2. Navigieren Sie zu "Downloads" oder "Für Ärzte"
3. Suchen Sie nach "GOÄ", "Gebührenordnung" oder "Privattarife"
4. Laden Sie die Honorarempfehlungen herunter

## Zusammenfassung

✅ **Korrekt für Österreich**:
- **KHO** (Kassenhonorarordnung) - für Kassenärzte (ÖGK)
- **Honorarordnungen** - unterschiedlich je nach Versicherungsträger:
  - **ÖGK**: Kassenhonorarordnung (oft nach Bundesländern getrennt)
  - **BVAEB**: Eigene Honorarordnung
  - **SVS**: Eigene Honorarordnung
  - **KFA, PVA, VAEB, AUVA**: Eigene Honorarordnungen
- **GOÄ** (Gebührenordnung für Ärzte) - für Privatärzte/Wahlärzte (ÖÄK)
- **Honorarordnung / Leistungskatalog** - allgemeine Bezeichnung

❌ **Falsch für Österreich**:
- **EBM** (Einheitlicher Bewertungsmaßstab) - das ist deutsch!
- **Einheitlicher Bewertungsmaßstab** - existiert in Österreich nicht

⚠️ **Wichtige Hinweise**:
1. Der Code verwendet teilweise "EBM" als historischen Begriff, meint aber eigentlich "KHO". Dies sollte bei zukünftigen Updates korrigiert werden.
2. **Honorarordnungen sind unterschiedlich** je nach Versicherungsträger und möglicherweise nach Bundesland!
3. **ÖGK-Honorarordnungen** sind oft nach Bundesländern getrennt - achten Sie darauf, die richtige Version zu verwenden!
4. **BVAEB und SVS** haben eigene Honorarordnungen - diese müssen separat heruntergeladen werden!

## Weitere Informationen

- **ÖGK-Website**: https://www.gesundheitskasse.at
- **BMG-Website**: https://www.bmg.gv.at
- **Österreichische Ärztekammer**: https://www.aerztekammer.at
- **Bundesärztekammer**: https://www.bundesaerztekammer.at

