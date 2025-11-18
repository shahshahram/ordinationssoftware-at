# Test-Anleitung: Dokument-Versionierung

## Übersicht
Diese Anleitung beschreibt, wie Sie die neue Dokument-Versionierungs-Funktionalität testen können.

## Voraussetzungen
- Backend läuft auf `http://localhost:5001`
- Frontend läuft auf `http://localhost:3000`
- Sie sind als Admin eingeloggt

## Test-Szenarien

### 1. Dokument erstellen und Status-Workflow testen

#### Schritt 1: Neues Dokument erstellen
1. Gehen Sie zu `/documents` im Frontend
2. Erstellen Sie ein neues Dokument (z.B. "Arztbrief")
3. **Erwartetes Ergebnis:**
   - Dokument wird mit Status `draft` erstellt
   - Version `1.0.0` wird automatisch zugewiesen
   - `documentClass` wird automatisch bestimmt (z.B. `static_medical`)

#### Schritt 2: Dokument zur Prüfung einreichen
1. Öffnen Sie das Dokument-Detail (`/documents/:id`)
2. Klicken Sie auf "Zur Prüfung einreichen"
3. **Erwartetes Ergebnis:**
   - Status ändert sich zu `under_review`
   - Version-Snapshot wird erstellt

#### Schritt 3: Dokument freigeben
1. Klicken Sie auf "Freigeben"
2. Optional: Geben Sie einen Freigabe-Kommentar ein
3. **Erwartetes Ergebnis:**
   - Status ändert sich zu `released`
   - `isReleased` wird auf `true` gesetzt
   - `releasedVersion` wird gespeichert
   - Version wird als `released` markiert

### 2. Neue Version erstellen (für RELEASED Dokumente)

#### Schritt 1: Versuch, RELEASED Dokument zu bearbeiten
1. Versuchen Sie, ein freigegebenes Dokument zu bearbeiten
2. **Erwartetes Ergebnis:**
   - Warnung wird angezeigt: "Dokument ist freigegeben"
   - Button "Neue Version erstellen" wird angezeigt

#### Schritt 2: Neue Version erstellen
1. Klicken Sie auf "Neue Version erstellen"
2. Geben Sie einen Änderungsgrund ein (z.B. "Korrektur der Diagnose")
3. Geben Sie die Änderungen ein
4. Klicken Sie auf "Erstellen"
5. **Erwartetes Ergebnis:**
   - Alte Version (z.B. `1.0.0`) wird archiviert
   - Neue Version (z.B. `1.1.0`) wird erstellt
   - Status wird zurück auf `draft` gesetzt
   - `isReleased` wird auf `false` gesetzt

### 3. Versions-Historie anzeigen

#### Schritt 1: Versions-Historie öffnen
1. Öffnen Sie ein Dokument mit mehreren Versionen
2. Klicken Sie auf den Tab "Versions-Historie"
3. **Erwartetes Ergebnis:**
   - Liste aller Versionen wird angezeigt
   - Status jeder Version (draft, released, etc.)
   - Erstellungsdatum und Benutzer
   - Änderungsgrund (falls vorhanden)

### 4. Versionen vergleichen

#### Schritt 1: Versionen auswählen
1. In der Versions-Historie klicken Sie auf das Vergleichs-Icon bei zwei Versionen
2. **Erwartetes Ergebnis:**
   - Beide Versionen werden ausgewählt
   - Button "Versionen vergleichen" erscheint

#### Schritt 2: Vergleich anzeigen
1. Klicken Sie auf "Versionen vergleichen"
2. **Erwartetes Ergebnis:**
   - Vergleichs-Ansicht wird angezeigt
   - Geänderte Felder werden hervorgehoben
   - Alte und neue Werte werden nebeneinander angezeigt

### 5. API-Endpunkte direkt testen (mit curl oder Postman)

#### Dokument-Versionen abrufen
```bash
curl -X GET http://localhost:5001/api/documents/{documentId}/versions \
  -H "Authorization: Bearer {token}"
```

#### Spezifische Version abrufen
```bash
curl -X GET http://localhost:5001/api/documents/{documentId}/versions/1.0.0 \
  -H "Authorization: Bearer {token}"
```

#### Versionen vergleichen
```bash
curl -X GET http://localhost:5001/api/documents/{documentId}/comparison/1.0.0/1.1.0 \
  -H "Authorization: Bearer {token}"
```

#### Neue Version erstellen
```bash
curl -X POST http://localhost:5001/api/documents/{documentId}/new-version \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "changeReason": "Test-Änderung",
    "content": {
      "text": "Neuer Inhalt"
    }
  }'
```

#### Dokument freigeben
```bash
curl -X POST http://localhost:5001/api/documents/{documentId}/release \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Freigabe für Test"
  }'
```

#### Dokument zur Prüfung einreichen
```bash
curl -X POST http://localhost:5001/api/documents/{documentId}/submit-review \
  -H "Authorization: Bearer {token}"
```

#### Audit Trail abrufen
```bash
curl -X GET http://localhost:5001/api/documents/{documentId}/audit-trail \
  -H "Authorization: Bearer {token}"
```

## Test-Checkliste

### Backend-Tests
- [ ] Dokument erstellen → Version `1.0.0` wird automatisch zugewiesen
- [ ] Dokument zur Prüfung einreichen → Status `under_review`
- [ ] Dokument freigeben → Status `released`, Version wird als `released` markiert
- [ ] RELEASED Dokument bearbeiten → Fehler: "Dokument kann nicht bearbeitet werden"
- [ ] Neue Version erstellen → Alte Version archiviert, neue Version `1.1.0` erstellt
- [ ] Versionen abrufen → Liste aller Versionen
- [ ] Versionen vergleichen → Unterschiede werden angezeigt
- [ ] Audit Trail → Vollständige Historie wird angezeigt

### Frontend-Tests
- [ ] Status-Warnung wird bei RELEASED Dokumenten angezeigt
- [ ] "Neue Version erstellen" Button funktioniert
- [ ] Versions-Historie Tab zeigt alle Versionen
- [ ] Vergleichs-Ansicht funktioniert
- [ ] Status-Badges werden korrekt angezeigt
- [ ] Dialoge für Version-Erstellung und Freigabe funktionieren

## Bekannte Probleme / Einschränkungen

1. **Ambulanzbefunde/XDS Endpunkte**: Diese wurden entfernt und verursachen 404-Fehler im Frontend. Dies ist erwartetes Verhalten, da diese Features nicht mehr unterstützt werden.

2. **Token-Refresh**: Das System versucht automatisch, abgelaufene Tokens zu erneuern. Falls dies fehlschlägt, werden Sie zur Login-Seite weitergeleitet.

## Debugging

### Backend-Logs prüfen
```bash
# Im Backend-Verzeichnis
cd backend
npm start
# Logs werden in der Konsole ausgegeben
```

### Frontend-Konsole prüfen
- Öffnen Sie die Browser-Entwicklertools (F12)
- Prüfen Sie die Console für Fehler
- Prüfen Sie das Network-Tab für API-Aufrufe

### MongoDB prüfen
```bash
# Verbinden Sie sich mit MongoDB
mongosh "mongodb://localhost:27017/ordinationssoftware"

# Dokumente prüfen
db.documents.find({}).pretty()

# Versionen prüfen
db.documentversions.find({}).pretty()
```

## Nächste Schritte

Nach erfolgreichen Tests können Sie:
1. Weitere Dokumenttypen testen (medizinisch/nicht-medizinisch)
2. Kontinuierliche Dokumente testen (Anamnese, Medical Status)
3. Performance-Tests mit vielen Versionen durchführen
4. Integrationstests für den kompletten Workflow erstellen

