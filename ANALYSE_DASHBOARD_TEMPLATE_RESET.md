# Analyse: Dashboard Widgets & Template Management Reset

## 🔍 Problembeschreibung

**Beobachtete Probleme:**
1. Dashboard Widget-Anordnung war komplett durcheinander
2. "Template Management" unter Dokumente war wieder eingeblendet (obwohl ausgeblendet)

**Datum:** Heute (bei App-Öffnung)

---

## 📊 Technische Analyse

### 1. Dashboard Widgets - Wie funktioniert es?

#### Speicherung:
- **Datenbank:** MongoDB Collection `DashboardWidget`
- **User-spezifisch:** Jeder User hat seine eigenen Widgets (`userId`)
- **Felder:** `position` (x, y, w, h), `order`, `isVisible`, `config`
- **Backend Route:** `GET /api/dashboard-widgets` (lädt Widgets für aktuellen User)

#### Frontend:
- **Redux Slice:** `dashboardWidgetsSlice.ts`
- **Laden:** Beim Dashboard-Mount wird `fetchDashboardWidgets()` aufgerufen
- **Speichern:** Bei Layout-Änderungen wird `reorderDashboardWidgets()` aufgerufen
- **Kein localStorage:** Widgets werden NICHT im Browser gespeichert

#### Code-Stellen:
- `frontend/src/store/slices/dashboardWidgetsSlice.ts` - Redux State Management
- `backend/routes/dashboardWidgets.js` - API Endpoints
- `backend/models/DashboardWidget.js` - MongoDB Schema

---

### 2. Template Management - Wie funktioniert es?

#### Sichtbarkeit:
- **Menüpunkt:** `frontend/src/components/Layout/Sidebar.tsx` Zeile 115
- **Route:** `frontend/src/App.tsx` Zeile 502-508
- **RBAC:** Erfordert Permission `documents.write`
- **Code-basiert:** Die Sichtbarkeit wird durch Code gesteuert, NICHT durch Datenbank

#### Code-Stellen:
- `frontend/src/components/Layout/Sidebar.tsx` Zeile 115: Menüpunkt-Definition
- `frontend/src/App.tsx` Zeile 502-508: Route-Definition

---

## 🎯 Mögliche Ursachen

### Ursache 1: Datenbank-Rollback (Wahrscheinlichkeit: ⭐⭐⭐⭐⭐)

**Was passiert:**
- MongoDB-Datenbank wurde auf einen älteren Stand zurückgesetzt
- Widget-Positionen und -Anordnungen gingen verloren
- System lädt alte/Standard-Widget-Konfiguration

**Wie prüfen:**
```bash
# MongoDB prüfen
mongo
use ordinationssoftware
db.dashboardwidgets.find().sort({updatedAt: -1}).limit(5)
```

**Typische Szenarien:**
- Datenbank-Backup wurde wiederhergestellt
- Datenbank wurde auf einen älteren Zeitpunkt zurückgesetzt
- Datenbank-Migration ist fehlgeschlagen
- Manueller Datenbank-Reset

---

### Ursache 2: User-Wechsel (Wahrscheinlichkeit: ⭐⭐⭐⭐)

**Was passiert:**
- Ein anderer User ist eingeloggt
- Jeder User hat seine eigenen Widget-Konfigurationen
- Der neue User hat noch keine Widgets konfiguriert → Standard-Layout

**Wie prüfen:**
- Prüfen Sie, welcher User aktuell eingeloggt ist
- Prüfen Sie die User-ID in den Widgets:
```javascript
// In Browser Console
localStorage.getItem('token')
// Dann User-ID aus Token extrahieren oder in Redux State prüfen
```

**Typische Szenarien:**
- Browser-Cache wurde geleert → Neuer Login erforderlich
- Anderer Browser/Computer verwendet
- Session abgelaufen → Neuer Login

---

### Ursache 3: Code-Änderungen rückgängig gemacht (Wahrscheinlichkeit: ⭐⭐⭐⭐)

**Was passiert:**
- Git-Repository wurde auf einen älteren Commit zurückgesetzt
- Code-Änderungen (z.B. Template Management ausblenden) gingen verloren
- Alte Version des Codes läuft

**Wie prüfen:**
```bash
# Git-Historie prüfen
git log --oneline --all -20
git status
git diff HEAD~1 frontend/src/components/Layout/Sidebar.tsx
```

**Typische Szenarien:**
- `git reset --hard` auf älteren Commit
- `git checkout` auf alten Branch
- Code wurde überschrieben durch Pull/Merge
- Deployment auf ältere Version

---

### Ursache 4: API-Fehler beim Laden (Wahrscheinlichkeit: ⭐⭐⭐)

**Was passiert:**
- Backend-API konnte Widgets nicht laden
- Frontend fällt auf leeres Array zurück
- System zeigt Standard-Layout (keine Widgets oder Default-Positionen)

**Wie prüfen:**
- Browser Console öffnen (F12)
- Network-Tab prüfen: `GET /api/dashboard-widgets`
- Prüfen auf Fehler (500, 404, etc.)

**Typische Szenarien:**
- Backend-Server war nicht erreichbar
- Datenbank-Verbindungsproblem
- API-Endpoint hat Fehler geworfen
- Authentifizierung fehlgeschlagen

---

### Ursache 5: Datenbank-Verbindungsproblem (Wahrscheinlichkeit: ⭐⭐)

**Was passiert:**
- MongoDB-Verbindung war unterbrochen
- API gibt leeres Array zurück
- Frontend zeigt Standard-Layout

**Wie prüfen:**
- Backend-Logs prüfen
- MongoDB-Verbindung testen
- Prüfen ob andere Datenbank-Abfragen funktionieren

---

### Ursache 6: Redux State Reset (Wahrscheinlichkeit: ⭐)

**Was passiert:**
- Redux State wurde zurückgesetzt
- Widgets werden neu geladen, aber mit alten Daten aus DB
- **Hinweis:** Dies würde nur temporär sein, da Widgets beim nächsten Laden wieder aus DB kommen

**Typische Szenarien:**
- Browser-Refresh während API-Call
- React-Strict-Mode (Development)
- Redux DevTools Reset

---

### Ursache 7: Datenbank-Index-Problem (Wahrscheinlichkeit: ⭐)

**Was passiert:**
- MongoDB-Index wurde gelöscht oder beschädigt
- Queries funktionieren nicht korrekt
- Falsche Widgets werden geladen

**Wie prüfen:**
```bash
# MongoDB Indexe prüfen
db.dashboardwidgets.getIndexes()
```

---

## 🔎 Diagnose-Schritte

### Schritt 1: Prüfen Sie die Datenbank

```bash
# MongoDB verbinden
mongo
use ordinationssoftware

# Widgets für aktuellen User prüfen
db.dashboardwidgets.find({userId: ObjectId("USER_ID_HIER")}).sort({updatedAt: -1})

# Prüfen wann Widgets zuletzt aktualisiert wurden
db.dashboardwidgets.find().sort({updatedAt: -1}).limit(10).pretty()
```

### Schritt 2: Prüfen Sie den Code

```bash
# Git-Status prüfen
git status
git log --oneline -10

# Prüfen ob Template Management ausgeblendet ist
grep -n "Template Management" frontend/src/components/Layout/Sidebar.tsx
```

### Schritt 3: Prüfen Sie Browser Console

1. Browser öffnen (F12)
2. Console-Tab öffnen
3. Network-Tab öffnen
4. Dashboard-Seite neu laden
5. Prüfen:
   - `GET /api/dashboard-widgets` Request
   - Response-Status (200, 404, 500?)
   - Response-Daten (welche Widgets werden zurückgegeben?)

### Schritt 4: Prüfen Sie den eingeloggten User

```javascript
// In Browser Console
// Redux State prüfen
window.__REDUX_DEVTOOLS_EXTENSION__ // Falls Redux DevTools installiert

// Oder direkt im Code prüfen
// In Dashboard.tsx console.log hinzufügen:
console.log('Current user:', user);
console.log('Widgets loaded:', widgets);
```

---

## 🎯 Wahrscheinlichste Ursache

**Basierend auf der Analyse:**

### Kombination aus Ursache 1 + 3:

1. **Datenbank-Rollback** → Widget-Positionen gingen verloren
2. **Code-Änderungen rückgängig gemacht** → Template Management ist wieder im Code

**Warum diese Kombination?**
- Beide Probleme traten gleichzeitig auf
- Widgets sind in der Datenbank → Datenbank-Problem
- Template Management ist im Code → Code-Problem
- Beide deuten auf einen "Reset" hin

---

## 📋 Checkliste zur Diagnose

- [ ] MongoDB-Datenbank prüfen: Wann wurden Widgets zuletzt aktualisiert?
- [ ] Git-Historie prüfen: Wurde Code zurückgesetzt?
- [ ] Eingeloggter User prüfen: Ist es der richtige User?
- [ ] Browser Console prüfen: Gibt es API-Fehler?
- [ ] Backend-Logs prüfen: Gibt es Fehler beim Laden der Widgets?
- [ ] Code prüfen: Ist Template Management im Code ausgeblendet?
- [ ] Datenbank-Backups prüfen: Wurde ein Backup wiederhergestellt?

---

## 🔧 Mögliche Lösungen (nach Diagnose)

### Wenn Datenbank-Rollback:
1. Prüfen ob Backup verfügbar ist
2. Widgets neu anordnen
3. Datenbank-Backup-Strategie überprüfen

### Wenn Code-Änderungen verloren:
1. Git-Historie prüfen
2. Code-Änderungen wiederherstellen
3. Template Management erneut ausblenden

### Wenn User-Wechsel:
1. Richtigen User einloggen
2. Widgets neu konfigurieren

### Wenn API-Fehler:
1. Backend-Logs prüfen
2. Datenbank-Verbindung prüfen
3. API-Endpoint testen

---

## 💡 Präventionsmaßnahmen

1. **Regelmäßige Backups:** Datenbank-Backups automatisiert durchführen
2. **Git-Branches:** Code-Änderungen in separaten Branches
3. **Versionierung:** Widget-Konfigurationen versionieren
4. **Monitoring:** API-Fehler überwachen
5. **Dokumentation:** Änderungen dokumentieren

---

## 📝 Zusammenfassung

**Wahrscheinlichste Ursache:**
- **Datenbank-Rollback** (Widget-Positionen verloren)
- **Code-Änderungen rückgängig gemacht** (Template Management wieder sichtbar)

**Nächste Schritte:**
1. MongoDB-Datenbank prüfen (wann wurden Widgets zuletzt aktualisiert?)
2. Git-Historie prüfen (wurde Code zurückgesetzt?)
3. Browser Console prüfen (API-Fehler?)
4. Eingeloggten User prüfen (richtiger User?)

**Wichtig:**
- Widgets werden in MongoDB gespeichert (nicht localStorage)
- Template Management wird durch Code gesteuert (nicht Datenbank)
- Beide Probleme deuten auf einen "Reset" hin

---

**Erstellt:** 2026-01-12  
**Status:** Analyse - Keine Umsetzung
