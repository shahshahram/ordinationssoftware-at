# 📋 Aktuelle ELGA-Implementierungsleitfäden (HL7 Austria)

**Quelle:** [HL7 Austria MediaWiki - Implementierungsleitfäden](https://wiki.hl7.at/index.php?title=Implementierungsleitfäden)  
**Letzte Aktualisierung:** Oktober 2025  
**Stand:** Diese Dokumentation basiert auf den offiziellen normativen/gültigen Leitfäden der HL7 Austria Governance Gruppe

---

## 🎯 Übersicht

Alle hier aufgeführten CDA-Implementierungsleitfäden wurden in der Governance Gruppe **"HL7 Austria"** erarbeitet und im Rahmen eines Abstimmungsverfahrens verabschiedet. Die Verfügbarkeit und Versionen der Leitfäden werden regelmäßig aktualisiert.

**⚠️ WICHTIG:** 
- **Nur Versionen mit Status "Normativ" oder "Gültig" werden aufgeführt**
- **Es können mehrere gleichzeitig gültige Versionen eines IL existieren** - alle müssen berücksichtigt werden, da verschiedene spezielle IL unterschiedliche Versionen voraussetzen können
- **Bei allen IL wird der Erratum-Link prozessiert** (falls verfügbar)

**Verbindlichkeit:** Die Verbindlichkeit zur Anwendung dieser Leitfäden wird durch Verordnungen zum Gesundheitstelematikgesetz 2012 begründet.

---

## ✅ Normative/Gültige GTelG Leitfäden (ELGA und eHealth)

### Basis-Leitfäden

#### 1. Allgemeiner Implementierungsleitfaden

**🔴 KRITISCH:** Es gelten **BEIDE** Versionen gleichzeitig gültig:
- Verschiedene spezielle IL erfordern unterschiedliche Versionen des Allgemeinen IL
- **Beide Versionen müssen zur Verfügung gehalten werden**

**Version 2.06.5:**
- **Status:** ✅ Gültig/Normativ
- **Zweck:** Wird von speziellen IL der Version 2.06.x-Familie vorausgesetzt
- **Link:** [Allgemeiner Implementierungsleitfaden Guide](https://wiki.hl7.at/index.php/ILF:Allgemeiner_Leitfaden_Guide)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:Allgemeiner_Leitfaden_Guide)
- **Verwendet von:** Spezielle IL Version 2.06.x

**Version 3.2.1+20211001:**
- **Status:** ✅ Normativ
- **Datum:** 2021-10-01
- **Zweck:** Basis für alle weiteren Leitfäden; beschreibt Struktur, Format und Standards von medizinischen Dokumenten in ELGA (Version 3.x)
- **Link:** [Allgemeiner Implementierungsleitfaden (Version 3) Guide](https://wiki.hl7.at/index.php/ILF:Allgemeiner_Leitfaden_Guide)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:Allgemeiner_Leitfaden_Guide)
- **Template-ID:** `1.2.40.0.34.11.1` - Allgemeiner Implementierungsleitfaden "CDA Dokumente im österreichischen Gesundheitswesen"
- **Verwendet von:** Spezielle IL Version 3.x

**💡 Implementierungshinweis:** Das System muss beide Versionen unterstützen und je nach verwendetem speziellen IL die richtige Version des Allgemeinen IL verwenden.

---

#### 2. ELGA XDS Metadaten

**Version 3.0.2+20240715:**
- **Status:** ✅ Normativ/Gültig
- **Datum:** 2024-07-15
- **Zweck:** Beschreibt die IHE XDS Metadaten, die für die Registrierung von Befunden (HL7 CDA) und Bilddaten (DICOM KOS) in der ELGA-Infrastruktur notwendig sind
- **Link:** [ELGA XDS Metadaten Guide](https://wiki.hl7.at/index.php/ILF:XDS_Metadaten_Guide)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:XDS_Metadaten_Guide)

**⚠️ WICHTIG:** Erratum-Link muss prozessiert werden!

---

### Spezielle Dokumenten-Leitfäden

#### 3. ELGA Entlassungsbrief (Ärztlich)

**Version 2.06.5:**
- **Status:** ✅ Normativ/Gültig
- **Aktuelle Version:** ⚠️ **2.06.5** (nicht 2.06.2!)
- **EIS-Stufe:** "Full Support"
- **Link:** [ELGA Entlassungsbrief Ärztlich Guide](https://wiki.hl7.at/index.php/ILF:Entlassungsbrief_Ärztlich_Guide)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:Entlassungsbrief_Ärztlich_Guide)
- **Template-IDs:**
  - `1.2.40.0.34.11.2` - Spezieller Leitfaden "Entlassungsbrief (Ärztlich)"
  - `1.2.40.0.34.11.2.0.3` - Entlassungsbrief (Ärztlich), EIS "Full Support"
- **Erfordert:** Allgemeiner IL Version **2.06.5**
- **Bereits implementiert im Projekt:** ✅ (teilweise - siehe `ELGA_IST_ANALYSE.md`)

---

#### 4. ELGA Entlassungsbrief (Pflege)

**Version 2.06.3:**
- **Status:** ✅ Normativ/Gültig
- **Aktuelle Version:** **2.06.3**
- **Link:** [ELGA Entlassungsbrief (Pflege) Guide](https://wiki.hl7.at/index.php/ILF:Entlassungsbrief_%28Pflege%29_Guide)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:Entlassungsbrief_%28Pflege%29_Guide)
- **Erfordert:** Allgemeiner IL Version **2.06.5**

---

#### 5. ELGA Pflegesituationsbericht

**Version 2.06.3:**
- **Status:** ✅ Normativ/Gültig
- **Datum:** 2021-07-15
- **Link:** [ELGA Pflegesituationsbericht Guide](https://wiki.hl7.at/index.php/ILF:Pflegesituationsbericht_Guide)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:Pflegesituationsbericht_Guide)
- **Erfordert:** Allgemeiner IL Version **2.06.5**

---

#### 6. ELGA e-Medikation

**Version 2.06.5:**
- **Status:** ✅ Normativ/Gültig
- **Link:** [ELGA e-Medikation Guide](https://wiki.hl7.at/index.php/ILF:E-Medikation_Guide)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:E-Medikation_Guide)
- **Erfordert:** Allgemeiner IL Version **2.06.5**

---

### Befund-Leitfäden

#### 7. ELGA Befund Bildgebende Diagnostik

**Version 3.0.2+20240715:**
- **Status:** ✅ Normativ/Gültig
- **Datum:** 2024-07-15
- **Zweck:** Spezifiziert die Struktur und Inhalte von Befunden der bildgebenden Diagnostik
- **Link:** [ELGA Befund bildgebende Diagnostik Guide](https://wiki.hl7.at/index.php/ILF:Befund_bildgebende_Diagnostik_Guide)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:Befund_bildgebende_Diagnostik_Guide)
- **Erfordert:** Allgemeiner IL Version **3.2.1+20211001**

**Weitere Versionen (falls gültig):**
- **Version 3.0.1+20240911:**
  - **Status:** ✅ Normativ (nach Erratum 3.0.2)
  - **Prüfen auf Guide-Seite:** [ELGA Befund bildgebende Diagnostik Guide](https://wiki.hl7.at/index.php/ILF:Befund_bildgebende_Diagnostik_Guide)

---

#### 8. ELGA Labor- & Mikrobiologiebefund

**Versionen (Status prüfen auf Guide-Seite):**
- **Status:** ✅ Normativ/Gültig
- **Link:** [ELGA Laborbefund Guide](https://wiki.hl7.at/index.php/ILF:Laborbefund_Guide)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:Laborbefund_Guide)
- **Mögliche Version:** 2.06.03 (Status auf Guide-Seite prüfen!)

**Zusätzlicher Leitfaden:**
- **Leitfaden zur Anwendung von LOINC in ELGA:**
  - **Status:** ✅ Gültig
  - **Link:** [Leitfaden zur Anwendung von LOINC in ELGA](https://wiki.hl7.at/index.php/ILF:Leitfaden_zur_Anwendung_von_LOINC_in_ELGA)
  - **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:Leitfaden_zur_Anwendung_von_LOINC_in_ELGA)
  - **Zweck:** Spezifiziert die inhaltliche Strukturierung von Laborbefunden in ELGA; Bietet Anleitungen zur Anwendung von LOINC-Codes; Hilfestellungen für das Mapping lokaler Codelisten auf LOINC

---

#### 9. ELGA Ambulanzbefund

**Versionen (Status prüfen auf Guide-Seite):**
- **Status:** ✅ Normativ/Gültig
- **Mögliche Version:** 1.0 (Status auf Guide-Seite prüfen!)
- **Link:** [ELGA Ambulanzbefund Guide](https://wiki.hl7.at/index.php/ILF:Ambulanzbefund_Guide)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:Ambulanzbefund_Guide)

---

### Spezialisierte Leitfäden

#### 10. ELGA Telemonitoring-Episodenbericht

**Version 1.2.0+20210304:**
- **Status:** ✅ Normativ/Gültig
- **Datum:** 2021-03-04
- **Zweck:** Beschreibt die Erstellung von Telemonitoring-Berichten und deren Integration in ELGA
- **Link:** [ELGA Telemonitoring-Episodenbericht Guide](https://wiki.hl7.at/index.php/ILF:Telemonitoring-Episodenbericht_Guide)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:Telemonitoring-Episodenbericht_Guide)

**Weitere Versionen (falls gültig):**
- **Version 1:** Status auf Guide-Seite prüfen

---

#### 11. e-Impfpass

**Version 2.0.0+20230717:**
- **Status:** ✅ Normativ/Gültig
- **Datum:** 2023-07-17
- **Link:** [e-Impfpass Guide](https://wiki.hl7.at/index.php/ILF:E-Impfpass_Guide)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:E-Impfpass_Guide)

---

## 🔄 In Bearbeitung (Status prüfen - nur aufnehmen wenn "Normativ" oder "Gültig")

⚠️ **HINWEIS:** Diese Leitfäden sind möglicherweise noch nicht normativ verabschiedet. Status auf jeweiliger Guide-Seite prüfen!

#### 12. ELGA Patient Summary
- **Status:** ⏳ Prüfen auf Guide-Seite (nur aufnehmen wenn "Normativ" oder "Gültig")
- **Link:** [ELGA Patient Summary Guide](https://wiki.hl7.at/index.php/ILF:Patient_Summary_Guide)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:Patient_Summary_Guide)

#### 13. ELGA Ärztlicher Befund (generisch)
- **Status:** ⏳ Prüfen auf Guide-Seite (nur aufnehmen wenn "Normativ" oder "Gültig")
- **Link:** [ELGA Ärztlicher Befund Guide](https://wiki.hl7.at/index.php/ILF:Ärztlicher_Befund_Guide)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:Ärztlicher_Befund_Guide)

#### 14. ELGA Patientenverfügung
- **Version 1:**
  - **Status:** ⚠️ Prüfen auf Guide-Seite (nur aufnehmen wenn "Normativ" oder "Gültig")
  - **Link:** [ELGA Patientenverfügung Guide](https://wiki.hl7.at/index.php/ILF:Patientenverfügung_Guide)
  - **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:Patientenverfügung_Guide)

#### 15. ELGA Pathologiebefund
- **Status:** ⏳ Prüfen auf Guide-Seite (nur aufnehmen wenn "Normativ" oder "Gültig")
- **Link:** [ELGA Pathologiebefund](https://wiki.hl7.at/index.php/ILF:Pathologiebefund)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:Pathologiebefund)

#### 16. ELGA Pflegeberichte
- **Status:** ⏳ Prüfen auf Guide-Seite (nur aufnehmen wenn "Normativ" oder "Gültig")
- **Link:** [ELGA Pflegeberichte Guide](https://wiki.hl7.at/index.php/ILF:Pflegeberichte_Guide)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:Pflegeberichte_Guide)

---

## 📚 Weitere Normative/Gültige Leitfäden (Nicht ELGA-spezifisch)

#### 17. EMS Labor- und Arztmeldung
- **Version 2020:**
  - **Status:** ✅ Normativ/Gültig
  - **Datum:** 2020-08-19
  - **Zweck:** Meldepflichtige Krankheiten
  - **Link:** [EMS Guide](https://wiki.hl7.at/index.php/ILF:EMS_Guide)
  - **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:EMS_Guide)

#### 18. Export-Normdatensatz (ENDS2)
- **Status:** ✅ Normativ/Gültig
- **Link:** [ENDS2 Guide](https://wiki.hl7.at/index.php/ILF:ENDS2_Guide)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:ENDS2_Guide)

#### 19. Aurea
- **Status:** ✅ Normativ/Gültig
- **Zweck:** Meldung antimikrobieller Resistenzen
- **Link:** [Aurea Guide](https://wiki.hl7.at/index.php/ILF:Aurea_Guide)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://wiki.hl7.at/index.php/ILF:Aurea_Guide)

#### 20. DICOM KOS-Leitfaden für den ELGA Bilddatenaustausch
- **Status:** ✅ Normativ/Gültig
- **Link:** [DICOM KOS Implementierungsleitfaden](https://hl7at.atlassian.net/wiki/spaces/OBD/pages/54952571/KOS+Implementierungsleitfaden)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://hl7at.atlassian.net/wiki/spaces/OBD/pages/54952571/KOS+Implementierungsleitfaden)

#### 21. Ermittlung und Speicherung des APPC in DICOM Daten
- **Status:** ✅ Normativ/Gültig
- **Link:** [Leitfaden zur Ermittlung und Speicherung des APPC](https://hl7at.atlassian.net/wiki/spaces/OBD/pages/54952632/Leitfaden+zur+Ermittlung+und+Speicherung+des+APPC+in+DICOM+Daten)
- **Erratum:** [Erratum-Link auf Guide-Seite prüfen](https://hl7at.atlassian.net/wiki/spaces/OBD/pages/54952632/Leitfaden+zur+Ermittlung+und+Speicherung+des+APPC+in+DICOM+Daten)

---

## 🧪 Trial Standard (NICHT normativ - nur zur Information)

#### 22. Augenbefund
- **Status:** 🧪 Trial Standard (NICHT normativ/gültig)
- **Link:** [Augenbefund](https://wiki.hl7.at/index.php/ILF:Augenbefund)
- **Hinweis:** Dieser Leitfaden ist NICHT normativ/gültig, wird hier nur zur Vollständigkeit erwähnt

---

## 📊 Versionsübersicht (Alle gültigen/normativen Versionen)

| Leitfaden | Gültige Versionen | Status | Erfordert Allgemeiner IL |
|-----------|-------------------|--------|-------------------------|
| **Allgemeiner IL** | **2.06.5** und **3.2.1+20211001** | ✅ Beide Normativ/Gültig | - |
| **ELGA XDS Metadaten** | 3.0.2+20240715 | ✅ Normativ/Gültig | - |
| **Entlassungsbrief (Ärztlich)** | **2.06.5** | ✅ Normativ/Gültig | 2.06.5 |
| **Entlassungsbrief (Pflege)** | **2.06.3** | ✅ Normativ/Gültig | 2.06.5 |
| **Pflegesituationsbericht** | 2.06.3 | ✅ Normativ/Gültig | 2.06.5 |
| **e-Medikation** | 2.06.5 | ✅ Normativ/Gültig | 2.06.5 |
| **Befund Bildgebende Diagnostik** | 3.0.2+20240715 (evtl. auch 3.0.1+20240911) | ✅ Normativ/Gültig | 3.2.1+20211001 |
| **Labor- & Mikrobiologiebefund** | 2.06.03 (Status prüfen!) | ⚠️ Prüfen | 2.06.5 |
| **Ambulanzbefund** | 1.0 (Status prüfen!) | ⚠️ Prüfen | ? |
| **Telemonitoring-Episodenbericht** | 1.2.0+20210304 (evtl. auch 1) | ✅ Normativ/Gültig | ? |
| **e-Impfpass** | 2.0.0+20230717 | ✅ Normativ/Gültig | ? |

---

## 🔗 Weitere Ressourcen

### HL7 Austria Wiki
- **Hauptseite:** https://wiki.hl7.at/
- **Übersicht Leitfäden:** https://wiki.hl7.at/index.php?title=Implementierungsleitfäden
- **Wissensbasis:** 
  - CDA-Standards
  - Terminologien
  - Governance Leitfadenerstellung

### ELGA Offizielle Website
- **Technische Informationen:** https://www.elga.gv.at/technische-informationen/implementierungsleitfaeden/

---

## 📝 Kritische Hinweise für die Implementierung

### 1. Versionierung - Mehrere gültige Versionen gleichzeitig

**⚠️ WICHTIG:** Verschiedene spezielle IL erfordern unterschiedliche Versionen des Allgemeinen IL:

- **Spezielle IL Version 2.06.x-Familie** erfordert: **Allgemeiner IL Version 2.06.5**
  - Entlassungsbrief (Ärztlich) 2.06.5
  - Entlassungsbrief (Pflege) 2.06.3
  - Pflegesituationsbericht 2.06.3
  - e-Medikation 2.06.5
  - Labor- & Mikrobiologiebefund 2.06.03

- **Spezielle IL Version 3.x-Familie** erfordert: **Allgemeiner IL Version 3.2.1+20211001**
  - Befund Bildgebende Diagnostik 3.0.2+20240715
  - Weitere Version 3.x IL

**Implementierung:** Das System muss **beide Versionen des Allgemeinen IL** unterstützen und je nach verwendetem speziellen IL die richtige Version verwenden.

### 2. Status-Prüfung

- **Nur Versionen mit Status "Normativ" oder "Gültig" verwenden**
- **Status auf der jeweiligen Guide-Seite prüfen**
- Bei Unsicherheit: Guide-Seite konsultieren

### 3. Erratum-Links

- **Bei ALLEN IL den Erratum-Link prozessieren**
- Erratum-Links finden sich auf den jeweiligen Guide-Seiten
- Errata können wichtige Korrekturen enthalten

### 4. Template-IDs

- Alle Leitfäden verwenden spezifische Template-IDs, die in den Dokumenten korrekt implementiert werden müssen
- Template-IDs variieren je nach Version

### 5. Terminologien

- Die Leitfäden referenzieren spezifische Terminologien (LOINC, SNOMED CT, ICD-10, etc.), die korrekt angewendet werden müssen

### 6. XDS Metadaten

- Für die Registrierung von Dokumenten in ELGA sind die XDS Metadaten zwingend erforderlich
- **Erratum-Link muss prozessiert werden**

---

## 🎯 Empfehlungen für experimentelle Implementierung

### Priorität 1 (Höchste Relevanz für Ordinationssoftware)
1. ✅ **Allgemeiner Implementierungsleitfaden** - **BEIDE Versionen** (2.06.5 und 3.2.1+20211001)
2. ✅ **ELGA XDS Metadaten** - Erforderlich für ELGA-Integration (**Erratum prozessieren!**)
3. ✅ **Entlassungsbrief (Ärztlich) 2.06.5** - Bereits teilweise implementiert (**Erratum prozessieren!**)
4. ⚠️ **Labor- & Mikrobiologiebefund** - Wichtig für Befundverwaltung (Status prüfen!)
5. ⚠️ **e-Medikation 2.06.5** - Relevant für Medikamentenverwaltung (**Erratum prozessieren!**)

### Priorität 2 (Mittlere Relevanz)
6. **Ambulanzbefund** - Für ambulante Behandlungen (Status prüfen!)
7. **Befund Bildgebende Diagnostik 3.0.2+20240715** - Für Bilddaten-Integration (**Erratum prozessieren!**)
8. **Patient Summary** - Wenn verfügbar (Status prüfen!)

### Priorität 3 (Zukünftige Erweiterungen)
9. **Telemonitoring-Episodenbericht** - Falls Telemonitoring geplant (**Erratum prozessieren!**)
10. **Entlassungsbrief (Pflege) 2.06.3** - Falls Pflegedokumentation benötigt (**Erratum prozessieren!**)

---

## ✅ Checkliste für Implementierung

- [ ] Beide Versionen des Allgemeinen IL verfügbar (2.06.5 und 3.2.1+20211001)
- [ ] Alle verwendeten speziellen IL haben Status "Normativ" oder "Gültig"
- [ ] Erratum-Links bei ALLEN verwendeten IL prozessiert
- [ ] Richtige Version des Allgemeinen IL je nach speziellem IL verwendet
- [ ] XDS Metadaten Erratum prozessiert
- [ ] Entlassungsbrief (Ärztlich) 2.06.5 verwendet (nicht ältere Version)
- [ ] Entlassungsbrief (Pflege) 2.06.3 verwendet
- [ ] Alle Template-IDs korrekt implementiert
- [ ] Alle Terminologien korrekt angewendet

---

**Stand der Dokumentation:** Oktober 2025  
**Nächste Überprüfung empfohlen:** Regelmäßig auf https://wiki.hl7.at/index.php?title=Implementierungsleitfäden  
**Wichtig:** Status und Versionen auf den jeweiligen Guide-Seiten prüfen!
