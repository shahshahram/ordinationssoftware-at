# TODO: Patienten-Aufklärung auf Honorarnote

## Ziel
Das Rechnungs-Template (PDF-Export) soll automatisch bei ÖGK-Positionen einen Aufklärungstext anzeigen, der die voraussichtliche Kassen-Rückerstattung zeigt.

## Anforderung
Unter jeder Leistung auf der Honorarnote soll automatisch ein kleiner Text erscheinen, wenn es sich um eine ÖGK-Position handelt:

**Format:**
```
"Voraussichtliche Kassen-Rückerstattung (80% des ÖGK-Tarifs von OÖ): € XX,XX"
```

## Details

### Bedingungen
- Nur bei `billingType === 'wahlarzt'` oder `privateBilling.honorNote === true`
- Nur bei Services mit `ogk.khoCode` oder `ogk.khoPrice`
- RefundRate basierend auf `billingGroup`:
  - `Grundleistung` → 100% Erstattung
  - Alle anderen → 80% Erstattung

### Berechnung
```javascript
// Erstattungsbetrag berechnen
const kassenarztPrice = service.ogk.khoPrice; // KHO-Preis in Euro
const refundRate = service.ogk.billingGroup === 'Grundleistung' ? 1.0 : 0.8;
const refundAmount = kassenarztPrice * refundRate;

// Text generieren
const stateName = getStateName(service.ogk.federalState); // z.B. "OÖ"
const refundText = `Voraussichtliche Kassen-Rückerstattung (${Math.round(refundRate * 100)}% des ÖGK-Tarifs von ${stateName}): € ${refundAmount.toFixed(2)}`;
```

### Implementierung
1. PDF-Generator finden (wahrscheinlich `invoicePDFService.js` oder `pdfGenerator.js`)
2. Template anpassen, um Refund-Text unter jeder ÖGK-Leistung anzuzeigen
3. Bundesland-Name aus `federalState` konvertieren (z.B. "oberoesterreich" → "OÖ")
4. RefundRate-Logik aus `billing-calculator.js` verwenden

### Dateien die wahrscheinlich angepasst werden müssen
- `backend/services/invoicePDFService.js` (oder ähnlich)
- `backend/utils/pdfGenerator.js`
- Eventuell Frontend-Komponente für PDF-Vorschau

### Beispiel-Output
```
Leistung: Blutentnahme aus der Vene (11a)
Preis: € 50,00
Voraussichtliche Kassen-Rückerstattung (80% des ÖGK-Tarifs von OÖ): € 1.70
─────────────────────────────────────────
Patient zahlt: € 48,30
```

## Disclaimer/Haftungsausschluss

**WICHTIG:** Unter der Summe auf der Honorarnote muss ein Disclaimer (Haftungsausschluss) angezeigt werden.

### Text:
```
"Hierbei handelt es sich um eine unverbindliche Berechnung auf Basis der aktuellen Honorarordnung. Die tatsächliche Erstattungshöhe obliegt dem Versicherungsträger."
```

### Gründe:
- ÖGK kann Leistungen ablehnen (z.B. wenn Patient im selben Quartal schon bei anderem Arzt war)
- Rechtliche Absicherung notwendig
- Transparenz für Patienten

### Positionierung:
- Unter der Gesamtsumme
- Kleingedruckt (kleinere Schriftgröße)
- Optional: Grauer Text oder kursiv
- Nur bei Wahlarzt-Rechnungen/Honorarnoten mit ÖGK-Positionen

### Beispiel-Layout:
```
─────────────────────────────────────────
Gesamtsumme: € 50,00
Voraussichtliche Erstattung: € 1.70
Patient zahlt: € 48,30

─────────────────────────────────────────
* Hierbei handelt es sich um eine unverbindliche 
  Berechnung auf Basis der aktuellen Honorarordnung. 
  Die tatsächliche Erstattungshöhe obliegt dem 
  Versicherungsträger.
─────────────────────────────────────────
```

## Status
- [ ] PDF-Template anpassen
- [ ] RefundRate-Logik integrieren
- [ ] Bundesland-Name konvertieren
- [ ] Disclaimer/Haftungsausschluss unter Summe hinzufügen
- [ ] Testen mit verschiedenen billingGroups
- [ ] Testen mit verschiedenen Bundesländern
- [ ] Disclaimer-Text validieren (rechtlich korrekt)
