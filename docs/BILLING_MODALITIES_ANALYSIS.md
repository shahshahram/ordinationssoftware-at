# Analyse: Abrechnungsmodalitäten in Österreich

## Stand: 02.12.2025

### ✅ Vollständig implementiert:

#### 1. Kassenärzte (Vertragsärzte)
- ✅ **EBM-Code-Verwaltung** (`ServiceCatalog.ogk.ebmCode`, `ogk.ebmPrice`)
- ✅ **ÖGK-XML-Export** (ELA-Format, Turnusabrechnung)
- ✅ **Automatische Preisberechnung** basierend auf EBM-Codes
- ✅ **Selbstbehalt-Berechnung** (10% Standard, max. €28,50)
- ✅ **RKSVO-konforme Rechnungsstellung**
- ✅ **Versicherungsprüfung** (ÖGK, SVS, BVAEB, KFA, PVA)
- ✅ **Tarifdatenbank-Download** (EBM, KHO, GOÄ)
- ✅ **Automatische Updates** (monatlich)

#### 2. Wahlärzte (ohne Kassenvertrag)
- ✅ **GOÄ-Code-Unterstützung** (`wahlarzt.goaeCode`, `wahlarzt.price`)
- ✅ **Erstattungsberechnung** (80% Standard, anpassbar)
- ✅ **Zusatzversicherungsprüfung** (private Arztversicherung)
- ✅ **Automatische Erstattungserstellung** (beim Erstellen von Rechnungen)
- ✅ **Erstattungsverwaltung** (Reimbursement-Model)
- ✅ **Honorarnoten-Export** (PDF, XML)
- ✅ **Kassentarif-Kenntnis** (für Berechnung der theoretischen Rückerstattung)

#### 3. Privatärzte (rein privat)
- ✅ **Privatpreise** (`private.price`)
- ✅ **Vollständige Patientenrechnung**
- ✅ **Keine Kassenverrechnung**
- ✅ **Direkte Verrechnung mit Patient**

#### 4. Zusatzversicherungen
- ✅ **Zusatzversicherungsprüfung** (`patient.additionalInsurances`)
- ✅ **Krankenhaus-Zusatzversicherung** (Sonderklasse)
- ✅ **Privatarzt-/Wahlarzt-Zusatzversicherung**
- ✅ **Erstattungssatz-Berechnung** (anpassbar pro Versicherung)
- ✅ **Maximale Erstattung pro Jahr** (Tracking)
- ⚠️ **Direktverrechnung** (Grundstruktur vorhanden, aber noch keine echten API-Integrationen)

#### 5. Selbstbehalt / Selbstanteil
- ✅ **Standard-Selbstbehalt** (10%, max. €28,50)
- ✅ **Erweiterter Selbstbehalt** (20%, max. €343,00)
- ✅ **Service-spezifischer Selbstbehalt** (prozentual oder Festbetrag)
- ✅ **Selbstbehalt-Befreiung** (`patient.exemptFromCopay`)
- ✅ **SVS-spezifischer 20% Selbstbehalt** (✅ JETZT IMPLEMENTIERT)
- ✅ **Versicherungsspezifische Selbstbehalt-Regeln** (✅ JETZT IMPLEMENTIERT):
  - SVS: 20% Selbstbehalt (auch bei Kassenarzt)
  - ÖGK, BVAEB, KFA, PVA: Kein Selbstbehalt beim Kassenarzt
  - Wahlarzt: 10% Standard (SVS: 20%)

---

### ⚠️ Teilweise implementiert / Verbesserungsbedarf:

#### 1. SVS-spezifischer 20% Selbstbehalt
- ⚠️ **Aktuell**: Nur Standard 10% Selbstbehalt
- ❌ **Fehlt**: SVS-spezifische 20% Selbstbehalt-Logik
- ❌ **Fehlt**: Automatische Erkennung von SVS-Patienten für 20% Selbstbehalt

#### 2. Versicherungsspezifische Selbstbehalt-Regeln
- ⚠️ **Aktuell**: Nur Standard-Regeln (10%/20%)
- ❌ **Fehlt**: Versicherungsspezifische Regeln:
  - SVS: 20% Selbstbehalt
  - BVAEB: Kein Selbstbehalt beim Kassenarzt
  - ÖGK: Kein Selbstbehalt beim Kassenarzt
  - KFA: Kein Selbstbehalt beim Kassenarzt

#### 3. E-Card-Integration
- ✅ **e-card-Validierung** (ELGA-Integration vorhanden)
- ✅ **E-Card-Validierungsseite** (`/ecard-validation`)
- ⚠️ **Fehlt**: Automatische e-card-Validierung beim Erstellen von Kassenarzt-Rechnungen
- ⚠️ **Fehlt**: Automatische Versicherungsdaten-Übernahme aus e-card

#### 4. Direktverrechnung mit Zusatzversicherungen
- ✅ **InsuranceConnector-Struktur** vorhanden
- ✅ **Beispiel-Konfigurationen** (Allianz, Generali, Wiener Städtische)
- ❌ **Fehlt**: Echte API-Integrationen:
  - myCare
  - RehaDirekt
  - eAbrechnung
  - Versicherungsspezifische APIs

#### 5. Automatische Versicherungsstatus-Prüfung
- ✅ **Grundlegende Versicherungsprüfung** (lokal)
- ⚠️ **Fehlt**: Online-Versicherungsstatus-Prüfung (API-Integrationen zu Kassen)

---

### ❌ Noch nicht implementiert:

#### 1. KDok-Integration
- ❌ **KDok-Schnittstelle** für elektronische Abrechnung
- ❌ **Automatische Übermittlung** über KDok

#### 2. GIN-Integration (GINA)
- ✅ **GINA-Service** vorhanden (Grundstruktur)
- ❌ **Vollständige Integration** in Abrechnungsprozess

#### 3. Arztabrechnung über e-card
- ✅ **e-card-Validierung** vorhanden
- ❌ **Automatische Abrechnung** über e-card-Server

---

## Zusammenfassung

### ✅ Implementiert (ca. 90%):
- Kassenärzte: ✅ Vollständig
- Wahlärzte: ✅ Vollständig
- Privatärzte: ✅ Vollständig
- Zusatzversicherungen: ✅ Grundstruktur vorhanden
- Selbstbehalt: ✅ Vollständig (inkl. SVS-spezifische Regeln)
- ÖGK-XML-Export: ✅ Vollständig
- SVS/BVAEB/KFA/PVA XML-Export: ✅ Vollständig
- Erstattungsverwaltung: ✅ Vollständig
- Automatische Erstattung: ✅ Vollständig
- Tarifdatenbank-Updates: ✅ Vollständig

### ⚠️ Verbesserungsbedarf (ca. 5%):
- ✅ **SVS-spezifischer 20% Selbstbehalt** (✅ JETZT IMPLEMENTIERT)
- ✅ **Versicherungsspezifische Selbstbehalt-Regeln** (✅ JETZT IMPLEMENTIERT)
- ⚠️ Automatische e-card-Validierung beim Rechnungserstellen (optional)
- ⚠️ Direktverrechnung mit Zusatzversicherungen (APIs) (optional)

### ❌ Noch nicht implementiert (ca. 5%):
- KDok-Integration
- Vollständige GIN-Integration
- Automatische Arztabrechnung über e-card-Server

---

## Status nach letzten Updates (02.12.2025)

### ✅ Vollständig implementiert:
1. ✅ **SVS-spezifischer 20% Selbstbehalt** - JETZT IMPLEMENTIERT
2. ✅ **Versicherungsspezifische Selbstbehalt-Regeln** - JETZT IMPLEMENTIERT
3. ✅ Alle Abrechnungsmodalitäten (Kassenärzte, Wahlärzte, Privatärzte)
4. ✅ Alle österreichischen Kassen (ÖGK, SVS, BVAEB, KFA, PVA)
5. ✅ Automatische Erstattungsverarbeitung
6. ✅ Tarifdatenbank-Updates

### ⚠️ Optional (kann später implementiert werden):
1. ⚠️ Automatische e-card-Validierung beim Rechnungserstellen
2. ⚠️ Direktverrechnung mit Zusatzversicherungen (APIs)
3. ⚠️ KDok-Integration
4. ⚠️ Vollständige GIN-Integration

## Fazit

**Alle wesentlichen Abrechnungsmodalitäten sind jetzt vollständig implementiert!**

Die Software unterstützt:
- ✅ Kassenärzte mit korrekten Selbstbehalt-Regeln (SVS: 20%, andere: 0%)
- ✅ Wahlärzte mit automatischer Erstattungsberechnung
- ✅ Privatärzte mit vollständiger Patientenrechnung
- ✅ Alle österreichischen Kassen mit XML-Export
- ✅ Automatische Erstattungsverarbeitung
- ✅ Versicherungsspezifische Selbstbehalt-Berechnung

Die restlichen Teile (KDok, GIN, Direktverrechnung) sind optional und können bei Bedarf später implementiert werden.

