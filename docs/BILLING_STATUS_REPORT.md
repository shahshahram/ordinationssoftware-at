# Abrechnungsstatus-Bericht

## Stand: 01.12.2025

### ✅ Implementiert:

#### 1. Kassenärzte (Kassenarzt-Abrechnung)
- ✅ **ServiceCatalog** mit `ogk.ebmCode` und `ogk.ebmPrice`
- ✅ **Billing Calculator** für Kassenarzt-Berechnungen
- ✅ **Selbstbehalt-Berechnung** (10% oder 20%, max. €50)
- ✅ **ÖGK-XML-Export** (ELA - Einzelleistungsauszug)
- ✅ **Turnusabrechnung** (monatliche Abrechnung)
- ✅ **RKSVO-konforme** Rechnungsstellung
- ✅ **Automatische Preisberechnung** basierend auf EBM-Codes

#### 2. Wahlärzte (Wahlarzt-Abrechnung)
- ✅ **ServiceCatalog** mit `wahlarzt.price` und `wahlarzt.reimbursementRate`
- ✅ **Billing Calculator** für Wahlarzt-Berechnungen
- ✅ **Erstattungsberechnung** (80% Standard, anpassbar)
- ✅ **Zusatzversicherungsprüfung** (private Arztversicherung)
- ✅ **Erstattungsverwaltung** (Reimbursement-Model)
- ✅ **GOÄ-Code-Unterstützung** (Gebührenordnung für Ärzte)

#### 3. Privatärzte (Privat-Abrechnung)
- ✅ **ServiceCatalog** mit `private.price`
- ✅ **Billing Calculator** für Privat-Berechnungen
- ✅ **Vollständige Patientenrechnung** (keine Versicherungsabrechnung)
- ✅ **Privatversicherungs-Connector** (Grundstruktur vorhanden)

### ⚠️ Teilweise implementiert:

#### Versicherungsprüfung
- ✅ Grundlegende Versicherungsprüfung (ÖGK, SVS, BVAEB, KFA, PVA)
- ⚠️ **Fehlt**: Vollständige API-Integration zu allen Kassen
- ⚠️ **Fehlt**: Automatische Versicherungsstatus-Prüfung (online)

#### Schnittstellen zu Kassen
- ✅ **ÖGK**: XML-Export implementiert
- ✅ **ÖGK**: Turnusabrechnung implementiert
- ⚠️ **SVS, BVAEB, KFA, PVA**: Nur Grundstruktur vorhanden
- ⚠️ **Privatversicherungen**: Nur Beispiel-Konfigurationen (Allianz, Generali, Wiener Städtische)

---

## 2. Schnittstellen zu relevanten Kassen

### ✅ Implementiert:

#### ÖGK (Österreichische Gesundheitskasse)
- ✅ XML-Export (ELA-Format)
- ✅ Turnusabrechnung
- ✅ Automatische Übermittlung (ogkAutoSubmitService)
- ✅ Tarifdatenbank-Download (EBM, KHO)

#### Grundlegende Versicherungsprüfung
- ✅ Versicherungsanbieter-Erkennung (ÖGK, SVS, BVAEB, KFA, PVA)
- ✅ Versicherungsnummer-Validierung
- ✅ Abrechnungstyp-Automatik (kassenarzt/wahlarzt/privat)

### ⚠️ Teilweise implementiert:

#### SVS (Sozialversicherung der Selbständigen)
- ⚠️ Nur Grundstruktur vorhanden
- ❌ Keine spezifische XML-Export-Funktion
- ❌ Keine API-Integration

#### BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)
- ⚠️ Nur Grundstruktur vorhanden
- ❌ Keine spezifische XML-Export-Funktion
- ❌ Keine API-Integration

#### KFA (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)
- ⚠️ Nur Grundstruktur vorhanden
- ❌ Keine spezifische XML-Export-Funktion
- ❌ Keine API-Integration

#### PVA (Pensionsversicherungsanstalt)
- ⚠️ Nur Grundstruktur vorhanden
- ❌ Keine spezifische XML-Export-Funktion
- ❌ Keine API-Integration

#### Privatversicherungen
- ⚠️ InsuranceConnector vorhanden, aber nur mit Beispiel-Konfigurationen
- ⚠️ Unterstützt: Allianz, Generali, Wiener Städtische (nur Struktur)
- ❌ Keine echten API-Integrationen

---

## 3. Abrechnungskataloge im System

### ✅ Implementiert:

#### ServiceCatalog (Leistungskatalog)
- ✅ **EBM-Codes** für Kassenarzt-Abrechnung (`ogk.ebmCode`, `ogk.ebmPrice`)
- ✅ **GOÄ-Codes** für Wahlarzt-Abrechnung (`wahlarzt.goaeCode`, `wahlarzt.price`)
- ✅ **KHO-Codes** für Kassenarzt-Abrechnung (über Tariff-Model)
- ✅ **Privatpreise** (`private.price`)
- ✅ **Selbstbehalt-Konfiguration** (`copay`)
- ✅ **Kategorisierung** (category, specialty)
- ✅ **Abrechnungstyp-Filter** (billingType: 'kassenarzt', 'wahlarzt', 'privat', 'both')

#### Tariff-Model (Tarifverwaltung)
- ✅ **GOÄ-Tarife** (Gebührenordnung für Ärzte)
- ✅ **KHO-Tarife** (Kassenhonorarordnung)
- ✅ **ET-Tarife** (Ergotherapie)
- ✅ **EBM-Tarife** (Einheitlicher Bewertungsmaßstab)
- ✅ **Custom-Tarife** (benutzerdefinierte Tarife)
- ✅ **Fachrichtung-Zuordnung** (specialty)
- ✅ **Gültigkeitszeitraum** (validFrom, validUntil)

#### Tarifdatenbanken
- ✅ **EBM-Tarifdatenbank** (Download von ÖGK-Website)
- ✅ **KHO-Tarifdatenbank** (Download von ÖGK-Website)
- ✅ **GOÄ-Tarifdatenbank** (Download von ÖGK-Website)

---

## 4. Update-Funktionalitäten für Kataloge

### ✅ Implementiert:

#### Automatische Updates
- ✅ **tariffUpdateService** - Automatischer Update-Service
- ✅ **ogkTariffDownloader** - Download von ÖGK-Tarifdatenbanken
- ✅ **checkForUpdates()** - Prüft auf verfügbare Updates
- ✅ **downloadAndImportAll()** - Lädt alle Tarifdatenbanken herunter und importiert
- ✅ **tariff-importer** - Importiert Tarife aus CSV/XML/JSON

#### Update-Mechanismen
- ✅ **Monatliche Updates** (am 1. des Monats)
- ✅ **Wöchentliche Updates** (montags)
- ✅ **Manuelle Updates** (über API-Endpunkte)
- ✅ **Versionierung** (version-Feld im ServiceCatalog)
- ✅ **Gültigkeitszeitraum** (validFrom, validUntil im Tariff)

#### API-Endpunkte für Updates
- ✅ `POST /api/ogk-tariff-download/ebm` - EBM-Tarifdatenbank herunterladen
- ✅ `POST /api/ogk-tariff-download/kho` - KHO-Tarifdatenbank herunterladen
- ✅ `POST /api/ogk-tariff-download/goae` - GOÄ-Tarifdatenbank herunterladen
- ✅ `POST /api/ogk-tariff-download/all` - Alle Tarifdatenbanken herunterladen
- ✅ `POST /api/tariffs/import` - Tarife importieren (CSV/XML/JSON)
- ✅ `GET /api/ogk-tariff-download/status` - Update-Status abrufen

### ⚠️ Teilweise implementiert:

#### ServiceCatalog-Updates
- ✅ Jährliches Update-Script vorhanden (`update-service-catalog-annual.js`)
- ⚠️ **Fehlt**: Automatische EBM-Preis-Updates im ServiceCatalog
- ⚠️ **Fehlt**: Automatische Synchronisation zwischen Tariff-Model und ServiceCatalog

#### Update-Benachrichtigungen
- ⚠️ **Fehlt**: E-Mail-Benachrichtigungen bei Updates
- ⚠️ **Fehlt**: Dashboard-Widget für Update-Status
- ⚠️ **Fehlt**: Update-Historie

---

## Zusammenfassung

### ✅ Vollständig implementiert:
1. ✅ Abrechnungsformalitäten für alle drei Typen (Kassenärzte, Wahlärzte, Privatärzte)
2. ✅ Abrechnungskataloge (EBM, GOÄ, KHO, ET)
3. ✅ Update-Funktionalitäten für Tarifdatenbanken

### ⚠️ Teilweise implementiert:
1. ⚠️ Schnittstellen zu Kassen (nur ÖGK vollständig, andere nur Grundstruktur)
2. ⚠️ Automatische ServiceCatalog-Updates (Script vorhanden, aber nicht automatisiert)

### ❌ Fehlt noch:
1. ❌ Vollständige API-Integrationen zu SVS, BVAEB, KFA, PVA
2. ❌ Echte Privatversicherungs-API-Integrationen
3. ❌ Automatische ServiceCatalog-Preis-Updates
4. ❌ Update-Benachrichtigungen
5. ❌ Dashboard für Update-Status

---

## Empfohlene nächste Schritte:

1. **ÖGK-Integration vervollständigen**: Automatische Übermittlung aktivieren
2. **SVS/BVAEB/KFA/PVA-Integrationen**: XML-Export-Funktionen implementieren
3. **Privatversicherungs-APIs**: Echte API-Integrationen einrichten
4. **ServiceCatalog-Auto-Updates**: Automatische Preis-Updates implementieren
5. **Update-Dashboard**: Frontend-Widget für Update-Status erstellen

